// The document's font (record 0074): which one the journal gets and which one the article is
// written in, in the Word for each and in the PDF source.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { JournalProfileFile } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { documentFontsOf, setDocumentFont } from "../src/document-font.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources, readAsset } from "../src/node-fs.ts";

const normal = async (bytes: Uint8Array) => {
  const styles = await (await JSZip.loadAsync(bytes)).file("word/styles.xml")!.async("string");
  return /<w:style [^>]*w:styleId="Normal"[^>]*>[\s\S]*?<\/w:style>/.exec(styles)![0];
};

describe("document font", () => {
  it("is Calibri 12 by default, the article's own when chosen, and the journal always gets its own", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    expect(documentFontsOf(p, "main")).toMatchObject({ journal: { family: "Calibri", size: 12 }, writing: { family: "Calibri", size: 12 }, own: {} });
    await setDocumentFont(p, "main", { family: "Times New Roman", size: 11 });
    expect(JSON.parse((await fs.readText("articles/main/article.json"))!).documentFont).toEqual({ family: "Times New Roman", size: 11 });
    // a journal that says nothing gets the document's
    expect(documentFontsOf(p, "main")).toMatchObject({ journal: { family: "Times New Roman", size: 11 }, writing: { family: "Times New Roman", size: 11 } });
    // a journal that says Arial 12: it gets Arial 12, and the article is still written in Times 11
    const art = p.articles[0];
    art.article = { ...art.article, journal: "test" };
    p.journals.set("test", { id: "test", manuscriptFormat: { font: { value: "Arial", source: "guide" }, fontSizePt: { value: 12, source: "guide" } }, articleTypes: [] } as unknown as JournalProfileFile);
    expect(documentFontsOf(p, "main")).toMatchObject({ journal: { family: "Arial", size: 12 }, writing: { family: "Times New Roman", size: 11 }, journalSays: { family: "Arial", size: 12 } });
    // only the size chosen: the family follows the journal again
    await setDocumentFont(p, "main", { family: null, size: 10 });
    expect(documentFontsOf(p, "main").writing).toEqual({ family: "Arial", size: 10 });
    await setDocumentFont(p, "main", null);
    expect(documentFontsOf(p, "main").own).toEqual({});
    await expect(setDocumentFont(p, "main", { size: 200 })).rejects.toThrow(/out of range/);
  });

  it("goes to the Word for co-authors as the article's and to the journal's Word and PDF as the journal's", async () => {
    const p = await createDemoProject(new MemoryFs());
    await setDocumentFont(p, "main", { family: "Times New Roman", size: 11 });
    const res = await nodeResources();
    const coauthors = await normal((await exportDocx(p, "main", "coauthors", res)).bytes);
    expect(coauthors).toMatch(/w:ascii="Times New Roman"/);
    expect(coauthors).toMatch(/<w:sz w:val="22"\/>/);
    // a journal with its own font and size
    const art = p.articles[0];
    const profile = JSON.parse(await readAsset("journals/reumatologia-clinica.json")) as JournalProfileFile;
    profile.manuscriptFormat = { ...profile.manuscriptFormat, font: { value: "Arial", source: profile.sources[0].id } };
    p.journals.set(profile.id, profile);
    art.article = { ...art.article, journal: profile.id };
    const journal = await normal((await exportDocx(p, "main", "journal", res)).bytes);
    expect(journal).toMatch(/w:ascii="Arial"/);
    expect(journal).toMatch(/<w:sz w:val="24"\/>/);
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source).toMatch(/#set text\(font: \("Arial", "Liberation Sans", "Arimo"[^)]*\), size: 12pt/);
  });
});
