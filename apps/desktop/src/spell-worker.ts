// The spell checker's web worker (records 0023 and 0057): spellbook in WebAssembly, one
// dictionary per language, loaded the first time a word of that language comes, and the
// project dictionary, which every language accepts. Each general dictionary goes with its
// specialty one (biomedicine, record 0059). The editor sends words, never the text.
import { loadSpellbook, withSpecialty, type Dictionary, type Spellbook } from "@scidesk/spell";
import wasmUrl from "@scidesk/spell/assets/spellwasm.wasm?url";
import esAff from "@scidesk/spell/assets/dicts/es_ES.aff?url";
import esDic from "@scidesk/spell/assets/dicts/es_ES.dic?url";
import enAff from "@scidesk/spell/assets/dicts/en_US.aff?url";
import enDic from "@scidesk/spell/assets/dicts/en_US.dic?url";
import gbAff from "@scidesk/spell/assets/dicts/en_GB.aff?url";
import gbDic from "@scidesk/spell/assets/dicts/en_GB.dic?url";
import esBiomed from "@scidesk/spell/assets/dicts/biomed_es.dic?url";
import enBiomed from "@scidesk/spell/assets/dicts/biomed_en.dic?url";

const FILES: Record<string, [string, string, string]> = { es_ES: [esAff, esDic, esBiomed], en_US: [enAff, enDic, enBiomed], en_GB: [gbAff, gbDic, enBiomed] };

let engine: Promise<Spellbook> | null = null;
const dicts = new Map<string, Promise<Dictionary | null>>();
const projectWords = new Set<string>();

const text = async (url: string) => (await fetch(url)).text();
function dictionary(name: string): Promise<Dictionary | null> {
  if (!dicts.has(name)) {
    dicts.set(name, (async () => {
      const files = FILES[name];
      if (!files) return null;
      engine ??= (async () => loadSpellbook(await (await fetch(wasmUrl)).arrayBuffer()))();
      const [sb, aff, dic, specialty] = await Promise.all([engine, text(files[0]), text(files[1]), text(files[2])]);
      const d = sb.dictionary(aff, withSpecialty(dic, specialty));
      for (const w of projectWords) d.add(w);
      return d;
    })());
  }
  return dicts.get(name)!;
}

export type SpellRequest =
  | { id: number; type: "check"; items: { dict: string; words: string[] }[] }
  | { id: number; type: "suggest"; dict: string; word: string }
  | { id: number; type: "project"; words: string[] };

self.onmessage = async ({ data }: MessageEvent<SpellRequest>) => {
  try {
    if (data.type === "check") {
      const result = await Promise.all(data.items.map(async ({ dict, words }) => {
        const d = await dictionary(dict);
        return d ? d.checkMany(words) : words.map(() => true);
      }));
      self.postMessage({ id: data.id, result });
    } else if (data.type === "suggest") {
      self.postMessage({ id: data.id, result: (await dictionary(data.dict))?.suggest(data.word).slice(0, 8) ?? [] });
    } else if (data.type === "project") {
      // the project dictionary: added to the loaded dictionaries and to those loaded later
      const fresh = data.words.filter((w) => !projectWords.has(w));
      for (const w of fresh) projectWords.add(w);
      for (const p of dicts.values()) { const d = await p; if (d) for (const w of fresh) d.add(w); }
      self.postMessage({ id: data.id, result: true });
    }
  } catch (e) {
    self.postMessage({ id: data.id, error: e instanceof Error ? e.message : String(e) });
  }
};
