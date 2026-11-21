// Turns the synthetic article (prototypes/corpus) into a .scidoc-like JSON, the input of
// the exporter: blocks with stable ids, citation nodes with their own id and the
// references they cite, cross-references to tables and figures, two tables and a figure
// as parts, and the references as CSL-JSON (the project library).
//   node src/make-scidoc.mjs  -> out/article.scidoc.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "../corpus/synthetic-round-knee-oa/source/";
const md = readFileSync(SRC + "article.md", "utf8");
const tables = ["table-1.json", "table-2.json"].map((f) => JSON.parse(readFileSync(SRC + f, "utf8")));

// deterministic ids, so that every run gives the same file
let seq = 0;
const hex = () => (Math.imul(++seq, 2654435761) >>> 0).toString(16).padStart(8, "0");
const blockId = () => `b-${hex()}`;

// ------------------------------------------------------------ references -> CSL-JSON
const [bodyMd, refsMd] = md.split(/^## Referencias\s*$/m);
const library = {};
for (const line of refsMd.split("\n")) {
  const m = /^(\d+)\.\s+(.*)$/.exec(line.trim());
  if (!m) continue;
  const id = `ref${m[1]}`;
  const r = /^(.*)\.\s+(\d{4});\s*([^:(]*)(?:\(([^)]*)\))?(?::\s*([^.]*))?\.?\s*$/.exec(m[2]);
  const left = r ? r[1] : m[2];
  const firstDot = left.indexOf(". ");
  const lastDot = left.lastIndexOf(". ");
  const author = left.slice(0, firstDot).split(/,\s*/).filter((a) => a && a !== "et al").map((a) => {
    const p = a.trim().split(" ");
    return { family: p.slice(0, -1).join(" ") || p[0], given: p.length > 1 ? [...p.at(-1)].join(" ") : "" };
  });
  library[id] = {
    id, type: "article-journal", author, title: left.slice(firstDot + 2, lastDot),
    "container-title": left.slice(lastDot + 2), "container-title-short": left.slice(lastDot + 2),
    ...(r ? { issued: { "date-parts": [[Number(r[2])]] }, volume: r[3]?.trim(), issue: r[4], page: r[5] } : {}),
  };
}
const expand = (s) => s.split(",").flatMap((p) => {
  const [a, b] = p.split(/[–-]/).map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => `ref${a + i}`) : [`ref${a}`];
});

// ------------------------------------------------------------ inline content
const tableIds = tables.map(() => `t-${hex()}`);
const figureId = `f-${hex()}`;
function inline(text) {
  const out = [];
  const push = (t, marks) => t && out.push(marks ? { type: "text", text: t, marks } : { type: "text", text: t });
  const re = /\*\*(.+?)\*\*|\s?\[(\d+(?:\s*[,–-]\s*\d+)*)\]|\^\{([^}]*)\}|(tabla|figura) (\d)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    push(text.slice(last, m.index));
    if (m[1]) push(m[1], [{ type: "bold" }]);
    else if (m[2]) out.push({ type: "citation", attrs: { id: `c-${hex()}`, refs: expand(m[2].replace(/\s/g, "")) } });
    else if (m[3]) push(m[3], [{ type: "superscript" }]);
    else {
      // "tabla 1" -> the word stays as text, the number is a cross-reference
      push(m[4] + " ");
      const target = m[4] === "tabla" ? tableIds[Number(m[5]) - 1] : figureId;
      out.push({ type: "xref", attrs: { target } });
    }
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return out;
}
const para = (text, type = "paragraph", attrs = {}) => ({ type, attrs: { id: blockId(), ...attrs }, content: inline(text) });

function tablePart(t, i) {
  const cell = (c) => (typeof c === "string" ? { text: c, colspan: 1, rowspan: 1 } : c);
  const row = (r, header) => ({
    type: "tableRow", attrs: { header },
    content: r.map(cell).map((c) => ({ type: header ? "tableHeader" : "tableCell", attrs: { colspan: c.colspan, rowspan: c.rowspan }, content: [para(c.text)] })),
  });
  return {
    type: "tablePart", attrs: { id: tableIds[i], src: `tables/table-${i + 1}.scitable` },
    content: [
      para(t.caption.replace(/^Tabla \d+\.\s*/, ""), "tableCaption"),
      { type: "table", attrs: { id: blockId(), columns: t.columns }, content: [...t.header.map((r) => row(r, true)), ...t.body.map((r) => row(r, false))] },
      ...t.notes.map((n) => para(n, "tableNote")),
    ],
  };
}

// ------------------------------------------------------------ blocks
const content = [];
let section = "";
for (const raw of bodyMd.split(/\n\s*\n/)) {
  const line = raw.trim();
  if (!line) continue;
  if (line.startsWith("# ")) { content.push(para(line.slice(2), "title")); continue; }
  const h = /^(#+)\s+(.*)$/.exec(line);
  if (h) {
    section = h[2];
    content.push(para(h[2], "heading", { level: h[1].length - 1 }));
    continue;
  }
  const slot = /^\[\[TABLE (\d+)\]\]$/.exec(line);
  if (slot) { content.push(tablePart(tables[Number(slot[1]) - 1], Number(slot[1]) - 1)); continue; }
  if (section === "Epidemiología" && !content.some((n) => n.type === "figurePart")) {
    // the synthetic article has no figure: one is added, with a cross-reference to it
    content.push(para(line.replace(/\.$/, " (figura 1).")));
    content.push({
      type: "figurePart", attrs: { id: figureId, src: "figures/figure-1.png", alt: "Gráfico de barras: proporción acumulada de rodillas con artrosis acelerada por visita" },
      content: [para("Proporción acumulada de rodillas que cumplen la definición de artrosis acelerada en cada visita (datos sintéticos).", "figureCaption")],
    });
    continue;
  }
  content.push(para(line));
}

const scidoc = {
  schemaVersion: 1,
  lang: "es",
  meta: { projectId: "p-7f3a9c1e", articleId: "main", title: "Artrosis de rodilla acelerada (sintético)" },
  changes: {},
  doc: { type: "doc", content },
  library,
};
mkdirSync("out", { recursive: true });
writeFileSync("out/article.scidoc.json", JSON.stringify(scidoc, null, 1));
const count = (type) => JSON.stringify(content).split(`"type":"${type}"`).length - 1;
console.log(JSON.stringify({ blocks: count("paragraph") + count("heading") + count("tableCaption") + count("tableNote") + count("figureCaption") + count("title"), citations: count("citation"), xrefs: count("xref"), references: Object.keys(library).length }));
