// Writes fixture-project/: a reduced SciDesk project with the body, the abstract and two
// tables in separate files, as PLAN.md section 4 lays them out.
// Run: node tools/make-fixture.mjs [rows]   (rows > 0 adds a long article for timing)
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { stableStringify } from "../src/stable-json.js";

const root = "fixture-project";
const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });
const p = (...content) => ({ type: "paragraph", content });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const cit = (...refs) => ({ type: "citation", attrs: { refs } });
const cell = (text, attrs = {}) => ({ type: "tableCell", attrs, content: [p(t(text))] });
const head = (text, attrs = {}) => ({ type: "tableHeader", attrs, content: [p(t(text))] });
const row = (...cells) => ({ type: "tableRow", content: cells });

const extra = Number(process.argv[2] ?? 0);
const sentence = "Los pacientes con artritis reumatoide presentaron una mejoría significativa de la actividad inflamatoria. ";

const body = {
  schemaVersion: 1,
  documentType: "article",
  doc: {
    type: "doc",
    content: [
      h(1, "Introducción"),
      p(t("La artritis reumatoide afecta al 0,5–1 % de la población adulta "), cit("smolen2016"), t(".")),
      p(t("El objetivo fue describir la actividad de la enfermedad en una cohorte de pacientes con artritis reumatoide de inicio "), cit("aletaha2010"), t(".")),
      h(1, "Resultados"),
      p(t("Las características basales se muestran en la "), { type: "xref", attrs: { target: "tab-basal" } }, t(". La actividad inflamatoria disminuyó en el seguimiento.")),
      { type: "tableRef", attrs: { id: "tab-basal", src: "tables/baseline.scitable" } },
      p(t("La respuesta al tratamiento se resume en la "), { type: "xref", attrs: { target: "tab-resp" } }, t(" "), cit("fransen2005"), t(".")),
      { type: "tableRef", attrs: { id: "tab-resp", src: "tables/response.scitable" } },
      ...Array.from({ length: extra }, (_, i) => p(t(sentence.repeat(3) + `(${i})`))),
      h(1, "Discusión"),
      p(t("La actividad inflamatoria en nuestra cohorte fue similar a la descrita en otras series "), cit("smolen2016", "aletaha2010"), t(".")),
    ],
  },
  changes: {},
};

const abstract = {
  schemaVersion: 1,
  documentType: "abstract",
  doc: {
    type: "doc",
    content: [
      h(2, "Resumen"),
      p(t("Objetivo: describir la actividad inflamatoria en la artritis reumatoide de inicio.")),
      p(t("Resultados: la actividad inflamatoria disminuyó a los 12 meses.")),
      p(t("Palabras clave: artritis reumatoide; actividad inflamatoria; cohorte.")),
    ],
  },
  changes: {},
};

// A .scitable holds one tablePart: caption, the table and its notes (R11: notes are objects).
const table = (id, caption, rows, notes) => ({
  schemaVersion: 1,
  documentType: "table",
  doc: {
    type: "tablePart",
    attrs: { id },
    content: [
      { type: "tableCaption", content: [t(caption)] },
      { type: "table", content: rows },
      ...notes.map(([nid, text, cites]) => ({ type: "tableNote", attrs: { id: nid }, content: [t(text), ...(cites ? [t(" "), cit(...cites)] : [])] })),
    ],
  },
  changes: {},
});

const baseline = table(
  "tab-basal",
  "Características basales de los pacientes",
  [
    row(head("Variable", { rowspan: 2 }), head("Cohorte (n = 120)", { colspan: 2 })),
    row(head("n"), head("%")),
    row(cell("Mujeres"), cell("86"), cell("72")),
    row(cell("Factor reumatoide positivo"), cell("74"), cell("62")),
    row(cell("Actividad inflamatoria alta"), cell("51"), cell("43")),
  ],
  [
    ["n-a", "Actividad inflamatoria medida con el DAS28.", ["prevoo1995"]],
    ["n-b", "Porcentajes sobre el total de la cohorte."],
  ],
);
const response = table(
  "tab-resp",
  "Respuesta EULAR a los 12 meses",
  [row(head("Respuesta"), head("n")), row(cell("Buena"), cell("48")), row(cell("Moderada"), cell("40")), row(cell("Sin respuesta"), cell("32"))],
  [["n-c", "Criterios de respuesta EULAR.", ["fransen2005"]]],
);

rmSync(root, { recursive: true, force: true });
mkdirSync(`${root}/articles/main/manuscript`, { recursive: true });
mkdirSync(`${root}/articles/main/tables`, { recursive: true });
const w = (path, obj) => writeFileSync(`${root}/${path}`, stableStringify(obj));
w("articles/main/article.json", { body: "manuscript/article.scidoc", abstract: "manuscript/abstract.scidoc" });
w("articles/main/manuscript/article.scidoc", body);
w("articles/main/manuscript/abstract.scidoc", abstract);
w("articles/main/tables/baseline.scitable", baseline);
w("articles/main/tables/response.scitable", response);
console.log(`fixture written (${extra} extra paragraphs)`);
