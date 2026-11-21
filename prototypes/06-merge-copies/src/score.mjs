// Scores a list of proposals against the ground truth of the synthetic round
// (prototypes/corpus/synthetic-round-knee-oa/edits-*.json). For each true edit:
//   found      the proposals that touch its place reproduce it (after normalising noise);
//   pieces     how many proposals it took (1 is best);
//   author     every proposal carries the co-author's name;
//   tracked    the tracked / untracked classification is right;
//   kind       moves, splits, comments and format changes are recognised as such;
//   noise      noise edits are flagged as noise (hidden by default).
// Proposals that match no true edit are false positives.
import { readFileSync } from "node:fs";
import { normNoise } from "./proposals.mjs";

const C = new URL("../../corpus/synthetic-round-knee-oa/", import.meta.url);
export const truth = (who) => JSON.parse(readFileSync(new URL(`edits-${who}.json`, C), "utf8"));

// applies proposals (base offsets) to a base paragraph's substring [s, e)
function applyRange(text, props, s, e) {
  let out = "", pos = s;
  for (const p of [...props].sort((a, b) => a.start - b.start || (a.kind === "insert" ? -1 : 1))) {
    if (p.start < pos) continue;
    out += text.slice(pos, p.start) + (p.after ?? "");
    pos = p.end;
  }
  return out + text.slice(pos, e);
}

export function score(props, baseTexts, edits, coauthor, { copy, baseWhere = [], byAuthor = false } = {}) {
  const used = new Set();
  const rows = [];
  // byAuthor: one document holds everybody's changes (Word's Combine): keep this co-author's
  const mine = props.filter((p) => (!copy || p.copy === copy) && (!byAuthor || p.author === coauthor));
  for (const ed of edits) {
    const r = { id: ed.id, type: ed.type, tracked: ed.tracked, noise: ed.noise, found: false, pieces: 0, author: false, trackedOk: false, kindOk: false, noiseOk: !ed.noise };
    // where the edit is in the base: the paragraph containing the anchor
    // (a table cell is located by its table, row and column, 1-based in the ground truth)
    const inCell = (i) => !ed.table || (baseWhere[i] && baseWhere[i].t === ed.table - 1 && baseWhere[i].r === ed.row - 1 && baseWhere[i].c === ed.col - 1);
    const pi = baseTexts.findIndex((t, i) => t.includes(ed.anchor) && inCell(i));
    const textP = baseTexts[pi] ?? "";
    const target = ed.target ?? ed.anchor;
    const tStart = pi >= 0 ? textP.indexOf(ed.anchor) + Math.max(0, ed.anchor.indexOf(target)) : -1;
    const tEnd = tStart + target.length;
    if (pi < 0) { r.note = "anchor not in base"; rows.push(r); continue; }
    let cand;
    if (ed.type === "comment") {
      cand = mine.filter((p) => p.kind === "comment" && p.para === pi && normNoise(p.text) === normNoise(ed.comment));
      r.found = cand.length > 0;
    } else if (ed.type === "format") {
      cand = mine.filter((p) => p.kind === "format" && p.para === pi && p.start < tEnd && p.end > tStart);
      r.found = cand.length > 0;
    } else if (ed.type === "move") {
      const from = mine.filter((p) => p.kind === "move-from" && p.para === pi && p.start < tEnd && p.end > tStart);
      const to = mine.filter((p) => p.kind === "move-to" && normNoise(p.after).includes(normNoise(target).slice(0, 40)));
      cand = [...from, ...to];
      r.found = from.length > 0 && to.length > 0;
    } else {
      // insert / replace / delete / split: proposals touching [tStart-1, tEnd+1] in that paragraph
      const at = ed.type === "insert" ? (ed.position === "before" ? tStart : tEnd) : null;
      const lo = at ?? tStart, hi = at ?? tEnd;
      cand = mine.filter((p) => p.para === pi && !["comment", "format", "move-from", "move-to"].includes(p.kind) && p.start <= hi + 1 && p.end >= lo - 1 && !(p.start === p.end && (p.start < lo - 1 || p.start > hi + 1)));
      if (cand.length) {
        const s = Math.min(lo, ...cand.map((p) => p.start)), e = Math.max(hi, ...cand.map((p) => p.end));
        const got = applyRange(textP, cand, s, e);
        let want;
        if (ed.type === "insert") want = textP.slice(s, at) + ed.text + textP.slice(at, e);
        else if (ed.type === "delete") want = textP.slice(s, tStart) + textP.slice(tEnd, e);
        else if (ed.type === "split_paragraph") want = null;
        else want = textP.slice(s, tStart) + ed.text + textP.slice(tEnd, e);
        r.found = ed.type === "split_paragraph" ? cand.some((p) => p.kind === "split") : normNoise(got) === normNoise(want);
        if (!r.found) r.note = `got «${got.slice(0, 50)}» want «${(want ?? "").slice(0, 50)}»`;
      }
    }
    cand ??= [];
    cand.forEach((p) => used.add(p));
    r.pieces = cand.length;
    r.author = cand.length > 0 && cand.every((p) => p.author === coauthor);
    r.trackedOk = ed.type === "comment" || (cand.length > 0 && cand.every((p) => p.tracked === !!ed.tracked));
    r.kindOk = ed.type === "move" ? cand.some((p) => p.kind.startsWith("move")) : ed.type === "split_paragraph" ? cand.some((p) => p.kind === "split") : r.found;
    r.noiseOk = ed.noise ? cand.length > 0 && cand.every((p) => p.noise) : cand.every((p) => !p.noise);
    rows.push(r);
  }
  const fp = mine.filter((p) => !used.has(p) && (!coauthor || p.author === coauthor || p.copy === copy));
  const n = rows.length, cnt = (f) => rows.filter(f).length;
  return {
    rows, falsePositives: fp,
    summary: { edits: n, found: cnt((r) => r.found), onePiece: cnt((r) => r.found && r.pieces === 1), author: cnt((r) => r.author), trackedOk: cnt((r) => r.trackedOk), kindOk: cnt((r) => r.kindOk), noiseOk: cnt((r) => r.noiseOk), falsePositives: fp.length, falsePositivesNotNoise: fp.filter((p) => !p.noise).length },
  };
}
