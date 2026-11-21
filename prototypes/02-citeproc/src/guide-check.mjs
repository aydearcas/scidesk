// Checks each candidate style against the reference rules and examples of Reumatología
// Clínica's Spanish authors' guide (read on 21/11/2026), one rule per line.
//   node src/guide-check.mjs  -> table on stdout and out/guide-check.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import CSL from "citeproc";
import { items, guide, hard } from "./library.mjs";

const STYLES = {
  "reumatologia-clinica (2012) = nlm-citation-sequence-superscript": "nlm-citation-sequence-superscript",
  "elsevier-vancouver (2019)": "elsevier-vancouver",
  "medicina-clinica (2017)": "medicina-clinica",
  "vancouver-nlm (ICMJE) = nlm-citation-sequence": "nlm-citation-sequence",
  "reumatologia-clinica-2026 (nuevo)": "reumatologia-clinica-2026",
};
const plain = (html) => html.replace(/<div class="csl-left-margin">([^<]*)<\/div>/, "$1 ").replace(/<\/?div[^>]*>/g, "").replace(/\s+/g, " ").trim();

// Each rule: what the guide asks, and a test on the formatted output (HTML of citeproc-js).
const RULES = [
  ["Citas con números en superíndice, sin corchetes", (o) => /^<sup>\d/.test(o.cite) && !/[[\]]/.test(o.cite) && !/<sup><sup>/.test(o.cite)],
  ["Lista numerada «1.» en orden de aparición", (o) => /^1\. /.test(o.bib.g1)],
  ["Autores «Apellido Iniciales», sin puntos en las iniciales", (o) => o.bib.g1.includes("Van der Geer J, Hanraads JAJ, Lupton RA. ")],
  ["Más de 6 autores: los 6 primeros y «et al.»", (o) => /Fuentes A, et al\. /.test(o.bib.e1) && !o.bib.e1.includes("Gallego")],
  ["6 autores: todos, sin «et al.»", (o) => o.bib.e2.includes("Ortega B. ")],
  ["Revista abreviada, «Año;Volumen:páginas»", (o) => /J Sci Commun\.? 2010;(<b>)?163(<\/b>)?:51.9/.test(o.bib.g1)],
  ["Volumen en negrita", (o) => o.bib.g1.includes("<b>163</b>")],
  ["Última página abreviada con raya corta (51–9)", (o) => o.bib.g1.includes(":51–9")],
  ["DOI como enlace https://doi.org/… al final", (o) => /https:\/\/doi\.org\/10\.1016\/j\.Sc\.2010\.00372\.$/.test(o.bib.g1)],
  ["Artículo con número de artículo (e00205)", (o) => /Heliyon\.? 2018;(<b>)?19(<\/b>)?:e00205/.test(o.bib.g2)],
  ["Libro: «Título. N.ª ed. Lugar: Editorial; año.»", (o) => /The elements of style\. 4\S* ed\. New York: Longman; 2000\.$/.test(o.bib.g3.replace(/<\/?sup>/g, ""))],
  ["Capítulo: «En/In: editores. Libro, Lugar: Editorial; año, p. x–y.»", (o) => /(In|En): Jones BS, Smith RZ, (editors|editores)\. (<i>)?Introduction to the electronic age(<\/i>)?, New York: E-Publishing Inc; 2009, p\. 281.304\.$/.test(o.bib.g4)],
  ["Capítulo: título del libro en cursiva", (o) => o.bib.g4.includes("<i>Introduction to the electronic age</i>")],
  ["Página web: «Título, URL; año [consultada el …]»", (o) => /Cancer statistics reports for the UK, http:\/\/www\.cancerresearchuk\.org\/aboutcancer\/statistics\/cancerstatsreport\/; 2003 \[consultada el 13 de marzo de 2003\]\.$/.test(o.bib.g5)],
  ["Conjunto de datos: «[dataset] … Título, Repositorio, v1; año. DOI.»", (o) => /^\d+\. \[dataset\] /.test(o.bib.g6) && o.bib.g6.includes("compositions, Mendeley Data, v1; 2015. https://doi.org/10.17632/xwj98nb39r.1.")],
  ["En prensa: lo indica", (o) => /en prensa/i.test(o.bib.e5)],
  ["Preprint: lo indica y da su DOI", (o) => /preprint/i.test(o.bib.e6) && o.bib.e6.includes("10.1101/2026.05.01.00000001")],
];

const locale = (l) => readFileSync(`csl/locales-${l}.xml`, "utf8");
const results = {};
for (const [label, file] of Object.entries(STYLES)) {
  const engine = new CSL.Engine({ retrieveLocale: locale, retrieveItem: (id) => items[id] }, readFileSync(`csl/${file}.csl`, "utf8"), "es-ES", true);
  const ids = [...Object.keys(guide), ...Object.keys(hard)];
  engine.updateItems(ids);
  const [meta, entries] = engine.makeBibliography();
  const bib = Object.fromEntries(meta.entry_ids.map((ids, i) => [ids[0], plain(entries[i])]));
  const o = { cite: engine.makeCitationCluster([{ id: "g1" }]), bib };
  results[label] = { pass: RULES.map(([, test]) => !!test(o)), bib };
}
mkdirSync("out", { recursive: true });
writeFileSync("out/guide-check.json", JSON.stringify(results, null, 1));

const labels = Object.keys(results);
console.log(`| Regla de la guía | ${labels.map((l) => l.split(" ")[0]).join(" | ")} |`);
console.log(`|---|${labels.map(() => "---").join("|")}|`);
RULES.forEach(([rule], i) => console.log(`| ${rule} | ${labels.map((l) => (results[l].pass[i] ? "sí" : "no")).join(" | ")} |`));
console.log(`| **Total** | ${labels.map((l) => `${results[l].pass.filter(Boolean).length}/${RULES.length}`).join(" | ")} |`);
