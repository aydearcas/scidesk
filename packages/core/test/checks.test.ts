// Checks before submission: limits, word counts, pending markers, uncited elements and
// ignored warnings (record 0041).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject, saveDocument, saveJson } from "../src/project.ts";
import { checkArticle, countWords, ignoreWarning, pendingMarkers, readiness, restoreWarning, setCountTableWords } from "../src/checks.ts";
import { exportDocx } from "../src/docx-export.ts";
import { addReference } from "../src/library.ts";
import { nodeResources, readAsset } from "../src/node-fs.ts";

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
    expect(r.warnings.map((w) => [w.level, w.id, w.params.value, w.params.limit])).toEqual([["blocking", "references-limit", 37, 30], ["blocking", "missing-declaration:ai-use", undefined, undefined]]);
    // stricter limits: every one of them shows
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    const original = prof.articleTypes.find((t) => t.articleType === "original")!;
    original.limits = { ...original.limits, words: { value: 2000, source: "guide" }, abstractWords: { value: 150, source: "guide" }, tables: { value: 1, source: "guide" }, titleCharacters: { value: 100, source: "guide" }, keywords: { value: 5, source: "guide" } };
    p.journals.set("reumatologia-clinica", prof);
    expect(ids(checkArticle(p, "main")).sort()).toEqual(["abstract-word-limit:es", "keywords-limit:es", "missing-declaration:ai-use", "references-limit", "tables-limit", "title-characters", "word-limit"]);
  });

  it("says when the journal has no limits for the article type", async () => {
    const { p } = await kneeOa("narrative-review");
    expect(checkArticle(p, "main").warnings.map((w) => [w.level, w.code])).toEqual([["blocking", "missing-declaration"], ["info", "no-limits"]]);
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
    // record 0085: several at once, in one write
    const other = await addReference(demo, { type: "book", title: "Otro sin citar", author: [{ family: "Tampoco" }] });
    const ids = checkArticle(demo, "main").warnings.filter((x) => x.code === "uncited-reference").map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining([`uncited-reference:${added.id}`, `uncited-reference:${other.id}`]));
    await ignoreWarning(demo, "main", ids, "not-applicable", "Para la discusión");
    const again = checkArticle(await loadProject(fs), "main").warnings.filter((x) => x.code === "uncited-reference");
    expect(again.every((x) => x.ignored?.status === "not-applicable" && x.ignored.note === "Para la discusión")).toBe(true);
  });

  it("says when an article is ready to submit, and what stands in the way", async () => {
    const { p } = await kneeOa();
    // too many references for the journal: blocked
    expect(readiness(checkArticle(p, "main"))).toMatchObject({ ready: false, missing: ["blocking"], blocking: 2, pending: 0 });
    // marked as correct, they no longer stop it (the AI declaration: as if it went elsewhere)
    await ignoreWarning(p, "main", "references-limit", "correct");
    await ignoreWarning(p, "main", "missing-declaration:ai-use", "not-applicable");
    expect(readiness(checkArticle(await loadProject(p.fs), "main"))).toEqual({ ready: true, missing: [], blocking: 0, pending: 0 });
    // a pending marker left in the text stops it again
    const q = await loadProject(p.fs);
    const body = structuredClone(q.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode);
    body.content!.push(para("b-pendingxx1", "Faltan los datos de 2025 XX."));
    expect(readiness(checkArticle(q, "main", { "manuscript/article.scidoc": body }))).toMatchObject({ ready: false, missing: ["pending"], pending: 1 });
    // without limits for its type (no journal profile for it), it cannot be said to be ready
    const { p: review } = await kneeOa("narrative-review");
    expect(readiness(checkArticle(review, "main")).missing).toContain("no-journal");
    // a new article: no text, an empty abstract without keywords, nobody signs
    const { createProject } = await import("../src/project.ts");
    const fresh = await createProject(new MemoryFs(), { name: "N", fileName: "n", title: "Nuevo", articleType: "original", journal: p.journals.get("reumatologia-clinica")!, readStyle: (f) => readAsset(`styles/${f}`) });
    expect(readiness(checkArticle(fresh, "main")).missing).toEqual(["empty", "abstract", "keywords", "authors"]);
  });

  it("asks for the declarations Reumatología Clínica requires, and not the conditional ones (record 0086)", async () => {
    const { createProject } = await import("../src/project.ts");
    const journal = JSON.parse(await readAsset("journals/reumatologia-clinica.json"));
    const p = await createProject(new MemoryFs(), { name: "N", fileName: "n", title: "Nuevo", articleType: "original", journal, readStyle: (f) => readAsset(`styles/${f}`) });
    const body = structuredClone(p.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode);
    const titles = (body.content ?? []).filter((n) => n.type === "heading").map((n) => (n.content ?? []).map((c) => c.text).join(""));
    // funding in the manuscript, before the references; no AI section (only when AI was used)
    expect(titles.slice(-2)).toEqual(["Financiación", "Bibliografía"]);
    const declarations = (doc?: PMNode) => checkArticle(p, "main", doc ? { "manuscript/article.scidoc": doc } : undefined).warnings.filter((w) => w.code === "missing-declaration").map((w) => w.id);
    expect(declarations()).toEqual([]);
    // without it, the article cannot be sent
    body.content = body.content!.filter((n) => !(n.type === "heading" && (n.content ?? []).some((c) => c.text === "Financiación")));
    expect(declarations(body)).toEqual(["missing-declaration:funding"]);
  });

  it("counts the tables' words when the journal or the article says so (record 0056)", async () => {
    const { fs, p } = await kneeOa();
    const base = checkArticle(p, "main").counts;
    // by default they do not count, and the report says how many there are
    expect(base).toMatchObject({ tableWordsCounted: false, tableWordsBy: "default" });
    expect(base.tableWords).toBeGreaterThan(20);
    const sum = (c: typeof base) => c.sections.filter((s) => s.counted).reduce((a, s) => a + s.words, 0);
    expect(sum(base)).toBe(base.main);
    // the journal's profile says they count
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    prof.articleTypes.find((t) => t.articleType === "original")!.limits.wordsIncludeTables = { value: true, source: "guide" };
    p.journals.set("reumatologia-clinica", prof);
    const withTables = checkArticle(p, "main").counts;
    expect(withTables).toMatchObject({ tableWordsCounted: true, tableWordsBy: "journal", main: base.main + base.tableWords });
    expect(sum(withTables)).toBe(withTables.main);
    // the article says otherwise, and it is kept in article.json; null follows the journal again
    await setCountTableWords(p, "main", false);
    expect(checkArticle(p, "main").counts).toMatchObject({ tableWordsCounted: false, tableWordsBy: "article", main: base.main });
    expect((await loadProject(fs)).articles[0].article.countTableWords).toBe(false);
    await setCountTableWords(p, "main", null);
    expect((await loadProject(fs)).articles[0].article).not.toHaveProperty("countTableWords");
    expect(checkArticle(p, "main").counts.tableWordsBy).toBe("journal");
  });

  it("warns of a declaration the journal requires and of the sections it fixes, and they go once added (record 0072)", async () => {
    const { p } = await kneeOa("case-report");
    const art = p.articles[0];
    const ids0 = checkArticle(p, "main").warnings.map((w) => w.id);
    expect(ids0).toContain("missing-declaration:ai-use");
    expect(ids0).toContain("missing-section:case-presentation");
    // the example's own sections (Epidemiología, Fisiopatología…) are not among a case report's
    const extra = checkArticle(p, "main").warnings.filter((w) => w.code === "extra-section").map((w) => w.params.heading);
    expect(extra.length).toBeGreaterThan(0);
    // a heading typed by hand, without a type of its own, is enough: its name says what it is
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!.doc as PMNode);
    const refs = body.content!.findIndex((n) => n.type === "heading" && n.attrs!.role === "references");
    body.content!.splice(refs, 0, { type: "heading", attrs: { id: "b-aiuse00001", level: 1, role: null, lang: null }, content: [{ type: "text", text: "Uso de inteligencia artificial" }] });
    expect(checkArticle(p, "main", { "manuscript/article.scidoc": body }).warnings.map((w) => w.id)).not.toContain("missing-declaration:ai-use");
    // the fixed sections in another order
    const intro = body.content!.findIndex((n) => n.type === "heading" && n.attrs!.role === "introduction");
    const disc = body.content!.findIndex((n) => n.type === "heading" && n.attrs!.role === "conclusions");
    expect(intro).toBeGreaterThan(-1);
    expect(disc).toBeGreaterThan(intro);
    const swapped = structuredClone(body);
    const [d] = swapped.content!.splice(disc, 1);
    swapped.content!.splice(intro, 0, d);
    expect(checkArticle(p, "main", { "manuscript/article.scidoc": swapped }).warnings.map((w) => w.code)).toContain("section-order");
    expect(checkArticle(p, "main", { "manuscript/article.scidoc": body }).warnings.map((w) => w.code)).not.toContain("section-order");
  });
});
