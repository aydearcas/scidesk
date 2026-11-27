// The proposals of a returned copy in the manuscript (record 0097): each one that can be
// placed goes into the text as a tracked change of its author, so it is read, accepted and
// rejected as any other change (and as Word does after "Compare"); its registry entry says
// which proposal it comes from (`source`). What cannot go into the text stays in the panel:
// comments (accepting one anchors it, adds its replies, resolves or removes it), proposals
// that take back a change that went with the copy (accepting one rejects that change) and
// those that fall on text written since.
import type { Editor } from "@tiptap/core";
import type { Node as PMNodeType, Mark } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { newId, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { placeProposal, type PlaceProblem, type Placement, type Proposal } from "@scidesk/core";
import { changeIds, track, untracked } from "./track-changes.ts";
import { comments, removeComment, updateComment, type CommentRecord } from "./comments.ts";

const ATOM = "\ufffc";
const SUGGESTION = /^(?:insertion|deletion|modification)$/;
const TEXTBLOCK = /^(paragraph|heading|title|tableCaption|tableNote|figureCaption|figureNote)$/;

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

/** What a proposal is now, for the panel. */
export type ProposalState =
  | { kind: "decided" }
  | { kind: "in-text"; changes: string[] }
  | { kind: "reverts"; change: string }
  | { kind: "comment"; at: Placement | null; problem?: PlaceProblem }
  | { kind: "can-place"; at: Placement }
  | { kind: "problem"; problem: PlaceProblem };

export function proposalStates(doc: PMNodeType, set: ProposalSetFile, base: Map<string, PMNode>): Map<string, ProposalState> {
  const inText = proposalChanges(doc);
  const idx = blockIndex(doc);
  const json = new Map<string, PMNode>();
  const current = (id: string) => {
    if (!json.has(id)) { const b = idx.get(id); if (b) json.set(id, b.node.toJSON() as PMNode); }
    return json.get(id);
  };
  const out = new Map<string, ProposalState>();
  for (const p of set.proposals) {
    if (p.status === "noise-hidden") continue;
    const changes = inText.get(p.id);
    // in the text again (an accept or reject undone): pending again
    if (changes) { out.set(p.id, { kind: "in-text", changes }); continue; }
    if (p.decision !== "pending") { out.set(p.id, { kind: "decided" }); continue; }
    const at = placeProposal(p, (id) => base.get(id), current);
    if (p.kind === "comment") {
      const missing = p.comment?.thread && !comments.registry[p.comment.thread] ? "missing" : undefined;
      out.set(p.id, "problem" in at ? { kind: "comment", at: null, problem: at.problem } : { kind: "comment", at, ...(missing ? { problem: missing } : {}) });
    } else if ("problem" in at) out.set(p.id, { kind: "problem", problem: at.problem });
    else if ("reverts" in at && at.reverts) out.set(p.id, { kind: "reverts", change: at.reverts });
    else out.set(p.id, { kind: "can-place", at });
  }
  return out;
}

const textOf = (s: string) => s.replaceAll(ATOM, "").replace(/[\r\n]+/g, " ");

/**
 * Brings the proposals that can be placed (`which`, or every pending one) into the text as
 * tracked changes of their authors, in one step that can be undone. The proposals placed.
 */
export function bringIntoText(editor: Editor, set: ProposalSetFile, states: Map<string, ProposalState>, which?: Set<string>): string[] {
  const state = editor.state;
  const { schema, doc } = state;
  const idx = blockIndex(doc);
  type Op = { p: Proposal; from: number; to: number; run: (tr: import("@tiptap/pm/state").Transaction, mark: Mark) => void };
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
      ops.push({ p, from: pos, to: pos, run: (tr, mark) => { tr.insert(pos, para(mark)); } });
      continue;
    }
    const b = idx.get(at.block);
    if (!b) continue;
    const from = b.pos + 1 + at.from, to = b.pos + 1 + at.to;
    if (p.kind === "delete-paragraph") {
      ops.push({ p, from: b.pos, to: b.pos + b.node.nodeSize, run: (tr, mark) => {
        tr.addNodeMark(b.pos, mark);
        if (b.node.content.size) tr.addMark(b.pos + 1, b.pos + 1 + b.node.content.size, mark);
      } });
      continue;
    }
    const text = textOf(p.after);
    if ((p.kind === "insert" || p.kind === "replace") && !text) continue;
    const marks = keepMarks(to);
    ops.push({ p, from, to, run: (tr, mark) => {
      if (text) tr.insert(to, schema.text(text, [...marks, mark]));
      if (to > from) tr.addMark(from, to, schema.marks.deletion.create({ id: mark.attrs.id }));
    } });
  }
  // later first, so the earlier positions still hold; two that overlap: the first only
  ops.sort((x, y) => y.from - x.from || y.to - x.to);
  const tr = state.tr;
  const placed: string[] = [];
  let floor = Infinity;
  for (const op of ops) {
    if (op.to > floor) continue;
    const id = newId("ch");
    track.registry[id] = { author: op.p.author, date: op.p.date ?? set.created, origin: "docx", source: op.p.id };
    op.run(tr, schema.marks.insertion.create({ id }));
    placed.push(op.p.id);
    floor = op.from;
  }
  if (tr.docChanged) editor.view.dispatch(tr.setMeta(untracked, true));
  return placed;
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
