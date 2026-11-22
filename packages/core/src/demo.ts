// The vertical slice's demo project (PLAN 8, R42): two paragraphs with citations and two
// references, all synthetic; optionally a second article, a letter in English. Used by
// 'scidesk demo', the tests and the app's preview.
import { newId, type PMNode } from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { addArticle, createProject, loadProject, saveDocument, saveJson, type Project } from "./project.ts";
import { addTablePart } from "./paste-table.ts";
import { addFigure } from "./outline.ts";

/**
 * With `letter`, the project has a second article: a short letter in English (record 0044).
 * With `parts`, the main article also has an abstract with keywords, a table with notes and
 * a figure, to try the composite document in the window (record 0021).
 */
export async function createDemoProject(fs: ProjectFs, fileName = "corte-vertical", opts: { letter?: boolean; parts?: boolean } = {}) {
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
  if (opts.parts) await addDemoParts(await loadProject(fs));
  if (!opts.letter) return loadProject(fs);

  // a second manuscript in the same project (record 0015): a letter in English, with the
  // same library, to try two articles open in the window (record 0044)
  const q = await addArticle(await loadProject(fs), { folder: "letter", title: "Early disease activity in rheumatoid arthritis: a reply (synthetic data)", lang: "en", articleType: "letter" });
  const letter = q.articles.find((a) => a.folder === "letter")!;
  const lf = structuredClone(letter.documents.get("manuscript/article.scidoc")!);
  const body = (lf.doc as PMNode).content!;
  body[1] = { type: "paragraph", attrs: { id: newId("b"), lang: null }, content: [
    { type: "text", text: "We read with interest the cohort on early rheumatoid arthritis" },
    { type: "citation", attrs: { id: newId("c"), items: [{ ref: r1 }] } },
    { type: "text", text: ". A trial with a different design found a smaller effect" },
    { type: "citation", attrs: { id: newId("c"), items: [{ ref: r2 }] } },
    { type: "text", text: ", and the two results should be read together." },
  ] };
  await saveDocument(q, letter, "manuscript/article.scidoc", lf as never);
  return loadProject(fs);
}

const txt = (text: string): PMNode[] => [{ type: "text", text }];
const para = (text: string): PMNode => ({ type: "paragraph", attrs: { id: newId("b"), lang: null }, content: txt(text) });

/** A line chart drawn by hand: the figure of the demo (synthetic). */
const DEMO_SVG = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 260" font-family="Arial" font-size="12">`,
  `<rect width="480" height="260" fill="#fff"/>`,
  `<g stroke="#ddd">${[20, 60, 100, 140, 180].map((y) => `<path d="M60 ${y}h400"/>`).join("")}</g>`,
  `<path d="M60 20v200h400" fill="none" stroke="#333"/>`,
  `<polyline points="80,48 190,110 300,142 430,158" fill="none" stroke="#0B6477" stroke-width="2.5"/>`,
  ...[[80, 48], [190, 110], [300, 142], [430, 158]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#0B6477"/>`),
  `<g text-anchor="middle">${[["0", 80], ["3", 190], ["6", 300], ["12", 430]].map(([t, x]) => `<text x="${x}" y="238">${t}</text>`).join("")}<text x="260" y="256">Meses desde el diagnóstico</text></g>`,
  `<g text-anchor="end">${[6, 5, 4, 3, 2, 1].map((v, i) => `<text x="52" y="${24 + i * 40}">${v}</text>`).join("")}</g>`,
  `<text x="14" y="120" transform="rotate(-90 14 120)" text-anchor="middle">DAS28-VSG</text>`,
  `</svg>`,
].join("\n");

/** The parts of the demo: abstract with keywords, a table with a specific and a general note, a figure. */
async function addDemoParts(p: Project) {
  const art = p.articles[0];
  const abstract = structuredClone(art.documents.get("manuscript/abstract.scidoc")!);
  (abstract.doc as PMNode).content = [{ type: "abstractSection", attrs: { id: newId("b"), lang: "es" }, content: [
    para("Objetivo: describir la evolución de la actividad inflamatoria durante el primer año de tratamiento en una cohorte de artritis reumatoide de inicio."),
    para("Métodos: cohorte ficticia de 120 pacientes con medidas del DAS28-VSG a los 0, 3, 6 y 12 meses."),
    para("Resultados: la mediana del DAS28-VSG bajó de 5,1 a 2,6 al año; la mayor parte del descenso ocurrió en los tres primeros meses."),
    { type: "keywords", attrs: { id: newId("b") }, content: ["Artritis reumatoide", "Actividad de la enfermedad", "DAS28"].map((k) => ({ type: "keyword", content: txt(k) })) },
  ] }];
  await saveDocument(p, art, "manuscript/abstract.scidoc", abstract);

  const median = newId("n");
  const cell = (type: "tableHeader" | "tableCell", content: PMNode[], align: string | null = null): PMNode => ({ type, attrs: { colspan: 1, rowspan: 1, align }, content: [{ type: "paragraph", attrs: { id: newId("b"), lang: null }, content }] });
  const row = (...cells: PMNode[]): PMNode => ({ type: "tableRow", content: cells });
  const call: PMNode = { type: "noteRef", attrs: { target: median } };
  const part: PMNode = { type: "tablePart", attrs: { id: newId("t") }, content: [
    { type: "tableCaption", attrs: { id: newId("b"), lang: null }, content: txt("Características basales de los pacientes (datos sintéticos)") },
    { type: "table", attrs: { id: newId("b"), columnWidths: [60, 40] }, content: [
      row(cell("tableHeader", txt("Variable")), cell("tableHeader", txt("Total (n = 120)"), "center")),
      row(cell("tableCell", txt("Edad, años")), cell("tableCell", [...txt("54 (45–63)"), call], "center")),
      row(cell("tableCell", txt("Mujeres, n (%)")), cell("tableCell", txt("86 (71,7)"), "center")),
      row(cell("tableCell", txt("DAS28-VSG")), cell("tableCell", [...txt("5,1 (4,3–5,8)"), call], "center")),
    ] },
    { type: "tableNote", attrs: { id: median, kind: "specific", lang: null }, content: txt("Mediana (rango intercuartílico).") },
    { type: "tableNote", attrs: { id: newId("n"), kind: "general", lang: null }, content: txt("DAS28-VSG: índice de actividad en 28 articulaciones con la velocidad de sedimentación globular.") },
  ] };
  const table = await addTablePart(p, art.folder, part);
  const figure = await addFigure(p, art.folder, { name: "evolucion.svg", bytes: new TextEncoder().encode(DEMO_SVG) });
  const fig = structuredClone(art.documents.get(figure.path)!);
  const fp = fig.doc as PMNode;
  fp.attrs = { ...fp.attrs, alt: "Gráfico de líneas: la mediana del DAS28-VSG baja de 5,1 al inicio a 2,6 a los 12 meses, sobre todo en los tres primeros." };
  fp.content![0].content = txt("Evolución de la mediana del DAS28-VSG durante el primer año (datos sintéticos)");
  await saveDocument(p, art, figure.path, fig);

  const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
  const content = (body.doc as PMNode).content!;
  const results = content.findIndex((n) => n.attrs?.role === "results");
  content.splice(results + 1, 1,
    { type: "paragraph", attrs: { id: newId("b"), lang: null }, content: [
      ...txt("Las características basales se recogen en la tabla "), { type: "xref", attrs: { target: table.ref.attrs!.id as string } },
      ...txt(", y la evolución de la actividad, en la figura "), { type: "xref", attrs: { target: figure.ref.attrs!.id as string } }, ...txt("."),
    ] },
    table.ref, figure.ref);
  await saveDocument(p, art, "manuscript/article.scidoc", body);
}
