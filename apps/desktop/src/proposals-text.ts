// The proposals of the returned copies in the manuscript (record 0097): each one that can be
// placed goes into the text as a tracked change of its author, so it is read, accepted and
// rejected as any other change (and as Word does after "Compare"); its registry entry says
// which proposal it comes from (`source`). Several copies can be in the text at once, in the
// order the user chose: a proposal of a later copy that does what an earlier one already does
// in the text agrees with it, and one that touches the same text another way is a conflict,
// decided on its card. What cannot go into the text stays in the panel: comments (accepting
// one anchors it, adds its replies, resolves or removes it), proposals that take back a change
// that went with the copy (accepting one rejects that change) and those that fall on text the
// author wrote since.
import type { Editor } from "@tiptap/core";
import type { Node as PMNodeType, Mark } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { newId, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { placeProposal, type PlaceProblem, type Placement, type Proposal } from "@scidesk/core";
import { revertSuggestion, suggestChangesKey } from "@scidesk/suggest-changes";
import { changeIds, track, untracked } from "./track-changes.ts";
import { comments, removeComment, updateComment, type CommentRecord } from "./comments.ts";

const ATOM = "\ufffc";
const SUGGESTION = /^(?:insertion|deletion|modification)$/;
const TEXTBLOCK = /^(paragraph|heading|title|tableCaption|tableNote|figureCaption|figureNote)$/;

/** A copy as the window works with it: its set of proposals and the blocks of the version it was sent from. */
export interface Copy { file: string; name: string; set: ProposalSetFile; base: Map<string, PMNode> | null }

/** The blocks of the editor's document by id, with where each one starts. */
export function blockIndex(doc: PMNodeType): Map<string, { node: PMNodeType; pos: number }> {
  const out = new Map<string, { node: PMNodeType; pos: number }>();
  doc.descendants((n, pos) => {
    const id = n.attrs.id;
    if (typeof id === "string" && /^(b|n)-/.test(id)) out.set(id, { node: n, pos });
    return !(n.type.name === "keywords" || TEXTBLOCK.test(n.type.name));
  });
  return out;
}

/** The tracked changes in the text that come from each proposal (by the registry's `source`). */
export function proposalChanges(doc: PMNodeType): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of changeIds(doc)) {
    const src = track.registry[id]?.source;
    if (src?.startsWith("pr-")) out.set(src, [...(out.get(src) ?? []), id]);
  }
  return out;
}
/** Whether a tracked change comes from a proposal of a copy. */
const fromCopy = (id: string) => !!track.registry[id]?.source?.startsWith("pr-");
/** Who made each change, once each. */
const authorsOf = (ids: string[]) => [...new Set(ids.map((id) => track.registry[id]?.author.name ?? "?"))];

/** What a proposal is now, for the panel. */
export type ProposalState =
  | { kind: "decided" }
  /** In the text; `others`: proposals of other copies that agree with it or clash with it. */
  | { kind: "in-text"; changes: string[]; others?: { name: string; agrees: boolean }[] }
  | { kind: "reverts"; change: string }
  /** Another copy's change in the text does the same: deciding that one decides this one. */
  | { kind: "agrees"; changes: string[]; with: string[] }
  /** Another copy's change in the text touches the same text another way. */
  | { kind: "conflict"; changes: string[]; with: string[] }
  | { kind: "comment"; at: Placement | null; problem?: PlaceProblem }
  | { kind: "can-place"; at: Placement }
  | { kind: "problem"; problem: PlaceProblem };

/** What each proposal of the copies is now, in the document `doc`. */
export function proposalStates(doc: PMNodeType, copies: Copy[]): Map<string, ProposalState> {
  const inText = proposalChanges(doc);
  const idx = blockIndex(doc);
  const json = new Map<string, PMNode>();
  const current = (id: string) => {
    if (!json.has(id)) { const b = idx.get(id); if (b) json.set(id, b.node.toJSON() as PMNode); }
    return json.get(id);
  };
  const out = new Map<string, ProposalState>();
  const owner = new Map<string, string>();
  for (const [pr, chs] of inText) for (const c of chs) owner.set(c, pr);
  for (const { set, base } of copies) {
    for (const p of set.proposals) {
      if (p.status === "noise-hidden") continue;
      const changes = inText.get(p.id);
      // in the text again (an accept or reject undone): pending again
      if (changes) { out.set(p.id, { kind: "in-text", changes }); continue; }
      if (p.decision !== "pending") { out.set(p.id, { kind: "decided" }); continue; }
      if (!base) { out.set(p.id, { kind: "problem", problem: "missing" }); continue; }
      const at = placeProposal(p, (id) => base.get(id), current, { foreign: fromCopy });
      if (p.kind === "comment") {
        const missing = p.comment?.thread && !comments.registry[p.comment.thread] ? "missing" : undefined;
        out.set(p.id, "problem" in at ? { kind: "comment", at: null, problem: at.problem } : "agrees" in at || "conflict" in at ? { kind: "comment", at: null } : { kind: "comment", at, ...(missing ? { problem: missing } : {}) });
      } else if ("problem" in at) out.set(p.id, { kind: "problem", problem: at.problem });
      else if ("agrees" in at) out.set(p.id, { kind: "agrees", changes: at.agrees, with: authorsOf(at.agrees) });
      else if ("conflict" in at) out.set(p.id, { kind: "conflict", changes: at.conflict, with: authorsOf(at.conflict) });
      else if ("reverts" in at && at.reverts) out.set(p.id, { kind: "reverts", change: at.reverts });
      else out.set(p.id, { kind: "can-place", at });
    }
  }
  // the card of a change in the text says who agrees with it and who clashes with it
  for (const { set } of copies) {
    for (const p of set.proposals) {
      const s = out.get(p.id);
      if (s?.kind !== "agrees" && s?.kind !== "conflict") continue;
      for (const c of s.changes) {
        const st = out.get(owner.get(c) ?? "");
        if (st?.kind === "in-text") st.others = [...(st.others ?? []), { name: p.author.name, agrees: s.kind === "agrees" }];
      }
    }
  }
  return out;
}

const textOf = (s: string) => s.replaceAll(ATOM, "").replace(/[\r\n]+/g, " ");

/**
 * Adds to `tr` the proposals of `set` that can be placed (by `states`, worked out on `tr.doc`;
 * only `which`, if given) as tracked changes of their authors. The proposals placed.
 */
export function placeInto(tr: Transaction, set: ProposalSetFile, states: Map<string, ProposalState>, which?: Set<string>): string[] {
  const doc = tr.doc;
  const schema = doc.type.schema;
  const idx = blockIndex(doc);
  type Op = { p: Proposal; from: number; to: number; run: (mark: Mark) => void };
  const ops: Op[] = [];
  const keepMarks = (pos: number) => doc.resolve(pos).marks().filter((m) => !SUGGESTION.test(m.type.name));
  for (const p of set.proposals) {
    const s = states.get(p.id);
    if (s?.kind !== "can-place" || (which && !which.has(p.id))) continue;
    const at = s.at;
    if ("after" in at) {
      const b = idx.get(at.after);
      if (!b) continue;
      const pos = b.pos + b.node.nodeSize;
      const $pos = doc.resolve(pos);
      const text = textOf(p.after).trim();
      const para = (mark: Mark) => schema.nodes.paragraph.create({ id: newId("b") }, text ? schema.text(text, [mark]) : null, [mark]);
      const probe = para(schema.marks.insertion.create({ id: "ch-probe" }));
      if (!$pos.parent.canReplace($pos.index(), $pos.index(), Fragment.from(probe))) continue;
      ops.push({ p, from: pos, to: pos, run: (mark) => { tr.insert(pos, para(mark)); } });
      continue;
    }
    const b = idx.get(at.block);
    if (!b) continue;
    const from = b.pos + 1 + at.from, to = b.pos + 1 + at.to;
    if (p.kind === "delete-paragraph") {
      ops.push({ p, from: b.pos, to: b.pos + b.node.nodeSize, run: (mark) => {
        tr.addNodeMark(b.pos, mark);
        if (b.node.content.size) tr.addMark(b.pos + 1, b.pos + 1 + b.node.content.size, mark);
      } });
      continue;
    }
    const text = textOf(p.after);
    if ((p.kind === "insert" || p.kind === "replace") && !text) continue;
    const marks = keepMarks(to);
    ops.push({ p, from, to, run: (mark) => {
      if (text) tr.insert(to, schema.text(text, [...marks, mark]));
      if (to > from) tr.addMark(from, to, schema.marks.deletion.create({ id: mark.attrs.id }));
    } });
  }
  // later first, so the earlier positions still hold; two that overlap: the first only
  ops.sort((x, y) => y.from - x.from || y.to - x.to);
  const placed: string[] = [];
  let floor = Infinity;
  for (const op of ops) {
    if (op.to > floor) continue;
    const id = newId("ch");
    track.registry[id] = { author: op.p.author, date: op.p.date ?? set.created, origin: "docx", source: op.p.id };
    op.run(schema.marks.insertion.create({ id }));
    placed.push(op.p.id);
    floor = op.from;
  }
  return placed;
}

/** Brings proposals of one copy into the text, in one step that can be undone. The proposals placed. */
export function bringIntoText(editor: Editor, copy: Copy, all: Copy[], which?: Set<string>): string[] {
  const tr = editor.state.tr;
  const placed = placeInto(tr, copy.set, proposalStates(tr.doc, all), which);
  if (tr.docChanged) editor.view.dispatch(tr.setMeta(untracked, true));
  return placed;
}

/** The text a change inserts and the text it deletes, by change id. */
function changeTexts(doc: PMNodeType): Map<string, { ins: string; del: string }> {
  const out = new Map<string, { ins: string; del: string }>();
  doc.descendants((n) => {
    for (const m of n.marks) {
      if (m.type.name !== "insertion" && m.type.name !== "deletion") continue;
      const id = String(m.attrs.id);
      const e = out.get(id) ?? { ins: "", del: "" };
      const text = n.isText ? n.text! : n.isLeaf ? ATOM : "";
      if (m.type.name === "insertion") e.ins += text; else e.del += text;
      out.set(id, e);
    }
  });
  return out;
}

/**
 * Lays the copies out again: the changes of every copy that are in the text as they were put
 * there (nobody wrote inside them) are taken out, and the copies in `shown` go back in, in that
 * order, so an earlier copy wins where two meet. One step that can be undone; nothing is
 * decided. The proposals placed.
 */
export function layOut(editor: Editor, all: Copy[], shown: Copy[]): string[] {
  const doc = editor.state.doc;
  const byId = new Map(all.flatMap((c) => c.set.proposals.map((p) => [p.id, p] as const)));
  const texts = changeTexts(doc);
  const out: string[] = [];
  for (const [pr, chs] of proposalChanges(doc)) {
    const p = byId.get(pr);
    if (!p) continue;
    const ins = chs.map((c) => texts.get(c)?.ins ?? "").join("").replaceAll("\u200b", "");
    const del = chs.map((c) => texts.get(c)?.del ?? "").join("");
    const wants = p.kind === "delete-paragraph" ? { ins: "", del: p.before } : { ins: p.kind === "insert-paragraph" ? textOf(p.after).trim() : textOf(p.after), del: p.kind === "insert-paragraph" ? "" : p.before };
    if (ins === wants.ins && del.replaceAll(ATOM, "") === wants.del.replaceAll(ATOM, "")) out.push(...chs);
  }
  let state: EditorState = editor.state;
  const steps: Transaction["steps"][number][] = [];
  for (const id of out) revertSuggestion(id)(state, (t: Transaction) => { steps.push(...t.steps); state = state.apply(t); });
  const tr = editor.state.tr;
  for (const s of steps) tr.step(s);
  const placed: string[] = [];
  for (const c of shown) placed.push(...placeInto(tr, c.set, proposalStates(tr.doc, all)));
  if (tr.docChanged) editor.view.dispatch(tr.setMeta(suggestChangesKey, { skip: true }).setMeta(untracked, true));
  return placed;
}

/**
 * "Use this one" on a conflict: the other copies' changes it clashes with are rejected and
 * this proposal goes into the text in their place, in one step. The proposals rejected.
 */
export function chooseInstead(editor: Editor, copy: Copy, all: Copy[], id: string, clashing: string[]): string[] {
  let state: EditorState = editor.state;
  const steps: Transaction["steps"][number][] = [];
  for (const c of clashing) revertSuggestion(c)(state, (t: Transaction) => { steps.push(...t.steps); state = state.apply(t); });
  const tr = editor.state.tr;
  for (const s of steps) tr.step(s);
  placeInto(tr, copy.set, proposalStates(tr.doc, all), new Set([id]));
  if (tr.docChanged) editor.view.dispatch(tr.setMeta(suggestChangesKey, { skip: true }).setMeta(untracked, true));
  return [...new Set(clashing.map((c) => track.registry[c]?.source).filter((s): s is string => !!s))];
}

/**
 * Accepts a comment proposal: a new comment is anchored where it was in the copy (with its
 * replies and resolved or not); for a comment that was sent, its new replies are added and it
 * is resolved, reopened or removed. The new comment id (true for one sent), or false when there
 * is nowhere to put it.
 */
export function acceptCommentProposal(view: EditorView, p: Proposal, at: Placement | null): string | boolean {
  const c = p.comment;
  if (!c) return false;
  if (c.thread) {
    if (!comments.registry[c.thread]) return false;
    if (c.removed) { removeComment(view, c.thread); return true; }
    updateComment(c.thread, (r) => ({ ...r, replies: [...r.replies, ...c.replies], resolved: c.resolved ?? r.resolved }));
    return true;
  }
  if (!at || "after" in at) return false;
  const idx = blockIndex(view.state.doc);
  const b = idx.get(at.block);
  if (!b) return false;
  let from = b.pos + 1 + at.from, to = b.pos + 1 + at.to;
  if (at.end) { const e = idx.get(at.end.block); if (e) to = e.pos + 1 + at.end.to; }
  // a comment on nothing (the text it was on is gone): on its whole paragraph
  if (to <= from) { from = b.pos + 1; to = b.pos + 1 + b.node.content.size; }
  if (to <= from) return false;
  const id = newId("cm");
  const record: CommentRecord = { author: p.author, date: p.date ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), origin: "docx", text: c.text, resolved: !!c.resolved, replies: c.replies };
  comments.registry[id] = record;
  view.dispatch(view.state.tr.addMark(from, to, view.state.schema.marks.comment.create({ id })).setMeta(untracked, true));
  for (const f of comments.listeners) f();
  return id;
}
