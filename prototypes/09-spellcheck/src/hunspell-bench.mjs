// Hunspell itself (hunspell-asm: Hunspell compiled to WebAssembly) on the same words as
// spellbook: load time, check time, suggestion time, and how often both engines agree.
//   node src/hunspell-bench.mjs <lang> <words.tsv from spellbench> <corpus.txt> [--disagree out]
import { readFileSync, writeFileSync } from "node:fs";
import { loadModule } from "hunspell-asm";
import { words, typos } from "./words.mjs";

const [lang, tsvPath, corpusPath] = process.argv.slice(2);
const disagreeOut = process.argv.includes("--disagree") ? process.argv[process.argv.indexOf("--disagree") + 1] : null;

let t = performance.now();
const factory = await loadModule();
const moduleMs = performance.now() - t;
t = performance.now();
const aff = factory.mountBuffer(readFileSync(`dicts/${lang}.aff`), `${lang}.aff`);
const dic = factory.mountBuffer(readFileSync(`dicts/${lang}.dic`), `${lang}.dic`);
const hs = factory.create(aff, dic);
const loadMs = performance.now() - t;

const all = words(readFileSync(corpusPath, "utf8"));
t = performance.now();
let rejected = 0;
for (const w of all) if (!hs.spell(w)) rejected++;
const checkMs = performance.now() - t;

// agreement with spellbook, word by word
const book = readFileSync(tsvPath, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
const disagree = [];
for (const [w, v] of book) {
  const h = hs.spell(w);
  if (h !== (v === "1")) disagree.push(`${w}\tspellbook=${v === "1" ? "ok" : "rechaza"}\thunspell=${h ? "ok" : "rechaza"}`);
}
if (disagreeOut) writeFileSync(disagreeOut, disagree.join("\n"));

const good = [...new Set(all)].filter((w) => hs.spell(w));
const cases = typos(good, 200).filter(([typo]) => !hs.spell(typo));
const times = [];
let top1 = 0, top5 = 0;
for (const [typo, original] of cases) {
  const s = performance.now();
  const sug = hs.suggest(typo);
  times.push(performance.now() - s);
  if (sug[0] === original) top1++;
  if (sug.slice(0, 5).includes(original)) top5++;
}
times.sort((a, b) => a - b);
const pct = (p) => times[Math.floor((times.length - 1) * p)];
console.log(JSON.stringify({
  engine: "hunspell-wasm (node)", dictionary: lang, moduleMs: +moduleMs.toFixed(1), loadMs: +loadMs.toFixed(1), words: all.length, rejected,
  checkMs: +checkMs.toFixed(2), distinctCompared: book.length, disagreements: disagree.length,
  typos: cases.length, suggestMedianMs: +pct(0.5).toFixed(2), suggestP95Ms: +pct(0.95).toFixed(2), suggestMaxMs: +pct(1).toFixed(2), top1, top5,
}));
