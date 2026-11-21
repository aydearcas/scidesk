// spellbook compiled to WebAssembly, measured like the other two engines.
//   node src/wasm-bench.mjs <lang> <words.tsv from spellbench> <corpus.txt>
import { readFileSync } from "node:fs";
import { loadSpellbook } from "./spellbook-wasm.mjs";
import { words, typos } from "./words.mjs";

const [lang, tsvPath, corpusPath] = process.argv.slice(2);
let t = performance.now();
const sb = await loadSpellbook(readFileSync("rust-wasm/target/wasm32-unknown-unknown/release/spellwasm.wasm"));
const moduleMs = performance.now() - t;
t = performance.now();
const d = sb.dictionary(readFileSync(`dicts/${lang}.aff`, "utf8"), readFileSync(`dicts/${lang}.dic`, "utf8"));
const loadMs = performance.now() - t;

// check paragraph by paragraph, as the editor would
const paragraphs = readFileSync(corpusPath, "utf8").split("\n").map(words).filter((p) => p.length);
const total = paragraphs.reduce((n, p) => n + p.length, 0);
t = performance.now();
let rejected = 0;
for (const p of paragraphs) for (const ok of d.checkMany(p)) if (!ok) rejected++;
const checkMs = performance.now() - t;

const book = readFileSync(tsvPath, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
const verdicts = d.checkMany(book.map(([w]) => w));
const disagreements = book.filter(([, v], i) => verdicts[i] !== (v === "1")).length;

const good = book.filter(([, v]) => v === "1").map(([w]) => w);
const cases = typos(good, 200).filter(([typo]) => !d.check(typo));
const times = [];
let top5 = 0;
for (const [typo, original] of cases) {
  const s = performance.now();
  const sug = d.suggest(typo);
  times.push(performance.now() - s);
  if (sug.slice(0, 5).includes(original)) top5++;
}
times.sort((a, b) => a - b);
const pct = (p) => +times[Math.floor((times.length - 1) * p)].toFixed(2);
console.log(JSON.stringify({ engine: "spellbook-wasm (node)", dictionary: lang, moduleMs: +moduleMs.toFixed(1), loadMs: +loadMs.toFixed(1), words: total, rejected, checkMs: +checkMs.toFixed(2), distinctCompared: book.length, disagreementsWithNative: disagreements, typos: cases.length, suggestMedianMs: pct(0.5), suggestP95Ms: pct(0.95), suggestMaxMs: pct(1), top5 }));
