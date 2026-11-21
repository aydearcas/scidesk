// Spell-check plugin for Tiptap: underlines drawn by the editor (decorations), language
// per fragment, the checker in a worker, and a cache so that only words never seen
// before travel to the worker.
//
// Language of a word: the `lang` mark on its text, else the `lang` attribute of its
// block, else the document's default language. Words are never sent with their context.
import { Extension, Mark } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const spellKey = new PluginKey("spellcheck");
const WORD = /[\p{L}'’]+/gu;

// Words not worth checking: acronyms, words with digits, single letters.
const skip = (w) => w.length < 2 || /^\p{Lu}{2,}$/u.test(w) || /\d/.test(w);

export const Lang = Mark.create({
  name: "lang",
  addAttributes: () => ({ lang: { default: null, parseHTML: (el) => el.getAttribute("lang"), renderHTML: (a) => ({ lang: a.lang }) } }),
  parseHTML: () => [{ tag: "span[lang]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
});

// Block-level language: an attribute on paragraphs and headings.
export const BlockLang = Extension.create({
  name: "blockLang",
  addGlobalAttributes: () => [
    { types: ["paragraph", "heading"], attributes: { lang: { default: null, parseHTML: (el) => el.getAttribute("lang"), renderHTML: (a) => (a.lang ? { lang: a.lang } : {}) } } },
  ],
});

// Every checkable word of a textblock, with its position and language.
function wordsOf(block, pos, defaultLang) {
  const out = [];
  const blockLang = block.attrs.lang ?? defaultLang;
  block.forEach((child, offset) => {
    if (!child.isText) return;
    const lang = child.marks.find((m) => m.type.name === "lang")?.attrs.lang ?? blockLang;
    for (const m of child.text.matchAll(WORD)) {
      const w = m[0].replace(/^['’]+|['’]+$/g, "");
      if (skip(w)) continue;
      const from = pos + 1 + offset + m.index + (m[0].indexOf(w));
      out.push({ word: w, lang, from, to: from + w.length });
    }
  });
  return out;
}

export function createSpellcheck({ worker, defaultLang = "es", onTiming } = {}) {
  const cache = new Map(); // "lang\u0000word" -> boolean
  const key = (lang, w) => `${lang}\u0000${w}`;
  let seq = 0;
  let recheck = () => {};
  const pending = new Map();
  worker.addEventListener("message", ({ data }) => {
    const p = pending.get(data.id);
    if (p) {
      pending.delete(data.id);
      p(data);
    }
  });
  const call = (msg) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    worker.postMessage({ ...msg, id });
  });

  function decorations(doc) {
    const decos = [];
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return true;
      for (const w of wordsOf(node, pos, defaultLang)) {
        if (cache.get(key(w.lang, w.word)) === false) decos.push(Decoration.inline(w.from, w.to, { class: "misspelled", "data-lang": w.lang }));
      }
      return false;
    });
    return DecorationSet.create(doc, decos);
  }

  const extension = Extension.create({
    name: "spellcheck",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: spellKey,
          state: {
            init: (_, state) => decorations(state.doc),
            apply: (tr, old, _o, state) => (tr.docChanged || tr.getMeta(spellKey) ? decorations(state.doc) : old.map(tr.mapping, tr.doc)),
          },
          props: { decorations: (state) => spellKey.getState(state) },
          view: (view) => {
            // send the words the cache does not know yet, after a short pause in typing
            let timer = null;
            const flush = async (startedAt) => {
              const byLang = new Map();
              view.state.doc.descendants((node, pos) => {
                if (!node.isTextblock) return true;
                for (const w of wordsOf(node, pos, defaultLang)) {
                  const k = key(w.lang, w.word);
                  if (cache.has(k)) continue;
                  if (!byLang.has(w.lang)) byLang.set(w.lang, new Set());
                  byLang.get(w.lang).add(w.word);
                }
                return false;
              });
              if (!byLang.size) return;
              const items = [...byLang].map(([lang, set]) => ({ lang, words: [...set] }));
              const { result, ms } = await call({ type: "check", items });
              items.forEach((it, i) => it.words.forEach((w, j) => cache.set(key(it.lang, w), result[i][j])));
              view.dispatch(view.state.tr.setMeta(spellKey, true));
              onTiming?.({ words: items.reduce((n, it) => n + it.words.length, 0), workerMs: ms, totalMs: performance.now() - startedAt });
            };
            const schedule = () => {
              const startedAt = performance.now();
              clearTimeout(timer);
              timer = setTimeout(() => flush(startedAt), 150);
            };
            recheck = schedule;
            schedule();
            return { update: (v, prev) => v.state.doc !== prev.doc && schedule() };
          },
        }),
      ];
    },
  });

  return {
    extension,
    init: (langs) => call({ type: "init", langs }),
    suggest: (lang, word) => call({ type: "suggest", lang, word }).then((d) => d.result),
    async addToProject(words, view) {
      await call({ type: "add", words });
      for (const k of [...cache.keys()]) if (cache.get(k) === false) cache.delete(k);
      view.dispatch(view.state.tr.setMeta(spellKey, true));
      recheck();
    },
    cacheSize: () => cache.size,
  };
}
