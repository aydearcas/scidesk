// The proposals of one returned copy, relative to the copy that was sent (the base), as
// PLAN.md 5.11 and the single proposal model (record 0019) need them:
//   - paragraphs are aligned by content (plan B: no SciDesk markers in this corpus);
//   - changes made WITHOUT tracking: diff of the base text against the copy's text with
//     every tracked change rejected; attributed to whoever returned the copy;
//   - changes made WITH tracking: taken from the revision marks, with their w:author;
//   - format changes (w:rPrChange) and comments, with their author;
//   - noise: changes that only touch spaces, quote marks or dashes (R4);
//   - moves: a deletion and an insertion of the same sentence.
// Each proposal: { copy, author, tracked, kind, para (base index), start, end (offsets in
// the base paragraph), before, after, noise, moveOf? }.
import { diffWordsWithSpace } from "diff";
import { units } from "./read-revisions.mjs";

export const normNoise = (s) => String(s ?? "").normalize("NFKC").replace(/[“”«»„"]/g, '"').replace(/[‘’‚']/g, "'").replace(/[‐‑‒–—−]/g, "-").replace(/[\s ]+/g, " ").replace(/\s*([<>≤≥=])\s*/g, "$1").trim();
const words = (s) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
const sim = (a, b) => { const A = words(a), B = words(b); if (!A.size && !B.size) return a.trim() === b.trim() ? 1 : 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n); };

// Align base paragraphs with the copy's units (by their rejected text): exact matches in
// order (LCS), then, inside each gap, pairs by similarity >= 0.5 in order.
export function align(baseTexts, theirTexts) {
  const n = baseTexts.length, m = theirTexts.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = baseTexts[i] === theirTexts[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const anchors = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (baseTexts[i] === theirTexts[j]) { anchors.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const pairs = [...anchors];
  const bounds = [[-1, -1], ...anchors, [n, m]];
  for (let k = 0; k + 1 < bounds.length; k++) {
    let j0 = bounds[k][1] + 1;
    for (let i = bounds[k][0] + 1; i < bounds[k + 1][0]; i++) {
      let best = -1, score = 0.5;
      for (let j = j0; j < bounds[k + 1][1]; j++) { const s = sim(baseTexts[i], theirTexts[j]); if (s >= score) { score = s; best = j; } }
      if (best >= 0) { pairs.push([i, best]); j0 = best + 1; }
    }
  }
  return pairs.sort((a, b) => a[0] - b[0]);
}

// word diff -> hunks { start, end, before, after } in coordinates of `a`
function hunks(a, b) {
  const out = [];
  let pos = 0, cur = null;
  for (const part of diffWordsWithSpace(a, b)) {
    if (!part.added && !part.removed) { if (cur) { out.push(cur); cur = null; } pos += part.value.length; continue; }
    cur ??= { start: pos, end: pos, before: "", after: "" };
    if (part.removed) { cur.before += part.value; cur.end += part.value.length; pos += part.value.length; }
    else cur.after += part.value;
  }
  if (cur) out.push(cur);
  // a word diff splits one edit into pieces around unchanged spaces or short words
  // ("menos de cuatro años" -> "cuatro años o menos"): join hunks whose gap is only
  // spaces or one word of up to 3 letters
  const joined = [];
  for (const h of out) {
    const prev = joined.at(-1);
    const gap = prev ? a.slice(prev.end, h.start) : null;
    if (prev && /^\s*\S{0,3}\s*$/u.test(gap) && gap.length <= 5) { prev.before += gap + h.before; prev.after += gap + h.after; prev.end = h.end; }
    else joined.push({ ...h });
  }
  return joined;
}

export function proposals(base, copy, { name, sender }) {
  const B = units(base), U = units(copy);
  const pairs = align(B.map((u) => u.rejected), U.map((u) => u.rejected));
  const out = [];
  const mk = (p) => out.push({ copy: name, noise: p.before !== undefined && !String(p.after ?? "").includes("\n") && normNoise(p.before) === normNoise(p.after ?? ""), ...p });
  const matchedU = new Set(pairs.map(([, j]) => j));
  for (const [i, j] of pairs) {
    const b = B[i].rejected, u = U[j];
    // 1. untracked: base vs the copy with tracked changes rejected
    const untracked = hunks(b, u.rejected);
    for (const h of untracked) mk({ author: sender, tracked: false, kind: h.before && h.after ? "replace" : h.before ? "delete" : "insert", para: i, ...h });
    // map offsets of the rejected view to the base (shifted by untracked hunks)
    const toBase = (x) => { let d = 0; for (const h of untracked) { const hs = h.start + d; if (x >= hs + h.after.length) d += h.before.length - h.after.length; else if (x > hs) return h.start; } return x - d; };
    // 2. tracked: contiguous runs of ins/del by the same author
    let rpos = 0, cur = null;
    const flush = () => { if (!cur) return; const s = toBase(cur.start), e = toBase(cur.start + cur.before.length); mk({ author: cur.author, date: cur.date, tracked: true, kind: cur.after.includes("\n") ? "split" : cur.before && cur.after ? "replace" : cur.before ? "delete" : "insert", para: i, start: s, end: e, before: cur.before, after: cur.after }); cur = null; };
    for (const s of u.segs) {
      if (s.kind === "same") { flush(); if (s.fmt) mk({ author: s.fmt.author, tracked: true, kind: "format", para: i, start: toBase(rpos), end: toBase(rpos + s.text.length), before: s.text, after: s.text, noise: false }); rpos += s.text.length; continue; }
      if (cur && (cur.author !== s.author)) flush();
      cur ??= { start: rpos, before: "", after: "", author: s.author, date: s.date };
      if (s.kind === "del") { cur.before += s.text; rpos += s.text.length; } else cur.after += s.text;
    }
    flush();
    // 3. comments
    for (const c of u.comments) mk({ author: c.author, tracked: true, kind: "comment", para: i, start: c.start, end: c.end, anchor: u.accepted.slice(c.start, c.end), text: c.text, noise: false });
  }
  // paragraphs only in the base (deleted without tracking) or only in the copy (new)
  const matchedB = new Set(pairs.map(([i]) => i));
  B.forEach((b, i) => { if (!matchedB.has(i)) mk({ author: sender, tracked: false, kind: "delete-paragraph", para: i, start: 0, end: b.rejected.length, before: b.rejected, after: "" }); });
  U.forEach((u, j) => {
    if (matchedU.has(j)) return;
    const prev = pairs.filter(([, jj]) => jj < j).at(-1)?.[0] ?? -1;
    const allIns = u.segs.every((s) => s.kind === "ins");
    mk({ author: allIns ? u.segs[0].author : sender, tracked: allIns, kind: "insert-paragraph", para: prev, start: Infinity, end: Infinity, before: "", after: u.accepted });
  });
  // 4. moves: a deletion and an insertion of the same text (>= 25 characters) by the same author
  const dels = out.filter((p) => p.kind === "delete" || p.kind === "delete-paragraph");
  for (const ins of out.filter((p) => p.kind === "insert" || p.kind === "insert-paragraph")) {
    const d = dels.find((x) => !x.moveOf && x.author === ins.author && normNoise(x.before).length >= 25 && normNoise(x.before) === normNoise(ins.after));
    if (d) { d.kind = "move-from"; ins.kind = "move-to"; d.moveOf = ins.para; ins.moveOf = d.para; }
  }
  return { proposals: out, aligned: pairs.length, baseUnits: B.length, copyUnits: U.length };
}
