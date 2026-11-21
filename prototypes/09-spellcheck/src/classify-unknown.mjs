// Why does the Spanish dictionary reject words of a real article? Sorts every rejected
// word into categories and prints counts only; the word lists go to private/.
//   node src/classify-unknown.mjs <corpus.txt>
import { readFileSync, writeFileSync } from "node:fs";
import { loadSpellbook } from "./spellbook-wasm.mjs";
import { words } from "./words.mjs";

const sb = await loadSpellbook(readFileSync("rust-wasm/target/wasm32-unknown-unknown/release/spellwasm.wasm"));
const es = sb.dictionary(readFileSync("dicts/es_ES.aff", "utf8"), readFileSync("dicts/es_ES.dic", "utf8"));
const en = sb.dictionary(readFileSync("dicts/en_US.aff", "utf8"), readFileSync("dicts/en_US.dic", "utf8"));

const text = readFileSync(process.argv[2], "utf8");
const all = words(text);
const counts = new Map();
for (const w of all) counts.set(w, (counts.get(w) ?? 0) + 1);
const distinct = [...counts.keys()];
const ok = es.checkMany(distinct);
const rejected = distinct.filter((_, i) => !ok[i]);

const cats = { acronym: [], english: [], capitalised: [], lowercase: [] };
for (const w of rejected) {
  if (/^\p{Lu}{2,}$/u.test(w) || /^\p{Lu}+\p{Ll}?\p{Lu}+/u.test(w)) cats.acronym.push(w); // DAS, MTX, PsA…
  else if (en.check(w)) cats.english.push(w);
  else if (/^\p{Lu}/u.test(w)) cats.capitalised.push(w); // names, places, journals, brands
  else cats.lowercase.push(w); // technical vocabulary or real typos
}
const occ = (list) => list.reduce((n, w) => n + counts.get(w), 0);
console.log(JSON.stringify({
  words: all.length, distinct: distinct.length, rejectedDistinct: rejected.length, rejectedOccurrences: occ(rejected),
  byCategory: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, { distinct: v.length, occurrences: occ(v) }])),
}, null, 1));
for (const [k, v] of Object.entries(cats)) writeFileSync(`private/unknown-${k}.txt`, v.map((w) => `${counts.get(w)}\t${w}`).sort((a, b) => parseInt(b) - parseInt(a)).join("\n"));
