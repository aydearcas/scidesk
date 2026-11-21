// SciDesk's DOCX exporter, prototype: .scidoc JSON -> DOCX with the `docx` library, styles
// taken from a reference template (R35) and the invisible markers of PLAN.md 5.10 (R3):
//   - every block: a hidden bookmark _SD_<id> around its content;
//   - every table and figure: a bookmark _SD_<id> around the whole part (caption to last
//     note) and _SDn_<id> around its number, which REF fields point to;
//   - every citation: a Zotero field (ADDIN ZOTERO_ITEM CSL_CITATION {json}) whose
//     citationID is the citation's id and whose items carry the CSL-JSON;
//   - the bibliography: a Zotero ZOTERO_BIBL field;
//   - caption numbers: SEQ Tabla / SEQ Figura fields; cross-references: REF fields;
//   - document properties: ZOTERO_PREF_1.. (the style, so Zotero can take over) and
//     SciDesk (project, article and the snapshot the copy was sent from, for the 3-way merge).
// Two profiles (5.10): "coauthors" (all of the above) and "journal" (plain text, no
// markers, no metadata).
//   node src/export.mjs [coauthors|journal] [out.docx]
import { readFileSync, writeFileSync } from "node:fs";
import JSZip from "jszip";
import CSL from "citeproc";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  BookmarkStart, BookmarkEnd, bookmarkUniqueNumericId, ImportedXmlComponent, Footer, PageNumber, AlignmentType,
  LineNumberRestartFormat,
} from "docx";

const profile = process.argv[2] ?? "coauthors";
const outFile = process.argv[3] ?? `out/article-${profile}.docx`;
const markers = profile === "coauthors";
const BLOCK_MARK = process.env.BLOCK_MARK ?? "range"; // how a block's bookmark is written (see paragraph())
const scidoc = JSON.parse(readFileSync("out/article.scidoc.json", "utf8"));
const LABEL = { es: { table: "Tabla", figure: "Figura", bib: "Bibliografía" }, en: { table: "Table", figure: "Figure", bib: "References" } }[scidoc.lang];

// ------------------------------------------------------------ template (R35)
// Styles come from the template. Their ids are localised by Word (a Spanish Word writes
// "Ttulo1" and "Descripcin"), so they are looked up by their built-in name.
const template = await JSZip.loadAsync(readFileSync("template/reference.dotx"));
const stylesXml = await template.file("word/styles.xml").async("string");
const styleId = {};
for (const m of stylesXml.matchAll(/<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"/g)) styleId[m[2].toLowerCase()] = m[1];
const S = (name) => styleId[name] ?? (() => { throw new Error(`style not in template: ${name}`); })();

// ------------------------------------------------------------ citations (citeproc-js)
const csl = "../04-typst-preview/csl/";
const engine = new CSL.Engine(
  { retrieveLocale: () => readFileSync(csl + "locales-es-ES.xml", "utf8"), retrieveItem: (id) => scidoc.library[id] },
  readFileSync(csl + "nlm-citation-sequence-superscript.csl", "utf8"), "es-ES");
const walk = (n, f) => { f(n); for (const c of n.content ?? []) walk(c, f); };
const order = [];
walk(scidoc.doc, (n) => n.type === "citation" && n.attrs.refs.forEach((r) => !order.includes(r) && order.push(r)));
engine.updateItems(order);
const [, bibEntries] = engine.makeBibliography();
const decode = (s) => s.replace(/&#38;|&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n));

// numbers of tables and figures, in document order (never stored: PLAN.md 3.2)
const number = {};
let nt = 0, nf = 0;
walk(scidoc.doc, (n) => { if (n.type === "tablePart") number[n.attrs.id] = ++nt; if (n.type === "figurePart") number[n.attrs.id] = ++nf; });
const kindOf = (id) => (id.startsWith("t-") ? "table" : "figure");

// ------------------------------------------------------------ raw OOXML for fields
const x = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rPrXml = (f = {}) => {
  const p = (f.bold ? "<w:b/>" : "") + (f.italic ? "<w:i/>" : "") + (f.sup ? '<w:vertAlign w:val="superscript"/>' : f.sub ? '<w:vertAlign w:val="subscript"/>' : "");
  return p ? `<w:rPr>${p}</w:rPr>` : "";
};
const runXml = (text, f) => `<w:r>${rPrXml(f)}<w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
// a fragment of several elements is written as it is, with no wrapper
const raw = (xml) => ImportedXmlComponent.fromXmlString(xml);
// A complex field with a cached, formatted result: Word shows the result as it is and
// does not ask to update anything when the file is opened.
const fieldXml = (instr, resultRuns) =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${x(instr)} </w:instrText></w:r>` +
  `<w:r><w:fldChar w:fldCharType="separate"/></w:r>${resultRuns}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;

// citeproc's HTML -> runs (as XML for fields, as TextRun otherwise)
function htmlRuns(html) {
  const runs = [];
  const f = {};
  for (const tok of html.split(/(<[^>]+>)/)) {
    if (!tok) continue;
    const tag = /^<(\/?)(\w+)/.exec(tok);
    const key = tag && { i: "italic", em: "italic", b: "bold", strong: "bold", sup: "sup", sub: "sub" }[tag[2]];
    if (!tag) runs.push({ text: decode(tok), f: { ...f } });
    else if (key) f[key] = !tag[1];
  }
  return runs;
}
// only the formatting that is on (TextRun writes <w:b w:val="false"/> for a false)
const fmt = (f) => Object.fromEntries(Object.entries({ bold: f.bold, italics: f.italic, superScript: f.sup, subScript: f.sub }).filter(([, v]) => v));
const textRun = ({ text, f }) => new TextRun({ text, ...fmt(f) });

function citationField(node) {
  const html = engine.makeCitationCluster(node.attrs.refs.map((id) => ({ id })));
  const runs = htmlRuns(html);
  if (!markers) return runs.map(textRun);
  const code = {
    citationID: node.attrs.id,
    properties: { formattedCitation: html, plainCitation: runs.map((r) => r.text).join(""), noteIndex: 0 },
    citationItems: node.attrs.refs.map((id) => ({ id, uris: [], itemData: scidoc.library[id] })),
    schema: "https://github.com/citation-style-language/schema/raw/master/csl-citation.json",
  };
  return [raw(fieldXml(`ADDIN ZOTERO_ITEM CSL_CITATION ${JSON.stringify(code)}`, runs.map((r) => runXml(r.text, r.f)).join("")))];
}
const bm = (name) => {
  const id = bookmarkUniqueNumericId();
  return [new BookmarkStart(name, id), new BookmarkEnd(id)];
};
const bmName = (id, prefix = "_SD_") => prefix + id.replace("-", "_");

// ------------------------------------------------------------ blocks
function inlines(content = []) {
  const out = [];
  for (const n of content) {
    if (n.type === "text") {
      const has = (t) => (n.marks ?? []).some((m) => m.type === t);
      out.push(textRun({ text: n.text, f: { bold: has("bold"), italic: has("italic"), sup: has("superscript") } }));
    } else if (n.type === "citation") out.push(...citationField(n));
    else if (n.type === "xref") {
      const num = String(number[n.attrs.target]);
      out.push(markers ? raw(fieldXml(`REF ${bmName(n.attrs.target, "_SDn_")} \\h`, runXml(num))) : new TextRun(num));
    }
  }
  return out;
}
// A paragraph whose content sits inside its block bookmark. `extraStart`/`extraEnd` open
// or close the bookmark of a whole part.
function paragraph(node, opts = {}, { before = [], after = [], lead = [] } = {}) {
  const children = [...lead, ...inlines(node.content)];
  if (markers) {
    // "range": the bookmark spans the block's content; "point": an empty bookmark at its start
    const [s, e] = bm(bmName(node.attrs.id));
    children.unshift(s);
    if (BLOCK_MARK === "point") children.splice(1, 0, e);
    else children.push(e);
  }
  return new Paragraph({ ...opts, children: [...before, ...children, ...after] });
}
function captionLead(part) {
  const kind = kindOf(part.attrs.id);
  const num = String(number[part.attrs.id]);
  const label = new TextRun(`${LABEL[kind]} `);
  if (!markers) return [label, new TextRun(`${num}. `)];
  const [s, e] = bm(bmName(part.attrs.id, "_SDn_"));
  return [label, s, raw(fieldXml(`SEQ ${LABEL[kind]} \\* ARABIC`, runXml(num))), e, new TextRun(". ")];
}

const border = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function tablePart(part) {
  const [caption, table, ...notes] = part.content;
  const [ps, pe] = markers ? bm(bmName(part.attrs.id)) : [];
  const out = [paragraph(caption, { style: S("caption"), keepNext: true }, { before: markers ? [ps] : [], lead: captionLead(part) })];
  const rows = table.content.map((row, i) => new TableRow({
    tableHeader: row.attrs.header,
    children: row.content.map((cell) => new TableCell({
      columnSpan: cell.attrs.colspan, rowSpan: cell.attrs.rowspan,
      borders: { top: i === 0 ? border : none, bottom: row.attrs.header && !table.content[i + 1]?.attrs.header ? border : i === table.content.length - 1 ? border : none, left: none, right: none },
      children: cell.content.map((p) => paragraph(p, { spacing: { line: 240 } }, { lead: [] })),
    })),
  }));
  out.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  notes.forEach((n, i) => out.push(paragraph(n, { spacing: { line: 240 } }, { after: markers && i === notes.length - 1 ? [pe] : [] })));
  return out;
}
function figurePart(part) {
  const [caption] = part.content;
  const [ps, pe] = markers ? bm(bmName(part.attrs.id)) : [];
  const image = new ImageRun({
    type: "png", data: readFileSync("template/figure-1.png"), transformation: { width: 480, height: 280 },
    altText: { name: "Figura", title: "Figura", description: part.attrs.alt },
  });
  return [
    new Paragraph({ keepNext: true, children: [...(markers ? [ps] : []), image] }),
    paragraph(caption, { style: S("caption") }, { lead: captionLead(part), after: markers ? [pe] : [] }),
  ];
}

const body = [];
for (const n of scidoc.doc.content) {
  if (n.type === "title") body.push(paragraph(n, { style: S("title") }));
  else if (n.type === "heading") body.push(paragraph(n, { style: S(`heading ${n.attrs.level}`) }));
  else if (n.type === "paragraph") body.push(paragraph(n));
  else if (n.type === "tablePart") body.push(...tablePart(n));
  else if (n.type === "figurePart") body.push(...figurePart(n));
}
// bibliography, formatted by citeproc-js; with markers, inside a Zotero bibliography field
body.push(new Paragraph({ style: S("heading 1"), children: [new TextRun(LABEL.bib)] }));
bibEntries.forEach((e, i) => {
  const label = decode(/csl-left-margin">([^<]*)</.exec(e)?.[1] ?? "").trim();
  const html = (/csl-right-inline">([\s\S]*)<\/div>\s*<\/div>/.exec(e)?.[1] ?? e).trim();
  const runs = [new TextRun(`${label} `), ...htmlRuns(html).map(textRun)];
  const first = i === 0, last = i === bibEntries.length - 1;
  const children = markers
    ? [
      ...(first ? [raw('<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ADDIN ZOTERO_BIBL {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>')] : []),
      ...runs,
      ...(last ? [raw('<w:r><w:fldChar w:fldCharType="end"/></w:r>')] : []),
    ]
    : runs;
  body.push(new Paragraph({ indent: { left: 400, hanging: 400 }, children }));
});

// ------------------------------------------------------------ document properties
const custom = [];
if (markers) {
  // Zotero keeps its document preferences in custom properties of at most 255 characters
  const pref = '<data data-version="3" zotero-version="7.0"><session id="SciDesk01"/><style id="http://www.zotero.org/styles/reumatologia-clinica" locale="es-ES" hasBibliography="1" bibliographyStyleHasBeenSet="1"/><prefs><pref name="fieldType" value="Field"/><pref name="automaticJournalAbbreviations" value="true"/></prefs></data>';
  for (let i = 0; i * 255 < pref.length; i++) custom.push({ name: `ZOTERO_PREF_${i + 1}`, value: pref.slice(i * 255, (i + 1) * 255) });
  custom.push({ name: "SciDesk", value: JSON.stringify({ format: 1, project: scidoc.meta.projectId, article: scidoc.meta.articleId, snapshot: "s-20261121-1300", profile }) });
}
const doc = new Document({
  externalStyles: stylesXml,
  compatabilityModeVersion: 15,
  ...(markers ? { title: scidoc.meta.title, creator: "SciDesk", lastModifiedBy: "SciDesk" } : { creator: "", lastModifiedBy: "", title: "" }),
  customProperties: custom,
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } },
      lineNumbers: { countBy: 1, restart: LineNumberRestartFormat.NEW_PAGE },
    },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) },
    children: body,
  }],
});
const buffer = await Packer.toBuffer(doc);
writeFileSync(outFile, buffer);
console.log(JSON.stringify({ profile, outFile, kb: Math.round(buffer.length / 1024), styles: { title: S("title"), h1: S("heading 1"), caption: S("caption") } }));
// an empty document, for the "copy everything into a new document" scenario of tools/word.ps1
writeFileSync("out/blank.docx", await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("")] }] })));
