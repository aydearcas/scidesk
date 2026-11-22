// The checker in Node (the command line): the dictionaries shipped with the package, each
// with its specialty list, loaded the first time a language is asked for.
import { readFile } from "node:fs/promises";
import { loadSpellbook, type Dictionary, type Spellbook } from "./spellbook.ts";
import { withSpecialty, SPECIALTY } from "./specialty.ts";
import { dictionaryFor } from "./words.ts";

const asset = (p: string) => new URL(`../assets/${p}`, import.meta.url);
let engine: Promise<Spellbook> | null = null;
const loaded = new Map<string, Promise<Dictionary>>();

/** The dictionary of a language tag ("es", "en-GB"…), or null if there is none. */
export async function nodeDictionary(lang: string): Promise<Dictionary | null> {
  const name = dictionaryFor(lang);
  if (!name) return null;
  if (!loaded.has(name)) {
    loaded.set(name, (async () => {
      engine ??= readFile(asset("spellwasm.wasm")).then((b) => loadSpellbook(b));
      const [sb, aff, dic, extra] = await Promise.all([engine, readFile(asset(`dicts/${name}.aff`), "utf8"), readFile(asset(`dicts/${name}.dic`), "utf8"), readFile(asset(`dicts/${SPECIALTY[name]}`), "utf8")]);
      return sb.dictionary(aff, withSpecialty(dic, extra));
    })());
  }
  return loaded.get(name)!;
}

/** Which words a language accepts (null: no dictionary), as the core's language checks ask. */
export async function nodeCheck(lang: string, words: string[]): Promise<boolean[] | null> {
  const d = await nodeDictionary(lang);
  return d ? d.checkMany(words) : null;
}
