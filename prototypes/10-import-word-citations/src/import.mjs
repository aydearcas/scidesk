// Imports the citations of a Word document (EndNote or Zotero) as SciDesk would when it
// starts an article from that document (R1, phase 2), and checks the result against what
// the document itself shows:
//   1. the library: one entry per distinct reference (EndNote: database id + record
//      number), in order of first citation, converted to CSL-JSON;
//   2. order: entry i of the document's bibliography is reference i of the library;
//   3. numbers: what each citation shows equals the numbers citeproc-js gives it;
//   4. text: each bibliography entry compared with citeproc-js's output for the same
//      reference in a Vancouver style (NLM).
// Output with the document's data goes to private/<name>.json; stdout only has counts.
//   node src/import.mjs <file.docx> [...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import CSL from "citeproc";
import { readCitations } from "./read-citations.mjs";
import { endnoteToCsl } from "./endnote-to-csl.mjs";

const csl = "../02-citeproc/csl/";
const STYLE = readFileSync(`${csl}nlm-citation-sequence.csl`, "utf8"); // Vancouver/NLM, numbers in parentheses
const norm = (s) => s.normalize("NFKC").replace(/[‐‑‒–—−]/g, "-").replace(/<[^>]+>/g, "").replace(/&#38;|&amp;/g, "&").replace(/\s+/g, " ").replace(/\s([.,;:])/g, "$1").trim().toLowerCase();
const words = (s) => new Set(norm(s).match(/[\p{L}\p{N}]{2,}/gu) ?? []);
const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1); };
const numbers = (s) => {
  const out = new Set();
  for (const m of s.replace(/[‐‑‒–—−]/g, "-").matchAll(/(\d+)\s*-\s*(\d+)|(\d+)/g)) {
    if (m[3]) out.add(Number(m[3])); else for (let i = Number(m[1]); i <= Number(m[2]); i++) out.add(i);
  }
  return [...out].sort((a, b) => a - b).join(",");
};

mkdirSync("private", { recursive: true });
const summary = [];
for (const file of process.argv.slice(2)) {
  const t0 = performance.now();
  const doc = await readCitations(file);
  const readMs = performance.now() - t0;

  // 1. library, in order of first citation
  const lib = new Map();
  const unmapped = {};
  for (const c of doc.citations) for (const x of c.cites) {
    if (lib.has(x.key)) continue;
    const id = `r${lib.size + 1}`;
    let entry;
    if (c.manager === "endnote") {
      const { csl: item, unmapped: rest } = endnoteToCsl(x.record, id);
      for (const k of Object.keys(rest)) unmapped[k] = (unmapped[k] ?? 0) + 1;
      entry = { id, csl: item, source: { manager: "endnote", key: x.key } };
    } else entry = { id, csl: { ...x.csl, id }, source: { manager: c.manager, key: x.key } };
    lib.set(x.key, entry);
  }
  const items = Object.fromEntries([...lib.values()].map((e) => [e.id, e.csl]));

  // 2-3. citeproc-js: numbers of each citation, and the bibliography
  const engine = new CSL.Engine({ retrieveLocale: (l) => readFileSync(`${csl}locales-${l}.xml`, "utf8"), retrieveItem: (id) => items[id] }, STYLE, "en-US", true);
  const citations = doc.citations.map((c, k) => ({ citationID: `c${k}`, citationItems: c.cites.map((x) => ({ id: lib.get(x.key).id, ...(x.pages ? { locator: x.pages } : {}) })), properties: { noteIndex: 0 } }));
  const rebuilt = engine.rebuildProcessorState(citations, "text", []);
  const numberCheck = { same: 0, different: [] };
  rebuilt.forEach(([, , text], k) => {
    const shown = numbers(doc.citations[k].shown), ours = numbers(text);
    if (shown === ours) numberCheck.same++; else numberCheck.different.push({ k, shown: doc.citations[k].shown, ours: text });
  });
  const [, bib] = engine.makeBibliography();
  const ours = bib.map((h) => h.replace(/<div class="csl-left-margin">[^<]*<\/div>/, "").replace(/<\/?div[^>]*>/g, "").trim());

  // 2. order: is document entry i about reference i?
  const docBib = doc.bibliography.map((e) => e.replace(/^\s*\[?\d+[.\])]?\s*/, ""));
  const order = { inPlace: 0, elsewhere: 0, unmatched: 0 };
  const textCheck = [];
  docBib.forEach((entry, i) => {
    const w = words(entry);
    let best = -1, score = 0;
    ours.forEach((o, j) => { const s = jaccard(w, words(o)); if (s > score) { score = s; best = j; } });
    if (score < 0.4) order.unmatched++; else if (best === i) order.inPlace++; else order.elsewhere++;
    // 4. text: same entry, ours vs the document's
    const o = ours[i] ?? "";
    textCheck.push({ i, exact: norm(entry).replace(/[.\s]/g, "") === norm(o).replace(/[.\s]/g, ""), similarity: +jaccard(w, words(o)).toFixed(2), document: entry, citeproc: o });
  });
  const sims = textCheck.map((t) => t.similarity).sort((a, b) => a - b);

  // 5. data: are the converted reference's data in the document's entry? (the styles
  // differ - NLM adds DOI, PMID and "[Internet]" - so this is the measure that matters)
  const libList = [...lib.values()];
  const fieldCheck = {};
  const tally = (f, ok) => { fieldCheck[f] ??= { found: 0, of: 0 }; fieldCheck[f].of++; if (ok) fieldCheck[f].found++; };
  docBib.forEach((entry, i) => {
    const e = norm(entry), c = libList[i]?.csl;
    if (!c) return;
    for (const a of (c.author ?? []).slice(0, 6)) tally("author", e.includes(norm(a.family ?? a.literal ?? "")));
    if (c.title) tally("title", e.replace(/[^\p{L}\p{N}]/gu, "").includes(norm(c.title).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 60)));
    if (c.issued) tally("year", e.includes(String(c.issued["date-parts"][0][0])));
    if (c.volume) tally("volume", e.includes(norm(c.volume)));
    if (c.page) tally("first page", e.includes(norm(c.page).split("-")[0]));
    if (c["container-title"]) tally("journal or book", e.includes(norm(c["container-title-short"] ?? c["container-title"]).slice(0, 25)) || e.includes(norm(c["container-title"]).slice(0, 25)));
  });

  const name = basename(file).replace(/\.docx$/i, "");
  writeFileSync(`private/${name}.json`, JSON.stringify({ library: [...lib.values()], citations: doc.citations.map((c, k) => ({ ...c, cites: c.cites.map((x) => ({ ...x, record: undefined, id: lib.get(x.key).id })), citeproc: rebuilt[k][2] })), numberCheck, textCheck, fieldCheck, unmapped }, null, 1));
  summary.push({
    document: `#${summary.length + 1}`, readMs: Math.round(readMs), citations: doc.citations.length, citeItems: doc.citations.reduce((n, c) => n + c.cites.length, 0),
    library: lib.size, bibliographyEntries: doc.bibliography.length,
    order, numbersSame: `${numberCheck.same}/${doc.citations.length}`,
    textExact: textCheck.filter((t) => t.exact).length, textSimilarityMedian: sims[sims.length >> 1], textSimilarityMin: sims[0],
    dataInDocumentEntry: Object.fromEntries(Object.entries(fieldCheck).map(([f, v]) => [f, `${v.found}/${v.of}`])),
    types: Object.entries([...lib.values()].reduce((a, e) => ((a[e.csl.type] = (a[e.csl.type] ?? 0) + 1), a), {})).map(([k, v]) => `${k}:${v}`).join(" "),
    withDOI: [...lib.values()].filter((e) => e.csl.DOI).length, withPMID: [...lib.values()].filter((e) => e.csl.PMID).length,
    unmappedFields: unmapped,
  });
}
console.log(JSON.stringify(summary, null, 1));
