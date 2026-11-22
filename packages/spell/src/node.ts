// The checker in Node (the command line): the dictionaries shipped with the package, each
// with its specialty list, loaded the first time a language is asked for.
import { readFile } from "node:fs/promises";
import { loadSpellbook, type Dictionary, type Spellbook } from "./spellbook.ts";
import { withSpecialty, SPECIALTY } from "./specialty.ts";
import { dictionaryFor } from "./words.ts";

const asset = (p: string) => new URL(`../assets/${p}`, import.meta.url);
let engine: Promise<Spellbook> | null = null;
const loaded = new Map<string, Promise<Dictionary>>();

/**
 * A dictionary by name: "en_GB" (with the specialty list) or "en_GB:general" (without it,
 * record 0063); null if there is no such dictionary.
 */
export async function nodeDictionaryNamed(spec: string): Promise<Dictionary | null> {
  const [name, kind] = spec.split(":");
  if (!SPECIALTY[name]) return null;
  if (!loaded.has(spec)) {
    loaded.set(spec, (async () => {
      engine ??= readFile(asset("spellwasm.wasm")).then((b) => loadSpellbook(b));
      const [sb, aff, dic, extra] = await Promise.all([engine, readFile(asset(`dicts/${name}.aff`), "utf8"), readFile(asset(`dicts/${name}.dic`), "utf8"), kind === "general" ? null : readFile(asset(`dicts/${SPECIALTY[name]}`), "utf8")]);
      return sb.dictionary(aff, withSpecialty(dic, extra));
    })());
  }
  return loaded.get(spec)!;
}

/** The dictionary of a language tag ("es", "en-GB"…), or null if there is none. */
export async function nodeDictionary(lang: string): Promise<Dictionary | null> {
  const name = dictionaryFor(lang);
  return name ? nodeDictionaryNamed(name) : null;
}

/** Which words a language accepts (null: no dictionary), as the core's language checks ask. */
export async function nodeCheck(lang: string, words: string[]): Promise<boolean[] | null> {
  const d = await nodeDictionary(lang);
  return d ? d.checkMany(words) : null;
}

/** Which words a dictionary accepts, by name ("en_US", "en_US:general"); all false if it does not exist. */
export async function nodeCheckDict(spec: string, words: string[]): Promise<boolean[]> {
  const d = await nodeDictionaryNamed(spec);
  return d ? d.checkMany(words) : words.map(() => false);
}
