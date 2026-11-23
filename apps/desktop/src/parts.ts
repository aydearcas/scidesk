// The parts of the composite document in the editor (record 0021): the abstract, tables and
// figures live in their own files and are edited here in place, inside the one tree of the
// article. Node and attribute names are those of the .scidoc format. This module has their
// nodes, the rules that keep each part whole (ids, copies, borders), the numbers and
// letters shown in place (never stored) and the table's own tab, a second view of the part.
import { Extension, Node, getExtensionField, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, Selection, TextSelection, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView, type NodeViewConstructor } from "@tiptap/pm/view";
import { Mapping, ReplaceAroundStep, ReplaceStep, StepMap } from "@tiptap/pm/transform";
import { Fragment, Slice, type Node as PMNode, type ResolvedPos, type Schema } from "@tiptap/pm/model";
import { keymap } from "@tiptap/pm/keymap";
import { baseKeymap, toggleMark } from "@tiptap/pm/commands";
import { CellSelection, TableMap, addRowAfter, goToNextCell, isInTable, tableEditing } from "@tiptap/pm/tables";
import { ID_OF_NODE, newId, type PMNode as JsonNode } from "@scidesk/formats";
import { copyPart, freePartPath, label } from "@scidesk/core";
import { actionFor, comboOf, keyScheme } from "./shortcuts.ts";
import { columnResize } from "./columnResize.ts";
import { tableLinesPlugin } from "./table-lines.ts";

const PART_TYPES = new Set(["tablePart", "figurePart"]);
/** Nodes whose borders an edit may not cut: text never moves from one file (or language) to another. */
const ISOLATED = new Set(["tablePart", "figurePart", "abstractPart", "abstractSection"]);

const data = (name: string, def: unknown = null) => ({
  default: def,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? def,
  renderHTML: (a: Record<string, unknown>) => (a[name] == null ? {} : { [`data-${name}`]: String(a[name]) }),
});
const hidden = (def: unknown = null) => ({ default: def, rendered: false });
/**
 * Parse rules of the parts come before the paragraph's "p" and the superscript's "sup"
 * (both at the default 50, and Tiptap's paragraph first): otherwise a pasted copy of a
 * table loses its notes and their calls.
 */
const FIRST = 60;

/** What the window tells the parts: the article's language, the texts of the interface and the known files. */
export const partContext = {
  lang: "es",
  uncited: "no citada",
  /** What an empty caption says, in grey, until something is written (a table's title, a figure's caption). */
  captionHint: (_kind: "table" | "figure") => "",
  noImage: (path: string) => path,
  /** Paths of the article's part files, also those not in the text (a copy never takes one). */
  files: (): Iterable<string> => [],
  /** An image of the article as a URL the web view can show, or null (TIFF). */
  image: async (_path: string): Promise<string | null> => null,
};
const images = new Map<string, Promise<string | null>>();
const imageUrl = (path: string) => { if (!images.has(path)) images.set(path, partContext.image(path)); return images.get(path)!; };
/** Forgets the images (another project, or a figure whose image changed). */
export function clearImages() {
  for (const p of images.values()) void p.then((u) => u && URL.revokeObjectURL(u));
  images.clear();
}

// ---------------------------------------------------------------- the abstract

const AbstractPart = Node.create({
  name: "abstractPart",
  content: "abstractSection+",
  isolating: true,
  defining: true,
  addAttributes: () => ({ src: hidden() }),
  parseHTML: () => [{ tag: "section[data-part=abstract]" }],
  renderHTML: ({ HTMLAttributes }) => ["section", mergeAttributes(HTMLAttributes, { "data-part": "abstract", class: "part part-abstract" }), 0],
});
const AbstractSection = Node.create({
  name: "abstractSection",
  content: "(heading | paragraph | keywords)+",
  isolating: true,
  defining: true,
  addAttributes: () => ({ id: data("id"), lang: { default: "es", parseHTML: (el: HTMLElement) => el.getAttribute("lang"), renderHTML: (a: Record<string, unknown>) => ({ lang: a.lang }) } }),
  parseHTML: () => [{ tag: "div.abstract-section" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { class: "abstract-section" }), 0],
});
const Keywords = Node.create({
  name: "keywords",
  content: "keyword+",
  defining: true,
  addAttributes: () => ({ id: data("id") }),
  parseHTML: () => [{ tag: "p.keywords", priority: FIRST }],
  renderHTML: ({ HTMLAttributes }) => ["p", mergeAttributes(HTMLAttributes, { class: "keywords" }), 0],
});
const Keyword = Node.create({
  name: "keyword",
  content: "inline*",
  parseHTML: () => [{ tag: "span.keyword", priority: FIRST }],
  renderHTML: () => ["span", { class: "keyword" }, 0],
});

// ---------------------------------------------------------------- tables

/** prosemirror-tables finds the table's nodes by their `tableRole` (as Tiptap's own table extension does). */
const TableRoles = Extension.create({
  name: "tableRoles",
  extendNodeSchema(extension) {
    const role = getExtensionField(extension, "tableRole" as never, { name: extension.name, options: extension.options, storage: extension.storage });
    return role ? { tableRole: role } : {};
  },
});

const TablePart = Node.create({
  name: "tablePart",
  content: "tableCaption table tableNote*",
  isolating: true,
  defining: true,
  addAttributes: () => ({ id: data("id"), src: data("src") }),
  parseHTML: () => [{ tag: "figure[data-part=table]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes(HTMLAttributes, { "data-part": "table", class: "part part-table" }), 0],
});
const TableCaption = Node.create({
  name: "tableCaption",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ id: data("id"), lang: data("lang") }),
  parseHTML: () => [{ tag: "figcaption.table-caption", priority: FIRST }],
  renderHTML: ({ HTMLAttributes }) => ["figcaption", mergeAttributes(HTMLAttributes, { class: "part-caption table-caption" }), 0],
});
const note = (name: "tableNote" | "figureNote") => Node.create({
  name,
  content: "inline*",
  defining: true,
  addAttributes: () => ({ id: data("id"), kind: data("kind", "general"), lang: data("lang") }),
  parseHTML: () => [{ tag: `p.${name}`, priority: FIRST }],
  renderHTML: ({ HTMLAttributes }) => ["p", mergeAttributes(HTMLAttributes, { class: `note-text ${name}` }), 0],
});
const Table = Node.create({
  name: "table",
  tableRole: "table",
  content: "tableRow+",
  isolating: true,
  addAttributes: () => ({
    id: data("id"),
    columnWidths: { default: null, parseHTML: (el: HTMLElement) => { try { return JSON.parse(el.getAttribute("data-widths") ?? "null"); } catch { return null; } }, renderHTML: () => ({}) },
    // record 0076: the table's style (null: the journal's); its lines are drawn by table-lines.ts
    style: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-table-style"), renderHTML: (a: Record<string, unknown>) => (a.style ? { "data-table-style": a.style } : {}) },
  }),
  parseHTML: () => [{ tag: "table" }],
  renderHTML: ({ node, HTMLAttributes }) => {
    const widths = node.attrs.columnWidths as number[] | null;
    return ["table", mergeAttributes(HTMLAttributes, { class: "part-grid" }), ["colgroup", ...(widths ?? []).map((w) => ["col", { style: `width: ${w}%` }])], ["tbody", 0]];
  },
} as Parameters<typeof Node.create>[0]);
const TableRow = Node.create({
  name: "tableRow",
  tableRole: "row",
  content: "(tableCell | tableHeader)+",
  parseHTML: () => [{ tag: "tr" }],
  renderHTML: () => ["tr", 0],
} as Parameters<typeof Node.create>[0]);
const ALIGNS = ["left", "center", "right", "decimal"];
const cell = (name: "tableCell" | "tableHeader", role: string, tag: "td" | "th") => Node.create({
  name,
  tableRole: role,
  content: "(paragraph | bulletList | orderedList)+",
  isolating: true,
  addAttributes: () => ({
    colspan: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute("colspan") ?? 1) || 1, renderHTML: (a: Record<string, unknown>) => (a.colspan === 1 ? {} : { colspan: a.colspan }) },
    rowspan: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute("rowspan") ?? 1) || 1, renderHTML: (a: Record<string, unknown>) => (a.rowspan === 1 ? {} : { rowspan: a.rowspan }) },
    align: {
      default: null,
      parseHTML: (el: HTMLElement) => (ALIGNS.includes(el.getAttribute("data-align") ?? "") ? el.getAttribute("data-align") : null),
      renderHTML: (a: Record<string, unknown>) => (a.align ? { "data-align": a.align } : {}),
    },
    // record 0076: the cell's own borders, kept on copy and paste inside SciDesk
    borders: {
      default: null,
      parseHTML: (el: HTMLElement) => { try { return JSON.parse(el.getAttribute("data-borders") ?? "null"); } catch { return null; } },
      renderHTML: (a: Record<string, unknown>) => (a.borders ? { "data-borders": JSON.stringify(a.borders) } : {}),
    },
  }),
  parseHTML: () => [{ tag }],
  renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
} as Parameters<typeof Node.create>[0]);

/** A call to a note of the same table or figure; its letter is a decoration (R11). */
const NoteRef = Node.create({
  name: "noteRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ target: data("target") }),
  parseHTML: () => [{ tag: "sup[data-target]", priority: FIRST }],
  renderHTML: ({ HTMLAttributes }) => ["sup", mergeAttributes(HTMLAttributes, { class: "note-ref" })],
});

// ---------------------------------------------------------------- figures

const FigurePart = Node.create({
  name: "figurePart",
  content: "figureCaption figureNote*",
  isolating: true,
  defining: true,
  addAttributes: () => ({ id: data("id"), src: data("src"), image: data("image"), alt: data("alt"), credit: data("credit"), license: data("license") }),
  parseHTML: () => [{ tag: "figure[data-part=figure]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes(HTMLAttributes, { "data-part": "figure", class: "part part-figure" }), ["div", { class: "part-content" }, 0]],
  // the image is shown, not edited: it is a file of figures/; caption and notes are text
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("figure");
    dom.className = "part part-figure";
    dom.dataset.part = "figure";
    const media = document.createElement("div");
    media.className = "part-image";
    media.contentEditable = "false";
    const content = document.createElement("div");
    content.className = "part-content";
    dom.append(media, content);
    let current = node;
    let drawn = "";
    const draw = () => {
      const path = String(current.attrs.image ?? "");
      const key = `${path}\n${current.attrs.alt ?? ""}`;
      if (key === drawn) return;
      drawn = key;
      void imageUrl(path).then((url) => {
        if (drawn !== key) return;
        if (url) {
          const img = document.createElement("img");
          img.src = url;
          img.alt = String(current.attrs.alt ?? "");
          img.draggable = false;
          media.replaceChildren(img);
        } else {
          const p = document.createElement("span");
          p.className = "part-image-missing";
          p.textContent = partContext.noImage(path);
          media.replaceChildren(p);
        }
      });
    };
    draw();
    return {
      dom,
      contentDOM: content,
      update: (n: PMNode) => { if (n.type !== current.type) return false; current = n; draw(); return true; },
      ignoreMutation: (m: MutationRecord | { type: "selection"; target: globalThis.Node }) => m.type !== "selection" && media.contains(m.target as globalThis.Node),
      stopEvent: (e: Event) => media.contains(e.target as globalThis.Node) && e.type !== "mousedown",
    };
  },
});
const FigureCaption = Node.create({
  name: "figureCaption",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ id: data("id"), lang: data("lang") }),
  parseHTML: () => [{ tag: "figcaption.figure-caption", priority: FIRST }],
  renderHTML: ({ HTMLAttributes }) => ["figcaption", mergeAttributes(HTMLAttributes, { class: "part-caption figure-caption" }), 0],
});

// ---------------------------------------------------------------- ids, copies and note calls

/** The position of the innermost isolated node around a position, or null in the body. */
function isolatedAt($pos: ResolvedPos): number | null {
  for (let d = $pos.depth; d > 0; d--) if (ISOLATED.has($pos.node(d).type.name)) return $pos.before(d);
  return null;
}
const crosses = (doc: PMNode, from: number, to: number) => from !== to && isolatedAt(doc.resolve(from)) !== isolatedAt(doc.resolve(to));

/** The table or figure part around a position, with its position. */
export function partAround($pos: ResolvedPos): { node: PMNode; pos: number } | null {
  for (let d = $pos.depth; d > 0; d--) if (PART_TYPES.has($pos.node(d).type.name)) return { node: $pos.node(d), pos: $pos.before(d) };
  return null;
}

/**
 * Keeps every part whole after each change (rules 1 and 3 of record 0021):
 * - a second part with the id or file of another (a pasted copy) becomes a new part, with
 *   a new file and new ids inside; the one that was already there keeps its own;
 * - every block keeps a unique id (Enter copies the attributes of the block it splits);
 * - a note call that no longer has its note in the same part is removed;
 * - column widths that no longer match the columns (a column added or removed) are dropped.
 */
const Identity = Extension.create({
  name: "partIdentity",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: new PluginKey("partIdentity"),
      appendTransaction: (trs, old, state) => {
        if (!trs.some((t) => t.docChanged)) return null;
        // 1. copies of parts, structural: kept in the undo history with the paste
        const mapping = new Mapping();
        for (const t of trs) mapping.appendMapping(t.mapping);
        const originals = new Set<number>();
        old.doc.forEach((n, offset) => { if (PART_TYPES.has(n.type.name)) { const r = mapping.mapResult(offset, 1); if (!r.deleted) originals.add(r.pos); } });
        const parts: { node: PMNode; offset: number }[] = [];
        state.doc.forEach((node, offset) => { if (PART_TYPES.has(node.type.name)) parts.push({ node, offset }); });
        const keep = new Set<number>();
        const claimed = new Set<string>();
        // the originals claim their id and file first, then the others in order
        for (const pass of [true, false]) {
          for (const p of parts) {
            if (originals.has(p.offset) !== pass || keep.has(p.offset)) continue;
            const { id, src } = p.node.attrs as { id: string | null; src: string | null };
            if (id && src && !claimed.has(`id:${id}`) && !claimed.has(`src:${src}`)) { claimed.add(`id:${id}`); claimed.add(`src:${src}`); keep.add(p.offset); }
          }
        }
        const copies = parts.filter((p) => !keep.has(p.offset));
        if (copies.length) {
          const tr = state.tr;
          const taken = new Set<string>([...partContext.files(), ...parts.map((p) => String(p.node.attrs.src ?? ""))]);
          for (const p of copies) {
            const kind = p.node.type.name === "tablePart" ? "table" : "figure";
            const path = freePartPath(kind, taken);
            taken.add(path);
            const copy = state.schema.nodeFromJSON(copyPart(p.node.toJSON() as JsonNode, path));
            const from = tr.mapping.map(p.offset);
            tr.replaceWith(from, from + p.node.nodeSize, copy);
          }
          return tr;
        }

        // 2. note calls without their note, structural too
        const dangling: number[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "noteRef") return true;
          const part = partAround(state.doc.resolve(pos));
          let found = false;
          part?.node.forEach((c) => { if (/Note$/.test(c.type.name) && c.attrs.id === node.attrs.target) found = true; });
          if (!found) dangling.push(pos);
          return false;
        });
        if (dangling.length) {
          const tr = state.tr;
          for (const pos of dangling.reverse()) tr.delete(pos, pos + 1);
          return tr;
        }

        // 3. attributes only: out of the undo history, as before (they follow the change they fix)
        const tr = state.tr;
        let changed = false;
        const seen = new Set<string>();
        state.doc.descendants((node, pos) => {
          const name = node.type.name;
          if (name === "table") {
            const widths = node.attrs.columnWidths as number[] | null;
            if (widths && widths.length !== TableMap.get(node).width) { tr.setNodeAttribute(pos, "columnWidths", null); changed = true; }
          }
          const kind = ID_OF_NODE[name];
          if (!kind || PART_TYPES.has(name) || name === "tableRef" || name === "figureRef") return true;
          const id = node.attrs.id as string | null;
          if (id && !seen.has(id)) { seen.add(id); return true; }
          let fresh: string;
          do fresh = newId(kind); while (seen.has(fresh));
          seen.add(fresh);
          tr.setNodeAttribute(pos, "id", fresh);
          changed = true;
          return true;
        });
        return changed ? tr.setMeta("addToHistory", false) : null;
      },
    }),
  ],
});

// ---------------------------------------------------------------- the borders of the parts

/**
 * A selection that crosses the border of a part (the abstract, a language of the abstract,
 * a table, a figure) is clamped to the side where it started before deleting, cutting,
 * typing or pasting over it; any other step that would cut a border halfway is refused
 * (rule 2 of record 0021). The abstract itself is never removed.
 */
function clampedSelection(state: EditorState): TextSelection | null {
  const { from, to, $from, empty } = state.selection;
  if (empty || !crosses(state.doc, from, to)) return null;
  const start = isolatedAt($from);
  let end: number;
  if (start === null) {
    // started in the body: stop before the first part that the selection enters
    end = to;
    state.doc.nodesBetween(from, to, (n, pos) => {
      if (ISOLATED.has(n.type.name) && pos < end && pos + n.nodeSize > to) end = pos;
      return !ISOLATED.has(n.type.name);
    });
    // and before any part that ends inside it, if it started inside one
  } else end = start + state.doc.nodeAt(start)!.nodeSize - 1;
  const sel = TextSelection.between(state.doc.resolve(from), state.doc.resolve(Math.max(from, end)), -1);
  return sel instanceof TextSelection && !crosses(state.doc, sel.from, sel.to) ? sel : TextSelection.create(state.doc, from);
}

const Boundaries = Extension.create({
  name: "partBoundaries",
  priority: 1000,
  addKeyboardShortcuts() {
    const clamp = () => {
      const { state, view } = this.editor;
      const sel = clampedSelection(state);
      if (sel) view.dispatch(state.tr.setSelection(sel));
      return false; // the usual key then runs on the clamped selection
    };
    const enterInCaption = () => {
      // Enter in a table's caption goes to its first cell (a caption is one paragraph)
      const { state, view } = this.editor;
      const { $from, empty } = state.selection;
      if (!empty || $from.parent.type.name !== "tableCaption") return false;
      const part = $from.node($from.depth - 1);
      const tableStart = $from.before() + $from.parent.nodeSize;
      if (part.type.name !== "tablePart") return false;
      view.dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(tableStart + 1))).scrollIntoView());
      return true;
    };
    const cellKey = (dir: 1 | -1) => () => {
      const { state, view } = this.editor;
      if (!isInTable(state)) return false;
      if (goToNextCell(dir)(state, view.dispatch)) return true;
      // Tab in the last cell adds a row, as in Word
      if (dir === 1 && addRowAfter(state, view.dispatch)) return goToNextCell(1)(view.state, view.dispatch);
      return true;
    };
    return { Backspace: clamp, Delete: clamp, "Mod-x": clamp, Enter: enterInCaption, Tab: cellKey(1), "Shift-Tab": cellKey(-1) };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("partBoundaries"),
        filterTransaction: (tr) => {
          if (!tr.docChanged) return true;
          if (tr.steps.some((step, i) => (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) && crosses(tr.docs[i], (step as ReplaceStep).from, (step as ReplaceStep).to))) return false;
          let before = 0, after = 0;
          tr.before.forEach((n) => { if (n.type.name === "abstractPart") before++; });
          tr.doc.forEach((n) => { if (n.type.name === "abstractPart") after++; });
          return after >= before;
        },
        props: {
          handleTextInput: (view, from, to, text) => {
            if (!crosses(view.state.doc, from, to)) return false;
            const sel = clampedSelection(view.state);
            if (!sel) return false;
            view.dispatch(view.state.tr.setSelection(sel).insertText(text, sel.from, sel.to));
            return true;
          },
          handlePaste: (view, _event, slice) => {
            const sel = clampedSelection(view.state);
            if (sel) view.dispatch(view.state.tr.setSelection(sel));
            // a whole table or figure pasted inside a part goes after that part
            let hasPart = false;
            slice.content.forEach((n) => { if (PART_TYPES.has(n.type.name)) hasPart = true; });
            const around = isolatedAt(view.state.selection.$from);
            if (hasPart && around !== null) {
              const top = view.state.doc.resolve(around);
              const at = top.depth === 0 ? around + view.state.doc.nodeAt(around)!.nodeSize : top.after(1);
              view.dispatch(view.state.tr.insert(at, slice.content.size ? closedParts(slice) : Fragment.empty).scrollIntoView());
              return true;
            }
            return false;
          },
          // a whole abstract pasted elsewhere comes as its text: there is only one abstract
          transformPasted: (slice, view) => flattenAbstract(slice, view.state.schema),
        },
      }),
    ];
  },
});

function closedParts(slice: Slice): Fragment {
  const out: PMNode[] = [];
  slice.content.forEach((n) => { if (PART_TYPES.has(n.type.name)) out.push(n); });
  return Fragment.from(out);
}

/** Abstract nodes that come whole in a pasted slice become paragraphs ("Palabras clave: a; b"). */
function flattenAbstract(slice: Slice, schema: Schema): Slice {
  const blocks = (n: PMNode): PMNode[] => {
    if (n.type.name === "abstractPart" || n.type.name === "abstractSection") { const out: PMNode[] = []; n.forEach((c) => out.push(...blocks(c))); return out; }
    if (n.type.name === "keywords") {
      const words: string[] = [];
      n.forEach((k) => words.push(k.textContent));
      return [schema.nodes.paragraph.create(null, words.length ? schema.text(words.join("; ")) : null)];
    }
    return [n];
  };
  let changed = false;
  const children: PMNode[] = [];
  slice.content.forEach((n, _o, i) => {
    const open = (i === 0 && slice.openStart > 0) || (i === slice.content.childCount - 1 && slice.openEnd > 0);
    if (!open && ["abstractPart", "abstractSection", "keywords"].includes(n.type.name)) { children.push(...blocks(n)); changed = true; } else children.push(n);
  });
  return changed ? new Slice(Fragment.from(children), slice.openStart, slice.openEnd) : slice;
}

// ---------------------------------------------------------------- numbers and letters in place

/** Tables and figures numbered by first cross-reference, then position (as the export). */
export function partNumbers(doc: PMNode): Map<string, number> {
  const tables: string[] = [];
  const figures: string[] = [];
  const all = new Set<string>();
  const add = (id: string, list: string[]) => { if (!list.includes(id)) list.push(id); };
  doc.forEach((n) => { if (n.type.name === "tablePart" || n.type.name === "tableRef" || n.type.name === "figurePart" || n.type.name === "figureRef") all.add(String(n.attrs.id)); });
  doc.descendants((n) => {
    if (n.type.name === "xref" && all.has(String(n.attrs.target))) add(String(n.attrs.target), String(n.attrs.target).startsWith("t-") ? tables : figures);
    return true;
  });
  doc.forEach((n) => {
    if (n.type.name === "tablePart" || n.type.name === "tableRef") add(String(n.attrs.id), tables);
    if (n.type.name === "figurePart" || n.type.name === "figureRef") add(String(n.attrs.id), figures);
  });
  return new Map([...tables.map((id, i) => [id, i + 1] as const), ...figures.map((id, i) => [id, i + 1] as const)]);
}
const letter = (i: number): string => (i < 26 ? String.fromCharCode(97 + i) : letter(Math.floor(i / 26) - 1) + letter(i % 26));

/** The parts of a tree (the article, or a part on its own in its tab) with the position before each. */
function eachPart(doc: PMNode, f: (node: PMNode, pos: number) => void) {
  if (PART_TYPES.has(doc.type.name)) f(doc, -1);
  else doc.forEach((n, offset) => { if (PART_TYPES.has(n.type.name)) f(n, offset); });
}

function labelDecorations(doc: PMNode, article: PMNode): DecorationSet {
  const L = label(partContext.lang);
  const numbers = partNumbers(article);
  const cited = new Set<string>();
  article.descendants((n) => { if (n.type.name === "xref") cited.add(String(n.attrs.target)); return true; });
  const decos: Decoration[] = [];
  eachPart(doc, (part, pos) => {
    const id = String(part.attrs.id);
    const isTable = part.type.name === "tablePart";
    const caption = part.firstChild!;
    const hint = caption.content.size ? "" : partContext.captionHint(isTable ? "table" : "figure");
    decos.push(Decoration.node(pos + 1, pos + 1 + caption.nodeSize, {
      "data-label": `${isTable ? L.table : L.figure} ${numbers.get(id) ?? "?"}.`,
      ...(cited.has(id) ? {} : { "data-uncited": partContext.uncited }),
      ...(hint ? { "data-placeholder": hint } : {}),
    }));
    // specific notes lettered by first call (R11); general notes have no letter
    const specific = new Set<string>();
    part.forEach((c) => { if (/Note$/.test(c.type.name) && c.attrs.kind === "specific") specific.add(String(c.attrs.id)); });
    const order: string[] = [];
    part.descendants((c) => { if (c.type.name === "noteRef" && specific.has(String(c.attrs.target)) && !order.includes(String(c.attrs.target))) order.push(String(c.attrs.target)); return true; });
    for (const s of specific) if (!order.includes(s)) order.push(s);
    const letters = new Map(order.map((s, i) => [s, letter(i)]));
    part.descendants((c, rel) => {
      const at = pos + 1 + rel;
      if (c.type.name === "noteRef") decos.push(Decoration.node(at, at + 1, { "data-letter": letters.get(String(c.attrs.target)) ?? "?" }));
      else if (/Note$/.test(c.type.name) && letters.has(String(c.attrs.id))) decos.push(Decoration.node(at, at + c.nodeSize, { "data-letter": letters.get(String(c.attrs.id))! }));
      return true;
    });
  });
  // the abstract: its heading by language, and "Palabras clave:" in the language of each
  doc.forEach((n, offset) => {
    if (n.type.name !== "abstractPart") return;
    const many = n.childCount > 1;
    n.forEach((s, rel) => {
      const at = offset + 1 + rel;
      const SL = label(String(s.attrs.lang ?? partContext.lang));
      decos.push(Decoration.node(at, at + s.nodeSize, { "data-label": many ? `${SL.abstract} · ${String(s.attrs.lang).toUpperCase()}` : SL.abstract }));
      s.forEach((k, r2) => { if (k.type.name === "keywords") decos.push(Decoration.node(at + 1 + r2, at + 1 + r2 + k.nodeSize, { "data-label": `${SL.keywords}:` })); });
    });
  });
  return DecorationSet.create(doc, decos);
}

export const labelsKey = new PluginKey<DecorationSet>("partLabels");
/** `article` gives the whole article when the view shows only a part (the table's tab). */
const labelsPlugin = (article?: () => PMNode) => new Plugin<DecorationSet>({
  key: labelsKey,
  state: {
    init: (_c, s) => labelDecorations(s.doc, article?.() ?? s.doc),
    apply: (tr, old, _o, s) => (tr.docChanged || tr.getMeta(labelsKey) ? labelDecorations(s.doc, article?.() ?? s.doc) : old),
  },
  props: { decorations: (s) => labelsKey.getState(s) },
});
const Labels = Extension.create({ name: "partLabels", addProseMirrorPlugins: () => [labelsPlugin()] });

/** Redraws the numbers and labels (another article, or the interface language changed). */
export function relabel(view: EditorView) { view.dispatch(view.state.tr.setMeta(labelsKey, true).setMeta("addToHistory", false)); }

// ---------------------------------------------------------------- editing a part

const TableEditing = Extension.create({ name: "tableEditing", addProseMirrorPlugins: () => [tableEditing(), columnResize()] });

export const partExtensions = [
  TableRoles, AbstractPart, AbstractSection, Keywords, Keyword,
  TablePart, TableCaption, note("tableNote"), Table, TableRow, cell("tableCell", "cell", "td"), cell("tableHeader", "header_cell", "th"),
  FigurePart, FigureCaption, note("figureNote"), NoteRef,
  Identity, Boundaries, Labels, TableEditing,
];

/** A part of a tree, to be inserted: what the core gives (a file's part) with the file it goes back to. */
export const placed = (part: JsonNode, src: string): JsonNode => ({ ...part, attrs: { ...part.attrs, src } });

/** Where a block goes: at the cursor in the body, or right after the part (or abstract) the cursor is in. */
export function blockInsertPos(state: EditorState): number | null {
  const around = isolatedAt(state.selection.$from);
  if (around === null) return null;
  const $p = state.doc.resolve(around);
  return $p.depth === 0 ? around + state.doc.nodeAt(around)!.nodeSize : $p.after(1);
}

/** A new note at the end of the part around the cursor; a specific note also gets its call at the cursor. */
export function addNote(state: EditorState, dispatch: (tr: Transaction) => void, kind: "general" | "specific"): boolean {
  const part = partAround(state.selection.$from);
  if (!part) return false;
  const type = state.schema.nodes[part.node.type.name === "tablePart" ? "tableNote" : "figureNote"];
  const id = newId("n");
  const end = part.pos + part.node.nodeSize - 1;
  const tr = state.tr.insert(end, type.create({ id, kind, lang: null }));
  const inCell = kind === "specific" && state.selection.$from.parent.inlineContent && state.selection.$from.parent.type.name === "paragraph";
  if (inCell) tr.insert(state.selection.to, state.schema.nodes.noteRef.create({ target: id }));
  const noteAt = tr.mapping.map(end, -1);
  tr.setSelection(TextSelection.create(tr.doc, noteAt + 1)).scrollIntoView();
  dispatch(tr);
  return true;
}

/** Sets attributes of the part with this id (alt text, credit, licence), as one undo step. */
export function setPartAttrs(editor: Editor, id: string, attrs: Record<string, unknown>) {
  let at = -1;
  editor.state.doc.forEach((n, offset) => { if (PART_TYPES.has(n.type.name) && n.attrs.id === id) at = offset; });
  if (at < 0) return;
  const tr = editor.state.tr;
  for (const [k, v] of Object.entries(attrs)) tr.setNodeAttribute(at, k, v === "" ? null : v);
  editor.view.dispatch(tr);
}

/** The cell alignment of the selection, set (or cleared) on every selected cell. */
export function setAlign(state: EditorState, dispatch: (tr: Transaction) => void, align: string | null) {
  if (!isInTable(state)) return false;
  const tr = state.tr;
  const set = (pos: number) => { const n = tr.doc.nodeAt(pos); if (n && /^table(Cell|Header)$/.test(n.type.name)) tr.setNodeAttribute(pos, "align", align); };
  if (state.selection instanceof CellSelection) state.selection.forEachCell((_n, pos) => set(pos));
  else {
    const $f = state.selection.$from;
    for (let d = $f.depth; d > 0; d--) if (/^table(Cell|Header)$/.test($f.node(d).type.name)) { set($f.before(d)); break; }
  }
  dispatch(tr);
  return true;
}

// ---------------------------------------------------------------- the table's own tab

/**
 * "Open the table in its tab" (record 0021): a second EditorView over the same tablePart of
 * the article (ProseMirror's nested-editor pattern), with no state of its own that is
 * saved: its steps are moved into the main editor, so undo, saving and the numbering stay
 * in one place, and the main editor's changes are copied back into the tab.
 */
export class PartTab {
  readonly view: EditorView;
  private readonly editor: Editor;
  private readonly id: string;
  private readonly onUpdate: () => void;
  private gone = false;
  constructor(editor: Editor, id: string, element: HTMLElement, private readonly onGone: () => void) {
    this.editor = editor;
    this.id = id;
    const found = this.find();
    if (!found) throw new Error(`the table ${id} is not in the text`);
    const schema = editor.schema;
    const undo = () => (editor.commands.undo(), true);
    const redo = () => (editor.commands.redo(), true);
    this.view = new EditorView(element, {
      state: EditorState.create({
        doc: found.node,
        plugins: [
          new Plugin({
            props: {
              // the scheme's text formats, as in the manuscript (R19)
              handleKeyDown: (view, event) => {
                const action = actionFor(keyScheme.current, comboOf(event));
                if (action === "undo") return (event.preventDefault(), undo());
                if (action === "redo") return (event.preventDefault(), redo());
                if (action && ["bold", "italic", "underline", "superscript", "subscript"].includes(action) && schema.marks[action]) {
                  event.preventDefault();
                  return toggleMark(schema.marks[action])(view.state, view.dispatch);
                }
                return false;
              },
            },
          }),
          keymap({
            "Mod-z": undo, "Mod-y": redo, "Shift-Mod-z": redo,
            Tab: (s, d) => goToNextCell(1)(s, d) || (addRowAfter(s, d) && goToNextCell(1)(this.view.state, this.view.dispatch)),
            "Shift-Tab": (s, d) => goToNextCell(-1)(s, d),
          }),
          keymap(baseKeymap),
          tableEditing(),
          columnResize(),
          labelsPlugin(() => editor.state.doc),
          tableLinesPlugin(),
        ],
      }),
      nodeViews: editor.extensionManager.nodeViews as Record<string, NodeViewConstructor>,
      dispatchTransaction: (tr) => this.dispatchInner(tr),
    });
    this.onUpdate = () => this.syncFromOuter();
    editor.on("update", this.onUpdate);
  }
  private find(): { node: PMNode; pos: number } | null {
    let found: { node: PMNode; pos: number } | null = null;
    this.editor.state.doc.forEach((node, offset) => { if (node.type.name === "tablePart" && node.attrs.id === this.id) found = { node, pos: offset }; });
    return found;
  }
  /** A command of prosemirror-tables or ProseMirror on the tab's view. */
  run(cmd: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean) {
    const ok = cmd(this.view.state, this.view.dispatch);
    this.view.focus();
    return ok;
  }
  private dispatchInner(tr: Transaction) {
    const { state, transactions } = this.view.state.applyTransaction(tr);
    this.view.updateState(state);
    if (tr.getMeta("fromOutside") || this.gone) return;
    const found = this.find();
    if (!found) return;
    const outer = this.editor.state.tr;
    const offset = StepMap.offset(found.pos + 1); // the tab's position 0 is the start of the part's content
    for (const t of transactions) for (const step of t.steps) { const mapped = step.map(offset); if (mapped) outer.step(mapped); }
    if (outer.docChanged) this.editor.view.dispatch(outer);
  }
  private syncFromOuter() {
    const found = this.find();
    if (!found) { this.destroy(); this.onGone(); return; }
    const inner = this.view.state;
    const next = found.node;
    if (next.eq(inner.doc)) { this.view.dispatch(inner.tr.setMeta(labelsKey, true).setMeta("fromOutside", true)); return; }
    const start = next.content.findDiffStart(inner.doc.content);
    const tr = inner.tr.setMeta("fromOutside", true);
    if (start != null) {
      let { a: endA, b: endB } = next.content.findDiffEnd(inner.doc.content)!;
      const overlap = start - Math.min(endA, endB);
      if (overlap > 0) { endA += overlap; endB += overlap; }
      tr.replace(start, endB, next.slice(start, endA));
    }
    for (const [k, v] of Object.entries(next.attrs)) if (inner.doc.attrs[k] !== v) tr.setDocAttribute(k, v);
    this.view.dispatch(tr);
  }
  destroy() {
    if (this.gone) return;
    this.gone = true;
    this.editor.off("update", this.onUpdate);
    this.view.destroy();
  }
}

