// Builds the Typst source of a test article as SciDesk's exporter would: text and tables
// from the synthetic article (prototypes/corpus), citations and bibliography already
// formatted by citeproc-js (PLAN.md 6.1: the PDF and the DOCX must show the same
// citations), Reumatología Clínica's manuscript format (12 pt, wide line spacing,
// numbered pages and lines) and a marker per paragraph to find it in the pages.
//   node src/gen.mjs [repeat]   -> out/article.typ (repeat > 1 makes a longer article)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import CSL from "citeproc";

const SRC = "../corpus/synthetic-round-knee-oa/source/";
const repeat = Number(process.argv[2] ?? 1);
const md = readFileSync(SRC + "article.md", "utf8");
const tables = ["table-1.json", "table-2.json"].map((f) => JSON.parse(readFileSync(SRC + f, "utf8")));

// ------------------------------------------------------------ references -> CSL-JSON
// The synthetic article lists Vancouver references ("Authors. Title. Journal. 2014;73:1323-30.").
const [bodyMd, refsMd] = md.split(/^## Referencias\s*$/m);
const items = {};
for (const line of refsMd.split("\n")) {
  const m = /^(\d+)\.\s+(.*)$/.exec(line.trim());
  if (!m) continue;
  const id = `ref${m[1]}`;
  const r = /^(.*)\.\s+(\d{4});\s*([^:(]*)(?:\(([^)]*)\))?(?::\s*([^.]*))?\.?\s*$/.exec(m[2]);
  const left = r ? r[1] : m[2];
  const firstDot = left.indexOf(". ");
  const lastDot = left.lastIndexOf(". ");
  const authorsTxt = left.slice(0, firstDot);
  const authors = authorsTxt.split(/,\s*/).filter((a) => a && a !== "et al").map((a) => {
    const p = a.trim().split(" ");
    // Vancouver initials ("DJ") are separate initials for CSL ("D J")
    return { family: p.slice(0, -1).join(" ") || p[0], given: p.length > 1 ? [...p.at(-1)].join(" ") : "" };
  });
  items[id] = {
    id, type: "article-journal", author: authors,
    title: left.slice(firstDot + 2, lastDot),
    "container-title-short": left.slice(lastDot + 2), "container-title": left.slice(lastDot + 2),
    issued: r ? { "date-parts": [[Number(r[2])]] } : undefined, volume: r?.[3]?.trim(), issue: r?.[4], page: r?.[5],
  };
}

// ------------------------------------------------------------ citeproc-js
const style = readFileSync("csl/nlm-citation-sequence-superscript.csl", "utf8"); // parent of reumatologia-clinica.csl
const locale = readFileSync("csl/locales-es-ES.xml", "utf8");
const engine = new CSL.Engine({ retrieveLocale: () => locale, retrieveItem: (id) => items[id] }, style, "es-ES");

const expand = (s) => s.split(",").flatMap((p) => {
  const [a, b] = p.split(/[–-]/).map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => `ref${a + i}`) : [`ref${a}`];
});
const order = [];
for (const m of bodyMd.matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g)) for (const id of expand(m[1].replace(/\s/g, ""))) if (!order.includes(id)) order.push(id);
engine.updateItems(order);
const t0 = performance.now();
const citationHtml = (ids) => engine.makeCitationCluster(ids.map((id) => ({ id })));
const [, bibEntries] = engine.makeBibliography();
const citeprocMs = performance.now() - t0;

// ------------------------------------------------------------ Typst markup
const decode = (s) => s.replace(/&#38;|&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n));
// every character with a meaning in Typst markup is escaped
const esc = (s) => s.replace(/[\\#$*_`<>@\[\]~"\/=+\-]/g, (c) => "\\" + c);
// citeproc's HTML (i, b, sup, sub, span) -> Typst
function htmlToTypst(html) {
  let out = "";
  for (const tok of html.split(/(<[^>]+>)/)) {
    if (!tok) continue;
    const tag = /^<(\/?)(\w+)/.exec(tok);
    if (!tag) out += esc(decode(tok));
    else if (tag[1]) out += ["i", "em", "b", "strong", "sup", "sub"].includes(tag[2]) ? "]" : "";
    else out += { i: "#emph[", em: "#emph[", b: "#strong[", strong: "#strong[", sup: "#super[", sub: "#sub[" }[tag[2]] ?? "";
  }
  return out;
}
// inline Markdown of the article: **bold**, citations [n], superscripts ^{a}
function inline(text) {
  let out = "";
  const re = /\*\*(.+?)\*\*|\[(\d+(?:\s*[,–-]\s*\d+)*)\]|\^\{([^}]*)\}/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    if (m[1]) out += `#strong[${esc(m[1])}]`;
    else if (m[2]) {
      const html = citationHtml(expand(m[2].replace(/\s/g, "")));
      // superscript styles (NLM, Vancouver superscript): no space before the number
      if (html.startsWith("<sup>")) out = out.replace(/\s+$/, "");
      out += htmlToTypst(html);
    }
    else out += `#super[${esc(m[3])}]`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}
function table(t, n) {
  const cell = (c, header) => {
    if (typeof c === "string") c = { text: c, colspan: 1, rowspan: 1 }; // body cells are plain strings
    const span = [c.colspan > 1 ? `colspan: ${c.colspan}` : "", c.rowspan > 1 ? `rowspan: ${c.rowspan}` : ""].filter(Boolean).join(", ");
    const body = header ? `#strong[${inline(c.text)}]` : inline(c.text);
    return span ? `table.cell(${span})[${body}]` : `[${body}]`;
  };
  const header = t.header.map((r) => r.map((c) => cell(c, true)).join(", ")).join(",\n    ");
  const body = t.body.map((r) => r.map((c) => cell(c, false)).join(", ")).join(",\n  ");
  const caption = t.caption.replace(/^Tabla \d+\.\s*/, "");
  return `#metadata("tab-${n}") <tab-${n}>
#figure(
  kind: table, supplement: [Tabla],
  caption: figure.caption(position: top)[${inline(caption)}],
  table(columns: ${t.columns}, stroke: none, align: left,
    table.hline(),
    table.header(
    ${header}),
    table.hline(stroke: 0.5pt),
  ${body},
    table.hline()),
)
${t.notes.map((n) => `#block(text(size: 9pt)[${inline(n)}])`).join("\n")}
`;
}

const blocks = [];
let pid = 0;
for (let k = 0; k < repeat; k++) {
  const placed = new Set();
  for (const raw of bodyMd.split(/\n\s*\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const level = line.match(/^#+/)[0].length;
      blocks.push(`${"=".repeat(level)} ${inline(line.replace(/^#+\s*/, ""))}`);
      continue;
    }
    // the article marks where each table goes with [[TABLE n]]
    const slot = /^\[\[TABLE (\d+)\]\]$/.exec(line);
    if (slot) {
      const i = Number(slot[1]) - 1;
      placed.add(i);
      blocks.push(table(tables[i], `${k}-${i + 1}`));
      continue;
    }
    const id = `p-${++pid}`;
    blocks.push(`#metadata("${id}") <${id}>${inline(line)}`);
  }
  tables.forEach((t, i) => !placed.has(i) && blocks.push(table(t, `${k}-${i + 1}`)));
}
// citeproc gives each entry as a label ("1.") and the reference; both go as they come,
// so the numbering is the style's, not Typst's
const bib = bibEntries
  .map((e) => {
    const label = /csl-left-margin">([^<]*)</.exec(e)?.[1] ?? "";
    const body = (/csl-right-inline">([\s\S]*)<\/div>\s*<\/div>/.exec(e)?.[1] ?? e.replace(/<\/?div[^>]*>/g, "")).trim();
    return `[${esc(decode(label.trim()))}], [${htmlToTypst(body)}]`;
  })
  .join(",\n  ");

const typ = `// Generated by src/gen.mjs. Manuscript format of Reumatología Clínica (author guide):
// A4, 12 pt, wide line spacing, numbered pages; line numbers for the reviewers.
#set document(title: "Artrosis de rodilla acelerada (sintético)", date: datetime(year: 2026, month: 11, day: 21))
#set page(paper: "a4", margin: 2.5cm, numbering: "1")
#set text(font: ("Carlito", "Calibri", "Liberation Sans"), size: 12pt, lang: "es")
#set par(leading: 1.25em, spacing: 1.6em, justify: false)
#set par.line(numbering: n => text(size: 8pt, fill: gray)[#n], numbering-scope: "page")
#show heading: set block(above: 1.6em, below: 1em)
#show figure.where(kind: table): set block(breakable: true)
#set figure.caption(separator: [. ])

${blocks.join("\n\n")}

= Bibliografía
#set par.line(numbering: none)
#grid(columns: (auto, 1fr), column-gutter: 0.6em, row-gutter: 1.2em,
  ${bib})
`;
mkdirSync("out", { recursive: true });
const out = repeat > 1 ? `out/article-x${repeat}.typ` : "out/article.typ";
writeFileSync(out, typ);
const words = bodyMd.split(/\s+/).length * repeat;
console.log(JSON.stringify({ out, paragraphs: pid, words, references: Object.keys(items).length, cited: order.length, citeprocMs: +citeprocMs.toFixed(1), sampleCitation: citationHtml(["ref1", "ref2", "ref3"]), sampleReference: bibEntries[0].replace(/\s+/g, " ").slice(0, 200) }));
