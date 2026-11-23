// The "new article" wizard's plan and what it writes (record 0048).
import { describe, expect, it } from "vitest";
import type { JournalProfileFile, PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { addArticle, articleFolder, createProject, loadProject } from "../src/project.ts";
import { articlePlan, folderName, journalSummary, journalTranslations, searchJournals } from "../src/new-article.ts";
import { readAsset } from "../src/node-fs.ts";
import { checkArticle } from "../src/checks.ts";
import { composeArticle } from "../src/compose.ts";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";

const rc = async () => JSON.parse(await readAsset("journals/reumatologia-clinica.json")) as JournalProfileFile;
const text = (n: PMNode): string => (n.type === "text" ? n.text ?? "" : (n.content ?? []).map(text).join(""));

describe("new article plan", () => {
  it("an original without journal: IMRaD and a structured abstract with keywords", () => {
    const p = articlePlan({ title: "T", lang: "es", articleType: "original" });
    expect(p.sections.map((s) => s.label)).toEqual(["Introducción", "Métodos", "Resultados", "Discusión", "Bibliografía"]);
    expect(p.abstracts).toHaveLength(1);
    expect(p.abstracts[0].sections!.map((s) => s.label)).toEqual(["Objetivo", "Métodos", "Resultados", "Conclusiones"]);
    expect(p.titles).toEqual([{ lang: "es", text: "T" }]);
  });

  it("takes the journal's abstract headings, and the other language's from SciDesk", async () => {
    const p = articlePlan({ title: "T", lang: "es", translations: ["en"], articleType: "original", journal: await rc() });
    expect(p.titles.map((t) => t.lang)).toEqual(["es", "en"]);
    expect(p.abstracts[0].sections!.map((s) => s.label)).toEqual(["Antecedentes y objetivo", "Pacientes o Materiales y métodos", "Resultados", "Discusión y Conclusiones"]);
    expect(p.abstracts[1].sections!.map((s) => s.label)).toEqual(["Background and objective", "Patients and methods", "Results", "Discussion and conclusions"]);
  });

  it("a case report takes the journal's fixed sections and an unstructured abstract", async () => {
    const p = articlePlan({ title: "T", lang: "es", articleType: "case-report", journal: await rc() });
    expect(p.sections.map((s) => s.role)).toEqual(["introduction", "case-presentation", "discussion", "conclusions", "ai-use", "references"]);
    // record 0072: the AI declaration the journal requires before the references
    expect(p.sections.find((s) => s.role === "ai-use")!.label).toBe("Uso de inteligencia artificial");
    expect(p.abstracts[0].sections).toBeNull();
  });

  it("a letter has no abstract and opens as the journal asks", async () => {
    const p = articlePlan({ title: "T", lang: "es", articleType: "letter", journal: await rc() });
    expect(p.abstracts).toEqual([]);
    expect(p.opening).toBe("Señor editor");
    expect(p.sections.map((s) => s.role)).toEqual(["ai-use", "references"]);
  });
});

describe("journals", () => {
  it("are found without accents, and the profile says what it asks", async () => {
    expect(searchJournals("reuma").map((j) => j.id)).toEqual(["reumatologia-clinica"]);
    expect(searchJournals("CLINICA").map((j) => j.id)).toEqual(["reumatologia-clinica", "medicina-clinica"]);
    expect(searchJournals("").length).toBeGreaterThan(5);
    const s = journalSummary(await rc(), "original", "es");
    expect(s).toMatchObject({ typeName: "Original", structuredAbstract: true, blind: "double", separateTitlePage: true, checked: "2026-11-20", typeMissing: false });
    expect(s.limits).toMatchObject({ words: 3000, tables: 6, figures: 6, references: 30 });
    expect(journalSummary(await rc(), "systematic-review", "es").typeMissing).toBe(true);
    expect(journalTranslations(await rc(), "es")).toEqual(["en"]);
  });

  it("a folder name comes from the title", () => {
    expect(folderName("Remisión sostenida en la artritis reumatoide de inicio")).toBe("remision-sostenida-artritis-reumatoide");
    expect(folderName("¿?")).toBe("articulo");
  });
});

describe("createProject with the wizard's choices", () => {
  it("writes the journal's profile and style, titles and abstracts by language, and loads", async () => {
    const fs = new MemoryFs();
    const p = await createProject(fs, {
      name: "Remisión", fileName: "remision", title: "Remisión sostenida", lang: "es", translations: ["en"], articleType: "original",
      journal: await rc(), readStyle: (f) => readAsset(`styles/${f}`),
    });
    const art = p.articles[0];
    expect(art.article).toMatchObject({ articleType: "original", lang: "es", translations: ["en"], journal: "reumatologia-clinica" });
    expect(art.article.citationStyle.id).toMatch(/reumatologia-clinica-scidesk-prototype$/);
    expect(await fs.readText("resources/journals/styles/reumatologia-clinica-2026.csl")).toMatch(/<style/);
    const body = art.documents.get("manuscript/article.scidoc")!.doc as PMNode;
    expect(body.content!.filter((n) => n.type === "title").map((n) => n.attrs!.lang)).toEqual(["es", "en"]);
    const abstract = art.documents.get("manuscript/abstract.scidoc")!.doc as PMNode;
    expect(abstract.content!.map((n) => n.attrs!.lang)).toEqual(["es", "en"]);
    expect(abstract.content![0].content!.at(-1)!.type).toBe("keywords");
    // the journal's limits apply at once
    expect(checkArticle(p, "main").limits.words).toBe(3000);
    expect(composeArticle(art).doc.content!.some((n) => n.type === "abstractPart")).toBe(true);
    // and it exports with the journal's own style
    const r = await exportDocx(p, "main", "journal", await nodeResources());
    expect(r.bytes.length).toBeGreaterThan(1000);
  });

  it("a letter without abstract is a valid project, and its composite has no abstract", async () => {
    const fs = new MemoryFs();
    const p = await createProject(fs, { name: "Carta", fileName: "carta", title: "Respuesta", articleType: "letter", journal: await rc(), readStyle: (f) => readAsset(`styles/${f}`) });
    const art = (await loadProject(fs)).articles[0];
    expect((art.documents.get("manuscript/abstract.scidoc")!.doc as PMNode).content).toEqual([]);
    expect(composeArticle(art).doc.content!.some((n) => n.type === "abstractPart")).toBe(false);
    expect(text((art.documents.get("manuscript/article.scidoc")!.doc as PMNode).content![1])).toBe("Señor editor:");
    expect(p.articles[0].article.citationStyle.id).toMatch(/reumatologia/);
  });

  it("a journal with only a style: no profile, its style", async () => {
    const p = await createProject(new MemoryFs(), { name: "X", fileName: "x", title: "X", citationStyle: "http://www.zotero.org/styles/the-lancet" });
    expect(p.articles[0].article).toMatchObject({ journal: null, citationStyle: { id: "http://www.zotero.org/styles/the-lancet" } });
  });
});

describe("a new article in an open project (record 0051)", () => {
  it("gets a free folder from its title, the journal's profile and style, and shares the library", async () => {
    const fs = new MemoryFs();
    let p = await createProject(fs, { name: "Estudio", fileName: "estudio", title: "Remisión sostenida" });
    expect(await articleFolder(p, "Main")).toBe("main-2");
    const folder = await articleFolder(p, "Protocolo del estudio");
    expect(folder).toBe("protocolo-estudio");
    p = await addArticle(p, { folder, title: "Protocolo del estudio", articleType: "narrative-review", journal: await rc(), readStyle: (f) => readAsset(`styles/${f}`) });
    expect(p.manifest.articles.map((a) => a.folder)).toEqual(["main", "protocolo-estudio"]);
    expect(p.journals.has("reumatologia-clinica")).toBe(true);
    expect(await fs.readText("resources/journals/styles/reumatologia-clinica-2026.csl")).toMatch(/<style/);
    expect(p.articles[1].article).toMatchObject({ articleType: "narrative-review", journal: "reumatologia-clinica" });
    expect(await articleFolder(p, "Protocolo del estudio")).toBe("protocolo-estudio-2");
    // a profile the project already has is kept as it is
    const edited = (await fs.readText("resources/journals/reumatologia-clinica.json"))!.replace("Reumatología Clínica", "Reumatología Clínica (editado)");
    await fs.write("resources/journals/reumatologia-clinica.json", edited);
    p = await addArticle(await loadProject(fs), { folder: "carta", title: "Carta", articleType: "letter", journal: await rc(), readStyle: (f) => readAsset(`styles/${f}`) });
    expect(await fs.readText("resources/journals/reumatologia-clinica.json")).toContain("(editado)");
    await expect(addArticle(p, { folder: "CARTA", title: "x" })).rejects.toThrow(/already/);
  });
});
