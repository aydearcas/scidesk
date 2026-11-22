// Builds the specialty dictionaries (record 0059) from specialty/<lang>/*.txt:
// assets/dicts/biomed_es.dic and biomed_en.dic. Stops on an unreadable entry or an unknown
// model word; drops (and lists) words the general dictionary already accepts, and repeats.
//   npm run build:specialty --workspace @scidesk/spell
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { loadSpellbook, dicFlags, parseSpecialtySource, SPECIALTY } from "../src/index.ts";

const root = new URL("../", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const sb = await loadSpellbook(readFileSync(new URL("assets/spellwasm.wasm", root)));
const LANGS: Record<string, string> = { es: "es_ES", en: "en_US" };

let failed = false;
for (const [lang, name] of Object.entries(LANGS)) {
  const base = read(`assets/dicts/${name}.dic`);
  const general = sb.dictionary(read(`assets/dicts/${name}.aff`), base);
  const flags = dicFlags(base);
  // the lists of this language, then those shared by every language (names, no flags)
  const files = [lang, "common"].flatMap((dir) => readdirSync(new URL(`specialty/${dir}/`, root)).filter((f) => f.endsWith(".txt")).sort().map((f) => `${dir}/${f}`));
  const seen = new Map<string, { line: string; at: string }>();
  const known: string[] = [];
  for (const f of files) {
    const { entries, errors } = parseSpecialtySource(read(`specialty/${f}`), f, (m) => flags.has(m) ? flags.get(m)! : null);
    for (const e of errors) { console.error(e); failed = true; }
    if (f.startsWith("common/")) for (const e of entries) if (e.line.includes("/")) { console.error(`${e.at}: no flags in the shared lists`); failed = true; }
    for (const e of entries) {
      const [word, f2 = ""] = e.line.split("/");
      if (seen.has(word)) { console.warn(`${e.at}: «${word}» repeats ${seen.get(word)!.at}`); continue; }
      // already in the general dictionary, with no flags of ours to add: not needed
      const ours = [...f2].filter((c) => !(flags.get(word) ?? "").includes(c));
      if (general.check(word) && !ours.length) { known.push(`${e.at} ${word}`); continue; }
      seen.set(word, e);
    }
  }
  const lines = [...seen.values()].map((e) => e.line).sort((a, b) => a.localeCompare(b, lang));
  // the flags must parse with this language's .aff
  const probe = sb.dictionary(read(`assets/dicts/${name}.aff`), `${lines.length}\n${lines.join("\n")}\n`);
  for (const l of lines) if (!probe.check(l.split("/")[0])) { console.error(`${lang}: «${l}» is not accepted after building`); failed = true; }
  if (known.length) console.log(`${lang}: ${known.length} already in the general dictionary, left out:\n  ${known.join("\n  ")}`);
  const header = `${lines.length}`;
  writeFileSync(new URL(`assets/dicts/${SPECIALTY[name]}`, root), `${header}\n${lines.join("\n")}\n`);
  // the other dictionaries that load this list must read its flags too (en_GB, record 0062)
  for (const [other, file] of Object.entries(SPECIALTY)) {
    if (other === name || file !== SPECIALTY[name]) continue;
    const d = sb.dictionary(read(`assets/dicts/${other}.aff`), `${lines.length}\n${lines.join("\n")}\n`);
    for (const l of lines) if (!d.check(l.split("/")[0])) { console.error(`${other}: «${l}» is not accepted with its .aff`); failed = true; }
  }
  console.log(`${lang}: ${lines.length} entries from ${files.length} lists → assets/dicts/${SPECIALTY[name]}`);
}
if (failed) process.exit(1);
