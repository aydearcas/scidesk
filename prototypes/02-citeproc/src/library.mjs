// The test library: 50 references in CSL-JSON and the citations of an article.
//   - g1..g6: the examples of Reumatología Clínica's authors' guide (Spanish edition),
//     entered as data (they are Elsevier's sample references);
//   - e1..e7: hard cases (7 and 6 authors, group author, a Spanish article of the journal,
//     in press, preprint, web report). Invented, like the rest;
//   - ref1..ref37: the references of the synthetic article (prototypes/corpus), with its
//     citations in order, so that the numbering is a real article's.
import { readFileSync } from "node:fs";

const md = readFileSync(new URL("../../corpus/synthetic-round-knee-oa/source/article.md", import.meta.url), "utf8");
const [bodyMd, refsMd] = md.split(/^## Referencias\s*$/m);

const n = (family, given, extra = {}) => ({ family, given, ...extra });
export const guide = {
  g1: { id: "g1", type: "article-journal", author: [n("Van der Geer", "J"), n("Hanraads", "J A J"), n("Lupton", "R A")], title: "The art of writing a scientific article", "container-title": "Journal of Science Communication", "container-title-short": "J Sci Commun", issued: { "date-parts": [[2010]] }, volume: "163", page: "51-59", DOI: "10.1016/j.Sc.2010.00372" },
  g2: { id: "g2", type: "article-journal", author: [n("Van der Geer", "J"), n("Hanraads", "J A J"), n("Lupton", "R A")], title: "The art of writing a scientific article", "container-title": "Heliyon", "container-title-short": "Heliyon", issued: { "date-parts": [[2018]] }, volume: "19", page: "e00205", DOI: "10.1016/j.heliyon.2018.e00205" },
  g3: { id: "g3", type: "book", author: [n("Strunk", "W", { suffix: "Jr" }), n("White", "E B")], title: "The elements of style", edition: "4", "publisher-place": "New York", publisher: "Longman", issued: { "date-parts": [[2000]] } },
  g4: { id: "g4", type: "chapter", author: [n("Mettam", "G R"), n("Adams", "L B")], title: "How to prepare an electronic version of your article", editor: [n("Jones", "B S"), n("Smith", "R Z")], "container-title": "Introduction to the electronic age", "publisher-place": "New York", publisher: "E-Publishing Inc", issued: { "date-parts": [[2009]] }, page: "281-304" },
  g5: { id: "g5", type: "webpage", author: [{ literal: "Cancer Research UK" }], title: "Cancer statistics reports for the UK", URL: "http://www.cancerresearchuk.org/aboutcancer/statistics/cancerstatsreport/", issued: { "date-parts": [[2003]] }, accessed: { "date-parts": [[2003, 3, 13]] } },
  g6: { id: "g6", type: "dataset", author: [n("Oguro", "M"), n("Imahiro", "S"), n("Saito", "S"), n("Nakashizuka", "T")], title: "Mortality data for Japanese oak wilt disease and surrounding forest compositions", publisher: "Mendeley Data", version: "1", issued: { "date-parts": [[2015]] }, DOI: "10.17632/xwj98nb39r.1" },
};
export const hard = {
  e1: { id: "e1", type: "article-journal", author: [n("Alonso", "M"), n("Benítez", "C"), n("Castro", "R"), n("Domínguez", "L"), n("Esteban", "P"), n("Fuentes", "A"), n("Gallego", "S"), n("Herrera", "J")], title: "Siete autores o más: una cohorte ficticia", "container-title": "Annals of the Rheumatic Diseases", "container-title-short": "Ann Rheum Dis", issued: { "date-parts": [[2024]] }, volume: "83", issue: "4", page: "412-420", DOI: "10.1136/ard-2023-000001" },
  e2: { id: "e2", type: "article-journal", author: [n("Ibáñez", "T"), n("Jiménez", "V"), n("Lozano", "E"), n("Moreno", "F"), n("Navarro", "D"), n("Ortega", "B")], title: "Exactly six authors in a made-up trial", "container-title": "Arthritis & Rheumatology", "container-title-short": "Arthritis Rheumatol", issued: { "date-parts": [[2023]] }, volume: "75", issue: "2", page: "201-209" },
  e3: { id: "e3", type: "report", author: [{ literal: "Grupo de Trabajo de la Guía de Práctica Clínica Ficticia" }], title: "Guía de práctica clínica sobre una enfermedad inventada", publisher: "Sociedad Ficticia de Reumatología", "publisher-place": "Madrid", issued: { "date-parts": [[2022]] }, URL: "https://example.org/gpc", accessed: { "date-parts": [[2026, 11, 20]] } },
  e4: { id: "e4", type: "article-journal", author: [n("Pérez", "A"), n("Quintana", "M"), n("Ruiz", "J")], title: "Un artículo en español con su título acentuado: ¿qué ocurre con la interrogación?", "container-title": "Reumatología Clínica", "container-title-short": "Reumatol Clin", issued: { "date-parts": [[2025]] }, volume: "21", issue: "3", page: "1323-1330", DOI: "10.1016/j.reuma.2025.000001", PMID: "40000001" },
  e5: { id: "e5", type: "article-journal", author: [n("Sánchez", "I"), n("Torres", "O")], title: "An accepted article that is not in an issue yet", "container-title": "Seminars in Arthritis and Rheumatism", "container-title-short": "Semin Arthritis Rheum", status: "en prensa", issued: { "date-parts": [[2026]] }, DOI: "10.1016/j.semarthrit.2026.000001" },
  e6: { id: "e6", type: "article", genre: "Preprint", author: [n("Ureña", "N"), n("Vega", "C")], title: "A preprint about an imaginary biomarker", publisher: "medRxiv", issued: { "date-parts": [[2026, 5, 2]] }, DOI: "10.1101/2026.05.01.00000001" },
  e7: { id: "e7", type: "webpage", author: [{ literal: "Agencia Ficticia del Medicamento" }], title: "Ficha técnica de un fármaco inventado", URL: "https://example.org/ficha", issued: { "date-parts": [[2025]] }, accessed: { "date-parts": [[2026, 11, 20]] } },
};

// the synthetic article's Vancouver references -> CSL-JSON (same parser as prototypes 3 and 4)
export const article = {};
for (const line of refsMd.split("\n")) {
  const m = /^(\d+)\.\s+(.*)$/.exec(line.trim());
  if (!m) continue;
  const id = `ref${m[1]}`;
  const r = /^(.*)\.\s+(\d{4});\s*([^:(]*)(?:\(([^)]*)\))?(?::\s*([^.]*))?\.?\s*$/.exec(m[2]);
  const left = r ? r[1] : m[2];
  const firstDot = left.indexOf(". ");
  const lastDot = left.lastIndexOf(". ");
  const author = left.slice(0, firstDot).split(/,\s*/).filter((a) => a && a !== "et al").map((a) => {
    const p = a.trim().split(" ");
    return { family: p.slice(0, -1).join(" ") || p[0], given: p.length > 1 ? [...p.at(-1)].join(" ") : "" };
  });
  article[id] = {
    id, type: "article-journal", author, title: left.slice(firstDot + 2, lastDot),
    "container-title": left.slice(lastDot + 2), "container-title-short": left.slice(lastDot + 2),
    ...(r ? { issued: { "date-parts": [[Number(r[2])]] }, volume: r[3]?.trim(), issue: r[4], page: r[5] } : {}),
  };
}
export const items = { ...article, ...guide, ...hard };

// citation clusters in reading order: the article's [n] citations, then a closing
// paragraph that cites the guide examples and the hard cases (one with a page locator)
const expand = (s) => s.split(",").flatMap((p) => {
  const [a, b] = p.split(/[–-]/).map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => `ref${a + i}`) : [`ref${a}`];
});
export const clusters = [];
for (const m of bodyMd.matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g)) clusters.push(expand(m[1].replace(/\s/g, "")).map((id) => ({ id })));
clusters.push(
  [{ id: "g1" }, { id: "g2" }], [{ id: "g3" }], [{ id: "g4", locator: "290", label: "page" }], [{ id: "g5" }, { id: "g6" }],
  [{ id: "e1" }, { id: "e2" }, { id: "e3" }], [{ id: "e4" }], [{ id: "e5" }, { id: "e6" }, { id: "e7" }],
);
