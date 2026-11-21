// Checks before submission: limits, word counts, pending markers, uncited elements and
// ignored warnings (record 0041).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject, saveDocument, saveJson } from "../src/project.ts";
import { checkArticle, countWords, ignoreWarning, pendingMarkers, restoreWarning } from "../src/checks.ts";
import { exportDocx } from "../src/docx-export.ts";
import { addReference } from "../src/library.ts";
import { nodeResources } from "../src/node-fs.ts";

const EXAMPLE = fileURLToPath(new URL("../../formats/examples/knee-oa/", import.meta.url));
async function kneeOa(articleType = "original") {
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
  const p = await loadProject(fs);
  await saveJson(p, "articles/main/article.json", { ...p.articles[0].article, articleType });
  return { fs, p: await loadProject(fs) };
}
const ids = (r: ReturnType<typeof checkArticle>, all = false) => r.warnings.filter((w) => all || !w.ignored).map((w) => w.id);
const para = (id: string, text: string): PMNode => ({ type: "paragraph", attrs: { id, lang: null }, content: [{ type: "text", text }] });

describe("checks", () => {
  it("counts words as Word does and finds pending markers", () => {
    expect(countWords("La artritis afecta al 0,5–1 % de la población (n = 12).")).toBe(10); // "%" and "=" alone are not words
    expect(countWords("  ")).toBe(0);
    expect(pendingMarkers("Ver XX y ?? en [REF] o [ref], TODO y comprobar y COMPROBAR, xx, Xavier, XXL").map((m) => m.marker))
      .toEqual(["XX", "??", "[REF]", "[ref]", "TODO", "COMPROBAR"]);
  });

  it("checks the example against Reumatología Clínica's limits for an original", async () => {
    const { p } = await kneeOa();
    const r = checkArticle(p, "main");
    expect(r.limits).toMatchObject({ words: 3000, references: 30, tables: 6, figures: 6, keywords: 6, authorsAdvised: 6 });
    expect(r.counts).toMatchObject({ references: 37, tables: 2, figures: 1, authors: 6, keywords: [{ lang: "es", count: 6 }, { lang: "en", count: 3 }] });
    // the references section is shown but not counted; the rest add up to the text's words
    const refs = r.counts.sections.find((s) => s.role === "references")!;
    expect(refs.counted).toBe(false);
    expect(r.counts.main).toBe(r.counts.sections.filter((s) => s.counted).reduce((a, s) => a + s.words, 0));
    expect(r.counts.main).toBeGreaterThan(2000);
    expect(r.warnings.map((w) => [w.level, w.id, w.params.value, w.params.limit])).toEqual([["blocking", "references-limit", 37, 30]]);
    // stricter limits: every one of them shows
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    const original = prof.articleTypes.find((t) => t.articleType === "original")!;
    original.limits = { ...original.limits, words: { value: 2000, source: "guide" }, abstractWords: { value: 150, source: "guide" }, tables: { value: 1, source: "guide" }, titleCharacters: { value: 100, source: "guide" }, keywords: { value: 5, source: "guide" } };
    p.journals.set("reumatologia-clinica", prof);
    expect(ids(checkArticle(p, "main")).sort()).toEqual(["abstract-word-limit:es", "keywords-limit:es", "references-limit", "tables-limit", "title-characters", "word-limit"]);
  });

  it("says when the journal has no limits for the article type", async () => {
    const { p } = await kneeOa("narrative-review");
    expect(checkArticle(p, "main").warnings.map((w) => [w.level, w.code])).toEqual([["info", "no-limits"]]);
  });

  it("finds pending markers everywhere, with ids that survive edits elsewhere; ignoring and restoring them", async () => {
    const { fs, p } = await kneeOa();
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, para("b-pending001", "La prevalencia fue del XX % [REF] y XX en varones."));
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const table = structuredClone(art.documents.get("tables/tabla-1.scitable")!);
    const cell = (table.doc as PMNode).content![1].content![2].content![1].content![0];
    cell.content = [{ type: "text", text: "??" }];
    await saveDocument(p, art, "tables/tabla-1.scitable", table);
    const r1 = checkArticle(p, "main");
    const pending = r1.warnings.filter((w) => w.code === "pending");
    expect(pending.map((w) => w.id)).toEqual([
      "pending:manuscript/article.scidoc:b-pending001:XX:0", "pending:manuscript/article.scidoc:b-pending001:[REF]:0", "pending:manuscript/article.scidoc:b-pending001:XX:1",
      `pending:tables/tabla-1.scitable:${cell.attrs!.id}:??:0`,
    ]);
    expect(pending[0]).toMatchObject({ level: "review", params: { marker: "XX" }, where: { path: "manuscript/article.scidoc", block: "b-pending001" } });
    // on screen, another paragraph is added: the ids stay
    const live = structuredClone(body.doc as PMNode);
    live.content!.unshift(para("b-newpara001", "Un párrafo nuevo al principio."));
    expect(ids(checkArticle(p, "main", { "manuscript/article.scidoc": live })).filter((i) => i.startsWith("pending"))).toEqual(pending.map((w) => w.id));
    // the journal's DOCX says that pending markers are left
    expect((await exportDocx(p, "main", "journal", await nodeResources())).warnings.join(" ")).toMatch(/4 pending marker/);
    // marked correct: saved, still listed as ignored; restored: back
    await ignoreWarning(p, "main", pending[3].id, "correct", "Es un dato que falta de verdad en la fuente");
    const reloaded = await loadProject(fs);
    const r2 = checkArticle(reloaded, "main");
    expect(ids(r2)).not.toContain(pending[3].id);
    expect(r2.warnings.find((w) => w.id === pending[3].id)?.ignored).toMatchObject({ status: "correct", note: "Es un dato que falta de verdad en la fuente" });
    expect(r2.warnings.at(-1)!.id).toBe(pending[3].id); // ignored ones go last
    await restoreWarning(reloaded, "main", pending[3].id);
    expect(ids(checkArticle(reloaded, "main"))).toContain(pending[3].id);
  });

  it("finds tables, figures and references that are never cited", async () => {
    const { p } = await kneeOa();
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    // drop every cross-reference to tables
    const strip = (n: PMNode): PMNode => ({ ...n, ...(n.content ? { content: n.content.filter((c) => !(c.type === "xref" && String(c.attrs!.target).startsWith("t-"))).map(strip) } : {}) });
    const r = checkArticle(p, "main", { "manuscript/article.scidoc": strip(body.doc as PMNode) });
    expect(r.warnings.filter((w) => w.code === "uncited-table").map((w) => [w.level, w.params.number])).toEqual([["review", 1], ["review", 2]]);
    expect(r.warnings.filter((w) => w.code === "uncited-figure")).toEqual([]);
    // a reference in the library that nobody cites: information only
    const fs = new MemoryFs();
    const demo = await createDemoProject(fs);
    const added = await addReference(demo, { type: "book", title: "Libro que no se cita", author: [{ family: "Nadie" }] });
    const w = checkArticle(demo, "main").warnings.find((x) => x.code === "uncited-reference")!;
    expect(w).toMatchObject({ id: `uncited-reference:${added.id}`, level: "info", params: { reference: "Nadie" } });
  });
});
