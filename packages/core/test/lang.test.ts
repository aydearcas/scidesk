// The language of a fragment (record 0060): marks only where they say something, Word's
// marks checked with the dictionaries, and the language in the DOCX and the PDF.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument } from "../src/project.ts";
import { applyTemplate, exportDocx, wordLang } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { cleanLangMarks, normalLang, sameLang, verifyLangMarks } from "../src/lang.ts";

const en = (text: string) => ({ type: "text", text, marks: [{ type: "lang", attrs: { lang: "en-US" } }] });
const para = (...content: PMNode[]): PMNode => ({ type: "paragraph", attrs: { id: "b-langtest01", lang: null }, content });

describe("language tags", () => {
  it("are tidied, compared without the region and written as Word does", () => {
    expect([normalLang("EN-us"), normalLang("es"), normalLang("x-none"), normalLang(null)]).toEqual(["en-US", "es", null, null]);
    expect([sameLang("es", "es-ES"), sameLang("en-GB", "en-US"), sameLang("en", "es"), sameLang("en", "en-US"), sameLang("en", "en-GB"), sameLang("EN_gb", "en-GB")]).toEqual([true, false, false, true, false, true]);
    expect([wordLang("es"), wordLang("en"), wordLang("en-gb")]).toEqual(["es-ES", "en-US", "en-GB"]);
  });
});

describe("lang marks", () => {
  it("only where the language differs from the one around, and on letters", () => {
    const doc: PMNode = { type: "doc", content: [
      para({ type: "text", text: "Texto ", marks: [{ type: "lang", attrs: { lang: "es-ES" } }] }, en("Rheumatoid arthritis"), en(" (12) "), { type: "text", text: " fin", marks: [{ type: "bold" }, { type: "lang", attrs: { lang: "es" } }] }),
      { type: "abstractSection", attrs: { id: "b-langtest02", lang: "en" }, content: [para(en("Background"))] },
    ] };
    const out = cleanLangMarks(doc, "es");
    expect(out.content![0].content).toEqual([{ type: "text", text: "Texto " }, en("Rheumatoid arthritis"), { type: "text", text: " (12) " }, { type: "text", text: " fin", marks: [{ type: "bold" }] }]);
    expect(out.content![1].content![0].content).toEqual([{ type: "text", text: "Background" }]);
  });

  it("from Word are checked with the dictionaries: Spanish marked as English loses its mark", async () => {
    const ES = new Set(["bibliografía", "enzimas", "musculares", "intravenosa", "etanercept"]);
    const EN = new Set(["rheumatoid", "arthritis", "impact", "of", "disease", "etanercept"]);
    const check = async (lang: string, words: string[]) => (lang.startsWith("es") ? words.map((w) => ES.has(w.toLowerCase())) : lang.startsWith("en") ? words.map((w) => EN.has(w.toLowerCase())) : null);
    const doc: PMNode = { type: "doc", content: [para(
      en("Bibliografía"), { type: "text", text: " " }, en("Rheumatoid Arthritis Impact of Disease"), { type: "text", text: " · " }, en("Enzimas musculares"),
      { type: "text", text: " " }, en("Etanercept"), { type: "text", text: " " }, en("Kasteler JS"),
      { type: "text", text: " ", marks: [] }, { type: "text", text: "Intravenosa", marks: [{ type: "lang", attrs: { lang: "de-DE" } }] },
      { type: "text", text: " " }, { type: "text", text: "Krebs von den Lungen", marks: [{ type: "lang", attrs: { lang: "de-DE" } }] },
    )] };
    const out = await verifyLangMarks(doc, "es", check);
    const marked = out.content![0].content!.filter((n) => n.marks?.some((m) => m.type === "lang")).map((n) => n.text);
    // English, a tie (a drug valid in both) and names stay; Spanish, and Spanish marked German, go
    expect(marked).toEqual(["Rheumatoid Arthritis Impact of Disease", "Etanercept", "Kasteler JS", "Krebs von den Lungen"]);
  });

  it("are valid in the format", () => {
    const d = { schemaVersion: 1, documentType: "article", lang: "es", changes: {}, comments: {}, doc: { type: "doc", content: [para(en("Rheumatoid"))] } };
    expect(validate("scidoc", d)).toEqual([]);
  });
});

describe("language in the exports", () => {
  it("the Word's default language is the article's; fragments in another language say so", async () => {
    const styles = '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="es-ES" w:eastAsia="en-US"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
    expect(applyTemplate(styles, { lang: "en" }).xml).toContain('<w:lang w:val="en-US" w:eastAsia="en-US"/>');
    expect(applyTemplate("<w:styles><w:docDefaults><w:rPrDefault><w:rPr></w:rPr></w:rPrDefault></w:docDefaults></w:styles>", { lang: "es" }).xml).toContain('<w:rPr><w:lang w:val="es-ES"/>');

    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, para({ type: "text", text: "Según el cuestionario " }, en("Rheumatoid Arthritis Impact of Disease"), { type: "text", text: " validado." }),
      { type: "paragraph", attrs: { id: "b-langtest03", lang: "en" }, content: [{ type: "text", text: "A whole paragraph in English." }] });
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const files = await JSZip.loadAsync((await exportDocx(p, "main", "coauthors", await nodeResources())).bytes);
    const xml = await files.file("word/document.xml")!.async("string");
    expect(await files.file("word/styles.xml")!.async("string")).toMatch(/<w:docDefaults>[\s\S]*?<w:lang w:val="es-ES"/);
    expect(xml).toMatch(/<w:lang w:val="en-US"\/><\/w:rPr><w:t[^>]*>Rheumatoid Arthritis Impact of Disease</);
    expect(xml).toMatch(/<w:lang w:val="en-US"\/><\/w:rPr><w:t[^>]*>A whole paragraph in English\.</);
    expect(xml).not.toMatch(/<w:lang w:val="[^"]*"\/><\/w:rPr><w:t[^>]*>Según el cuestionario/);

    const typ = (await manuscriptTypst(p, "main", await nodeResources())).source;
    expect(typ).toContain('#text(lang: "en", region: "US")[Rheumatoid Arthritis Impact of Disease]');
    expect(typ).toContain('#text(lang: "en")[A whole paragraph in English.]');
  });
});
