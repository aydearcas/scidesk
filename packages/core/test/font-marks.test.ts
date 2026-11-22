// A fragment's own font and size (record 0047): valid marks, carried by the DOCX for the
// coauthors and never by the DOCX or the PDF for the journal, and counted by the checks.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument } from "../src/project.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { checkArticle } from "../src/checks.ts";
import { nodeResources } from "../src/node-fs.ts";

const own: PMNode = {
  type: "paragraph", attrs: { id: "b-ownfont001", lang: null },
  content: [
    { type: "text", text: "Revisar esta cifra con Laura", marks: [{ type: "fontFamily", attrs: { family: "Arial" } }, { type: "fontSize", attrs: { size: 16 } }] },
    { type: "text", text: " y el resto." },
  ],
};
const doc = (marks: unknown[]) => ({ schemaVersion: 1, documentType: "article", lang: "es", changes: {}, comments: {}, doc: { type: "doc", content: [{ type: "paragraph", attrs: { id: "b-x000000001", lang: null }, content: [{ type: "text", text: "x", marks }] }] } });

describe("own font and size", () => {
  it("are valid marks with a font name and a size in half points", () => {
    expect(validate("scidoc", doc([{ type: "fontFamily", attrs: { family: "Times New Roman" } }, { type: "fontSize", attrs: { size: 10.5 } }]))).toEqual([]);
    expect(validate("scidoc", doc([{ type: "fontSize", attrs: { size: 10.3 } }])).length).toBeGreaterThan(0);
    expect(validate("scidoc", doc([{ type: "fontSize", attrs: { size: 0 } }])).length).toBeGreaterThan(0);
    expect(validate("scidoc", doc([{ type: "fontFamily", attrs: { family: "Arial;} body{x" } }])).length).toBeGreaterThan(0);
  });

  it("go to the coauthors' Word, never to the journal's Word or PDF, and the checks count them", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, own);
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const xmlOf = async (bytes: Uint8Array) => (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string");
    const coauthors = await xmlOf((await exportDocx(p, "main", "coauthors", await nodeResources())).bytes);
    expect(coauthors).toMatch(/<w:rFonts w:ascii="Arial"[^>]*\/>[\s\S]*?<w:sz w:val="32"\/>[\s\S]*?Revisar esta cifra/);
    const journal = await xmlOf((await exportDocx(p, "main", "journal", await nodeResources())).bytes);
    const run = /<w:r>(?:(?!<w:r>)[\s\S])*?Revisar esta cifra/.exec(journal)![0];
    expect(run).not.toMatch(/w:rFonts|w:sz/);
    const { source } = await manuscriptTypst(p, "main", await nodeResources());
    expect(source).toContain("Revisar esta cifra con Laura");
    expect(source).not.toMatch(/Arial|size: 16pt/);
    const w = checkArticle(p, "main").warnings.find((x) => x.code === "own-font");
    expect(w).toMatchObject({ level: "info", params: { count: 1 }, where: { path: "manuscript/article.scidoc", block: "b-ownfont001" } });
  });
});
