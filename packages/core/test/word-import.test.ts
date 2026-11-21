// "New article from a Word document" with the synthetic Word of the corpus (made with
// Word, Spanish style ids) and with a DOCX that SciDesk exports (abstract in two languages,
// a figure).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { projectFromWord } from "../src/word-import.ts";
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

  it("refuses a folder that is not empty", async () => {
    const fs = new MemoryFs({ "x.txt": "hola" });
    await expect(projectFromWord(fs, new Uint8Array(readFileSync(SENT)), { fileName: "sent.docx" })).rejects.toThrow(/not empty/);
  });
});
