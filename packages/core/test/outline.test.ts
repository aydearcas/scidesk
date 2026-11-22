// The concept navigator's outline, and adding an empty table or a figure (record 0044).
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject } from "../src/project.ts";
import { addEmptyTable, addFigure, articleOutline } from "../src/outline.ts";
import { checkArticle } from "../src/checks.ts";

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

describe("article outline", () => {
  it("numbers tables and figures as the export, with caption, notes and whether they are cited", async () => {
    const fs = new MemoryFs();
    let p = await createDemoProject(fs);
    const t1 = await addEmptyTable(p, "main", 3, 2);
    const t2 = await addEmptyTable(p, "main");
    const f1 = await addFigure(p, "main", { name: "Curva.PNG", bytes: PNG });
    expect(t1.path).toBe("tables/tabla-1.scitable");
    expect(t2.path).toBe("tables/tabla-2.scitable");
    expect(f1.path).toBe("figures/figura-1.scifigure");
    expect(await fs.readBytes("articles/main/figures/figura-1.png")).toEqual(PNG);
    const body = structuredClone(p.articles[0].documents.get("manuscript/article.scidoc")!.doc) as PMNode;
    // table 2 is cited first, so it comes out as table 1; table 1 is never cited
    body.content!.push(
      { type: "paragraph", attrs: { id: "b-outline01", lang: null }, content: [{ type: "text", text: "Véase la tabla " }, { type: "xref", attrs: { target: t2.ref.attrs!.id } }] },
      t1.ref, t2.ref, f1.ref,
    );
    const o = articleOutline(p, "main", { "manuscript/article.scidoc": body });
    expect(o.title?.text).toMatch(/^Actividad inflamatoria/);
    expect(o.tables.map((t) => [t.src, t.number, t.cited])).toEqual([["tables/tabla-2.scitable", 1, true], ["tables/tabla-1.scitable", 2, false]]);
    expect(o.figures).toEqual([{ id: f1.ref.attrs!.id, src: "figures/figura-1.scifigure", number: 1, caption: "", cited: false, notes: 0, image: "figures/figura-1.png" }]);
    expect(o.abstract.map((a) => a.lang)).toEqual(["es"]);
    // the same numbers as the checks
    const r = checkArticle(p, "main", { "manuscript/article.scidoc": body });
    expect(r.warnings.filter((w) => w.code === "uncited-table").map((w) => w.params.number)).toEqual([2]);
    // the new files are valid: the project loads again
    p = await loadProject(fs);
    expect([...p.articles[0].documents.keys()].sort()).toContain("figures/figura-1.scifigure");
  });

  it("refuses an image it cannot export and takes the next free number", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    await expect(addFigure(p, "main", { name: "graph.bmp", bytes: PNG })).rejects.toThrow(/PNG, JPEG/);
    await fs.write("articles/main/figures/figura-1.jpg", PNG);
    expect((await addFigure(p, "main", { name: "a.jpg", bytes: PNG })).path).toBe("figures/figura-2.scifigure");
  });
});

describe("a second article", () => {
  it("is added with the project's library in common, and is checked and exported on its own", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs, "demo", { letter: true });
    expect(p.manifest.articles.map((a) => a.folder)).toEqual(["main", "letter"]);
    const letter = p.articles.find((a) => a.folder === "letter")!;
    expect(letter.article).toMatchObject({ articleType: "letter", lang: "en" });
    expect(articleOutline(p, "letter").title?.text).toMatch(/^Early disease activity/);
    // both references cited in the letter; the main article is unchanged
    expect(checkArticle(p, "letter").counts.references).toBe(2);
    expect(checkArticle(p, "main").counts.sections.map((s) => s.heading)).toContain("Introducción");
    const { exportDocx } = await import("../src/docx-export.ts");
    const { nodeResources } = await import("../src/node-fs.ts");
    const r = await exportDocx(p, "letter", "coauthors", await nodeResources());
    expect(r.path).toMatch(/^articles\/letter\/exports\//);
    // the folder cannot be used twice
    const { addArticle } = await import("../src/project.ts");
    await expect(addArticle(p, { folder: "letter", title: "x" })).rejects.toThrow(/already/);
  });
});
