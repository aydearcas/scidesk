// Where each proposal of a returned copy goes in the text as it is now (record 0097): the
// proposals are anchored in the version sent (record 0031), and the author may have kept
// writing since. Each block of the version sent is compared with the same block now; a
// proposal whose text the author has not touched since goes where that text is now, one
// that falls on text changed since, or on a tracked change, is left in the panel. The window
// brings the ones that can be placed into the text as tracked changes of their author.
import { diffChars, diffWordsWithSpace } from "diff";
import { stableStringify, type PMNode, type ProposalSetFile, type RoundFile } from "@scidesk/formats";
import { ATOM } from "./docx-read.ts";
import { keywordsText } from "./docx-export.ts";
import type { Project } from "./project.ts";
import { loadSnapshot } from "./snapshot.ts";

export type Proposal = ProposalSetFile["proposals"][number];
const SUGGESTION = /^(?:insertion|deletion|modification)$/;
const TEXTBLOCK = /^(paragraph|heading|title|tableCaption|tableNote|figureCaption|figureNote)$/;
const tracked = (n: PMNode) => (n.marks ?? []).some((m) => SUGGESTION.test(m.type));

/**
 * A block's content as the proposals' offsets count it: in a text block, one unit per
 * ProseMirror offset (a character of text, or ATOM for an inline atom), deleted text and the
 * U+200B of a tracked split included; keywords as "a; b; c". `pm` gives, for each boundary
 * between units, its ProseMirror offset inside the block (null: between two keywords), and
 * `marked` says which units carry a tracked change.
 */
export interface BlockUnits {
  text: string; pm: (number | null)[]; marked: boolean[]; keywords?: boolean;
  /** In a text block, the tracked change on each unit (its id and whether it is an insertion or a deletion). */
  changes?: ({ id: string; type: string } | null)[];
}

export function blockUnits(n: PMNode): BlockUnits | null {
  if (n.type === "keywords") {
    const kws = n.content ?? [];
    const anyMark = tracked(n) || kws.some((k) => tracked(k) || (k.content ?? []).some(tracked));
    const text = keywordsText(n);
    // with tracked changes in them, the keywords cannot be placed into: every unit marked
    if (anyMark) return { text, pm: Array(text.length + 1).fill(null), marked: Array(text.length).fill(true), keywords: true };
    const pm: (number | null)[] = [];
    let out = "";
    let off = 0;
    for (const k of kws) {
      const units = (k.content ?? []).map((c) => (c.type === "text" ? c.text! : ATOM)).join("").replaceAll("\u200b", "");
      if (units) {
        if (out) { out += "; "; pm[out.length - 1] = null; }
        for (let i = 0; i <= units.length; i++) pm[out.length + i] = off + 1 + i;
        out += units;
      }
      off += (k.content ?? []).reduce((s, c) => s + (c.type === "text" ? c.text!.length : 1), 0) + 2;
    }
    if (!pm.length) pm.push(1);
    return { text: out, pm, marked: Array(out.length).fill(false), keywords: true };
  }
  if (!TEXTBLOCK.test(n.type)) return null;
  let text = "";
  const marked: boolean[] = [];
  const changes: ({ id: string; type: string } | null)[] = [];
  for (const c of n.content ?? []) {
    const unit = c.type === "text" ? c.text! : ATOM;
    text += unit;
    const m = (c.marks ?? []).find((k) => SUGGESTION.test(k.type));
    for (let i = 0; i < unit.length; i++) { marked.push(!!m); changes.push(m ? { id: String(m.attrs?.id), type: m.type } : null); }
  }
  return { text, pm: Array.from({ length: text.length + 1 }, (_, i) => i), marked, changes };
}

/** Offsets of `a` mapped to `b` (a block as it was sent, and as it is now), and what changed between them. */
export function blockMapping(a: string, b: string) {
  // [start in a, start in b, length] of each piece that is the same
  const same: [number, number, number][] = [];
  const removed: [number, number][] = [];
  const inserted: number[] = [];
  if (a === b) same.push([0, 0, a.length]);
  else {
    let i = 0, j = 0;
    for (const part of diffChars(a, b)) {
      const n = part.value.length;
      if (part.added) { inserted.push(i); j += n; } else if (part.removed) { removed.push([i, i + n]); i += n; } else { same.push([i, j, n]); i += n; j += n; }
    }
  }
  return {
    /** Where offset `off` of `a` is in `b`; inside text removed since, where that text was. */
    map(off: number): number {
      let last = 0;
      for (const [x, y, n] of same) {
        if (off < x) return y;
        if (off <= x + n) return y + off - x;
        last = y + n;
      }
      return last;
    },
    /** Whether the range from–to of `a` (a point when equal) touches what changed. */
    changed(from: number, to: number): boolean {
      if (removed.some(([x, y]) => (from === to ? x < from && from < y : x < to && from < y))) return true;
      return inserted.some((x) => from < x && x < to);
    },
    /** Whether something was inserted at `off`, or with only spaces in between (two insertions at one point meet). */
    insertedAt: (off: number) => inserted.some((x) => a.slice(Math.min(x, off), Math.max(x, off)).trim() === ""),
  };
}

export type PlaceProblem = "changed" | "tracked" | "missing" | "unsupported";
/** Where a proposal goes now: ProseMirror offsets inside the block (or after a block, for a new paragraph). */
export type Placement =
  | { block: string; from: number; to: number; end?: { block: string; to: number }; reverts?: string }
  | { after: string };
/**
 * Where it meets the proposals of another copy already in the text (their tracked changes):
 * the same result (`agrees`), or another one on the same text (`conflict`).
 */
export type Meeting = { agrees: string[] } | { conflict: string[] };
/**
 * Record 0100: where a proposal falls on text the author changed after sending the copy, the
 * stretch both touch, in three versions: as it was sent, as the author has it now and as the
 * co-author left it. `from`–`to` is that stretch in the block now (ProseMirror offsets);
 * `free` says nothing in it is a tracked change, so the co-author's version can go in its place.
 */
export interface Zone { base: string; mine: string; theirs: string; from: number; to: number; free: boolean }
export type PlaceResult = Placement | Meeting | { problem: PlaceProblem; zone?: Zone };

export interface PlaceOptions {
  /**
   * Whether a tracked change of the text comes from a proposal of a copy (record 0097): those
   * are not the author's edits since sending, and where a proposal falls on one, two copies meet.
   */
  foreign?: (changeId: string) => boolean;
}

/**
 * The tracked change that `p` takes back, if it does exactly that (Word gives it when the
 * co-author rejects a change that went with the copy): with that change rejected, the text
 * around the proposal is what the proposal leaves there.
 */
function revertsChange(now: BlockUnits, p: Proposal, f: number, t: number): string | undefined {
  const ch = now.changes;
  if (!ch || (p.kind !== "delete" && p.kind !== "insert" && p.kind !== "replace")) return undefined;
  const ids = new Set(ch.slice(f, t).flatMap((c) => (c ? [c.id] : [])));
  // a point right before a deletion: putting its text back
  if (f === t && ch[f]?.type === "deletion") ids.add(ch[f]!.id);
  if (ids.size !== 1) return undefined;
  const id = [...ids][0];
  let xs = ch.findIndex((c) => c?.id === id), xe = xs;
  while (ch[xe]?.id === id) xe++;
  // the change in one piece
  if (ch.slice(xe).some((c) => c?.id === id)) return undefined;
  const lo = Math.min(f, xs), hi = Math.max(t, xe);
  const visible = (from: number, to: number) => [...now.text.slice(from, to)].filter((_, i) => ch[from + i]?.type !== "deletion").join("");
  const rejected = [...now.text.slice(lo, hi)].filter((_, i) => !(ch[lo + i]?.id === id && ch[lo + i]?.type === "insertion")).join("");
  if (visible(f, t) !== p.before) return undefined;
  return rejected === visible(lo, f) + p.after + visible(t, hi) ? id : undefined;
}

/** The blocks of a set of documents by id (text blocks, keywords and the blocks a new paragraph may follow). */
export function blocksById(docs: Iterable<PMNode>): Map<string, PMNode> {
  const out = new Map<string, PMNode>();
  const visit = (n: PMNode) => {
    const id = n.attrs?.id;
    if (typeof id === "string" && /^(b|n)-/.test(id)) out.set(id, n);
    if (n.type === "keywords" || TEXTBLOCK.test(n.type)) return;
    n.content?.forEach(visit);
  };
  for (const d of docs) visit(d);
  return out;
}

/**
 * Where `p` goes in the text as it is now (`current`), from the blocks of the version sent
 * (`base`). A comment always goes somewhere while its block is there: on text changed since,
 * it goes where that text is now.
 */
export function placeProposal(p: Proposal, base: (id: string) => PMNode | null | undefined, current: (id: string) => PMNode | null | undefined, opts: PlaceOptions = {}): PlaceResult {
  const a = p.anchor as { block?: string; from?: number; to?: number; after?: string | null };
  if (p.kind === "insert-paragraph") {
    if (!a.after || !current(a.after)) return { problem: "missing" };
    return { after: a.after };
  }
  if (!a.block || a.from === undefined || a.to === undefined) return { problem: "unsupported" };
  if (p.kind === "format" || p.kind === "move" || p.kind === "split-paragraph" || p.kind === "join-paragraphs") return { problem: "unsupported" };
  const isComment = p.kind === "comment";
  const one = (block: string, from: number, to: number): { from: number; to: number; reverts?: string } | Meeting | { problem: PlaceProblem; zone?: Zone } => {
    const cur = current(block), was = base(block);
    if (!cur || !was) return { problem: "missing" };
    const now = blockUnits(cur);
    const then = was.type === "keywords" ? keywordsText(was) : blockUnits(was)?.text;
    if (!now || then === undefined) return { problem: "unsupported" };
    const view = authorsView(now, opts);
    const m = blockMapping(then, view.text);
    // record 0100: an insertion where the author inserted too meets the author's text
    if (!isComment && (m.changed(from, to) || (from === to && p.kind === "insert" && m.insertedAt(from)))) {
      // the three versions of the stretch the author's edits and the proposal share
      const z = zoneOf(then, view.text, from, to);
      const rf = view.right(z.bFrom), rt = Math.max(rf, view.left(z.bTo));
      const pf = now.pm[rf], pt = now.pm[rt];
      if (now.keywords || pf == null || pt == null) return { problem: "changed" };
      const theirs = then.slice(z.from, from) + p.after.replace(/[\r\n]+/g, " ") + then.slice(to, z.to);
      return { problem: "changed", zone: { base: then.slice(z.from, z.to), mine: view.text.slice(z.bFrom, z.bTo), theirs, from: pf, to: pt, free: !now.marked.slice(rf, rt).some(Boolean) } };
    }
    const uf = m.map(from), ut = Math.max(uf, m.map(to));
    const point = uf === ut;
    // in the text as it is (with the other copies' insertions): a point before them, a range inside them
    const f = point ? view.left(uf) : view.right(uf), t = point ? f : view.left(ut);
    if (!isComment) {
      const met = meeting(now, view, p, f, t, point ? view.right(uf) : t);
      if (met) return met;
      // undoing a tracked change that went with the copy (the co-author rejected it): rejecting it
      const reverts = revertsChange(now, p, f, t);
      if (reverts) return { from: f, to: t, reverts };
      if (point ? now.marked[f - 1] && now.marked[f] && !view.foreign(f) : now.marked.slice(f, t).some(Boolean)) return { problem: "tracked" };
      if (now.keywords && (p.before.includes(";") || p.after.includes(";"))) return { problem: "unsupported" };
    }
    const pf = now.pm[f], pt = now.pm[t];
    if (pf == null || pt == null) return { problem: now.keywords ? "unsupported" : "changed" };
    if (pf === pt && (p.kind === "delete" || p.kind === "replace")) return { problem: "changed" };
    return { from: pf, to: pt };
  };
  if (p.kind === "delete-paragraph") {
    const cur = current(a.block), was = base(a.block);
    if (!cur || !was) return { problem: "missing" };
    const now = blockUnits(cur);
    if (!now || now.keywords) return { problem: "unsupported" };
    const view = authorsView(now, opts);
    if (view.text !== blockUnits(was)?.text) return { problem: "changed" };
    const ids = [...new Set((now.changes ?? []).flatMap((c, i) => (c && view.foreign(i) ? [c.id] : [])))];
    if (ids.length) {
      // another copy deleted the whole paragraph too: the same
      const all = now.text.length > 0 && (now.changes ?? []).every((c, i) => c?.type === "deletion" && view.foreign(i));
      return all ? { agrees: ids } : { conflict: ids };
    }
    if (now.marked.some(Boolean)) return { problem: "tracked" };
    return { block: a.block, from: 0, to: now.text.length };
  }
  const end = p.comment?.end;
  const placed = (r: ReturnType<typeof one>): r is { from: number; to: number; reverts?: string } => "from" in r;
  if (end && end.block !== a.block) {
    const start = one(a.block, a.from, a.to);
    const last = one(end.block, 0, end.to);
    if (!placed(start)) return start;
    if (!placed(last)) return { block: a.block, from: start.from, to: start.to };
    return { block: a.block, from: start.from, to: start.to, end: { block: end.block, to: last.to } };
  }
  const r = one(a.block, a.from, a.to);
  return placed(r) ? { block: a.block, ...r } : r;
}

/**
 * The stretch of `a` (a block as sent) that the edits between `a` and `b` (the block as the
 * author has it) share with the range from–to, widened to whole words, and the same stretch
 * in `b`: an edit that touches the stretch joins it, until none is left at its edges.
 */
export function zoneOf(a: string, b: string, from: number, to: number): { from: number; to: number; bFrom: number; bTo: number } {
  type Part = { a0: number; a1: number; b0: number; b1: number; same: boolean };
  const parts: Part[] = [];
  let i = 0, j = 0;
  for (const part of diffWordsWithSpace(a, b)) {
    const n = part.value.length;
    if (part.added) { parts.push({ a0: i, a1: i, b0: j, b1: j + n, same: false }); j += n; }
    else if (part.removed) { parts.push({ a0: i, a1: i + n, b0: j, b1: j, same: false }); i += n; }
    else { parts.push({ a0: i, a1: i + n, b0: j, b1: j + n, same: true }); i += n; j += n; }
  }
  let zf = from, zt = to;
  const word = /[\p{L}\p{N}]/u;
  for (let grew = true; grew;) {
    grew = false;
    for (const p of parts) {
      // an edit with only spaces between it and the stretch touches it too
      if (p.same || (p.a0 > zt && a.slice(zt, p.a0).trim() !== "") || (p.a1 < zf && a.slice(p.a1, zf).trim() !== "")) continue;
      if (p.a0 < zf || p.a1 > zt) { zf = Math.min(zf, p.a0); zt = Math.max(zt, p.a1); grew = true; }
    }
    // whole words at the edges
    while (zf > 0 && word.test(a[zf - 1]) && word.test(a[zf] ?? "")) { zf--; grew = true; }
    while (zt < a.length && word.test(a[zt]) && word.test(a[zt - 1] ?? "")) { zt++; grew = true; }
  }
  const touching = parts.filter((p) => !p.same && p.a0 <= zt && p.a1 >= zf);
  const inSame = (off: number, end: boolean) => {
    const p = parts.find((x) => x.same && (end ? x.a0 < off && off <= x.a1 : x.a0 <= off && off < x.a1)) ?? parts.find((x) => x.same && x.a0 <= off && off <= x.a1);
    return p ? p.b0 + off - p.a0 : end ? b.length : 0;
  };
  const starts = touching.filter((p) => p.a0 === zf).map((p) => p.b0), ends = touching.filter((p) => p.a1 === zt).map((p) => p.b1);
  const bFrom = Math.min(starts.length ? Math.min(...starts) : Infinity, inSame(zf, false));
  const bTo = Math.max(ends.length ? Math.max(...ends) : -Infinity, inSame(zt, true));
  return { from: zf, to: zt, bFrom, bTo: Math.max(bFrom, bTo) };
}

/**
 * The block as its author has it: without the insertions of the copies brought into the text
 * (their deletions are still the author's text). `left(k)` and `right(k)` give where the
 * boundary k of that text is in the block, before or after any of those insertions there.
 */
function authorsView(now: BlockUnits, opts: PlaceOptions) {
  const ch = now.changes ?? [];
  const foreign = (i: number) => !!ch[i] && !!opts.foreign?.(ch[i]!.id);
  const keep: number[] = [];
  let text = "";
  for (let i = 0; i < now.text.length; i++) if (!(foreign(i) && ch[i]!.type === "insertion")) { keep.push(i); text += now.text[i]; }
  return {
    text, foreign,
    left: (k: number) => (k === 0 ? 0 : keep[k - 1] + 1),
    right: (k: number) => (k < keep.length ? keep[k] : now.text.length),
  };
}

/**
 * Where `p` (the range f–t of the block, or a point with the insertions of other copies up to
 * `edge`) meets the tracked changes of other copies: the same result when those changes are
 * accepted, or a conflict when they touch the same text with another one. Insertions of two
 * copies at one point are not a conflict: they go side by side, as in Word.
 */
function meeting(now: BlockUnits, view: ReturnType<typeof authorsView>, p: Proposal, f: number, t: number, edge: number): Meeting | undefined {
  const ch = now.changes ?? [];
  const ids = new Set<string>();
  for (let i = f; i < Math.max(t, edge); i++) if (view.foreign(i)) ids.add(ch[i]!.id);
  if (!ids.size) return undefined;
  let lo = f, hi = Math.max(t, edge);
  ch.forEach((c, i) => { if (c && ids.has(c.id)) { lo = Math.min(lo, i); hi = Math.max(hi, i + 1); } });
  const pick = (from: number, to: number, keepUnit: (i: number) => boolean) => [...now.text.slice(from, to)].filter((_, k) => keepUnit(from + k)).join("");
  // the other copies' insertions are not the author's text; their deletions are
  const authors = (i: number) => !(view.foreign(i) && ch[i]!.type === "insertion");
  const theirs = pick(lo, hi, (i) => !(ch[i] && ids.has(ch[i]!.id) && ch[i]!.type === "deletion") && (authors(i) || ids.has(ch[i]!.id)));
  const ours = pick(lo, f, authors) + p.after.replace(/[\r\n]+/g, " ") + pick(t, hi, authors);
  if (theirs === ours) return { agrees: [...ids] };
  return f === t ? undefined : { conflict: [...ids] };
}

// ---------------------------------------------------------------- the sets on disk

export interface LoadedSet { file: string; set: ProposalSetFile; name: string }

/** The proposal sets of an article (its rounds' and the rest), oldest first, with who returned each copy. */
export async function loadProposalSets(project: Project, folder: string): Promise<LoadedSet[]> {
  const dir = `articles/${folder}/`;
  const all = (await project.fs.list(dir)).filter((p) => /^(rounds\/[^/]+\/proposals|proposals)\/[^/]+\.json$/.test(p.slice(dir.length)));
  const rounds = new Map<string, RoundFile>();
  const out: LoadedSet[] = [];
  for (const file of all) {
    const text = await project.fs.readText(file);
    if (!text) continue;
    const set = JSON.parse(text) as ProposalSetFile;
    let name = set.proposals[0]?.author.name ?? "";
    const round = /^(.*\/rounds\/[^/]+\/)proposals\//.exec(file)?.[1];
    if (round && set.origin.copy) {
      if (!rounds.has(round)) { const r = await project.fs.readText(`${round}round.json`); if (r) rounds.set(round, JSON.parse(r) as RoundFile); }
      name = rounds.get(round)?.copies.find((c) => c.id === set.origin.copy)?.returnedBy.name ?? name;
    }
    out.push({ file, set, name });
  }
  return out.sort((x, y) => x.set.created.localeCompare(y.set.created));
}

/** The blocks of the version a set was computed from (its snapshot), by id. */
export async function baseBlocksOf(project: Project, folder: string, set: ProposalSetFile): Promise<Map<string, PMNode>> {
  const snap = await loadSnapshot(project.fs, set.base.snapshot);
  const prefix = `articles/${folder}/`;
  const docs = Object.entries(snap.files).filter(([f]) => f.startsWith(prefix) && /\.(scidoc|scitable|scifigure)$/.test(f)).map(([, t]) => (JSON.parse(t) as { doc: PMNode }).doc);
  return blocksById(docs);
}

/** Records what the user did with some proposals of a set (a new set: the old one is not changed). */
export function decideProposals(set: ProposalSetFile, ids: Iterable<string>, decision: Proposal["decision"], by: { name: string; person?: string }, date: string): ProposalSetFile {
  const which = new Set(ids);
  return {
    ...set,
    proposals: set.proposals.map((p) => {
      if (!which.has(p.id) || p.decision === decision) return p;
      if (decision === "pending") { const { decided: _, ...rest } = p; return { ...rest, decision }; }
      return { ...p, decision, decided: { by, date } };
    }),
  };
}

export async function saveProposalSet(project: Project, file: string, set: ProposalSetFile) {
  await project.fs.write(file, stableStringify(set));
}
