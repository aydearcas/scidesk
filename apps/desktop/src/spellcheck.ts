// The spell checker in the editor (records 0023 and 0057): wavy underlines drawn as
// decorations, the language of each word from its block (or the abstract, title or part
// around it, or a `lang` mark), and the article's language otherwise. Only the paragraphs a
// change touches are looked at again; words never seen go to the worker after a pause of
// 150 ms, and a cache keeps every answer. Deleted text (tracked changes) is not checked.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { dictionaryFor, wordsIn } from "@scidesk/spell";
import type { SpellRequest } from "./spell-worker.ts";

export const spellKey = new PluginKey<DecorationSet>("spellcheck");

/** Settings the window changes while the editor lives. */
export const spellOptions = { enabled: true, lang: "es" };

// ---------------------------------------------------------------- the worker

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, (data: { result?: unknown; error?: string }) => void>();
type Request = SpellRequest extends infer R ? (R extends unknown ? Omit<R, "id"> : never) : never;
function call<T>(msg: Request): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL("./spell-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => { waiting.get(data.id)?.(data); waiting.delete(data.id); };
  }
  return new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, (d) => (d.error ? reject(new Error(d.error)) : resolve(d.result as T)));
    worker!.postMessage({ ...msg, id });
  });
}

const cache = new Map<string, boolean>();
const key = (dict: string, word: string) => `${dict}\u0000${word}`;

/** The project dictionary for every language; words thought wrong are asked again. */
export async function setProjectWords(words: string[], view?: EditorView | null) {
  await call({ type: "project", words });
  for (const [k, ok] of cache) if (!ok) cache.delete(k);
  if (view) refresh(view);
}
export const suggestions = (dict: string, word: string) => call<string[]>({ type: "suggest", dict, word });

/** Draws the underlines again (the language, the setting or the dictionary changed). */
export function refresh(view: EditorView) {
  view.dispatch(view.state.tr.setMeta(spellKey, "all").setMeta("addToHistory", false));
}

// ---------------------------------------------------------------- words of a block

interface Found { word: string; dict: string; from: number; to: number }

/** The language around a block: its own, else the nearest ancestor's (abstract, part), else the article's. */
function langAt(doc: PMNode, pos: number, block: PMNode): string {
  if (block.attrs.lang) return block.attrs.lang as string;
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const l = $pos.node(d).attrs.lang;
    if (l) return l as string;
  }
  return spellOptions.lang;
}

/** Every word to check in a textblock at `pos`, with its dictionary. */
function wordsOfBlock(doc: PMNode, block: PMNode, pos: number): Found[] {
  const out: Found[] = [];
  const blockLang = langAt(doc, pos, block);
  // the block's text, with deleted fragments and atoms as spaces so that offsets stay right
  let text = "";
  const langs: { at: number; dict: string | null }[] = [];
  block.forEach((child) => {
    const deleted = child.marks.some((m) => m.type.name === "deletion");
    const lang = (child.marks.find((m) => m.type.name === "lang")?.attrs.lang as string | undefined) ?? blockLang;
    langs.push({ at: text.length, dict: deleted ? null : dictionaryFor(lang) });
    text += child.isText && !deleted ? child.text! : " ".repeat(child.nodeSize);
  });
  for (const w of wordsIn(text)) {
    const seg = [...langs].reverse().find((l) => l.at <= w.index);
    if (!seg?.dict) continue;
    const from = pos + 1 + w.index;
    out.push({ word: w.word, dict: seg.dict, from, to: from + w.word.length });
  }
  return out;
}

/** Underlines for the given textblocks; words not in the cache yet go to `unknown`. */
function underline(doc: PMNode, blocks: { node: PMNode; pos: number }[], unknown: Map<string, Set<string>>): Decoration[] {
  const decos: Decoration[] = [];
  for (const { node, pos } of blocks) {
    for (const w of wordsOfBlock(doc, node, pos)) {
      const ok = cache.get(key(w.dict, w.word));
      if (ok === undefined) { if (!unknown.has(w.dict)) unknown.set(w.dict, new Set()); unknown.get(w.dict)!.add(w.word); }
      else if (!ok) decos.push(Decoration.inline(w.from, w.to, { class: "misspelled" }, { word: w.word, dict: w.dict }));
    }
  }
  return decos;
}

function textblocks(doc: PMNode, from = 0, to = doc.content.size): { node: PMNode; pos: number }[] {
  const out: { node: PMNode; pos: number }[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock) { out.push({ node, pos }); return false; }
    return true;
  });
  return out;
}

/** The ranges of the new document that a transaction changed. */
function changedRanges(tr: Transaction): [number, number][] {
  const ranges: [number, number][] = [];
  tr.steps.forEach((step, i) => {
    step.getMap().forEach((_os, _oe, ns, ne) => {
      // map through the later steps of the same transaction
      let from = ns, to = ne;
      for (let j = i + 1; j < tr.steps.length; j++) { from = tr.steps[j].getMap().map(from, -1); to = tr.steps[j].getMap().map(to, 1); }
      ranges.push([from, to]);
    });
  });
  return ranges;
}

// ---------------------------------------------------------------- the plugin

export const Spellcheck = Extension.create({
  name: "spellcheck",
  addProseMirrorPlugins() {
    const unknown = new Map<string, Set<string>>();
    const all = (state: EditorState) => (spellOptions.enabled ? DecorationSet.create(state.doc, underline(state.doc, textblocks(state.doc), unknown)) : DecorationSet.empty);
    return [
      new Plugin<DecorationSet>({
        key: spellKey,
        state: {
          init: (_c, state) => all(state),
          apply(tr, old, _o, state) {
            if (tr.getMeta(spellKey) === "all") return all(state);
            if (!tr.docChanged || !spellOptions.enabled) return tr.docChanged ? old.map(tr.mapping, tr.doc) : old;
            let set = old.map(tr.mapping, tr.doc);
            const blocks = new Map<number, PMNode>();
            for (const [from, to] of changedRanges(tr)) {
              const a = Math.max(0, Math.min(from, state.doc.content.size));
              const b = Math.max(a, Math.min(to, state.doc.content.size));
              for (const blk of textblocks(state.doc, a, b)) blocks.set(blk.pos, blk.node);
            }
            if (!blocks.size) return set;
            const list = [...blocks].map(([pos, node]) => ({ pos, node }));
            for (const b of list) set = set.remove(set.find(b.pos, b.pos + b.node.nodeSize));
            return set.add(state.doc, underline(state.doc, list, unknown));
          },
        },
        props: { decorations: (state) => spellKey.getState(state) },
        view(view) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let busy = false;
          const ask = async () => {
            if (busy || !unknown.size) return;
            busy = true;
            const items = [...unknown].map(([dict, words]) => ({ dict, words: [...words] }));
            unknown.clear();
            try {
              const result = await call<boolean[][]>({ type: "check", items });
              items.forEach((it, i) => it.words.forEach((w, j) => cache.set(key(it.dict, w), result[i][j])));
              // only the answers that are wrong change what is drawn
              if (result.some((r) => r.includes(false)) && !view.isDestroyed) refresh(view);
            } catch { /* the checker failed: no underlines, never an error while typing */ }
            busy = false;
            if (unknown.size) schedule();
          };
          const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void ask(), 150); };
          schedule();
          return { update: () => { if (unknown.size) schedule(); }, destroy: () => clearTimeout(timer) };
        },
      }),
    ];
  },
});

/** The misspelled word at a position, if the pointer is on one. */
export function misspelledAt(state: EditorState, pos: number): { from: number; to: number; word: string; dict: string } | null {
  const set = spellKey.getState(state);
  const d = set?.find(pos, pos).find((x) => x.from <= pos && x.to >= pos);
  if (!d) return null;
  const spec = d.spec as { word: string; dict: string };
  return { from: d.from, to: d.to, word: spec.word, dict: spec.dict };
}
