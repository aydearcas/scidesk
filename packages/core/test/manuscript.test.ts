// The full manuscript export with the knee-oa example of packages/formats: abstract in two
// languages, two tables with notes called from their cells, a figure, cross-references,
// the Reumatología Clínica profile with its own style, and both profiles.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { applyTemplate, exportDocx, imageSize } from "../src/docx-export.ts";
import { readDocx } from "../src/docx-read.ts";
import { loadProject } from "../src/project.ts";
import { importCopy } from "../src/round.ts";
import { nodeRasterizer, nodeResources, scideskPdfBinary } from "../src/node-fs.ts";
import { createDemoProject } from "../src/demo.ts";

const res = await nodeResources();
const EXAMPLE = fileURLToPath(new URL("../../formats/examples/knee-oa/", import.meta.url));

async function kneeOa() {
  const fs = new MemoryFs();
  const visit = (rel: string) => {
    for (const name of readdirSync(EXAMPLE + rel)) {
      const p = rel ? `${rel}/${name}` : name;
      if (p.includes("/rounds/")) continue; // the example's round is not this test's
      if (statSync(EXAMPLE + p).isDirectory()) visit(p);
      else fs.files.set(p, new Uint8Array(readFileSync(EXAMPLE + p)));
    }
  };
  visit("");
  return { fs, project: await loadProject(fs) };
}
const documentXml = async (bytes: Uint8Array) => (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string");
const textOf = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

describe("manuscript export (knee-oa example, Reumatología Clínica)", () => {
  it("writes abstract, tables with lettered notes, figure, cross-references and the page format", async () => {
    const { project } = await kneeOa();
    const out = await exportDocx(project, "main", "coauthors", res);
    expect(out.warnings).toEqual([]);
    const xml = await documentXml(out.bytes);
    const text = textOf(xml);
    expect(text).toContain("Resumen");
    expect(text).toContain("Abstract");
    expect(text).toMatch(/Palabras clave: artrosis de rodilla; progresión rápida/);
    // tables and figure numbered, with SEQ fields and number bookmarks that REF fields use
    expect((xml.match(/SEQ Tabla \\\* ARABIC/g) ?? []).length).toBe(2);
    expect((xml.match(/SEQ Figura \\\* ARABIC/g) ?? []).length).toBe(1);
    expect(xml).toMatch(/REF _SDn_t_[a-z0-9]+ \\h/);
    expect(xml).toMatch(/REF _SDn_n_[a-z0-9]+ \\h/); // a note call
    expect(xml).toMatch(/<w:drawing>/); // the image
    expect(xml).toMatch(/<w:tblHeader\/>/); // header rows repeat on every page
    // Reumatología Clínica: double spacing and 12 pt on Normal, numbered pages
    const zip = await JSZip.loadAsync(out.bytes);
    const styles = await zip.file("word/styles.xml")!.async("string");
    expect(styles).toMatch(/w:line="480"/);
    expect(styles).toMatch(/<w:sz w:val="24"\/>/);
    expect(Object.keys(zip.files).some((f) => /footer/.test(f))).toBe(true);
    // the journal's own style: bold volume, Elsevier-Vancouver (record 0026)
    expect(xml).toMatch(/Hunter DJ, Bierma-Zeinstra S/);
  });

  it("an unchanged copy gives no proposals: generated text is not content", async () => {
    const { project } = await kneeOa();
    const out = await exportDocx(project, "main", "coauthors", res);
    const read = await readDocx(out.bytes);
    expect(read.paragraphs.some((p) => /^Tabla \d+\. $/.test(p.lead))).toBe(true);
    const r = await importCopy(project, "main", out.bytes, { fileName: "sin-cambios.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(r.set.proposals.map((p) => `${p.kind} «${p.before}»→«${p.after}»`)).toEqual([]);
    expect(r.set.integrity).toBe("ok");
  });

  it("an edit in a table cell is anchored in the table's file", async () => {
    const { project } = await kneeOa();
    const out = await exportDocx(project, "main", "coauthors", res);
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = (await zip.file("word/document.xml")!.async("string")).replace(">Menor en la acelerada<", ">Menor en la rodilla acelerada<");
    zip.file("word/document.xml", xml);
    const r = await importCopy(project, "main", new Uint8Array(await zip.generateAsync({ type: "uint8array" })), { fileName: "copia.docx", returnedBy: { name: "Javier Soler Benítez" } });
    expect(r.set.proposals.map((p) => [p.kind, p.before, p.after, (p.anchor as { file: string }).file])).toEqual([["insert", "", "rodilla ", "tables/tabla-1.scitable"]]);
  });

  it("the journal profile: no marks, tables at the end when the profile says so, captions list", async () => {
    const { fs, project } = await kneeOa();
    const profile = project.journals.get("reumatologia-clinica")!;
    profile.manuscriptFormat!.tables = { value: "end", source: "guide" };
    const out = await exportDocx(project, "main", "journal", res);
    const xml = await documentXml(out.bytes);
    expect(xml).not.toMatch(/_SD|ZOTERO|REF |SEQ /);
    const text = textOf(xml);
    // captions list after the bibliography, tables after it
    expect(text.indexOf("Pies de figura")).toBeGreaterThan(text.indexOf("Bibliografía"));
    expect(text.indexOf("Tabla 1.")).toBeGreaterThan(text.indexOf("Bibliografía"));
    expect(xml).not.toMatch(/<w:drawing>/);
    void fs;
  });

  it("reads image sizes and applies the page format to Normal", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 0, 0, 0, 1, 0, 8, 2]);
    expect(imageSize(png)).toEqual({ type: "png", width: 512, height: 256 });
    const t = applyTemplate('<w:styles><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style></w:styles>', { lineSpacing: 2, fontSizePt: 12 });
    expect(t.xml).toMatch(/<w:pPr><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"\/><\/w:pPr>/);
    expect(t.xml).toMatch(/<w:sz w:val="24"\/>/);
    expect(t.xml).not.toMatch(/w:val="22"/);
  });

  it("an SVG figure goes in as itself with a PNG fallback (record 0068)", async () => {
    const p = await createDemoProject(new MemoryFs(), "svg", { parts: true });
    const res = await nodeResources();
    // without a rasterizer: the file name and a warning, as before
    const plain = await exportDocx(p, "main", "coauthors", res);
    expect(plain.warnings.join(" ")).toMatch(/figura-1.svg.*scidesk-pdf/i);
    // with one: the SVG and the PNG in word/media, the SVG blip in the drawing, the size of the SVG
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 3, 0xc0, 0, 0, 2, 8, 8, 2]);
    let asked = 0;
    const out = await exportDocx(p, "main", "coauthors", { ...res, rasterize: async () => (asked++, { png, width: 480, height: 260 }) });
    expect(asked).toBe(1);
    expect(out.warnings.join(" ")).not.toMatch(/svg/i);
    const zip = await JSZip.loadAsync(out.bytes);
    const media = Object.keys(zip.files).filter((n) => n.startsWith("word/media/"));
    expect(media.some((n) => n.endsWith(".svg"))).toBe(true);
    expect(media.some((n) => n.endsWith(".png"))).toBe(true);
    const doc = await zip.file("word/document.xml")!.async("string");
    expect(doc).toMatch(/svgBlip/);
    // 480 × 260 CSS pixels at 9525 EMU each
    expect(doc).toContain(`cx="${480 * 9525}" cy="${260 * 9525}"`);
    // the copy still comes back without proposals
    const back = await importCopy(p, "main", out.bytes, { fileName: "svg.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden")).toHaveLength(0);
    // a rasterizer that fails: a warning that says why
    const failed = await exportDocx(p, "main", "journal", { ...res, rasterize: async () => { throw new Error("broken"); } });
    expect(failed.warnings.join(" ")).toContain("the SVG cannot be drawn (broken)");
  });

  const bin = scideskPdfBinary();
  it.skipIf(!bin)("draws the SVG with the scidesk-pdf binary (record 0068)", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#0b6477"/></svg>');
    const r = await nodeRasterizer(bin!)(svg);
    expect([r.width, r.height]).toEqual([200, 100]);
    expect(imageSize(r.png)).toEqual({ type: "png", width: 400, height: 200 });
    await expect(nodeRasterizer(bin!)(new TextEncoder().encode("not an image"))).rejects.toThrow();
  });
});
