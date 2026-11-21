// Prototypes 2 and 9 measured in the browser engine itself (WebKit in Safari; Chromium in
// the PC's browser for comparison). Same operations as prototype 2's bench.mjs (fewer
// rounds) and prototype 9's spellbook measurements. Results go to the PC (out/bench-*.json).
import CSL from "citeproc";
import { loadSpellbook } from "../../09-spellcheck/src/spellbook-wasm.mjs";

const $ = (id) => document.getElementById(id);
const say = (s) => ($("out").textContent += s + "\n");
const ms = (t) => +(performance.now() - t).toFixed(2);
const median = (v) => +[...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2);
const text = (u) => fetch(u).then((r) => r.text());

async function citeproc() {
  const { items, clusters } = await (await fetch("/bench-data.json")).json();
  const locales = { "es-ES": await text("/csl/locales-es-ES.xml"), "en-US": await text("/csl/locales-en-US.xml") };
  const out = {};
  for (const style of ["reumatologia-clinica-2026", "nlm-citation-sequence", "apa"]) {
    const xml = await text(`/csl/${style}.csl`);
    const r = {};
    let t = performance.now();
    const engine = new CSL.Engine({ retrieveLocale: (l) => locales[l] ?? locales["en-US"], retrieveItem: (id) => items[id] }, xml, "es-ES", true);
    r.engineMs = ms(t);
    const doc = clusters.map((list, k) => ({ citationID: `c${k}`, citationItems: list, properties: { noteIndex: 0 } }));
    const pairs = (a) => a.map((c) => [c.citationID, 0]);
    t = performance.now();
    for (let k = 0; k < doc.length; k++) engine.processCitationCluster(doc[k], pairs(doc.slice(0, k)), []);
    r.loadAllMs = ms(t);
    t = performance.now();
    const [, bib] = engine.makeBibliography();
    r.bibliographyMs = ms(t);
    r.entries = bib.length;
    const ins = [], rem = [];
    let redraw = 0;
    for (let i = 0; i < 10; i++) {
      t = performance.now();
      const [, upd] = engine.processCitationCluster({ citationID: `x${i}`, citationItems: [{ id: "ref30" }], properties: { noteIndex: 0 } }, [], pairs(doc));
      ins.push(ms(t)); redraw = upd.length;
      t = performance.now();
      engine.processCitationCluster(doc[0], [], pairs(doc.slice(1)));
      rem.push(ms(t));
    }
    r.insertAtStartMedianMs = median(ins); r.removeMedianMs = median(rem); r.clustersToRedraw = redraw;
    out[style] = r;
    say(`citeproc ${style}: procesador ${r.engineMs} ms · 40 citas ${r.loadAllMs} ms · insertar al principio ${r.insertAtStartMedianMs} ms (${redraw} que redibujar) · bibliografía ${r.bibliographyMs} ms`);
  }
  return out;
}

async function spell() {
  const r = {};
  let t = performance.now();
  const sb = await loadSpellbook(await (await fetch("/p9/spellwasm.wasm")).arrayBuffer());
  r.wasmLoadMs = ms(t);
  const dicts = {};
  for (const lang of ["es_ES", "en_US"]) {
    const [aff, dic] = await Promise.all([text(`/p9/${lang}.aff`), text(`/p9/${lang}.dic`)]);
    t = performance.now();
    dicts[lang] = sb.dictionary(aff, dic);
    r[`${lang}ParseMs`] = ms(t);
  }
  const words = (await text("/article.txt")).match(/[\p{L}]+/gu);
  t = performance.now();
  const ok = dicts.es_ES.checkMany(words);
  r.checkWords = words.length; r.checkMs = ms(t); r.rejected = ok.filter((x) => !x).length;
  const typos = ["artrosiss", "rodila", "aceleradda", "progrecion", "radiografia", "cartilago", "menisco", "obesidaad", "tratamineto", "pronostico"];
  const sug = [];
  let first = {};
  for (const w of typos) { t = performance.now(); const s = dicts.es_ES.suggest(w); sug.push(ms(t)); first[w] = s[0]; }
  r.suggestMedianMs = median(sug); r.suggestMaxMs = Math.max(...sug); r.suggestions = first;
  r.wasmMemoryMB = +(sb.memoryBytes() / 1048576).toFixed(1);
  say(`corrector: WebAssembly ${r.wasmLoadMs} ms · es_ES ${r.es_ESParseMs} ms · en_US ${r.en_USParseMs} ms · ${r.checkWords} palabras en ${r.checkMs} ms · sugerencias ${r.suggestMedianMs} ms (máx. ${r.suggestMaxMs})`);
  return r;
}

$("run").onclick = async () => {
  $("run").disabled = true;
  $("out").textContent = "";
  const ua = navigator.userAgent;
  const engine = /Chrome\//.test(ua) ? "chromium" : /AppleWebKit/.test(ua) && /Safari\//.test(ua) ? "webkit" : "other";
  say(`motor: ${engine} · ${ua}`);
  const result = { engine, ua, at: new Date().toISOString(), citeproc: await citeproc(), spell: await spell() };
  await fetch("/api/bench", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(result) });
  say("Resultados enviados al PC.");
};
