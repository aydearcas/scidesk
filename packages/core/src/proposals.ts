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
import { ATOM, rejectedText, type DocxParagraph, type DocxRead } from "./docx-read.ts";
import { now } from "./project.ts";
import { LABELS, keywordsText } from "./docx-export.ts";

/** Headings the export writes itself ("Resumen", "Pies de figura"…): not content. */
const GENERATED = new Set(Object.values(LABELS).flatMap((l) => [l.abstract, l.bib, l.captions]));

export interface BaseBlock {
  file: string; id: string; text: string; citations: string[];
  /**
   * Record 0095: what of the block is not in `text` (deleted text, the U+200B of a tracked
   * split), as [ProseMirror offset, length] in order: the proposals' offsets are mapped
   * through them to the block's own offsets.
   */
  skips?: [number, number][];
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
      let pm = 0;
      for (const c of n.content ?? []) {
        const size = c.type === "text" ? c.text!.length : 1;
        if ((c.marks ?? []).some((m) => m.type === "deletion")) { skips.push([pm, size]); pm += size; continue; }
        if (c.type === "text") {
          // the U+200B of a tracked split is the paragraph mark's revision in the Word
          if (c.text!.includes("\u200b") && (c.marks ?? []).some((m) => m.type === "insertion")) {
            [...c.text!].forEach((ch, k) => { if (ch === "\u200b") skips.push([pm + k, 1]); else text += ch; });
          } else text += c.text;
        } else { text += ATOM; if (c.type === "citation") citations.push(c.attrs!.id as string); }
        pm += size;
      }
      out.push({ file, id: n.attrs.id as string, text, citations, ...(skips.length ? { skips } : {}) });
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
  const words = (s: string) => norm(s).toLowerCase().split(/\s+/).filter(Boolean);
  const A = words(a), B = words(b);
  const count = new Map<string, number>();
  for (const w of A) count.set(w, (count.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of B) { const c = count.get(w) ?? 0; if (c) { common++; count.set(w, c - 1); } }
  return (2 * common) / (A.length + B.length);
}

interface Hunk { from: number; to: number; before: string; after: string }
/** Word diff of a against b, as hunks in a's coordinates, with step 6 (join close pieces). */
function hunks(a: string, b: string): Hunk[] {
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

export interface CopyInfo { round?: string; copy?: string; file?: string; returnedBy: { name: string; person?: string }; snapshot: string }

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
  let cursor = 0;
  for (const p of copy.paragraphs) {
    if (match.has(p.index)) { cursor = match.get(p.index)! + 1; continue; }
    let best = -1, score = 0.5;
    for (let i = cursor; i < base.length; i++) {
      if (used.has(i)) continue;
      const s = similarity(base[i].text, rejectedText(p));
      if (s > score) { best = i; score = s; }
    }
    if (best >= 0) { match.set(p.index, best); used.add(best); cursor = best + 1; }
  }

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
      if (!p.blocks.length && p.segments.every((s) => s.kind === "same") && GENERATED.has(text.trim())) continue;
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
    if (used.has(i)) continue;
    push({ author: info.returnedBy, tracked: false, kind: "delete-paragraph", anchor: { file: b.file, block: b.id, from: 0, to: b.text.length }, before: b.text, after: "", date });
  }

  // integrity: applying the proposals of each block to the sent text gives the copy accepted
  let integrity: "ok" | "mismatch" = "ok";
  for (const p of copy.paragraphs) {
    const i = match.get(p.index);
    if (i === undefined) continue;
    const b = base[i];
    const mine = proposals.filter((x) => "block" in x.anchor && x.anchor.block === b.id && x.kind !== "delete-paragraph");
    // untracked proposals alone give the copy with its tracked changes rejected; all of them,
    // the copy with everything accepted (Word's accepted view)
    if (apply(b.text, mine.filter((x) => !x.tracked)) !== rejectedText(p)) integrity = "mismatch";
    if (apply(b.text, mine) !== p.segments.filter((s) => s.kind !== "del").map((s) => s.text).join("")) integrity = "mismatch";
  }

  // record 0095: offsets in the sent block's own coordinates (with its deleted text)
  const blockOf = new Map(base.map((b) => [b.id, b]));
  for (const x of proposals) {
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
