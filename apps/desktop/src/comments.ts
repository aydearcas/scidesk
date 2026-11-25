// Comments in the editor (phase 2a, record 0094; design proposal 3.3 and 4.2, D5): text is
// anchored to a comment with a `comment` mark that carries its id; who wrote it, when, its
// text, its replies and whether it is resolved go to the `comments` registry of the .scidoc,
// next to `changes` (record 0031). Comments may overlap, as in Word. Adding, resolving or
// removing a comment is never a tracked change. The threads are shown in the right panel,
// in the order of the text (ReviewPanel.tsx).
import { Mark, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Fragment, Slice, type Mark as PMMark, type Node as PMNodeType } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { newId, type DocumentFile } from "@scidesk/formats";
import { revealIn, scrollerOf } from "./reveal.ts";
import { untracked } from "./track-changes.ts";

export type CommentRecord = DocumentFile["comments"][string];
export type CommentAuthor = CommentRecord["author"];

/**
 * The article's registry of comments (filled from its files when it is shown) and who is
 * listening: the window marks the article as changed (to save it) and redraws the panel
 * whenever a comment's text, replies or state change, which are not in the document.
 */
export const comments: { registry: Record<string, CommentRecord>; listeners: Set<() => void> } = {
  registry: {},
  listeners: new Set(),
};
const changed = () => { for (const f of comments.listeners) f(); };
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export const CommentMark = Mark.create({
  name: "comment",
  // typing at its edges does not extend it, as in Word; comments may overlap
  inclusive: false,
  excludes: "",
  addAttributes: () => ({
    id: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-comment"), renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: "span[data-comment]", consuming: false }],
  renderHTML: ({ mark }) => ["span", { "data-comment": String(mark.attrs.id), class: "comment" }, 0],
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("commentPaste"),
      props: {
        // a copy of commented text is pasted without the comment (it is still where it was);
        // text that was cut keeps it (it moves), as in Word; one from elsewhere never has one
        transformPasted: (slice, view) => pastedComments(slice, view.state.doc),
      },
    })];
  },
});

function stripFragment(f: Fragment, drop: (m: PMMark) => boolean): Fragment {
  const out: PMNodeType[] = [];
  f.forEach((n) => {
    const marks = n.marks.filter((m) => !drop(m));
    if (n.isText) out.push(marks.length === n.marks.length ? n : n.mark(marks));
    else out.push(n.copy(stripFragment(n.content, drop)).mark(marks));
  });
  return Fragment.from(out);
}
const stripMarks = (s: Slice, drop: (m: PMMark) => boolean) => new Slice(stripFragment(s.content, drop), s.openStart, s.openEnd);

/** What is pasted keeps only the comments that are not in the document any more (it was cut) and that the article knows. */
export function pastedComments(slice: Slice, doc: PMNodeType): Slice {
  const here = commentIds(doc);
  return stripMarks(slice, (m) => m.type.name === "comment" && (here.has(String(m.attrs.id)) || !comments.registry[String(m.attrs.id)]));
}

// ---------------------------------------------------------------- reading the document

const commentMarks = (n: PMNodeType) => n.marks.filter((m) => m.type.name === "comment");

/** The ids of the comments anchored in a document. */
export function commentIds(doc: PMNodeType): Set<string> {
  const out = new Set<string>();
  doc.descendants((n) => { for (const m of commentMarks(n)) out.add(String(m.attrs.id)); });
  return out;
}

/** Where a comment is anchored: from its first marked node to its last. */
export function commentRange(doc: PMNodeType, id: string): { from: number; to: number } | null {
  let from = -1, to = -1;
  doc.descendants((n, pos) => {
    if (commentMarks(n).some((m) => String(m.attrs.id) === id)) {
      if (from < 0) from = pos;
      to = pos + n.nodeSize;
    }
  });
  return from < 0 ? null : { from, to };
}

export interface CommentAnchor { id: string; from: number; to: number; text: string }
/** The comments of a document in reading order, with the text they are anchored to. */
export function listComments(doc: PMNodeType): CommentAnchor[] {
  const seen = new Map<string, CommentAnchor>();
  doc.descendants((n, pos) => {
    for (const m of commentMarks(n)) {
      const id = String(m.attrs.id);
      const c = seen.get(id) ?? { id, from: pos, to: pos, text: "" };
      c.to = pos + n.nodeSize;
      if (c.text.length < 240) c.text += n.isText ? n.text : n.isLeaf ? "" : ` ${n.textContent} `;
      seen.set(id, c);
    }
  });
  return [...seen.values()].map((c) => ({ ...c, text: c.text.replace(/​/g, "").replace(/\s+/g, " ").trim() }));
}

/**
 * The comment at the cursor, or the one the selection touches: with several (overlapping
 * comments), the one anchored to the shortest text, which is the one inside.
 */
export function commentAt(state: EditorState): string | null {
  const { from, to, empty } = state.selection;
  const ids = new Set<string>();
  const look = (n: PMNodeType | null | undefined) => { for (const m of n ? commentMarks(n) : []) ids.add(String(m.attrs.id)); };
  if (empty) {
    const $p = state.doc.resolve(from);
    // inside the marked text, not merely next to it: both sides, or the side the cursor is in
    const after = $p.nodeAfter ? new Set(commentMarks($p.nodeAfter).map((m) => String(m.attrs.id))) : new Set<string>();
    const before = $p.nodeBefore ? commentMarks($p.nodeBefore).map((m) => String(m.attrs.id)) : [];
    for (const id of before) ids.add(id);
    for (const id of after) ids.add(id);
  } else state.doc.nodesBetween(from, to, (n) => { look(n); });
  if (!ids.size) return null;
  let best: string | null = null, size = Infinity;
  for (const id of ids) {
    const r = commentRange(state.doc, id);
    if (r && r.to - r.from < size) { best = id; size = r.to - r.from; }
  }
  return best;
}

/**
 * What a comment takes with nothing selected: the word at the cursor (letters, digits, hyphens
 * and apostrophes); next to a sign or an inline atom (a note call, a citation), what is
 * written there without spaces, "(4,3–5,8)ᵃ"; between spaces, the nearest of those before the
 * cursor, or after it. Null only in a block with no text at all.
 */
export function wordAt(state: EditorState): { from: number; to: number } | null {
  const $p = state.selection.$from;
  const block = $p.parent;
  if (!block.isTextblock) return null;
  // one character per inline atom, so that offsets are positions in the block
  const text = block.textBetween(0, block.content.size, undefined, "￼");
  const around = (at: number, test: (c: string) => boolean): [number, number] | null => {
    let a = at, b = at;
    while (a > 0 && test(text[a - 1])) a--;
    while (b < text.length && test(text[b])) b++;
    return a < b ? [a, b] : null;
  };
  const isWord = (c: string) => /[\p{L}\p{N}'’-]/u.test(c);
  const isToken = (c: string) => /\S/u.test(c.replace(/​/g, " "));
  const at = $p.parentOffset;
  let r = around(at, isWord) ?? around(at, isToken);
  if (!r) {
    let a = at;
    while (a > 0 && !isToken(text[a - 1])) a--;
    let b = at;
    while (b < text.length && !isToken(text[b])) b++;
    r = a > 0 ? around(a, isToken) : b < text.length ? around(b, isToken) : null;
  }
  if (!r) return null;
  const start = $p.start();
  return { from: start + r[0], to: start + r[1] };
}

// ---------------------------------------------------------------- commands

const commentTr = (tr: Transaction) => tr.setMeta(untracked, true);

/**
 * Anchors a new comment to the selection (or to the word at the cursor) and registers it
 * with no text yet: the panel asks for it. Its id, or null when there is no text to anchor it to.
 */
export function addComment(view: EditorView, author: CommentAuthor): string | null {
  const state = view.state;
  const sel = state.selection;
  const range = sel.empty ? wordAt(state) : { from: sel.from, to: sel.to };
  if (!range || !state.doc.textBetween(range.from, range.to, " ", "￼").trim()) return null;
  const id = newId("cm");
  comments.registry[id] = { author, date: now(), origin: "local", text: "", resolved: false, replies: [] };
  const mark = state.schema.marks.comment.create({ id });
  view.dispatch(commentTr(state.tr.addMark(range.from, range.to, mark)));
  changed();
  return id;
}

/** Takes a comment out of the text (the text stays); one undo step brings it back. */
export function removeComment(view: EditorView, id: string) {
  const r = commentRange(view.state.doc, id);
  if (r) view.dispatch(commentTr(view.state.tr.removeMark(r.from, r.to, view.state.schema.marks.comment.create({ id }))));
  changed();
}

/** Changes a comment's registry entry (its text, its replies, whether it is resolved). */
export function updateComment(id: string, f: (c: CommentRecord) => CommentRecord) {
  const c = comments.registry[id];
  if (!c) return;
  comments.registry[id] = f(c);
  changed();
}
export const setCommentText = (id: string, text: string) => updateComment(id, (c) => ({ ...c, text }));
export const resolveComment = (id: string, resolved: boolean) => updateComment(id, (c) => ({ ...c, resolved }));
export const replyToComment = (id: string, author: CommentAuthor, text: string) =>
  updateComment(id, (c) => ({ ...c, resolved: false, replies: [...c.replies, { author, date: now(), text }] }));
export const removeReply = (id: string, index: number) => updateComment(id, (c) => ({ ...c, replies: c.replies.filter((_, i) => i !== index) }));

/** Selects a comment's text and scrolls the desk (never the window) to it. */
export function goToComment(view: EditorView, id: string): boolean {
  const r = commentRange(view.state.doc, id);
  if (!r) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, r.from, r.to)));
  const scroller = scrollerOf(view.dom);
  try {
    const a = view.coordsAtPos(r.from);
    if (scroller) revealIn(scroller, new DOMRect(a.left, a.top, 1, Math.max(1, a.bottom - a.top)), "center");
  } catch { /* hidden: leave it */ }
  return true;
}

/** The next (1) or previous (-1) comment after or before the cursor, resolved ones left out; null when there is none. */
export function stepComment(editor: Editor, dir: 1 | -1): string | null {
  const all = listComments(editor.state.doc).filter((c) => !comments.registry[c.id]?.resolved);
  if (!all.length) return null;
  const at = editor.state.selection.from;
  const here = commentAt(editor.state);
  const next = dir > 0
    ? all.find((c) => c.from > at && c.id !== here) ?? all[0]
    : [...all].reverse().find((c) => c.from < at && c.id !== here) ?? all[all.length - 1];
  return goToComment(editor.view, next.id) ? next.id : null;
}

/** The registry the files keep: only the comments still anchored in the document. */
export function commentRegistryFor(doc: PMNodeType): Record<string, CommentRecord> {
  const ids = commentIds(doc);
  return Object.fromEntries(Object.entries(comments.registry).filter(([id]) => ids.has(id)));
}

// ---------------------------------------------------------------- how they are drawn

let sheet: HTMLStyleElement | null = null;
/**
 * The comment the user is on stands out and resolved ones lose their colour. A rule per id in
 * a style sheet of the page, so the document is never redrawn for it (and the table's tab follows).
 */
export function paintComments(active: string | null) {
  if (typeof document === "undefined") return;
  if (!sheet) { sheet = document.createElement("style"); sheet.dataset.comments = ""; document.head.appendChild(sheet); }
  const sel = (id: string) => `.ProseMirror span.comment[data-comment="${id.replace(/[^a-z0-9-]/g, "")}"]`;
  const resolved = Object.entries(comments.registry).filter(([, c]) => c.resolved).map(([id]) => sel(id));
  sheet.textContent = [
    resolved.length ? `${resolved.join(",")} { background: none; border-bottom-color: transparent; }` : "",
    active ? `${sel(active)} { background: var(--comment-active); border-bottom-color: var(--comment-line-active); }` : "",
  ].join("\n");
}
