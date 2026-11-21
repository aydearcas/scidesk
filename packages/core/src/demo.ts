// The vertical slice's demo project (PLAN 8, R42): two paragraphs with citations and two
// references, all synthetic. Used by 'scidesk demo', the tests and the app's preview.
import { newId, type PMNode } from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { createProject, loadProject, saveDocument, saveJson } from "./project.ts";

export async function createDemoProject(fs: ProjectFs, fileName = "corte-vertical") {
  const p = await createProject(fs, { name: "Corte vertical", fileName, title: "Actividad inflamatoria en la artritis reumatoide de inicio (datos sintéticos)" });
  const r1 = newId("r"), r2 = newId("r");
  const library = { schemaVersion: 1 as const, references: [
    { id: r1, added: p.manifest.created, source: { kind: "manual" as const, date: p.manifest.created }, csl: { type: "article-journal" as const, title: "Una cohorte ficticia de artritis reumatoide de inicio", author: [{ family: "Alonso", given: "M" }, { family: "Benítez", given: "C" }], "container-title": "Reumatología Clínica", "container-title-short": "Reumatol Clin", issued: { "date-parts": [[2025]] }, volume: "21", issue: "3", page: "120-127" } },
    { id: r2, added: p.manifest.created, source: { kind: "manual" as const, date: p.manifest.created }, csl: { type: "article-journal" as const, title: "A made-up trial of an imaginary treatment", author: [{ family: "Castro", given: "R" }], "container-title": "Annals of the Rheumatic Diseases", "container-title-short": "Ann Rheum Dis", issued: { "date-parts": [[2024]] }, volume: "83", page: "412-420", DOI: "10.1136/ard-2023-000001" } },
  ] };
  await saveJson(p, "references/library.json", library);
  p.library = library as never;
  const art = p.articles[0];
  const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
  const content = (file.doc as PMNode).content!;
  const intro = content.findIndex((n) => n.attrs?.role === "introduction");
  content[intro + 1] = { type: "paragraph", attrs: { id: newId("b"), lang: null }, content: [
    { type: "text", text: "La artritis reumatoide afecta al 0,5–1 % de la población adulta y su actividad inflamatoria se mide con índices compuestos" },
    { type: "citation", attrs: { id: newId("c"), items: [{ ref: r1 }] } },
    { type: "text", text: "." },
  ] };
  content.splice(intro + 2, 0, { type: "paragraph", attrs: { id: newId("b"), lang: null }, content: [
    { type: "text", text: "El objetivo de este estudio fue describir la evolución de la actividad durante el primer año de tratamiento" },
    { type: "citation", attrs: { id: newId("c"), items: [{ ref: r1 }, { ref: r2, locator: "415", label: "page" }] } },
    { type: "text", text: "." },
  ] });
  await saveDocument(p, art, "manuscript/article.scidoc", file as never);
  return loadProject(fs);
}
