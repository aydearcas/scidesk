// Numbered sections (record 0070): the numbers, the setting, the Word and the PDF source.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { JournalProfileFile, PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { numberHeadings, placeSection, roleFromName, sectionNumberingOf, sectionNumbers, sectionSpan, setSectionNumbering } from "../src/sections.ts";
import { checkArticle } from "../src/checks.ts";
import { saveDocument } from "../src/project.ts";

const h = (level: number, role: string | null = null, numbered?: boolean) => ({ level, role, numbered });

describe("numbered sections", () => {
  it("numbers levels 1 to 3, leaves the closing sections and their subsections out", () => {
    const hs = [h(1, "introduction"), h(1, "methods"), h(2), h(2, "ethics"), h(3), h(2), h(1, "results"), h(4), h(1, "acknowledgements"), h(2), h(1, "references")];
    expect(numberHeadings(hs, "1.")).toEqual(["1.", "2.", "2.1.", "2.2.", "2.2.1.", "2.3.", "3.", null, null, null, null]);
    expect(numberHeadings(hs, "1")).toEqual(["1", "2", "2.1", "2.2", "2.2.1", "2.3", "3", null, null, null, null]);
    expect(numberHeadings(hs, "none").every((n) => n === null)).toBe(true);
  });

  it("a heading marked without number skips its subsections, and the next one numbers on", () => {
    expect(numberHeadings([h(1), h(1, null, false), h(2), h(1), h(2)], "1.")).toEqual(["1.", null, null, "2.", "2.1."]);
    // a subsection before any section, as Word does
    expect(numberHeadings([h(2), h(1)], "1")).toEqual(["0.1", "1"]);
  });

  it("the article's setting wins over the journal's, and none when neither says", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    expect(sectionNumberingOf(p, "main")).toEqual({ value: "none", from: "default" });
    const art = p.articles[0];
    art.article = { ...art.article, journal: "test" };
    p.journals.set("test", { id: "test", manuscriptFormat: { sectionNumbering: { value: "1", source: "guide" } } } as unknown as JournalProfileFile);
    expect(sectionNumberingOf(p, "main")).toEqual({ value: "1", from: "journal" });
    await setSectionNumbering(p, "main", "1.");
    expect(sectionNumberingOf(p, "main")).toEqual({ value: "1.", from: "article" });
    expect(JSON.parse((await fs.readText("articles/main/article.json"))!).sectionNumbering).toBe("1.");
    await setSectionNumbering(p, "main", null);
    expect(sectionNumberingOf(p, "main").from).toBe("journal");
    await expect(setSectionNumbering(p, "main", "I." as never)).rejects.toThrow(/unknown numbering/);
  });

  it("goes to Word as a list on the heading styles, unnumbered headings with numId 0, and to the PDF as text", async () => {
    const p = await createDemoProject(new MemoryFs(), "num", { parts: true });
    await setSectionNumbering(p, "main", "1.");
    const doc = p.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    const numbers = sectionNumbers(doc, "1.");
    const headings = doc.content!.filter((n) => n.type === "heading");
    expect(headings.map((n) => numbers.get(n.attrs!.id as string) ?? null)).toEqual(headings.map((n) => (n.attrs!.role === "references" ? null : expect.stringMatching(/^\d\.$/))));
    const res = await nodeResources();
    for (const profile of ["coauthors", "journal"] as const) {
      const out = await exportDocx(p, "main", profile, res);
      const zip = await JSZip.loadAsync(out.bytes);
      const styles = await zip.file("word/styles.xml")!.async("string");
      const h1 = /<w:style [^>]*><w:name w:val="heading 1"\/>[\s\S]*?<\/w:style>/.exec(styles)![0];
      expect(h1).toMatch(/<w:keepLines\/><w:numPr><w:ilvl w:val="0"\/><w:numId w:val="9000"\/><\/w:numPr>/);
      const numbering = await zip.file("word/numbering.xml")!.async("string");
      expect(numbering).toMatch(/<w:abstractNum w:abstractNumId="9000">[\s\S]*<w:lvlText w:val="%1\.%2\."\/>/);
      // every abstractNum before the first num, and the sections' num at the end
      expect(numbering.lastIndexOf("<w:abstractNum ")).toBeLessThan(numbering.indexOf("<w:num "));
      expect(numbering).toMatch(/<w:num w:numId="9000"><w:abstractNumId w:val="9000"\/><\/w:num><\/w:numbering>/);
      const body = await zip.file("word/document.xml")!.async("string");
      // the references heading (and the abstract's) leave the list; the numbers are never text
      const refs = /<w:p>(?:(?!<\/w:p>).)*?Bibliografía(?:(?!<\/w:p>).)*?<\/w:p>/.exec(body)![0];
      expect(refs).toMatch(/<w:numId w:val="0"\/>/);
      expect(body).not.toMatch(/>1\. Introducción</);
    }
    // the copy for co-authors comes back without proposals
    const out = await exportDocx(p, "main", "coauthors", res);
    const back = await importCopy(p, "main", out.bytes, { fileName: "num.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => `${x.kind} «${x.before}»→«${x.after}»`)).toEqual([]);
    // the PDF: the number as text, escaped so that Typst does not take it for a list
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source).toMatch(/\n= 1\\\. Introducción/);
    expect(typst.source).toMatch(/\n= Bibliografía/);
  });

  it("without numbering, nothing changes in the Word", async () => {
    const p = await createDemoProject(new MemoryFs());
    const zip = await JSZip.loadAsync((await exportDocx(p, "main", "journal", await nodeResources())).bytes);
    expect(await zip.file("word/styles.xml")!.async("string")).not.toMatch(/w:numId w:val="9000"/);
    expect(await zip.file("word/numbering.xml")!.async("string")).not.toMatch(/9000/);
    expect(await zip.file("word/document.xml")!.async("string")).not.toMatch(/<w:numId w:val="0"\/>/);
  });

  it("reads a section's type from its name (record 0071)", () => {
    expect(["Agradecimientos", "Acknowledgments", "Financiación.", "Conflicto de intereses", "Competing interests", "Consentimiento informado", "Data availability statement",
      "Contribución de los autores", "Author contributions", "Apéndice A", "Anexo 2", "Presentación del caso", "Pacientes y métodos", "Responsabilidades éticas", "Objetivos"].map(roleFromName))
      .toEqual(["acknowledgements", "acknowledgements", "funding", "conflicts", "conflicts", "consent", "data-availability", "contributions", "contributions", "appendix", "appendix", "case-presentation", "methods", "ethics", "objective"]);
    expect(roleFromName("Limitaciones del estudio")).toBeNull();
  });

  it("a heading typed by hand as Agradecimientos is a closing section: no number, words not counted", async () => {
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    const doc = file.doc as PMNode;
    const refs = doc.content!.findIndex((n) => n.type === "heading" && n.attrs!.role === "references");
    doc.content!.splice(refs, 0,
      { type: "heading", attrs: { id: "b-ack0000001", level: 1, role: null, lang: null }, content: [{ type: "text", text: "Agradecimientos" }] },
      { type: "paragraph", attrs: { id: "b-ack0000002", lang: null }, content: [{ type: "text", text: "A los pacientes y al personal de enfermería del servicio." }] });
    await saveDocument(p, art, "manuscript/article.scidoc", file);
    const numbers = sectionNumbers(doc, "1");
    expect(numbers.has("b-ack0000001")).toBe(false);
    const section = checkArticle(p, "main").counts.sections.find((x) => x.block === "b-ack0000001")!;
    expect(section).toMatchObject({ role: "acknowledgements", counted: false });
  });

  it("puts a new section where it usually goes, and an untyped one after the cursor's section", () => {
    // 0 title, 1 Introducción, 2 p, 3 Métodos, 4 p, 5 Resultados, 6 p, 7 Discusión, 8 p, 9 Financiación, 10 p, 11 Bibliografía
    const hs = [{ index: 1, level: 1, role: "introduction" }, { index: 3, level: 1, role: "methods" }, { index: 4, level: 2, role: null }, { index: 5, level: 1, role: "results" }, { index: 7, level: 1, role: "discussion" }, { index: 9, level: 1, role: "funding" }, { index: 11, level: 1, role: "references" }];
    expect(placeSection(hs, 13, "conclusions")).toBe(9);
    expect(placeSection(hs, 13, "acknowledgements")).toBe(9);
    expect(placeSection(hs, 13, "conflicts")).toBe(11);
    expect(placeSection(hs, 13, "appendix")).toBe(13);
    expect(placeSection(hs, 13, "objective")).toBe(3);
    expect(placeSection(hs, 13, "other", 4)).toBe(5);
    expect(placeSection(hs, 13, "other", 10)).toBe(9); // never among the closing sections
    expect(placeSection(hs, 13, null)).toBe(9);
    expect(sectionSpan(hs, 13, 3)).toEqual({ from: 3, to: 5 });
    expect(sectionSpan(hs, 13, 4)).toEqual({ from: 4, to: 5 });
    expect(sectionSpan(hs, 13, 11)).toEqual({ from: 11, to: 13 });
  });
});
