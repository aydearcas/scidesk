// Live renumbering with citeproc-js, as SciDesk's citation worker would do it: the article's
// citation clusters are registered one by one with processCitationCluster, then a citation
// is inserted at the start (every number after it changes), removed, moved and edited. For
// each operation: time, and how many clusters citeproc says must be redrawn. Three styles:
// the new Reumatología Clínica style (numeric, superscript), Vancouver/NLM (numeric,
// brackets) and APA 7 (author-date). Also: switching style, the bibliography, and the
// output formats.
//   node src/bench.mjs [rounds]  -> table on stdout and out/bench.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import CSL from "citeproc";
import { items, clusters } from "./library.mjs";

const rounds = Number(process.argv[2] ?? 20);
const STYLES = { "reumatologia-clinica-2026": "es-ES", "nlm-citation-sequence": "es-ES", apa: "es-ES" };
const locale = (l) => readFileSync(`csl/locales-${l}.xml`, "utf8");
const ms = (t) => +(performance.now() - t).toFixed(2);
const median = (v) => +[...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2);

function newEngine(style, lang) {
  return new CSL.Engine({ retrieveLocale: locale, retrieveItem: (id) => items[id] }, readFileSync(`csl/${style}.csl`, "utf8"), lang, true);
}
const cite = (k, list) => ({ citationID: `c${k}`, citationItems: list, properties: { noteIndex: 0 } });

const report = {};
for (const [style, lang] of Object.entries(STYLES)) {
  const r = (report[style] = {});
  let t = performance.now();
  const engine = newEngine(style, lang);
  r.engineMs = ms(t);

  // register the article's clusters in reading order
  const doc = clusters.map((list, k) => cite(k, list)); // the document: clusters in order
  const pairs = (arr) => arr.map((c) => [c.citationID, 0]);
  t = performance.now();
  for (let k = 0; k < doc.length; k++) engine.processCitationCluster(doc[k], pairs(doc.slice(0, k)), []);
  r.loadAllMs = ms(t);
  r.clusters = doc.length;
  r.cited = Object.keys(engine.registry.registry).length;

  // the same, the other way: rebuild everything at once (what a style switch costs)
  t = performance.now();
  const e2 = newEngine(style, lang);
  const rebuilt = e2.rebuildProcessorState(doc, "html", []); // [citationID, noteIndex, string] in order
  r.switchStyleMs = ms(t);

  t = performance.now();
  const [, bib] = engine.makeBibliography();
  r.bibliographyMs = ms(t);
  r.bibliographyEntries = bib.length;

  // operations, each undone after measuring so that every round starts from the article
  const ops = { insertAtStart: [], removeFirst: [], moveFirstToEnd: [], editAddReference: [] };
  const updated = {};
  for (let i = 0; i < rounds; i++) {
    // insert a new citation of a late reference (ref30) before everything: all numbers shift
    const extra = cite(`x${i}`, [{ id: "ref30" }]);
    t = performance.now();
    let [, upd] = engine.processCitationCluster(extra, [], pairs(doc));
    ops.insertAtStart.push(ms(t)); updated.insertAtStart = upd.length;
    // remove it again (re-register the first cluster with the extra one gone)
    t = performance.now();
    [, upd] = engine.processCitationCluster(doc[0], [], pairs(doc.slice(1)));
    ops.removeFirst.push(ms(t)); updated.removeFirst = upd.length;
    // move the first cluster to the end, then back
    t = performance.now();
    [, upd] = engine.processCitationCluster(doc[0], pairs(doc.slice(1)), []);
    ops.moveFirstToEnd.push(ms(t)); updated.moveFirstToEnd = upd.length;
    engine.processCitationCluster(doc[0], [], pairs(doc.slice(1)));
    // edit a cluster in the middle: add a reference cited only near the end (g1)
    const mid = doc.length >> 1;
    const edited = { ...doc[mid], citationItems: [...doc[mid].citationItems, { id: "g1" }] };
    t = performance.now();
    [, upd] = engine.processCitationCluster(edited, pairs(doc.slice(0, mid)), pairs(doc.slice(mid + 1)));
    ops.editAddReference.push(ms(t)); updated.editAddReference = upd.length;
    engine.processCitationCluster(doc[mid], pairs(doc.slice(0, mid)), pairs(doc.slice(mid + 1)));
  }
  r.ops = Object.fromEntries(Object.entries(ops).map(([k, v]) => [k, { medianMs: median(v), maxMs: +Math.max(...v).toFixed(2), clustersToRedraw: updated[k] }]));

  // what the first clusters look like, and one bibliography entry
  r.sample = { firstCitations: rebuilt.slice(0, 4).map((x) => x[2]), lastCitations: rebuilt.slice(-3).map((x) => x[2]), firstEntry: bib[0].replace(/\s+/g, " ").trim().slice(0, 170) };
}

// output formats: the same entry as HTML, plain text and RTF
const fmt = {};
for (const f of ["html", "text", "rtf"]) {
  const e = newEngine("reumatologia-clinica-2026", "es-ES");
  e.setOutputFormat(f);
  e.updateItems(["g1"]);
  fmt[f] = e.makeBibliography()[1][0].trim();
}
report.formats = fmt;

mkdirSync("out", { recursive: true });
writeFileSync("out/bench.json", JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
