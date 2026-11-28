// Record 0104: "New article from a Word document" with live citations — Zotero fields (the
// Word for co-authors SciDesk exports) and EndNote fields (with the long XML in base64 in an
// EN.CITE.DATA field), checked against the document's own bibliography.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { loadProject } from "../src/project.ts";
import { projectFromWord } from "../src/word-import.ts";
import { REUMATOLOGIA_CLINICA } from "../src/resources.ts";

const find = (n: PMNode, type: string, out: PMNode[] = []) => { if (n.type === type) out.push(n); n.content?.forEach((c) => find(c, type, out)); return out; };
const textOf = (n: PMNode): string => (n.text ?? "") + (n.content ?? []).map(textOf).join("");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const record = (db: string, n: number, authors: string[], title: string, year: number, extra = "") =>
  `<record><rec-number>${n}</rec-number><foreign-keys><key app="EN" db-id="${db}">${n}</key></foreign-keys><ref-type name="Journal Article">17</ref-type>` +
  `<contributors><authors>${authors.map((a) => `<author>${a}</author>`).join("")}</authors></contributors><titles><title>${title}</title><secondary-title>Reumatol Clin</secondary-title></titles>` +
  `<periodical><full-title>Reumatología Clínica</full-title></periodical><pages>10-15</pages><volume>16</volume><dates><year>${year}</year></dates>${extra}</record>`;
const A = record("db1", 12, ["Pérez, Juan", "Gil, Ana"], "Un estudio de cohorte", 2020, "<electronic-resource-num>10.1016/j.reuma.2020.01.001</electronic-resource-num>");
const B = record("db1", 30, ["Smith, John"], "A trial of something", 2021);
const run = (t: string) => `<w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const fld = (type: string, data = "") => `<w:r><w:fldChar w:fldCharType="${type}">${data ? `<w:fldData xml:space="preserve">${data}</w:fldData>` : ""}</w:fldChar></w:r>`;
const instr = (t: string) => `<w:r><w:instrText xml:space="preserve">${esc(t)}</w:instrText></w:r>`;
const para = (inner: string, style = "") => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${inner}</w:p>`;

/** A Word document made with EndNote: two citations (the second's XML in an EN.CITE.DATA) and its bibliography. */
async function endnoteWord(bibliography: string[]) {
  const short = `<EndNote><Cite><Author>Pérez</Author><Year>2020</Year><RecNum>12</RecNum><DisplayText>[1]</DisplayText>${A}</Cite></EndNote>`;
  const long = `<EndNote><Cite><Author>Smith</Author><Year>2021</Year><RecNum>30</RecNum><DisplayText>[1, 2]</DisplayText>${B}</Cite><Cite><Author>Pérez</Author><Year>2020</Year><RecNum>12</RecNum><Pages>12</Pages>${A}</Cite></EndNote>`;
  const b64 = Buffer.from(long, "utf8").toString("base64");
  const bib = bibliography.map((e, i) => para(
    (i === 0 ? fld("begin") + instr(" ADDIN EN.REFLIST ") + fld("separate") : "") + run(e) + (i === bibliography.length - 1 ? fld("end") : ""),
  )).join("");
  const body = [
    para(run("Un artículo con citas"), "Title"),
    para(run("Introducción"), "Heading1"),
    para(run("La artritis afecta al 1 % de la población ") + fld("begin") + instr(` ADDIN EN.CITE ${short}`) + fld("separate") + run("[1]") + fld("end") + run(".")),
    para(run("Otros lo confirman ") + fld("begin") + instr(" ADDIN EN.CITE ") + fld("begin", b64) + instr(" ADDIN EN.CITE.DATA ") + fld("end") + fld("separate") + run("[1, 2]") + fld("end") + run(".")),
    para(run("Bibliografía"), "Heading1"),
    bib,
  ].join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

describe("new article from a Word document with live citations (record 0104)", () => {
  it("turns EndNote's citations into live ones, with their references, when they match the bibliography", async () => {
    const fs = new MemoryFs();
    const { project, report } = await projectFromWord(fs, await endnoteWord(["1. Pérez J, Gil A. Un estudio de cohorte. Reumatol Clin. 2020;16:10-5.", "2. Smith J. A trial of something. Reumatol Clin. 2021;16:10-5."]), { fileName: "endnote.docx" });
    expect(report).toMatchObject({ citations: 2, references: 2, citationManager: "endnote", citationStyle: "http://www.zotero.org/styles/nlm-citation-sequence" });
    expect(report.warnings).toEqual([]);
    // the library, in order of first citation, in CSL-JSON
    const refs = project.library.references;
    expect(refs.map((r) => [r.csl.title, r.source?.kind, r.source?.key])).toEqual([["Un estudio de cohorte", "endnote-field", "db1:12"], ["A trial of something", "endnote-field", "db1:30"]]);
    expect(refs[0].csl).toMatchObject({ type: "article-journal", author: [{ family: "Pérez", given: "Juan" }, { family: "Gil", given: "Ana" }], "container-title": "Reumatología Clínica", DOI: "10.1016/j.reuma.2020.01.001", issued: { "date-parts": [[2020]] } });
    // the citations, live: the second cites both, with the page
    const body = project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    const cites = find(body, "citation");
    expect(cites.map((c) => (c.attrs!.items as { ref: string; locator?: string; label?: string }[]).map((x) => [x.ref, x.locator ?? null, x.label ?? null]))).toEqual([
      [[refs[0].id, null, null]],
      [[refs[1].id, null, null], [refs[0].id, "12", "page"]],
    ]);
    // the text around them, without what they showed; the bibliography is SciDesk's own now
    expect(textOf(body)).toContain("de la población .");
    expect(textOf(body)).not.toContain("[1]");
    expect(textOf(body)).not.toContain("Un estudio de cohorte");
    expect(find(body, "heading").map((h) => h.attrs!.role)).toContain("references");
    await loadProject(fs);
  });

  it("keeps them as their text when they do not match the document's bibliography", async () => {
    const { project, report } = await projectFromWord(new MemoryFs(), await endnoteWord(["1. Uno.", "2. Dos.", "3. Tres."]), { fileName: "endnote.docx" });
    expect(report).toMatchObject({ citations: 0, references: 0, citationManager: null });
    expect(report.warnings.join(" ")).toMatch(/bibliography has 3 entries but its citations cite 2 references/);
    expect(project.library.references).toEqual([]);
    const body = project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    expect(find(body, "citation")).toEqual([]);
    expect(textOf(body)).toContain("de la población [1].");
    expect(textOf(body)).toContain("3. Tres.");
  });

  it("reads back the Word for co-authors SciDesk exports: Zotero fields, its style and the page of a citation", async () => {
    const demo = await createDemoProject(new MemoryFs());
    const out = await exportDocx(demo, "main", "coauthors", await nodeResources());
    const fs = new MemoryFs();
    const { project, report } = await projectFromWord(fs, out.bytes, { fileName: "coautores.docx" });
    const sent = find(demo.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode, "citation");
    expect(report).toMatchObject({ citations: sent.length, citationManager: "zotero", citationStyle: REUMATOLOGIA_CLINICA });
    const cited = new Set(sent.flatMap((c) => (c.attrs!.items as { ref: string }[]).map((x) => x.ref)));
    expect(report.references).toBe(cited.size);
    // the same references (by title) and the same pages
    const title = (lib: typeof project.library, id: string) => lib.references.find((r) => r.id === id)!.csl.title;
    const back = find(project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode, "citation");
    const items = (c: PMNode, lib: typeof project.library) => (c.attrs!.items as { ref: string; locator?: string }[]).map((x) => [title(lib, x.ref), x.locator ?? null]);
    expect(back.map((c) => items(c, project.library))).toEqual(sent.map((c) => items(c, demo.library)));
    expect(project.articles[0].article.citationStyle.id).toBe(REUMATOLOGIA_CLINICA);
    expect(report.warnings).toEqual([]);
  });
});
