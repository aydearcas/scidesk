// British or American English throughout an article (record 0063): every English word of
// the composed document (the body, the English abstract, English fragments, tables and
// figures) that the target variety spells otherwise, grouped by word for the dialog, and
// applied in one step of the undo history. Text between quotation marks (quotes, titles
// cited literally) and names in the middle of a sentence (World Health Organization) are
// listed but not changed unless the user ticks them.
import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { englishVariantFixes, wordsIn, type EnglishVariety } from "@scidesk/spell";
import { langAround } from "./lang.ts";
import { checkDict } from "./spellcheck.ts";

export interface VariantPlace { from: number; to: number; word: string; replacement: string; quoted: boolean; proper: boolean }
export interface VariantRow {
  key: string;
  word: string;
  replacement: string;
  places: VariantPlace[];
  /** Ticked when the dialog opens: not quoted and not a name. */
  suggested: boolean;
  quoted: number;
  proper: boolean;
}

const isEnglish = (l: string | null | undefined) => !!l && l.toLowerCase().startsWith("en");
const OPEN = new Set(["“", "«", "„"]);
const CLOSE = new Set(["”", "»"]);

/** The English words of the document, with where they are and whether they are quoted or a name. */
function englishWords(doc: PMNode): { word: string; from: number; to: number; quoted: boolean; proper: boolean }[] {
  const out: { word: string; from: number; to: number; quoted: boolean; proper: boolean }[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return true;
    const around = langAround(doc.resolve(pos + 1));
    let text = "";
    const segs: { at: number; english: boolean }[] = [];
    block.forEach((child) => {
      const deleted = child.marks.some((m) => m.type.name === "deletion");
      const lang = (child.marks.find((m) => m.type.name === "lang")?.attrs.lang as string | undefined) ?? around;
      segs.push({ at: text.length, english: !deleted && isEnglish(lang) });
      text += child.isText && !deleted ? child.text! : " ".repeat(child.nodeSize);
    });
    // inside quotation marks, character by character (straight quotes open and close in turn)
    const quoted: boolean[] = [];
    let depth = 0, straight = false;
    for (const ch of text) {
      if (OPEN.has(ch)) depth++;
      else if (CLOSE.has(ch)) depth = Math.max(0, depth - 1);
      else if (ch === '"') straight = !straight;
      for (let k = 0; k < ch.length; k++) quoted.push(depth > 0 || straight);
    }
    for (const w of wordsIn(text)) {
      const seg = [...segs].reverse().find((s) => s.at <= w.index);
      if (!seg?.english) continue;
      const before = text.slice(0, w.index).trimEnd();
      const proper = /^\p{Lu}/u.test(w.word) && before !== "" && !/[.!?:]$/.test(before);
      out.push({ word: w.word, from: pos + 1 + w.index, to: pos + 1 + w.index + w.word.length, quoted: quoted[w.index] ?? false, proper });
    }
    return false;
  });
  return out;
}

/** What changes to reach a variety, grouped by word (names apart), most frequent first. */
export async function englishPlan(state: EditorState, to: EnglishVariety): Promise<VariantRow[]> {
  const words = englishWords(state.doc);
  const fixes = await englishVariantFixes(words.map((w) => w.word), to, checkDict);
  const rows = new Map<string, VariantRow>();
  for (const w of words) {
    const replacement = fixes.get(w.word);
    if (!replacement) continue;
    const key = `${w.word.toLowerCase()}→${replacement.toLowerCase()}${w.proper ? "|name" : ""}`;
    const row = rows.get(key) ?? { key, word: w.word, replacement, places: [], suggested: true, quoted: 0, proper: w.proper };
    row.places.push({ ...w, replacement });
    if (w.quoted) row.quoted++;
    rows.set(key, row);
  }
  for (const r of rows.values()) r.suggested = !r.proper && r.quoted < r.places.length;
  return [...rows.values()].sort((a, b) => Number(b.suggested) - Number(a.suggested) || b.places.length - a.places.length || a.word.localeCompare(b.word, "en"));
}

/**
 * Applies the chosen rows in one step: each word replaced in place (its marks kept), quoted
 * ones only if `quoted`; with `tag`, the English of the document says the variety too
 * (fragments, paragraphs, the English abstract) so that the checker and Word follow it.
 * Returns how many words changed.
 */
export function applyEnglishPlan(editor: Editor, rows: VariantRow[], opts: { quoted: boolean; tag: string | null }): number {
  const { state } = editor;
  const tr = state.tr;
  const places = rows.flatMap((r) => r.places).filter((p) => opts.quoted || !p.quoted).sort((a, b) => b.from - a.from);
  let changed = 0;
  for (const p of places) {
    // only where the text is still the same word
    if (state.doc.textBetween(p.from, p.to) !== p.word) continue;
    tr.insertText(p.replacement, p.from, p.to);
    changed++;
  }
  if (opts.tag) {
    const langType = state.schema.marks.lang;
    tr.doc.descendants((node, pos) => {
      if ("lang" in node.attrs && isEnglish(node.attrs.lang as string | null) && node.attrs.lang !== opts.tag) tr.setNodeAttribute(pos, "lang", opts.tag);
      const m = node.isText ? node.marks.find((x) => x.type === langType) : undefined;
      if (m && isEnglish(m.attrs.lang as string) && m.attrs.lang !== opts.tag) tr.addMark(pos, pos + node.nodeSize, langType.create({ lang: opts.tag }));
      return true;
    });
  }
  if (tr.docChanged) editor.view.dispatch(tr);
  return changed;
}
