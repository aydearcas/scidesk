// Web worker that owns the spell checker: spellbook in WebAssembly, one dictionary per
// language, plus the project dictionary. The editor sends words, never the document.
import { loadSpellbook } from "./spellbook-wasm.mjs";

const dicts = {};
let ready;

async function init(langs) {
  const t0 = performance.now();
  const wasm = await (await fetch("/rust-wasm/target/wasm32-unknown-unknown/release/spellwasm.wasm")).arrayBuffer();
  const sb = await loadSpellbook(wasm);
  const timings = {};
  for (const lang of langs) {
    const [aff, dic] = await Promise.all([fetch(`/dicts/${lang}.aff`).then((r) => r.text()), fetch(`/dicts/${lang}.dic`).then((r) => r.text())]);
    const t = performance.now();
    dicts[lang] = sb.dictionary(aff, dic);
    timings[lang] = +(performance.now() - t).toFixed(1);
  }
  return { totalMs: +(performance.now() - t0).toFixed(1), parseMs: timings, wasmMemoryMB: +(sb.memoryBytes() / 1048576).toFixed(1) };
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  if (type === "init") {
    ready = init(data.langs);
    return self.postMessage({ id, result: await ready });
  }
  await ready;
  if (type === "check") {
    // items: [{ lang, words: [...] }] -> one boolean array per item
    const t = performance.now();
    const result = data.items.map(({ lang, words }) => (dicts[lang] ? dicts[lang].checkMany(words) : words.map(() => true)));
    return self.postMessage({ id, result, ms: performance.now() - t });
  }
  if (type === "suggest") return self.postMessage({ id, result: dicts[data.lang]?.suggest(data.word) ?? [] });
  if (type === "add") {
    // project dictionary: every language accepts the word
    for (const d of Object.values(dicts)) for (const w of data.words) d.add(w);
    return self.postMessage({ id, result: true });
  }
};
