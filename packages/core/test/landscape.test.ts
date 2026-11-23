// Landscape pages (record 0085): in the format, the composite document, the Word (a section
// of its own), back from a co-author's copy, and the PDF source (a flipped page).
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { composeArticle, splitArticle } from "../src/compose.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { loadProject, saveDocument } from "../src/project.ts";

async function withLandscape() {
  const fs = new MemoryFs();
  const p = await createDemoProject(fs, "demo", { parts: true });
  const art = p.articles[0];
  const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
  const body = (file.doc as PMNode).content!;
  // the table on a landscape page, and two paragraphs of the discussion on another
  body.find((n) => n.type === "tableRef")!.attrs!.landscape = true;
  const paras = body.filter((n) => n.type === "paragraph");
  paras.at(-2)!.attrs!.landscape = true;
  paras.at(-1)!.attrs!.landscape = true;
  expect(validate("scidoc", file)).toEqual([]);
  await saveDocument(p, art, "manuscript/article.scidoc", file);
  return { fs, p: await loadProject(fs) };
}

describe("landscape pages", () => {
  it("belong to the place in the text: the part has it while composed, its file never", async () => {
    const { p } = await withLandscape();
    const art = p.articles[0];
    const doc = composeArticle(art).doc;
    const part = doc.content!.find((n) => n.type === "tablePart")!;
    expect(part.attrs!.landscape).toBe(true);
    const files = splitArticle(doc, art);
    const src = part.attrs!.src as string;
    expect((files.get(src)!.doc as PMNode).attrs).not.toHaveProperty("landscape");
    expect((files.get("manuscript/article.scidoc")!.doc as PMNode).content!.find((n) => n.type === "tableRef")!.attrs).toMatchObject({ landscape: true });
    expect(validate("scitable", files.get(src))).toEqual([]);
  });

  it("are sections of their own in the Word, and come back from a copy without proposals", async () => {
    const { p } = await withLandscape();
    const res = await nodeResources();
    for (const profile of ["coauthors", "journal"] as const) {
      const out = await exportDocx(p, "main", profile, res);
      const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
      const sections = [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => m[0]);
      // portrait, landscape (the table), portrait, landscape (the two paragraphs), portrait (the bibliography)
      expect(sections.map((x) => (/w:orient="landscape"/.test(x) ? "L" : "P"))).toEqual(["P", "L", "P", "L", "P"]);
      // the table itself is in the first landscape section: between the first two section ends
      const ends = [...xml.matchAll(/<w:sectPr\b/g)].map((m) => m.index!);
      const tableAt = xml.indexOf("<w:tbl>");
      expect(tableAt).toBeGreaterThan(ends[0]);
      expect(tableAt).toBeLessThan(ends[1]);
      expect(sections.slice(1).every((x) => /<w:type w:val="nextPage"\/>/.test(x))).toBe(true);
      // a landscape A4: 29.7 cm wide, and the table as wide as its text
      expect(sections[1]).toMatch(/<w:pgSz w:w="16838" w:h="11906"/);
      expect(sections.every((x) => /<w:footerReference/.test(x))).toBe(true);
    }
    const out = await exportDocx(p, "main", "coauthors", res);
    const back = await importCopy(p, "main", out.bytes, { fileName: "landscape.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => `${x.kind} «${x.before}»→«${x.after}»`)).toEqual([]);
    expect(back.set.integrity ?? "ok").not.toBe("mismatch");
  });

  it("are flipped pages in the PDF source", async () => {
    const { p } = await withLandscape();
    const typst = await manuscriptTypst(p, "main", await nodeResources());
    // the table between the first two turns
    const turns = [...typst.source.matchAll(/#set page\(flipped: (true|false)\);/g)].map((m) => m.index!);
    const tableAt = typst.source.indexOf("#figure(kind: table");
    expect(tableAt > turns[0] && tableAt < turns[1]).toBe(true);
    expect(typst.source.match(/#set page\(flipped: (true|false)\);/g)).toEqual([
      "#set page(flipped: true);", "#set page(flipped: false);", "#set page(flipped: true);", "#set page(flipped: false);",
    ]);
  });
});
