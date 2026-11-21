// Shared test schema: a reduced .scidoc (paragraphs with stable ids, an inline
// citation atom, bold/italic and a table), built in two variants because each
// library needs its own marks and attributes.
import { Schema } from "prosemirror-model";
import { tableNodes } from "prosemirror-tables";
import { addSuggestionMarks } from "@handlewithcare/prosemirror-suggest-changes";

function baseNodes() {
  return {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      attrs: { id: { default: null } },
      parseDOM: [{ tag: "p" }],
      toDOM: (n) => ["p", { "data-id": n.attrs.id }, 0],
    },
    text: { group: "inline" },
    citation: {
      inline: true,
      group: "inline",
      atom: true,
      attrs: { refs: { default: [] } },
      parseDOM: [{ tag: "cite" }],
      toDOM: (n) => ["cite", { "data-refs": JSON.stringify(n.attrs.refs) }, "[cit]"],
    },
    ...tableNodes({ tableGroup: "block", cellContent: "paragraph+", cellAttributes: {} }),
  };
}

function baseMarks() {
  return {
    bold: { parseDOM: [{ tag: "strong" }], toDOM: () => ["strong", 0] },
    italic: { parseDOM: [{ tag: "em" }], toDOM: () => ["em", 0] },
  };
}

// Variant A: @handlewithcare/prosemirror-suggest-changes.
// Changes are marks (insertion / deletion / modification) that carry only an id.
// Parents of blocks must accept the marks so block-level suggestions work.
export function suggestSchema() {
  const nodes = baseNodes();
  const blockMarks = "insertion modification deletion";
  nodes.doc = { ...nodes.doc, marks: blockMarks };
  nodes.table_cell = { ...nodes.table_cell, marks: blockMarks };
  nodes.table_header = { ...nodes.table_header, marks: blockMarks };
  return new Schema({ nodes, marks: addSuggestionMarks(baseMarks()) });
}

// Variant B: @manuscripts/track-changes-plugin.
// Every node and mark needs a dataTracked attribute; text changes are
// tracked_insert / tracked_delete marks with the metadata inside.
export function manuscriptsSchema() {
  const nodes = baseNodes();
  for (const [name, spec] of Object.entries(nodes)) {
    if (name === "text") continue;
    nodes[name] = { ...spec, attrs: { ...(spec.attrs || {}), dataTracked: { default: null } } };
  }
  nodes.paragraph = { ...nodes.paragraph, marks: "_" };
  const marks = baseMarks();
  for (const [name, spec] of Object.entries(marks)) {
    marks[name] = { ...spec, attrs: { dataTracked: { default: null } } };
  }
  marks.tracked_insert = {
    excludes: "tracked_insert tracked_delete",
    attrs: { dataTracked: { default: null } },
    parseDOM: [{ tag: "ins" }],
    toDOM: () => ["ins", 0],
  };
  marks.tracked_delete = {
    excludes: "tracked_insert tracked_delete",
    attrs: { dataTracked: { default: null } },
    parseDOM: [{ tag: "del" }],
    toDOM: () => ["del", 0],
  };
  return new Schema({ nodes, marks });
}

// The same starting document for every scenario.
export function startDocJSON() {
  const p = (id, ...content) => ({ type: "paragraph", attrs: { id }, content });
  const t = (text) => ({ type: "text", text });
  const cell = (text) => ({ type: "table_cell", content: [p(null, t(text))] });
  return {
    type: "doc",
    content: [
      p("p-1", t("La artritis reumatoide afecta al 1 % de la población "), { type: "citation", attrs: { refs: ["smolen2016"] } }, t(".")),
      p("p-2", t("Los resultados se muestran en la tabla.")),
      {
        type: "table",
        content: [
          { type: "table_row", content: [cell("Edad"), cell("54 años")] },
          { type: "table_row", content: [cell("Mujeres"), cell("72 %")] },
        ],
      },
    ],
  };
}
