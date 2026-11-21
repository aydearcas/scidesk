// EndNote XML <record> (as read by read-citations.mjs) -> CSL-JSON.
// Covers the reference types and fields that EndNote writes into Word fields; what it does
// not map is kept in `unmapped` so that the import can show it.

const TYPES = {
  "Journal Article": "article-journal", "Electronic Article": "article-journal", "Book": "book", "Edited Book": "book",
  "Book Section": "chapter", "Electronic Book Section": "chapter", "Web Page": "webpage", "Report": "report",
  "Government Document": "report", "Conference Proceedings": "paper-conference", "Conference Paper": "paper-conference",
  "Thesis": "thesis", "Magazine Article": "article-magazine", "Newspaper Article": "article-newspaper", "Dataset": "dataset",
  "Online Database": "dataset", "Patent": "patent", "Statute": "legislation", "Unpublished Work": "manuscript", "Generic": "document",
};
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const list = (v) => (v == null ? [] : [].concat(v));

// "Last, First M." -> {family, given}; a name with no comma, or ending in a comma (EndNote's
// way of marking an organisation), is a literal name
export function parseName(s) {
  const t = s.trim();
  if (!t.includes(",") || /,\s*$/.test(t)) return { literal: t.replace(/,\s*$/, "") };
  const [family, ...rest] = t.split(",");
  const given = rest.join(",").trim();
  const suffix = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(given.split(/\s+/).at(-1)) && given.split(/\s+/).length > 1 ? given.split(/\s+/).at(-1) : null;
  return { family: family.trim(), given: suffix ? given.replace(new RegExp(`\\s+${suffix}$`), "") : given, ...(suffix ? { suffix } : {}) };
}

export function endnoteToCsl(rec, id) {
  const r = { ...rec };
  const take = (k) => { const v = r[k]; delete r[k]; return v; };
  const type = TYPES[take("ref-type")] ?? "document";
  const csl = { id, type };
  const authors = list(take("contributors/authors"));
  const editors = list(take("contributors/secondary-authors"));
  if (authors.length) csl.author = authors.map(parseName);
  if (editors.length) (type === "chapter" || type === "paper-conference" || type === "book" ? (csl.editor = editors.map(parseName)) : (csl["container-author"] = editors.map(parseName)));
  csl.title = take("titles/title");
  const secondary = take("titles/secondary-title");
  const full = take("periodical/full-title");
  const abbr = take("periodical/abbr-1") ?? take("alt-periodical/abbr-1");
  const alt = take("titles/alt-title");
  csl["container-title"] = full ?? secondary;
  if (abbr) csl["container-title-short"] = abbr;
  else if (alt && type === "article-journal") csl["container-title-short"] = alt;
  const year = take("dates/year");
  const pub = list(take("dates/pub-dates"))[0];
  if (year && /\d{4}/.test(year)) {
    const parts = [Number(year.match(/\d{4}/)[0])];
    const m = pub && /([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{1,2}))?/.exec(pub);
    if (m && MONTHS[m[1].toLowerCase()]) { parts.push(MONTHS[m[1].toLowerCase()]); if (m[2]) parts.push(Number(m[2])); }
    csl.issued = { "date-parts": [parts] };
  }
  for (const [from, to] of [["volume", "volume"], ["number", "issue"], ["pages", "page"], ["publisher", "publisher"], ["pub-location", "publisher-place"], ["language", "language"]]) {
    const v = take(from);
    if (v) csl[to] = v;
  }
  const edition = take("edition");
  if (edition && type !== "article-journal") csl.edition = edition; // in journal articles EndNote/PubMed put the publication status here
  const doi = take("electronic-resource-num");
  if (doi) { const d = /10\.\d{4,9}\/\S+/.exec(doi); if (d) csl.DOI = d[0].replace(/[.,;]$/, ""); }
  const acc = take("accession-num");
  const provider = take("remote-database-provider");
  if (acc && /^\d{5,9}$/.test(acc) && (!provider || /nlm|pubmed/i.test(provider))) csl.PMID = acc;
  for (const k of ["custom1", "custom2", "custom6"]) { const v = take(k); const p = v && /PMC\d+/.exec(v); if (p) csl.PMCID = p[0]; else if (v) r[k] = v; }
  const urls = list(take("urls/related-urls"));
  if (urls[0] && type !== "article-journal") csl.URL = urls[0];
  else if (urls[0] && !csl.DOI) csl.URL = urls[0];
  const isbn = take("isbn");
  if (isbn) csl[type === "article-journal" ? "ISSN" : "ISBN"] = isbn.split(/[\s;]+/)[0];
  // not mapped (kept apart so that nothing is lost silently)
  for (const k of ["rec-number", "auth-address", "keywords/keyword", "abstract", "notes", "label", "research-notes", "work-type"]) delete r[k];
  for (const k of Object.keys(csl)) if (csl[k] == null || csl[k] === "") delete csl[k];
  return { csl, unmapped: r };
}
