// Reads a Zotero collection through the local API and converts it to SciDesk's library
// (CSL-JSON plus the Zotero link), then checks what the conversion keeps:
//   1. field by field, against the original references of prototype 2 (the test library
//      was filled from them, through RIS, as a user's library would be);
//   2. as formatted by citeproc-js with prototype 2's Reumatología Clínica style;
//   3. incremental sync (`since`), the quick search for the citation picker, and timings.
//   node src/read-collection.mjs ["collection name"]   -> out/library.json, out/report.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import CSL from "citeproc";
import { ZoteroLocal, toLibraryEntry } from "./zotero.mjs";
import { items as originals } from "../../02-citeproc/src/library.mjs";

const wanted = process.argv[2] ?? "Artrosis acelerada (prueba)";
const z = new ZoteroLocal();
const ms = (t) => +(performance.now() - t).toFixed(1);
const report = {};

let t = performance.now();
const { items: cols } = await z.collections();
report.collections = cols.map((c) => ({ key: c.key, name: c.data.name, parent: c.data.parentCollection || null, items: c.meta.numItems }));
const col = cols.find((c) => c.data.name === wanted);
if (!col) throw new Error(`no collection "${wanted}"; there are: ${cols.map((c) => c.data.name).join(", ")}`);

t = performance.now();
const { items, version } = await z.collectionItems(col.key);
report.readCollection = { items: items.length, ms: ms(t), requests: z.requests, libraryVersion: version, serverId: z.serverId };

// SciDesk id: a short stable id of its own (here derived from the Zotero key for the test)
const library = items.map((it) => toLibraryEntry(it, z.serverId, (i) => `r-${i.key.toLowerCase()}`));
mkdirSync("out", { recursive: true });
writeFileSync("out/library.json", JSON.stringify(library, null, 1));

// 1. field by field against the originals (matched by title)
// (two guide examples share a title, so the DOI is part of the match)
const matchKey = (c) => `${c.title}|${c.DOI ?? ""}`;
const byTitle = Object.fromEntries(Object.values(originals).map((o) => [matchKey(o), o]));
const FIELDS = ["type", "title", "author", "editor", "container-title", "container-title-short", "issued", "volume", "issue", "page", "DOI", "URL", "accessed", "edition", "publisher", "publisher-place", "PMID", "status", "genre", "version"];
const norm = (v) => JSON.stringify(v, (k, x) => (Array.isArray(x) && x.every((y) => typeof y === "string" && /^\d+$/.test(y)) ? x.map(Number) : x));
const diffs = {};
for (const e of library) {
  const o = byTitle[matchKey(e.csl)];
  if (!o) { (diffs["(no match)"] ??= []).push(e.csl.title); continue; }
  for (const f of FIELDS) {
    if (o[f] == null && e.csl[f] == null) continue;
    if (norm(o[f]) !== norm(e.csl[f])) (diffs[f] ??= []).push(`${o.id}: ${JSON.stringify(o[f])} -> ${JSON.stringify(e.csl[f])}`.slice(0, 160));
  }
}
report.fieldDifferences = Object.fromEntries(Object.entries(diffs).map(([f, l]) => [f, { count: l.length, examples: l.slice(0, 3) }]));

// 2. formatted output: original vs from Zotero, same style
const csl = "../02-citeproc/csl/";
const engine = (lookup) => new CSL.Engine({ retrieveLocale: (l) => readFileSync(`${csl}locales-${l}.xml`, "utf8"), retrieveItem: lookup }, readFileSync(`${csl}reumatologia-clinica-2026.csl`, "utf8"), "es-ES", true);
const plain = (h) => h.replace(/<div class="csl-left-margin">[^<]*<\/div>/, "").replace(/<\/?div[^>]*>/g, "").replace(/\s+/g, " ").trim();
let same = 0;
const different = [];
for (const e of library) {
  const o = byTitle[matchKey(e.csl)];
  if (!o) continue;
  const a = engine(() => o); a.updateItems([o.id]);
  const b = engine(() => ({ ...e.csl, id: e.id })); b.updateItems([e.id]);
  const pa = plain(a.makeBibliography()[1][0]), pb = plain(b.makeBibliography()[1][0]);
  if (pa === pb) same++; else different.push({ id: o.id, original: pa, fromZotero: pb });
}
report.formatted = { same, different: different.length, examples: different.slice(0, 6) };

// 3. incremental sync and search
t = performance.now();
const again = await z.collectionItems(col.key, { since: version });
report.incremental = { since: version, changedItems: again.items.length, ms: ms(t) };
t = performance.now();
const all = await z.all("/users/0/items/top", { format: "json", include: "data,csljson" });
report.wholeLibrary = { items: all.items.length, ms: ms(t) };
const searches = {};
for (const q of ["Driban", "knee osteoarthritis", "2016", "artrosis"]) {
  t = performance.now();
  const r = await z.search(q);
  searches[q] = { hits: r.total, ms: ms(t) };
}
report.search = searches;

writeFileSync("out/report.json", JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
