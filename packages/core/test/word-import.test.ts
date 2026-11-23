// "New article from a Word document" with the synthetic Word of the corpus (made with
// Word, Spanish style ids) and with a DOCX that SciDesk exports (abstract in two languages,
// a figure).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { projectFromWord, shortTitle } from "../src/word-import.ts";
import { exportDocx } from "../src/docx-export.ts";
import { loadProject } from "../src/project.ts";
import { nodeResources } from "../src/node-fs.ts";
import type { PMNode } from "@scidesk/formats";

const SENT = fileURLToPath(new URL("../../../prototypes/corpus/synthetic-round-knee-oa/sent.docx", import.meta.url));
const EXAMPLE = fileURLToPath(new URL("../../formats/examples/knee-oa/", import.meta.url));

describe("new article from a Word document", () => {
  it("reads the synthetic Word: title, abstract and keywords, sections with roles, tables with merged cells and notes", async () => {
    const fs = new MemoryFs();
    const { project, report } = await projectFromWord(fs, new Uint8Array(readFileSync(SENT)), { fileName: "sent.docx" });
    expect(report).toMatchObject({ tables: 2, figures: 0, abstract: true, abstractLanguages: ["es"], crossReferences: 2 });
    const art = project.articles[0];
    expect(art.article.lang).toBe("es");
    const body = art.documents.get("manuscript/article.scidoc")!.doc as PMNode;
    expect(body.content![0]).toMatchObject({ type: "title" });
    const headings = body.content!.filter((n) => n.type === "heading");
    expect(headings.map((h) => h.attrs!.role).filter(Boolean)).toEqual(["introduction", "conclusions", "references"]);
    expect(headings.filter((h) => h.attrs!.level === 2)).toHaveLength(7);
    const abstract = art.documents.get("manuscript/abstract.scidoc")!.doc as PMNode;
    const keywords = abstract.content![0].content!.find((n) => n.type === "keywords")!;
    expect(keywords.content!.map((k) => k.content![0].text)).toEqual(["artrosis de rodilla", "progresión rápida", "fenotipo", "resonancia magnética", "menisco", "Osteoarthritis Initiative"]);
    const t1 = art.documents.get("tables/tabla-1.scitable")!.doc as PMNode;
    expect(t1.content![0].content![0].text).toMatch(/^Comparación entre la artrosis de rodilla acelerada/); // "Tabla 1. " stripped
    const firstRow = t1.content![1].content![0].content!;
    expect(firstRow.map((c) => [c.type, c.attrs!.colspan, c.attrs!.rowspan])).toEqual([["tableHeader", 1, 2], ["tableHeader", 2, 1], ["tableHeader", 1, 2]]);
    expect(t1.content!.filter((n) => n.type === "tableNote")).toHaveLength(3);
    // "tabla 1" in the text became a live cross-reference
    expect(JSON.stringify(body)).toContain(`"target":"${t1.attrs!.id}"`);
    // the project validates on reload and exports
    await loadProject(fs);
    const out = await exportDocx(project, "main", "journal", await nodeResources());
    expect(out.warnings).toEqual([]);
  });

  it("reads a DOCX exported by SciDesk: two abstracts, a figure with its image", async () => {
    // the knee-oa example exported, as a Word someone already had
    const src = new MemoryFs();
    const visit = (rel: string) => {
      for (const name of readdirSync(EXAMPLE + rel)) {
        const p = rel ? `${rel}/${name}` : name;
        if (p.includes("/rounds/")) continue;
        if (statSync(EXAMPLE + p).isDirectory()) visit(p);
        else src.files.set(p, new Uint8Array(readFileSync(EXAMPLE + p)));
      }
    };
    visit("");
    const docx = (await exportDocx(await loadProject(src), "main", "coauthors", await nodeResources())).bytes;
    const fs = new MemoryFs();
    const { project, report } = await projectFromWord(fs, docx, { fileName: "articulo.docx" });
    expect(report).toMatchObject({ tables: 2, figures: 1, abstractLanguages: ["es", "en"] });
    expect([...fs.files.keys()]).toContain("articles/main/figures/figura-1.png");
    const fig = project.articles[0].documents.get("figures/figura-1.scifigure")!.doc as PMNode;
    expect(fig.content![0].content![0].text).toMatch(/^Proporción acumulada/);
    // tables, figure and notes all round-trip through SciDesk's own export
    const t = project.articles[0].documents.get("tables/tabla-1.scitable")!.doc as PMNode;
    expect(t.content!.filter((n) => n.type === "tableNote").length).toBeGreaterThan(0);
  });

  it("keeps a paragraph's left indent through the DOCX and back, and in the PDF source (record 0069)", async () => {
    const { createDemoProject } = await import("../src/demo.ts");
    const { saveDocument } = await import("../src/project.ts");
    const { manuscriptTypst } = await import("../src/typst-export.ts");
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    const para = (file.doc as PMNode).content!.find((n) => n.type === "paragraph" && n.content?.length)!;
    para.attrs = { ...para.attrs, indent: 2 };
    await saveDocument(p, art, "manuscript/article.scidoc", file);
    const res = await nodeResources();
    const out = await exportDocx(p, "main", "journal", res);
    const JSZip = (await import("jszip")).default;
    const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
    expect(xml).toContain('<w:ind w:left="1418"/>');
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source).toContain("#pad(left: 2.50cm)[");
    // back from Word: the same paragraph with the same indent, and none on the others
    const back = await projectFromWord(new MemoryFs(), out.bytes, { fileName: "indent.docx" });
    const body = back.project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    const indented = body.content!.filter((n) => n.type === "paragraph" && n.attrs?.indent);
    expect(indented).toHaveLength(1);
    expect(indented[0].attrs!.indent).toBe(2);
  });

  it("keeps alignment and block quotations through the DOCX and back, and in the PDF source (record 0073)", async () => {
    const { createDemoProject } = await import("../src/demo.ts");
    const { saveDocument } = await import("../src/project.ts");
    const { manuscriptTypst } = await import("../src/typst-export.ts");
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    const body = (file.doc as PMNode).content!;
    const paras = body.filter((n) => n.type === "paragraph" && n.content?.length);
    paras[0].attrs = { ...paras[0].attrs, align: "center" };
    const quoted = paras[1];
    body.splice(body.indexOf(quoted), 1, { type: "blockquote", attrs: { id: "b-quote00001" }, content: [quoted] });
    const title = body.find((n) => n.type === "title")!;
    title.attrs = { ...title.attrs, align: "right" };
    await saveDocument(p, art, "manuscript/article.scidoc", file);
    const res = await nodeResources();
    const out = await exportDocx(p, "main", "journal", res);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:jc w:val="right"/>');
    // the quotation: Word's Quote style, set in on both sides and not centred
    const styles = await zip.file("word/styles.xml")!.async("string");
    const quote = /<w:style [^>]*><w:name w:val="Quote"\/>[\s\S]*?<\/w:style>/.exec(styles)![0];
    expect(quote).toContain('<w:ind w:left="709" w:right="709"/>');
    expect(quote).not.toMatch(/<w:jc |<w:i\/>|<w:color /);
    const quoteId = /<w:style [^>]*w:styleId="([^"]+)"[^>]*><w:name w:val="Quote"\/>/.exec(styles)![1];
    expect(xml).toContain(`<w:pStyle w:val="${quoteId}"/>`);
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source).toContain("#align(center)[");
    expect(typst.source).toContain("#pad(x: 1.25cm)[");
    // back from Word: the centred paragraph and the quotation (justified is the journal's, so not read)
    const back = await projectFromWord(new MemoryFs(), out.bytes, { fileName: "align.docx" });
    const doc = back.project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    expect(doc.content!.filter((n) => n.type === "paragraph" && n.attrs?.align === "center")).toHaveLength(1);
    const bq = doc.content!.filter((n) => n.type === "blockquote");
    expect(bq).toHaveLength(1);
    expect(bq[0].content![0].content!.map((c) => c.text ?? "").join("")).toContain(quoted.content![0].text!.slice(0, 20));
  });

  it("refuses a folder that is not empty", async () => {
    const fs = new MemoryFs({ "x.txt": "hola" });
    await expect(projectFromWord(fs, new Uint8Array(readFileSync(SENT)), { fileName: "sent.docx" })).rejects.toThrow(/not empty/);
  });
});

describe("the project's name from the title", () => {
  it("is cut at a word, not in the middle of one (phase 1 test)", () => {
    const title = "Eficacia y seguridad de los inmunosupresores en la dermatomiositis del adulto: revisión sistemática";
    expect(shortTitle(title, 80)).toBe("Eficacia y seguridad de los inmunosupresores en la dermatomiositis del adulto…");
    expect(shortTitle("Un título corto", 80)).toBe("Un título corto");
    expect(shortTitle(title, 80).length).toBeLessThanOrEqual(80);
  });
});
