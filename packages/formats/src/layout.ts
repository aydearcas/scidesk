// Fixed layout of a project folder (PLAN 4, P24) and what travels with it versus what stays
// on each computer (R26, record 0013). Paths are relative to the project root; <article> is
// the folder of an article under articles/.
export const PROJECT_LAYOUT = {
  manifest: "<name>.scidesk",
  library: "references/library.json",
  imports: "references/imports/",
  people: "people/people.json",
  dictionary: "resources/dictionary.txt",
  journals: "resources/journals/<id>.json",
  journalStyles: "resources/journals/styles/<style>.csl",
  styles: "resources/styles/<style>.csl",
  article: "articles/<article>/article.json",
  authors: "articles/<article>/authors.json",
  body: "articles/<article>/manuscript/article.scidoc",
  abstract: "articles/<article>/manuscript/abstract.scidoc",
  coverLetter: "articles/<article>/documents/cover-letter.scidoc",
  titlePage: "articles/<article>/documents/title-page.scidoc",
  contributions: "articles/<article>/documents/contributions.scidoc",
  declarations: "articles/<article>/documents/declarations.scidoc",
  reviewerResponses: "articles/<article>/documents/reviewer-responses/<round>.scidoc",
  supplementary: "articles/<article>/supplementary/supplementary-material.scidoc",
  tables: "articles/<article>/tables/<name>.scitable",
  figures: "articles/<article>/figures/<name>.scifigure",
  figureImages: "articles/<article>/figures/<name>.<png|jpg|tiff|svg|eps|pdf>",
  rounds: "articles/<article>/rounds/<round>/",
  proposals: "articles/<article>/proposals/<set>.json",
  exports: "articles/<article>/exports/",
  history: ".scidesk/history/",
} as const;

/** Travels with the project (synchronised, copied, sent): everything in the folder. */
export const TRAVELS = [
  "manifest", "library", "imports", "people", "dictionary", "journals", "journalStyles", "styles",
  "article", "authors", "body", "abstract", "coverLetter", "titlePage", "contributions", "declarations",
  "reviewerResponses", "supplementary", "tables", "figures", "figureImages", "rounds", "proposals",
  "history",
] as const satisfies readonly (keyof typeof PROJECT_LAYOUT)[];

/** In the folder but disposable: regenerated on demand, and never needed to open the project. */
export const DISPOSABLE = ["exports"] as const satisfies readonly (keyof typeof PROJECT_LAYOUT)[];

/** Stays on each computer, in the app's data folder, under the project id (local-state.ts). */
export const LOCAL_ONLY = [
  "window and tabs state", "recent projects", "caches (citeproc, spell checking, preview)",
  "Zotero sync state (Zotero-Server-ID, versions)", "unsaved-changes journal (R25)", "app settings",
] as const;
