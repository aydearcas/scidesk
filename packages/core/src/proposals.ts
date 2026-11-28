// Proposals of a returned copy, from the version that was sent (record 0029, steps 1–3, 5
// and 6, and the integrity check):
//   1. align the copy's paragraphs with the sent blocks: the SciDesk bookmark is a hint,
//      confirmed by content; the rest by content, in order;
//   2. what was changed WITHOUT tracking: diff of the sent text against the copy with every
//      tracked change rejected, attributed to whoever returned the copy;
//   3. what was changed WITH tracking: the copy's marks, with their w:author;
//   5. noise (spaces, quotes, dashes) hidden;
//   6. pieces of one edit split by a space or a short word joined.
// Offsets are ProseMirror's inside each block of the sent version: each UTF-16 unit of
// text and each inline atom count 1. Vertical slice: formats, comments, moves, tables and
// tracked paragraph splits come in phase 2a.
import { diffWordsWithSpace } from "diff";
import { newId, validate, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { ATOM, rejectedText, type DocxComment, type DocxParagraph, type DocxRead } from "./docx-read.ts";
import { now } from "./project.ts";
import { LABELS, commentDurableId, keywordsText, revisionDate } from "./docx-export.ts";

/** Headings the export writes itself ("Resumen", "Pies de figura"…): not content. */
export const GENERATED = new Set(Object.values(LABELS).flatMap((l) => [l.abstract, l.bib, l.captions]));

export interface BaseBlock {
  file: string; id: string; text: string; citations: string[];
  /**
   * Record 0095: what of the block is not in `text` (deleted text, the U+200B of a tracked
   * split), as [ProseMirror offset, length] in order: the proposals' offsets are mapped
   * through them to the block's own offsets.
   */
  skips?: [number, number][];
  /** Record 0096: the comments anchored in the block, with their range of `text`. */
  comments?: { id: string; from: number; to: number }[];
}

/**
 * A text offset of a sent block as the block's own ProseMirror offset (record 0095). Where
 * something skipped is right at the offset, `after` puts it past it (the start of a range),
 * else before it (the end of a range, or a point where text is inserted).
 */
export function pmOffset(b: BaseBlock, offset: number, after = false): number {
  let pm = offset;
  for (const [at, length] of b.skips ?? []) { if (at < pm || (after && at === pm)) pm += length; else break; }
  return pm;
}

/** The text blocks of a document as the merge compares them (deleted text left out). */
export function baseBlocks(file: string, doc: PMNode): BaseBlock[] {
  const out: BaseBlock[] = [];
  const visit = (n: PMNode) => {
    if (n.type === "keywords" && n.attrs?.id) {
      // exported as one paragraph: "a; b; c" (the "Palabras clave: " before it is generated)
      out.push({ file, id: n.attrs.id as string, text: keywordsText(n), citations: [] });
      return;
    }
    const isTextblock = /^(paragraph|heading|title|tableCaption|tableNote|figureCaption|figureNote)$/.test(n.type);
    if (isTextblock && n.attrs?.id && !(n.marks ?? []).some((m) => m.type === "deletion")) {
      let text = "";
      const citations: string[] = [];
      const skips: [number, number][] = [];
      const comments = new Map<string, { from: number; to: number }>();
      let pm = 0;
      for (const c of n.content ?? []) {
        const size = c.type === "text" ? c.text!.length : 1;
        if ((c.marks ?? []).some((m) => m.type === "deletion")) { skips.push([pm, size]); pm += size; continue; }
        const from = text.length;
        for (const m of c.marks ?? []) if (m.type === "comment") {
          const id = String(m.attrs!.id);
          comments.set(id, { from: comments.get(id)?.from ?? from, to: from });
        }
        if (c.type === "text") {
          // the U+200B of a tracked split is the paragraph mark's revision in the Word
          if (c.text!.includes("\u200b") && (c.marks ?? []).some((m) => m.type === "insertion")) {
            [...c.text!].forEach((ch, k) => { if (ch === "\u200b") skips.push([pm + k, 1]); else text += ch; });
          } else text += c.text;
        } else { text += ATOM; if (c.type === "citation") citations.push(c.attrs!.id as string); }
        for (const m of c.marks ?? []) if (m.type === "comment") comments.get(String(m.attrs!.id))!.to = text.length;
        pm += size;
      }
      out.push({
        file, id: n.attrs.id as string, text, citations, ...(skips.length ? { skips } : {}),
        ...(comments.size ? { comments: [...comments].map(([id, r]) => ({ id, ...r })) } : {}),
      });
      return;
    }
    n.content?.forEach(visit);
  };
  visit(doc);
  return out;
}

const norm = (s: string) => s.normalize("NFC").replace(/[\u00a0\u2009\u202f\s]+/g, " ").replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'").replace(/[‐\u2011‒–—]/g, "-").trim();
function similarity(a: string, b: string) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  // words by their letters and digits: "mitad." and "mitad," are the same word
  const words = (s: string) => norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const A = words(a), B = words(b);
  if (!A.length || !B.length) return A.length === B.length ? 1 : 0;
  const count = new Map<string, number>();
  for (const w of A) count.set(w, (count.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of B) { const c = count.get(w) ?? 0; if (c) { common++; count.set(w, c - 1); } }
  return (2 * common) / (A.length + B.length);
}

/**
 * The text the export writes before a block itself ("Palabras clave: ", "Tabla 1. ", a note's
 * letter): with the bookmarks, it is the paragraph's lead; without them (plan B), it is
 * recognised here, and taken as the lead when that makes the paragraph match its block better.
 */
export const GENERATED_LEAD = new RegExp(`^(?:(?:${Object.values(LABELS).flatMap((l) => [l.keywords]).join("|")}): |(?:${Object.values(LABELS).flatMap((l) => [l.table, l.figure]).join("|")}) \\d+\\.\\s?|[a-z] )`);

/** Word counts of a text, for comparing paragraphs quickly. */
function wordsOf(s: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) out.set(w, (out.get(w) ?? 0) + 1);
  return out;
}
function overlap(a: Map<string, number>, b: Map<string, number>, na: number, nb: number) {
  if (!na || !nb) return na === nb ? 0.55 : 0;
  let common = 0;
  for (const [w, c] of a) common += Math.min(c, b.get(w) ?? 0);
  return (2 * common) / (na + nb);
}

/**
 * Step 1 without bookmarks (plan B, records 0029 and 0101): between the paragraphs already
 * matched, the copy's paragraphs and the sent blocks are paired keeping their order, with the
 * best total similarity (each pair at least 0.5), as a sequence alignment. A paragraph whose
 * generated lead makes it match better without it gets that lead taken off.
 */
function alignByContent(base: BaseBlock[], paragraphs: DocxParagraph[], match: Map<number, number>, used: Set<number>) {
  const info = paragraphs.map((p) => {
    const text = rejectedText(p);
    const lead = p.blocks.length || p.lead ? "" : GENERATED_LEAD.exec(text)?.[0] ?? "";
    const w = wordsOf(text), ws = lead ? wordsOf(text.slice(lead.length)) : null;
    return { p, text, lead, w, nw: [...w.values()].reduce((a, b) => a + b, 0), ws, nws: ws ? [...ws.values()].reduce((a, b) => a + b, 0) : 0 };
  });
  const bw = base.map((b) => { const w = wordsOf(b.text); return { w, n: [...w.values()].reduce((a, c) => a + c, 0) }; });
  const sim = (k: number, i: number): { s: number; strip: boolean } => {
    const x = info[k], y = bw[i];
    if (x.text === base[i].text) return { s: 1.01, strip: false };
    const raw = overlap(x.w, y.w, x.nw, y.n);
    const cut = x.ws ? (x.text.slice(x.lead.length) === base[i].text ? 1.01 : overlap(x.ws, y.w, x.nws, y.n)) : 0;
    return cut > raw ? { s: cut, strip: true } : { s: raw, strip: false };
  };
  const strip = new Set<number>();
  const pair = (k: number, i: number, cut: boolean) => { match.set(paragraphs[k].index, i); used.add(i); if (cut) strip.add(k); };
  // the anchors: the pairs already made, kept only while they go forward in both
  const anchors: [number, number][] = [[-1, -1]];
  const byIndex = new Map(paragraphs.map((p, k) => [p.index, k]));
  for (const [ci, bi] of [...match].sort((a, b) => a[0] - b[0])) {
    const k = byIndex.get(ci)!;
    if (bi > anchors[anchors.length - 1][1]) anchors.push([k, bi]);
  }
  anchors.push([paragraphs.length, base.length]);
  for (let g = 0; g + 1 < anchors.length; g++) {
    const cs: number[] = [], bs: number[] = [];
    for (let k = anchors[g][0] + 1; k < anchors[g + 1][0]; k++) if (!match.has(paragraphs[k].index)) cs.push(k);
    for (let i = anchors[g][1] + 1; i < anchors[g + 1][1]; i++) if (!used.has(i)) bs.push(i);
    if (!cs.length || !bs.length) continue;
    if (cs.length * bs.length > 250_000) {
      // too big to align whole: the nearest good match ahead, as before
      let from = 0;
      for (const k of cs) {
        let best = -1, score = 0.5, cut = false;
        for (let j = from; j < bs.length && j < from + 200; j++) { const r = sim(k, bs[j]); if (r.s > score) { best = j; score = r.s; cut = r.strip; } }
        if (best >= 0) { pair(k, bs[best], cut); from = best + 1; }
      }
      continue;
    }
    // the alignment: D[a][b] = best total for the first a paragraphs and b blocks
    const A = cs.length, B = bs.length;
    const D = Array.from({ length: A + 1 }, () => new Float64Array(B + 1));
    const S = Array.from({ length: A }, () => new Float64Array(B));
    for (let a = 1; a <= A; a++) {
      for (let b = 1; b <= B; b++) {
        const r = sim(cs[a - 1], bs[b - 1]).s;
        S[a - 1][b - 1] = r;
        D[a][b] = Math.max(D[a - 1][b], D[a][b - 1], r >= 0.5 ? D[a - 1][b - 1] + r : -Infinity);
      }
    }
    for (let a = A, b = B; a > 0 && b > 0;) {
      const r = S[a - 1][b - 1];
      if (r >= 0.5 && D[a][b] === D[a - 1][b - 1] + r) { pair(cs[a - 1], bs[b - 1], sim(cs[a - 1], bs[b - 1]).strip); a--; b--; }
      else if (D[a][b] === D[a - 1][b]) a--;
      else b--;
    }
  }
  // the generated leads recognised: off the paragraph's text (only from text nobody changed)
  for (const k of strip) {
    const p = paragraphs[k];
    let n = info[k].lead.length;
    const first = p.segments.findIndex((x) => x.text.length > 0);
    if (first < 0 || p.segments.slice(0, first + 1).some((x) => x.kind !== "same") || p.segments[first].text.length < n) continue;
    p.lead = info[k].lead;
    p.segments[first] = { ...p.segments[first], text: p.segments[first].text.slice(n) };
    n = 0;
  }
}

export interface Hunk { from: number; to: number; before: string; after: string }
/** Word diff of a against b, as hunks in a's coordinates, with step 6 (join close pieces). */
export function hunks(a: string, b: string): Hunk[] {
  const out: Hunk[] = [];
  let pos = 0;
  for (const part of diffWordsWithSpace(a, b)) {
    if (part.added) {
      const last = out.at(-1);
      if (last && last.to === pos) last.after += part.value;
      else out.push({ from: pos, to: pos, before: "", after: part.value });
    } else if (part.removed) {
      const last = out.at(-1);
      if (last && last.to === pos) { last.before += part.value; last.to += part.value.length; }
      else out.push({ from: pos, to: pos + part.value.length, before: part.value, after: "" });
      pos += part.value.length;
    } else pos += part.value.length;
  }
  const joined: Hunk[] = [];
  for (const h of out) {
    const last = joined.at(-1);
    const gap = last ? a.slice(last.to, h.from) : "";
    if (last && /^\s*(\S{1,3}\s*)?$/.test(gap) && gap.length <= 5) {
      last.before += gap + h.before; last.after += gap + h.after; last.to = h.to;
    } else joined.push({ ...h });
  }
  return joined;
}

/** Maps an offset of the copy's rejected text to the base text, through the untracked diff. */
function mapper(base: string, rejected: string) {
  const pairs: [number, number][] = [[0, 0]];
  let i = 0, j = 0;
  for (const part of diffWordsWithSpace(base, rejected)) {
    if (part.added) j += part.value.length;
    else if (part.removed) i += part.value.length;
    else { pairs.push([i, j]); i += part.value.length; j += part.value.length; pairs.push([i, j]); }
  }
  return (offset: number) => {
    let best: [number, number] = [0, 0];
    for (const p of pairs) if (p[1] <= offset) best = p;
    return Math.min(base.length, best[0] + (offset - best[1]));
  };
}

/** Applies proposals given in base offsets, from the end, so that offsets stay valid. */
export function apply(text: string, ps: { anchor: unknown; after: string; tracked: boolean }[]): string {
  const ranged = ps.map((p) => ({ ...(p.anchor as { from: number; to: number }), after: p.after, tracked: p.tracked }));
  // later first; at the same place, the tracked change (made on top of the untracked text) last
  ranged.sort((x, y) => y.from - x.from || y.to - x.to || Number(x.tracked) - Number(y.tracked));
  for (const r of ranged) text = text.slice(0, r.from) + r.after + text.slice(r.to);
  return text;
}

export interface SentComment { author: { name: string }; date: string; text: string; resolved: boolean; replies: { author: { name: string }; date: string; text: string }[] }
export interface CopyInfo {
  round?: string; copy?: string; file?: string; returnedBy: { name: string; person?: string }; snapshot: string;
  /** Record 0096: the comments of the version sent, by id (the registries of the snapshot). */
  sentComments?: Record<string, SentComment>;
}

type Draft = Omit<ProposalSetFile["proposals"][number], "id" | "status" | "decision">;
type Anchored = Pick<Draft, "anchor" | "before" | "after"> & { end?: NonNullable<Draft["comment"]>["end"] };

/**
 * Record 0096: the comments of the copy as proposals. A comment that was sent (known by its
 * w16cid:durableId, which the export derives from its id, or else by author, date and text)
 * gives one only if the copy adds replies to it, resolves or reopens it, or no longer has
 * it; any other is a new comment, with its replies. Offsets are in the sent text, as the
 * other proposals'.
 */
function commentProposals(base: BaseBlock[], copy: DocxRead, match: Map<number, number>, info: CopyInfo, date: string): Draft[] {
  const sent = info.sentComments ?? {};
  if (!copy.comments.length && !Object.keys(sent).length) return [];
  type Known = { thread: string; reply?: number };
  const byDurable = new Map<string, Known>();
  const byKey = new Map<string, Known>();
  const key = (author: string, when: string | null, text: string) => `${author}\u0000${revisionDate(when) ?? ""}\u0000${norm(text)}`;
  for (const [thread, c] of Object.entries(sent)) {
    byDurable.set(commentDurableId(thread), { thread });
    byKey.set(key(c.author.name, c.date, c.text), { thread });
    c.replies.forEach((r, reply) => {
      byDurable.set(commentDurableId(thread, reply), { thread, reply });
      byKey.set(key(r.author.name, r.date, r.text), { thread, reply });
    });
  }
  const known = (c: DocxComment): Known | null => (c.durableId ? byDurable.get(c.durableId.toUpperCase()) : undefined) ?? byKey.get(key(c.author, c.date, c.text)) ?? null;
  const when = (d: string | null) => revisionDate(d) ?? date;
  const reply = (r: DocxComment) => ({ author: { name: r.author || info.returnedBy.name }, date: when(r.date), text: r.text });

  // where each comment of the copy is: its range's start and end, or its reference
  type Pos = { p: number; off: number };
  const edges = new Map<string, { start?: Pos; end?: Pos; ref?: Pos }>();
  for (const p of copy.paragraphs) {
    let off = 0;
    for (const s of p.segments) {
      if (s.edge) {
        const e = edges.get(s.edge.comment) ?? {};
        if (s.edge.side === "start") e.start ??= { p: p.index, off };
        else e[s.edge.side] = { p: p.index, off };
        edges.set(s.edge.comment, e);
      } else if (s.kind !== "ins") off += s.text.length;
    }
  }
  const mappers = new Map<number, (offset: number) => number>();
  const toBase = (pos: Pos) => {
    const b = base[match.get(pos.p)!];
    if (!mappers.has(pos.p)) mappers.set(pos.p, mapper(b.text, rejectedText(copy.paragraphs[pos.p])));
    return mappers.get(pos.p)!(pos.off);
  };
  /** The commented text in the copy, in the sent text's coordinates. */
  const inCopy = (c: DocxComment): Anchored => {
    const e = edges.get(c.word);
    const start = e?.start ?? e?.ref;
    const stop = e?.end ?? e?.ref ?? start;
    if (!start || match.get(start.p) === undefined) {
      // on a paragraph the co-author added (or nowhere): after the sent block before it
      let after: string | null = null;
      for (let k = (start?.p ?? 0) - 1; k >= 0 && after === null; k--) { const i = match.get(k); if (i !== undefined) after = base[i].id; }
      const text = start ? copy.paragraphs[start.p].segments.filter((s) => s.kind !== "del").map((s) => s.text).join("") : "";
      return { anchor: { file: (after ? base.find((b) => b.id === after)! : base[0]).file, after }, before: "", after: text };
    }
    const b = base[match.get(start.p)!];
    const from = toBase(start);
    const same = !stop || stop.p === start.p;
    const to = same ? Math.max(from, toBase(stop ?? start)) : b.text.length;
    const last = !same && match.get(stop!.p) !== undefined ? base[match.get(stop!.p)!] : null;
    return {
      anchor: { file: b.file, block: b.id, from, to }, before: b.text.slice(from, to), after: b.text.slice(from, to),
      ...(last && last.id !== b.id ? { end: { file: last.file, block: last.id, to: toBase(stop!) } } : {}),
    };
  };
  /** Where a comment sent was anchored, from the sent blocks. */
  const inBase = (thread: string): Anchored | null => {
    const blocks = base.flatMap((b) => (b.comments ?? []).filter((c) => c.id === thread).map((c) => ({ b, ...c })));
    if (!blocks.length) return null;
    const [first, last] = [blocks[0], blocks.at(-1)!];
    const text = first.b.text.slice(first.from, first.to);
    return {
      anchor: { file: first.b.file, block: first.b.id, from: first.from, to: first.to }, before: text, after: text,
      ...(last.b.id !== first.b.id ? { end: { file: last.b.file, block: last.b.id, to: last.to } } : {}),
    };
  };
  const draft = (where: Anchored, author: { name: string }, when: string, comment: NonNullable<Draft["comment"]>): Draft => {
    const { end, ...at } = where;
    return { author, tracked: true, kind: "comment", ...at, comment: { ...comment, ...(end ? { end } : {}) }, date: when };
  };

  const out: Draft[] = [];
  const ids = new Set(copy.comments.map((c) => c.word));
  const tops = copy.comments.filter((c) => !c.parent || !ids.has(c.parent));
  const seen = new Set<string>();
  for (const top of tops) {
    const replies = copy.comments.filter((c) => c.parent === top.word);
    const k = known(top);
    if (k && k.reply === undefined && sent[k.thread] && !seen.has(k.thread)) {
      seen.add(k.thread);
      const fresh = replies.filter((r) => { const m = known(r); return !(m && m.thread === k.thread && m.reply !== undefined); });
      const resolved = top.done !== sent[k.thread].resolved;
      if (!fresh.length && !resolved) continue;
      const where = inBase(k.thread) ?? inCopy(top);
      out.push(draft(where, fresh.length ? { name: fresh[0].author || info.returnedBy.name } : info.returnedBy, fresh.length ? when(fresh[0].date) : date, {
        thread: k.thread, text: "", replies: fresh.map(reply), ...(resolved ? { resolved: top.done } : {}),
      }));
    } else {
      out.push(draft(inCopy(top), { name: top.author || info.returnedBy.name }, when(top.date), { text: top.text, replies: replies.map(reply), ...(top.done ? { resolved: true } : {}) }));
    }
  }
  // the comments sent that the copy no longer has: the co-author removed them
  for (const thread of Object.keys(sent)) {
    if (seen.has(thread)) continue;
    const where = inBase(thread);
    if (where) out.push(draft(where, info.returnedBy, date, { thread, text: "", replies: [], removed: true }));
  }
  return out;
}

export function proposalsFromCopy(base: BaseBlock[], copy: DocxRead, info: CopyInfo): ProposalSetFile {
  const proposals: ProposalSetFile["proposals"] = [];
  let hiddenNoise = 0;
  const date = now();

  // 1. alignment: bookmark hint confirmed by content (>= 0.5), then by content in order
  const byId = new Map(base.map((b, i) => [b.id, i]));
  const match = new Map<number, number>(); // copy paragraph -> base index
  const used = new Set<number>();
  for (const p of copy.paragraphs) {
    for (const id of [...p.blocks].reverse()) {
      const i = byId.get(id);
      if (i === undefined || used.has(i)) continue;
      if (similarity(base[i].text, rejectedText(p)) >= 0.5 || base[i].text === rejectedText(p)) { match.set(p.index, i); used.add(i); break; }
    }
  }
  alignByContent(base, copy.paragraphs, match, used);

  const push = (p: Omit<ProposalSetFile["proposals"][number], "id" | "status" | "decision">) => {
    const noise = p.kind !== "insert-paragraph" && p.kind !== "delete-paragraph" && norm(p.before) === norm(p.after);
    if (noise) hiddenNoise++;
    proposals.push({ id: newId("pr"), ...p, status: noise ? "noise-hidden" : "applicable", decision: "pending" });
  };

  let lastBase: BaseBlock | null = null;
  for (const p of copy.paragraphs) {
    const i = match.get(p.index);
    if (i === undefined) {
      // a paragraph that is not in the sent version: new (with or without tracking)
      const tracked = p.segments.length > 0 && p.segments.every((s) => s.kind === "ins" || !s.text.trim());
      const author = tracked ? { name: p.segments.find((s) => s.author)!.author! } : info.returnedBy;
      const text = p.segments.filter((s) => s.kind !== "del").map((s) => s.text).join("");
      // a heading the export writes, or the place of a figure it could not draw ("[figures/…]")
      if (!p.blocks.length && p.segments.every((s) => s.kind === "same") && (GENERATED.has(text.trim()) || /^\[figures\/[^\]]+\]$/.test(text.trim()))) continue;
      if (text.trim()) push({ author, tracked, kind: "insert-paragraph", anchor: { file: (lastBase ?? base[0]).file, after: lastBase?.id ?? null }, before: "", after: text, date });
      continue;
    }
    const b = base[i];
    lastBase = b;
    const rejected = rejectedText(p);
    // 2. untracked: sent text -> copy with tracked changes rejected
    for (const h of hunks(b.text, rejected)) {
      push({ author: info.returnedBy, tracked: false, kind: h.before && h.after ? "replace" : h.before ? "delete" : "insert", anchor: { file: b.file, block: b.id, from: h.from, to: h.to }, before: h.before, after: h.after, date });
    }
    // 3. tracked: walk the segments in rejected coordinates and map them to the base
    const toBase = mapper(b.text, rejected);
    let pos = 0;
    const segs = p.segments;
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      if (s.kind === "same") { pos += s.text.length; continue; }
      // a deletion followed by an insertion of the same author is one replacement
      let before = "", after = "";
      const author = s.author ?? info.returnedBy.name;
      const start = pos;
      while (k < segs.length && segs[k].kind !== "same" && (segs[k].author ?? info.returnedBy.name) === author) {
        if (segs[k].kind === "del") { before += segs[k].text; pos += segs[k].text.length; } else after += segs[k].text;
        k++;
      }
      k--;
      const from = toBase(start), to = toBase(pos);
      push({ author: { name: author }, tracked: true, kind: before && after ? "replace" : before ? "delete" : "insert", anchor: { file: b.file, block: b.id, from, to }, before, after, ...(s.date ? { date: s.date.replace(/\.\d+Z$/, "Z") } : {}) });
    }
  }
  for (const [i, b] of base.entries()) {
    // an empty paragraph the copy does not have is no change anyone made
    if (used.has(i) || !b.text.trim()) continue;
    push({ author: info.returnedBy, tracked: false, kind: "delete-paragraph", anchor: { file: b.file, block: b.id, from: 0, to: b.text.length }, before: b.text, after: "", date });
  }
  // record 0096: the comments, never noise and never text
  for (const c of commentProposals(base, copy, match, info, date)) proposals.push({ id: newId("pr"), ...c, status: "applicable", decision: "pending" });

  // integrity: applying the proposals of each block to the sent text gives the copy accepted
  let integrity: "ok" | "mismatch" = "ok";
  for (const p of copy.paragraphs) {
    const i = match.get(p.index);
    if (i === undefined) continue;
    const b = base[i];
    const mine = proposals.filter((x) => "block" in x.anchor && x.anchor.block === b.id && x.kind !== "delete-paragraph" && x.kind !== "comment");
    // untracked proposals alone give the copy with its tracked changes rejected; all of them,
    // the copy with everything accepted (Word's accepted view)
    if (apply(b.text, mine.filter((x) => !x.tracked)) !== rejectedText(p)) integrity = "mismatch";
    if (apply(b.text, mine) !== p.segments.filter((s) => s.kind !== "del").map((s) => s.text).join("")) integrity = "mismatch";
  }

  // record 0095: offsets in the sent block's own coordinates (with its deleted text)
  const blockOf = new Map(base.map((b) => [b.id, b]));
  for (const x of proposals) {
    const end = x.comment?.end;
    if (end) { const b = blockOf.get(end.block); if (b) end.to = pmOffset(b, end.to); }
    const a = x.anchor as { block?: string; from?: number; to?: number };
    const b = a.block ? blockOf.get(a.block) : undefined;
    if (!b?.skips || a.from === undefined || a.to === undefined) continue;
    const point = a.from === a.to;
    a.from = pmOffset(b, a.from, !point);
    a.to = point ? a.from : pmOffset(b, a.to);
  }

  const set: ProposalSetFile = {
    schemaVersion: 1, id: newId("ps"),
    origin: { kind: "docx-copy", ...(info.round ? { round: info.round } : {}), ...(info.copy ? { copy: info.copy } : {}), ...(info.file ? { file: info.file } : {}) },
    base: { snapshot: info.snapshot }, created: date, integrity, hiddenNoise, proposals,
  };
  const issues = validate("proposal-set", set);
  if (issues.length) throw new Error(`invalid proposal set: ${issues[0].path} ${issues[0].message}`);
  return set;
}
