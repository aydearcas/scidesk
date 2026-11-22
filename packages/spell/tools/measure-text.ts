// How many words of a plain text the checker would underline, with and without the
// specialty dictionary (record 0059), and which ones. The text and the list stay on this
// computer: run it on private documents, never commit what it prints.
//   node tools/measure-text.ts <text file> <es|en> [--top N] [--base] [--other en]
// --other: words the other language accepts are counted apart (text in that language without
// its mark, which the editor would check with the right dictionary once marked).
import { readFileSync } from "node:fs";
import { loadSpellbook, wordsIn, dictionaryFor, withSpecialty, SPECIALTY } from "../src/index.ts";

const [file, lang, ...rest] = process.argv.slice(2);
if (!file || !lang) {
  console.error("usage: measure-text.ts <text file> <es|en> [--top N] [--base]");
  process.exit(1);
}
const top = Number(rest[rest.indexOf("--top") + 1]) || 40;
const name = dictionaryFor(lang)!;
const asset = (p: string) => readFileSync(new URL(`../assets/${p}`, import.meta.url), "utf8");
const sb = await loadSpellbook(readFileSync(new URL("../assets/spellwasm.wasm", import.meta.url)));
const aff = asset(`dicts/${name}.aff`);
const base = asset(`dicts/${name}.dic`);
const dicts = {
  general: sb.dictionary(aff, base),
  specialty: sb.dictionary(aff, withSpecialty(base, asset(`dicts/${SPECIALTY[name]}`))),
};

const otherLang = rest.includes("--other") ? dictionaryFor(rest[rest.indexOf("--other") + 1]) : null;
const other = otherLang
  ? sb.dictionary(asset(`dicts/${otherLang}.aff`), withSpecialty(asset(`dicts/${otherLang}.dic`), asset(`dicts/${SPECIALTY[otherLang]}`)))
  : null;
const words = wordsIn(readFileSync(file, "utf8")).map((w) => w.word);
console.log(`${words.length} words to check in ${file}`);
for (const [label, d] of Object.entries(dicts)) {
  const ok = d.checkMany(words);
  const bad = new Map<string, number>();
  words.forEach((w, i) => { if (!ok[i]) bad.set(w, (bad.get(w) ?? 0) + 1); });
  let n = [...bad.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${label}: ${n} underlined (${(n / words.length * 1000).toFixed(1)} per 1,000 words), ${bad.size} distinct`);
  if (other) {
    const keys = [...bad.keys()];
    const inOther = other.checkMany(keys);
    let m = 0;
    keys.forEach((k, i) => { if (inOther[i]) { m += bad.get(k)!; bad.delete(k); } });
    n -= m;
    console.log(`  ${m} of them are words of the other language; the rest: ${n} (${(n / words.length * 1000).toFixed(1)} per 1,000 words), ${bad.size} distinct`);
  }
  if (label === "general" && !rest.includes("--base")) continue;
  const list = [...bad].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).slice(0, top);
  console.log(list.map(([w, c]) => `${c}\t${w}`).join("\n"));
}
