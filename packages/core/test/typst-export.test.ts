// The manuscript as Typst source and the PDF (record 0040). The PDF itself is compiled only
// when the scidesk-pdf binary is built (cargo build --bin scidesk-pdf).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject, saveDocument } from "../src/project.ts";
import { nodeResources, nodeTypstCompiler, scideskPdfBinary } from "../src/node-fs.ts";
import { exportPdf, fontList, manuscriptTypst, typstEscape } from "../src/typst-export.ts";

const res = await nodeResources();
const date = new Date(2026, 10, 21);
const EXAMPLE = fileURLToPath(new URL("../../formats/examples/knee-oa/", import.meta.url));
async function kneeOa() {
  const fs = new MemoryFs();
  const visit = (rel: string) => {
    for (const name of readdirSync(EXAMPLE + rel)) {
      const p = rel ? `${rel}/${name}` : name;
      if (p.includes("/rounds/")) continue;
      if (statSync(EXAMPLE + p).isDirectory()) visit(p);
      else fs.files.set(p, new Uint8Array(readFileSync(EXAMPLE + p)));
    }
  };
  visit("");
  return { fs, p: await loadProject(fs) };
}
const binary = scideskPdfBinary();

describe("typst export", () => {
  it("escapes everything with a meaning in Typst markup", () => {
    expect(typstEscape("#5 *a* _b_ [x] $1 <c> @d ~ `e` \"f\" a/b = + - \\")).toBe("\\#5 \\*a\\* \\_b\\_ \\[x\\] \\$1 \\<c\\> \\@d \\~ \\`e\\` \\\"f\\\" a\\/b \\= \\+ \\- \\\\");
    expect(fontList("Times New Roman").slice(0, 3)).toEqual(["Times New Roman", "Liberation Serif", "Tinos"]);
    expect(fontList()).toContain("Carlito");
  });

  it("writes the demo: title, citations of the style, bibliography, markers, no author", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    // a paragraph that would break Typst markup if it were not escaped, and one that starts like a list
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.push(
      { type: "paragraph", attrs: { id: "b-tricky0001", lang: null }, content: [{ type: "text", text: "Ver #5 y [nota] con *asteriscos*, a_b, 50 $ y <30 @x // no es un comentario" }] },
      { type: "paragraph", attrs: { id: "b-tricky0002", lang: null }, content: [{ type: "text", text: "2. No es una lista" }, { type: "text", text: " pero esto sí va en cursiva", marks: [{ type: "italic" }] }] },
    );
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const { source, files, warnings } = await manuscriptTypst(p, "main", res, { date });
    expect(warnings).toEqual([]);
    expect(files).toEqual({});
    expect(source).toContain('#set document(title: "Actividad inflamatoria en la artritis reumatoide de inicio (datos sintéticos)", author: (), date: datetime(year: 2026, month: 11, day: 21))');
    expect(source).toContain('lang: "es"');
    expect(source).toMatch(/compuestos#super\[1\];\./); // citeproc-js' superscript, as in the DOCX
    expect(source).toContain("Ver \\#5 y \\[nota\\] con \\*asteriscos\\*, a\\_b, 50 \\$ y \\<30 \\@x \\/\\/ no es un comentario");
    expect(source).toContain("<b-tricky0002>2\\. No es una lista#emph[ pero esto sí va en cursiva];");
    expect(source).toMatch(/#grid\(columns: \(auto, 1fr\)[\s\S]*\[1\.\], \[Alonso M, Benítez C/);
    expect(source).not.toContain("Alonso, María"); // no people in the metadata (blinded)
  });

  it("writes the example in the journal's format: tables with spans and notes, figures, cross-references", async () => {
    const { p } = await kneeOa();
    const { source, files, warnings } = await manuscriptTypst(p, "main", res, { date });
    expect(warnings).toEqual([]);
    // Reumatología Clínica: 12 pt, double spacing, numbered pages, margins of 2.5 cm, captions at the end
    expect(source).toContain('#set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm), numbering: "1")');
    expect(source).toContain("size: 12pt");
    expect(source).toContain("#set par(leading: 1.4em, spacing: 1.4em, justify: false)");
    expect(source).toContain("= Resumen");
    expect(source).toContain("= Abstract");
    expect(source).toContain("#strong[Palabras clave:]");
    expect(source.match(/#figure\(kind: table/g)).toHaveLength(2);
    expect(source).toContain("#strong[Tabla 1.]");
    expect(source).toContain("table(columns: (34fr, 20fr, 20fr, 26fr)");
    expect(source).toMatch(/table\.header\(table\.cell\(rowspan: 2\)\[#metadata\([^)]*\) <[^>]*>Característica\], table\.cell\(colspan: 2\)/);
    expect(source).toContain("Acelerada#super[a]");
    expect(source).toContain("#super[b] ");
    expect(source).toMatch(/más abajo \(tabla 1\)/);
    // figure captions in a list at the end; the images go to the journal as separate files (as with the DOCX)
    expect(source.indexOf("= Pies de figura")).toBeGreaterThan(source.indexOf("= Bibliografía"));
    expect(source).toContain("#strong[Figura 1.] ");
    expect(source).not.toContain("image(");
    expect(files).toEqual({});
    // with the figures in the text, the image goes in the bundle
    const inText = structuredClone(p.journals.get("reumatologia-clinica")!);
    delete inText.manuscriptFormat!.figureCaptionsList;
    p.journals.set("reumatologia-clinica", inText);
    const b2 = await manuscriptTypst(p, "main", res, { date });
    expect(b2.source).toMatch(/#figure\(image\("figures\/figura-1.png", width: [\d.]+pt, alt: "Gráfico de barras/);
    expect(Object.keys(b2.files)).toEqual(["figures/figura-1.png"]);
    // no author of the title page
    for (const person of p.people.people) if (person.kind === "person") expect(source).not.toContain(person.family);
  });

  it.skipIf(!binary)("compiles the example to a PDF with the same code as the app", async () => {
    const { fs, p } = await kneeOa();
    const r = await exportPdf(p, "main", res, nodeTypstCompiler(binary!), { date });
    expect(r.path).toBe("articles/main/exports/main-revista.pdf");
    expect(new TextDecoder().decode(r.bytes.slice(0, 5))).toBe("%PDF-");
    expect(r.pages).toBeGreaterThan(10);
    expect(fs.files.get(r.path)).toEqual(r.bytes);
    const ua = await exportPdf(p, "main", res, nodeTypstCompiler(binary!), { date, standard: "ua-1" });
    expect(ua.pages).toBe(r.pages);
  }, 60_000);
});

describe("formatted text followed by a bracket (record 0064)", () => {
  // "#strong[x](y)" takes "(y)" as more arguments: every command ends with ";"
  const para: PMNode = { type: "paragraph", attrs: { id: "b-bracket001", lang: null }, content: [
    { type: "text", text: "Con " }, { type: "text", text: "azatioprina", marks: [{ type: "bold" }] }, { type: "text", text: "(MD −0,06) y " },
    { type: "text", text: "metotrexato", marks: [{ type: "italic" }] }, { type: "text", text: "[sic]" }, { type: "hardBreak" }, { type: "text", text: "(otra línea)" },
  ] };
  const withPara = async () => {
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, para);
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    return p;
  };
  it("ends each command with a semicolon", async () => {
    const { source } = await manuscriptTypst(await withPara(), "main", res, { date });
    expect(source).toContain("Con #strong[azatioprina];(MD −0,06) y #emph[metotrexato];\\[sic\\]#linebreak();(otra línea)");
  });
  it.skipIf(!binary)("and Typst compiles it", async () => {
    const r = await exportPdf(await withPara(), "main", res, nodeTypstCompiler(binary!), { date });
    expect(r.pages).toBeGreaterThan(0);
  }, 60_000);
});

describe("the preview's source (record 0058)", () => {
  it("is written from what is on screen when `live` is given, and the saved article does not change", async () => {
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!.doc as PMNode);
    body.content!.push({ type: "paragraph", attrs: { id: "b-livetext01", lang: null }, content: [{ type: "text", text: "Texto sin guardar" }] });
    const live = await manuscriptTypst(p, "main", res, { date, live: { "manuscript/article.scidoc": body } });
    expect(live.source).toContain("Texto sin guardar");
    expect(live.source).toContain("<b-livetext01>");
    const saved = await manuscriptTypst(p, "main", res, { date });
    expect(saved.source).not.toContain("Texto sin guardar");
  });
});

