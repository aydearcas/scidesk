// The language of a fragment in the editor (record 0060): the `lang` mark of the format,
// set from Revisar or from the menu of an underlined word, read from pasted HTML (Word marks
// its runs) only where it differs from the language around it, and checked with the
// dictionaries after a paste. The spell checker reads it (spellcheck.ts), and the DOCX and
// the PDF write it.
import { Extension, Mark, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Fragment, Slice, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { cleanLangMarks, normalLang, sameLang, verifyLangMarks } from "@scidesk/core";
import { dictionaryFor, wordsIn } from "@scidesk/spell";
import { checkWords, spellOptions } from "./spellcheck.ts";

export const LangMark = Mark.create({
  name: "lang",
  // Word writes <span lang=EN-US>: tidied to en-US (Tiptap reads each attribute on its own)
  addAttributes: () => ({ lang: { default: null, rendered: false, parseHTML: (el: HTMLElement) => normalLang(el.getAttribute("lang")) } }),
  // other marks may come from the same span
  parseHTML: () => [{ tag: "span[lang]", consuming: false, getAttrs: (el) => (normalLang((el as HTMLElement).getAttribute("lang")) ? null : false) }],
  renderHTML: ({ mark }) => ["span", { lang: mark.attrs.lang, "data-lang": mark.attrs.lang }, 0],
});

/** The language around a position, without marks: its block's, a container's, the article's. */
export function langAround($pos: ResolvedPos): string {
  for (let d = $pos.depth; d > 0; d--) {
    const l = $pos.node(d).attrs.lang;
    if (l) return l as string;
  }
  return spellOptions.lang;
}

/** The language at the cursor (a mark wins), and whether it is a fragment's own. */
export function langAtCursor(state: EditorState): { lang: string; fragment: boolean } {
  const { $from, empty, from } = state.selection;
  // a selection: the text it starts with; a cursor: what typing would carry
  const marks = state.storedMarks ?? (empty ? $from.marks() : state.doc.nodeAt(from)?.marks ?? $from.marks());
  const mark = marks.find((m) => m.type.name === "lang");
  return mark ? { lang: mark.attrs.lang as string, fragment: true } : { lang: langAround($from), fragment: false };
}

/**
 * Sets the language of what is selected, or of the paragraphs of the cursor if nothing is.
 * A fragment gets a mark (none if it is the language around it); a paragraph gets the
 * attribute (none if it is the language of its container or the article).
 */
export function setLanguage(editor: Editor, lang: string) {
  const { state } = editor;
  const { from, to, empty, $from } = state.selection;
  const tr = state.tr;
  const type = state.schema.marks.lang;
  if (!empty) {
    tr.removeMark(from, to, type);
    if (!sameLang(lang, langAround($from))) tr.addMark(from, to, type.create({ lang }));
  } else {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock || !("lang" in node.attrs)) return true;
      const $in = state.doc.resolve(pos);
      const container = (() => { for (let d = $in.depth; d > 0; d--) { const l = $in.node(d).attrs.lang; if (l) return l as string; } return spellOptions.lang; })();
      tr.setNodeAttribute(pos, "lang", sameLang(lang, container) ? null : lang);
      // the paragraph's fragments in that language need no mark any more
      node.descendants((child, at) => {
        const m = child.marks.find((x) => x.type === type);
        if (m && sameLang(m.attrs.lang as string, lang)) tr.removeMark(pos + 1 + at, pos + 1 + at + child.nodeSize, type);
      });
      return false;
    });
    if (tr.storedMarks?.some((m) => m.type === type) || $from.marks().some((m) => m.type === type)) tr.removeStoredMark(type);
  }
  if (tr.docChanged) editor.view.dispatch(tr);
  editor.commands.focus();
}

/** The other language with a dictionary (Spanish ↔ English), for the menu of an underlined word. */
export const otherLang = (lang: string): string | null => (lang.toLowerCase().startsWith("es") ? "en" : lang.toLowerCase().startsWith("en") ? "es" : null);

const HARD_STOP = /[.;:!?¿¡()[\]«»"“”]/;

/**
 * The words around an underlined word that are in `lang` instead: the word must be one, and
 * the stretch grows over its neighbours while they are words of `lang` that the language
 * here rejects, or words both accept between two of them, never past a full stop, a colon or
 * a bracket. Returns the range, or null if the word is not of that language either.
 */
export async function foreignStretch(state: EditorState, pos: number, lang: string): Promise<{ from: number; to: number; text: string } | null> {
  const $pos = state.doc.resolve(pos);
  const block = $pos.parent;
  if (!block.isTextblock) return null;
  const start = $pos.start();
  const here = langAround($pos);
  const dHere = dictionaryFor(here), dThere = dictionaryFor(lang);
  if (!dHere || !dThere || dHere === dThere) return null;
  let text = "";
  block.forEach((child) => { text += child.isText ? child.text! : " ".repeat(child.nodeSize); });
  const words = wordsIn(text);
  const i = words.findIndex((w) => start + w.index <= pos && pos <= start + w.index + w.word.length);
  if (i < 0) return null;
  const list = words.map((w) => w.word);
  const [okHere, okThere] = await Promise.all([checkWords(here, list), checkWords(lang, list)]);
  if (!okHere || !okThere || !okThere[i] || okHere[i]) return null;
  const foreign = (k: number) => okThere[k] && !okHere[k];
  const both = (k: number) => okThere[k] && okHere[k];
  const gap = (a: number, b: number) => HARD_STOP.test(text.slice(words[a].index + words[a].word.length, words[b].index));
  const grow = (dir: 1 | -1) => {
    let edge = i;
    for (let k = i + dir; k >= 0 && k < words.length; k += dir) {
      if (gap(Math.min(k, k - dir), Math.max(k, k - dir))) break;
      if (foreign(k)) { edge = k; continue; }
      if (!both(k)) break;
      // a word of both languages only between two of this one
      let n = k + dir;
      while (n >= 0 && n < words.length && both(n) && !gap(Math.min(n, n - dir), Math.max(n, n - dir))) n += dir;
      if (n < 0 || n >= words.length || !foreign(n) || gap(Math.min(n, n - dir), Math.max(n, n - dir))) break;
      edge = n;
      k = n;
    }
    return edge;
  };
  const first = grow(-1), last = grow(1);
  const from = start + words[first].index, to = start + words[last].index + words[last].word.length;
  return { from, to, text: state.doc.textBetween(from, to, " ") };
}

// ---------------------------------------------------------------- pasting

const pasteKey = new PluginKey("langPaste");

/**
 * Pasted text keeps a language mark only where it differs from the language where it lands,
 * and, once the dictionaries answer, only if its words are of that language (Word marks
 * Spanish headings or lists of drugs as English).
 */
export const LangPaste = Extension.create({
  name: "langPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      key: pasteKey,
      props: {
        transformPasted(slice, view) {
          if (!view.state.schema.marks.lang) return slice;
          const around = langAround(view.state.selection.$from);
          const json = cleanLangMarks({ type: "doc", content: slice.content.toJSON() ?? [] }, around);
          return new Slice(Fragment.fromJSON(view.state.schema, json.content ?? []), slice.openStart, slice.openEnd);
        },
      },
      appendTransaction(trs, _old, state) {
        const paste = trs.find((t) => t.getMeta("paste") || t.getMeta("uiEvent") === "paste");
        if (!paste) return null;
        const found: { from: number; to: number; text: string; lang: string; around: string }[] = [];
        paste.mapping.maps.forEach((map, i) => map.forEach((_a, _b, from, to) => {
          let f = from, t = to;
          for (let j = i + 1; j < paste.mapping.maps.length; j++) { f = paste.mapping.maps[j].map(f, -1); t = paste.mapping.maps[j].map(t, 1); }
          state.doc.nodesBetween(f, t, (node: PMNode, pos) => {
            const m = node.isText ? node.marks.find((x) => x.type.name === "lang") : undefined;
            if (m) found.push({ from: pos, to: pos + node.nodeSize, text: node.text!, lang: m.attrs.lang as string, around: langAround(state.doc.resolve(pos)) });
            return true;
          });
        }));
        // after this transaction, never inside it
        if (found.length) setTimeout(() => void verifyPasted(editor, found), 0);
        return null;
      },
    })];
  },
});

async function verifyPasted(editor: Editor, found: { from: number; to: number; text: string; lang: string; around: string }[]) {
  // one paragraph per fragment, with the language around it: the core decides each
  const doc = { type: "doc", content: found.map((f) => ({ type: "paragraph", attrs: { lang: f.around }, content: [{ type: "text", text: f.text, marks: [{ type: "lang", attrs: { lang: f.lang } }] }] })) };
  const out = await verifyLangMarks(doc, spellOptions.lang, checkWords);
  if (editor.isDestroyed) return;
  const { state } = editor;
  const tr = state.tr;
  out.content!.forEach((p, k) => {
    if (p.content?.[0]?.marks?.length) return;
    const f = found[k];
    // the text may have changed meanwhile: only where it is still the same
    if (f.to > state.doc.content.size || state.doc.textBetween(f.from, f.to) !== f.text) return;
    tr.removeMark(f.from, f.to, state.schema.marks.lang);
  });
  if (tr.docChanged) editor.view.dispatch(tr.setMeta("addToHistory", false));
}
