// Colour of the text, highlight and underline (record 0043): valid in the format, in the
// DOCX and the PDF's Typst source, and back from a Word document.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument } from "../src/project.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { projectFromWord } from "../src/word-import.ts";
import { nodeResources } from "../src/node-fs.ts";

const formatted: PMNode = {
  type: "paragraph", attrs: { id: "b-colour0001", lang: null },
  content: [
    { type: "text", text: "Dato por confirmar", marks: [{ type: "highlight", attrs: { color: "yellow" } }] },
    { type: "text", text: " y " },
    { type: "text", text: "texto en rojo", marks: [{ type: "textColor", attrs: { color: "#C00000" } }] },
    { type: "text", text: " y " },
    { type: "text", text: "subrayado", marks: [{ type: "underline" }] },
    { type: "text", text: "." },
  ],
};

describe("text colour, highlight and underline", () => {
  it("are valid marks; a colour that is not #RRGGBB or a highlight Word does not have are not", () => {
    const doc = (marks: unknown[]) => ({ schemaVersion: 1, documentType: "article", lang: "es", changes: {}, comments: {}, doc: { type: "doc", content: [{ type: "paragraph", attrs: { id: "b-x000000001", lang: null }, content: [{ type: "text", text: "x", marks }] }] } });
    expect(validate("scidoc", doc([{ type: "highlight", attrs: { color: "darkYellow" } }, { type: "textColor", attrs: { color: "#1F4E79" } }]))).toEqual([]);
    expect(validate("scidoc", doc([{ type: "textColor", attrs: { color: "red" } }])).length).toBeGreaterThan(0);
    expect(validate("scidoc", doc([{ type: "highlight", attrs: { color: "orange" } }])).length).toBeGreaterThan(0);
  });

  it("go to the DOCX and the Typst source, and come back from Word", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, formatted);
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const out = await exportDocx(p, "main", "journal", await nodeResources());
    const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:highlight w:val="yellow"\/>[\s\S]*?Dato por confirmar/);
    expect(xml).toMatch(/<w:color w:val="C00000"\/>[\s\S]*?texto en rojo/);
    expect(xml).toMatch(/<w:u w:val="single"\/>[\s\S]*?subrayado/);
    const { source } = await manuscriptTypst(p, "main", await nodeResources());
    expect(source).toContain('#highlight(fill: rgb("#FFFF00"))[Dato por confirmar]');
    expect(source).toContain('#text(fill: rgb("#C00000"))[texto en rojo]');
    expect(source).toContain("#underline[subrayado]");
    // the same DOCX opened with "New from Word"
    const back = await projectFromWord(new MemoryFs(), out.bytes, { fileName: "vuelta.docx" });
    const doc = back.project.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    const para = doc.content!.find((n) => JSON.stringify(n).includes("Dato por confirmar"))!;
    expect(para.content).toEqual(formatted.content);
  });
});
