// Tracked changes in the editor (phase 2a, record 0090; prototypes 7, 8 and 11, record 0020):
// SciDesk's own copy of prosemirror-suggest-changes (packages/suggest-changes) turns every
// edit, while tracking is on, into insertion, deletion and modification marks with an id; who
// made each change, and when, goes to the `changes` registry of the .scidoc. The changes of
// another author are never joined to one's own. A composition (accents on macOS) is turned
// into a change once it ends. Accepting and rejecting, one change or all of them.
import { Extension, Mark, type AnyExtension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { newId, type DocumentFile } from "@scidesk/formats";
import { revealIn, scrollerOf } from "./reveal.ts";
import {
  applySuggestion, applySuggestions, disableSuggestChanges, enableSuggestChanges, isSuggestChangesEnabled,
  revertSuggestion, revertSuggestions, setCanJoinSuggestion, suggestChanges, suggestChangesKey, transformToSuggestionTransaction,
} from "@scidesk/suggest-changes";

export type ChangeRecord = DocumentFile["changes"][string];
export const SUGGESTION_MARKS = "insertion deletion modification";
/** Marks a block or an inline atom can carry: tracked changes and comment anchors (record 0094). */
export const NODE_MARKS = `${SUGGESTION_MARKS} comment`;
const SUGGESTION_RE = /^(?:insertion|deletion|modification)$/;

/**
 * Who is writing, and the article's registry of changes (filled from its files when it is
 * shown, and by every tracked edit). The window sets the author from the settings.
 */
export const track: { author: { name: string; person?: string }; registry: Record<string, ChangeRecord> } = {
  author: { name: "" },
  registry: {},
};

/** A pastel colour per author, the same every time (by name). */
const PALETTE = ["#1565C0", "#AD1457", "#2E7D32", "#6A1B9A", "#E65100", "#00838F", "#5D4037", "#C62828"];
export function authorColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return PALETTE[h % PALETTE.length];
}
/** What the window shows about a change: its author and when. */
export function changeInfo(id: string): ChangeRecord | null {
  return track.registry[id] ?? null;
}

const suggestionMark = (name: "insertion" | "deletion" | "modification", tag: string, extra: Record<string, unknown> = {}) =>
  Mark.create({
    name,
    inclusive: false,
    excludes: name === "modification" ? "deletion insertion" : SUGGESTION_MARKS,
    addAttributes: () => ({
      id: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-change"), renderHTML: () => ({}) },
      ...extra,
    }),
    parseHTML: () => [{ tag: `${tag}[data-change]` }],
    renderHTML: ({ mark }) => {
      const id = String(mark.attrs.id);
      const info = track.registry[id];
      const color = authorColor(info?.author.name ?? "");
      return [tag, {
        "data-change": id,
        class: `change change-${name}`,
        style: `--change-color: ${color}`,
        title: info ? `${info.author.name} · ${new Date(info.date).toLocaleString()}` : "",
      }, 0];
    },
  });
const hidden = () => ({ default: null, renderHTML: () => ({}) });
export const Insertion = suggestionMark("insertion", "ins");
export const Deletion = suggestionMark("deletion", "del");
export const Modification = suggestionMark("modification", "span", { type: hidden(), attrName: hidden(), previousValue: hidden(), newValue: hidden() });

// Composition (prototype 11): on macOS a dead key ("´" then "i") opens a composition, and
// WebKit replaces a provisional "´" with "í" when it ends. Tracking each step of it leaves
// "´í". So while composing, transactions pass through untouched (and out of the undo history);
// when it ends, the net change is undone and applied again as one transaction, which is tracked.
const compositionKey = new PluginKey("trackComposition");
const composing: { start: PMNodeType | null } = { start: null };
function compositionPlugin() {
  const finish = (view: Editor["view"], tries = 0) => {
    // WebKit may still report the composition as open right after compositionend: wait
    if (view.composing && tries < 40) { setTimeout(() => finish(view, tries + 1), 25); return; }
    const start = composing.start;
    composing.start = null;
    if (!start) return;
    const cur = view.state.doc;
    const a = start.content.findDiffStart(cur.content);
    if (a == null) return;
    let { a: endA, b: endB } = start.content.findDiffEnd(cur.content)!;
    const over = a - Math.min(endA, endB);
    if (over > 0) { endA += over; endB += over; }
    const inserted = cur.slice(a, endB);
    view.dispatch(view.state.tr.replace(a, endB, start.slice(a, endA)).setMeta(suggestChangesKey, { skip: true }).setMeta("addToHistory", false));
    const tr = view.state.tr.replace(a, endA, inserted);
    tr.setSelection(TextSelection.near(tr.doc.resolve(a + inserted.size)));
    view.dispatch(tr);
  };
  return new Plugin({
    key: compositionKey,
    props: {
      handleDOMEvents: {
        compositionstart: (view) => { if (isSuggestChangesEnabled(view.state) && !composing.start) composing.start = view.state.doc; return false; },
        compositionend: (view) => { setTimeout(() => finish(view), 0); return false; },
      },
    },
  });
}

/** The ids of the tracked changes in a document. */
export function changeIds(doc: PMNodeType): Set<string> {
  const out = new Set<string>();
  doc.descendants((n) => { for (const m of n.marks) if (SUGGESTION_RE.test(m.type.name)) out.add(String(m.attrs.id)); });
  return out;
}

/** New change ids get the current author; only the ranges the transaction touched are scanned. */
function registerAuthors(tr: Transaction) {
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const doc = tr.doc;
  tr.steps.forEach((step, i) => {
    const s = step as unknown as { from?: number; to?: number; pos?: number };
    const from = s.from ?? s.pos;
    if (from === undefined) return;
    const to = s.to ?? from + 1;
    const m = tr.mapping.slice(i);
    const a = Math.max(0, m.map(from, -1) - 1);
    const b = Math.min(doc.content.size, m.map(to, 1) + 1);
    doc.nodesBetween(a, Math.max(a, b), (n) => {
      for (const mk of n.marks) {
        const id = String(mk.attrs.id);
        if (SUGGESTION_RE.test(mk.type.name) && !track.registry[id]) {
          track.registry[id] = { author: { ...track.author, name: track.author.name || "?" }, date, origin: "local" };
        }
      }
    });
  });
}

const isInsertedBreak = (n: PMNodeType | null | undefined) => !!n && n.isText && /^​+$/.test(n.text ?? "") && n.marks.some((m) => m.type.name === "insertion");

/**
 * Issue #11 of suggest-changes (record 0090): a tracked Enter is a pair of U+200B with an
 * insertion mark, one at the end of the first paragraph and one at the start of the second;
 * Backspace right after it only took the second and left the paragraphs apart. As in Word,
 * Backspace at the start of the second paragraph (or Delete at the end of the first) now
 * takes the inserted break away and joins them again, untracked: it was never in the text.
 */
export function joinInsertedBreak(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, dir: -1 | 1): boolean {
  if (!isSuggestChangesEnabled(state) || !state.selection.empty) return false;
  const $p = state.selection.$from;
  const block = $p.parent;
  if (!block.isTextblock || $p.depth < 1) return false;
  let from: number, to: number;
  if (dir < 0) {
    // only inserted breaks between the start of the paragraph and the cursor
    if (block.textBetween(0, $p.parentOffset).replace(/​/g, "") !== "") return false;
    const lead = isInsertedBreak(block.firstChild) ? block.firstChild!.nodeSize : 0;
    if ($p.parentOffset > lead) return false;
    const prev = state.doc.resolve($p.before()).nodeBefore;
    if (!prev?.isTextblock || !isInsertedBreak(prev.lastChild)) return false;
    from = $p.before() - 1 - prev.lastChild!.nodeSize;
    to = $p.start() + lead;
  } else {
    const trail = isInsertedBreak(block.lastChild) ? block.lastChild!.nodeSize : 0;
    if (!trail || $p.parentOffset < block.content.size - trail) return false;
    const next = state.doc.resolve($p.after()).nodeAfter;
    if (!next?.isTextblock) return false;
    const lead = isInsertedBreak(next.firstChild) ? next.firstChild!.nodeSize : 0;
    from = $p.end() - trail;
    to = $p.after() + 1 + lead;
  }
  if (dispatch) dispatch(state.tr.delete(from, to).setMeta(suggestChangesKey, { skip: true }).setMeta(untracked, true).scrollIntoView());
  return true;
}

/** Turns edits into tracked changes while tracking is on (Tiptap's dispatchTransaction hook). */
export const TrackChanges = Extension.create({
  name: "trackChanges",
  // before the other Backspace and Delete handlers (lists, indent)
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Backspace: () => joinInsertedBreak(this.editor.state, this.editor.view.dispatch, -1),
      Delete: () => joinInsertedBreak(this.editor.state, this.editor.view.dispatch, 1),
    };
  },
  addProseMirrorPlugins() { return [suggestChanges(), compositionPlugin()]; },
  dispatchTransaction({ transaction, next }) {
    const state = this.editor.state;
    const skip = "skip" in (transaction.getMeta(suggestChangesKey) ?? {}) || transaction.getMeta("history$") || transaction.getMeta("fromOutside") || transaction.getMeta(untracked);
    if (!transaction.docChanged || skip || !isSuggestChangesEnabled(state)) return next(transaction);
    if (composing.start) return next(transaction.setMeta("addToHistory", false));
    // record 0020: a change only joins the one next to it if it is by the same author
    setCanJoinSuggestion((id) => !track.registry[String(id)] || track.registry[String(id)].author.name === track.author.name);
    let tracked: Transaction;
    try { tracked = transformToSuggestionTransaction(transaction, state, () => newId("ch")); }
    finally { setCanJoinSuggestion(null); }
    // the authors first: the marks are drawn with their colour
    registerAuthors(tracked);
    next(tracked);
  },
});

/** Meta for an edit that must never be tracked (accepting or rejecting a change, restoring). */
export const untracked = "untracked";

/**
 * Lets blocks and inline atoms carry tracked-change and comment marks: in ProseMirror a node's
 * marks are allowed by its parent, and a node without inline content allows none by default.
 * Tiptap cannot add that from another extension, so every container gets it here.
 */
export function withNodeMarks(extensions: AnyExtension[]): AnyExtension[] {
  return extensions.map((e) => {
    if (e.type !== "node") return e;
    const config = e.config as { content?: unknown; marks?: unknown };
    // a node that says which marks it takes: as it is
    if (config.marks !== undefined) return e;
    let content = config.content;
    if (typeof content === "function") {
      try { content = (content as (this: unknown) => unknown).call({ name: e.name, options: e.options, storage: {}, parent: undefined }); } catch { content = undefined; }
    }
    // an atom, or a text block (whose text takes every mark): as it is
    if (typeof content !== "string" || !content || /\b(?:inline|text)\b/.test(content)) return e;
    return e.extend({ marks: NODE_MARKS });
  });
}

// ---------------------------------------------------------------- how changes are shown (record 0092)

/**
 * Word's "Display for review": every mark ("all"), the final text with a line in the margin
 * where something changed ("simple"), the final text ("none") or the text before the changes
 * ("original"). Only the view changes: the document keeps every change.
 */
export const MARKUP_VIEWS = ["all", "simple", "none", "original"] as const;
export type MarkupView = (typeof MARKUP_VIEWS)[number];
/** Shows the changes as `view` says (a class on the page, so the table's tab follows it too). */
export function setMarkupView(view: MarkupView) {
  document.documentElement.dataset.markup = view;
}

// ---------------------------------------------------------------- commands for the window

export const isTracking = (state: EditorState) => isSuggestChangesEnabled(state);
export function setTracking(editor: Editor, on: boolean) {
  (on ? enableSuggestChanges : disableSuggestChanges)(editor.state, editor.view.dispatch);
}

/** The tracked change at the cursor (or touching the selection), if any. */
export function changeAt(state: EditorState): { id: string; from: number; to: number } | null {
  const { from, to } = state.selection;
  let found: string | null = null;
  const look = (n: PMNodeType | null | undefined) => { for (const m of n?.marks ?? []) if (SUGGESTION_RE.test(m.type.name)) found = String(m.attrs.id); };
  if (from === to) {
    const $p = state.doc.resolve(from);
    look($p.nodeAfter);
    if (!found) look($p.nodeBefore);
    for (let d = $p.depth; d > 0 && !found; d--) look($p.node(d));
  } else state.doc.nodesBetween(from, to, (n) => { if (!found) look(n); });
  if (!found) return null;
  return { id: found, ...changeRange(state.doc, found)! };
}

/** Where a change is in the document: from its first mark to its last. */
export function changeRange(doc: PMNodeType, id: string): { from: number; to: number } | null {
  let from = -1, to = -1;
  doc.descendants((n, pos) => {
    if (n.marks.some((m) => SUGGESTION_RE.test(m.type.name) && String(m.attrs.id) === id)) {
      if (from < 0) from = pos;
      to = pos + n.nodeSize;
    }
  });
  return from < 0 ? null : { from, to };
}

/** The changes of the document in reading order, with their author and the text they touch. */
export function listChanges(doc: PMNodeType): { id: string; kind: "insertion" | "deletion" | "modification" | "replacement"; text: string; from: number }[] {
  const seen = new Map<string, { id: string; kinds: Set<string>; text: string; from: number }>();
  doc.descendants((n, pos) => {
    for (const m of n.marks) {
      if (!SUGGESTION_RE.test(m.type.name)) continue;
      const id = String(m.attrs.id);
      const c = seen.get(id) ?? { id, kinds: new Set<string>(), text: "", from: pos };
      c.kinds.add(m.type.name);
      if (c.text.length < 200) c.text += n.isText ? n.text : n.isLeaf ? "" : ` ${n.textContent} `;
      seen.set(id, c);
    }
  });
  return [...seen.values()].map((c) => ({
    id: c.id, from: c.from, text: c.text.replace(/​/g, "").replace(/\s+/g, " ").trim(),
    kind: c.kinds.has("insertion") && c.kinds.has("deletion") ? "replacement" : ([...c.kinds][0] as "insertion"),
  }));
}

/** Accepts or rejects one change, or all of them; never tracked, one undo step. */
export function decide(editor: Editor, accept: boolean, id?: string) {
  const dispatch = (tr: Transaction) => editor.view.dispatch(tr.setMeta(untracked, true));
  if (id) (accept ? applySuggestion : revertSuggestion)(id)(editor.state, dispatch);
  else (accept ? applySuggestions : revertSuggestions)(editor.state, dispatch);
}

/** Goes to the next (1) or previous (-1) change after or before the cursor; false when there is none. */
export function stepChange(editor: Editor, dir: 1 | -1): boolean {
  const all = listChanges(editor.state.doc);
  if (!all.length) return false;
  const at = editor.state.selection.from;
  const here = changeAt(editor.state)?.id;
  const next = dir > 0
    ? all.find((c) => c.from > at && c.id !== here) ?? all[0]
    : [...all].reverse().find((c) => c.from < at && c.id !== here) ?? all[all.length - 1];
  const r = changeRange(editor.state.doc, next.id);
  if (!r) return false;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, r.from, r.to)));
  // only the desk scrolls, never the window (reveal.ts)
  const scroller = scrollerOf(editor.view.dom);
  try {
    const a = editor.view.coordsAtPos(r.from);
    if (scroller) revealIn(scroller, new DOMRect(a.left, a.top, 1, Math.max(1, a.bottom - a.top)), "center");
  } catch { /* hidden: leave it */ }
  return true;
}

/** The registry the files keep: only the changes still in the document. */
export function registryFor(doc: PMNodeType): Record<string, ChangeRecord> {
  const ids = changeIds(doc);
  return Object.fromEntries(Object.entries(track.registry).filter(([id]) => ids.has(id)));
}
