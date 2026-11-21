// Three-way merge of a review round (PLAN.md 5.11, R2): base = the copy that was sent,
// mine = the author's current copy (the base plus what the author wrote since), theirs =
// each returned copy. Proposals are computed base -> theirs and applied onto mine.
//   - a proposal that touches characters the author also changed: conflict with mine;
//   - two co-authors touching the same characters: agreement if they did the same (after
//     normalising noise), otherwise a conflict between co-authors;
//   - two co-authors in the same sentence without touching the same characters: shown
//     together, both applied;
//   - noise (spaces, quote marks, dashes) is hidden and not applied; format changes and
//     comments are listed apart and do not conflict.
// Also checks that applying all of a copy's proposals to the base gives back that copy's
// text with its changes accepted (so the proposals lose nothing).
//   node src/merge.mjs  -> summary on stdout, out/merge.json and out/merged.txt
import { writeFileSync, mkdirSync } from "node:fs";
import { diffWordsWithSpace } from "diff";
import { readRevisions, units } from "./read-revisions.mjs";
import { proposals, normNoise } from "./proposals.mjs";
import { truth } from "./score.mjs";

const C = "../corpus/synthetic-round-knee-oa/";
const base = await readRevisions(C + "sent.docx");
const B = units(base);
const baseTexts = B.map((u) => u.rejected);

// mine: three changes the author made after sending (invented for the test)
const MY_EDITS = [
  { anchor: "que afecta a entre el 4 % y el 10 % de las rodillas en riesgo", from: "el 10 %", to: "el 12 %", why: "same characters as Ríos (R36): conflict with mine" },
  { anchor: "La escala KL clasifica la artrosis de 0 a 4", from: "La escala KL clasifica", to: "La escala de Kellgren-Lawrence (KL) clasifica", why: "paragraph Ríos and Soler also changed, elsewhere: no conflict" },
  { anchor: "Conviene recordar que la clasificación radiográfica tiene un límite intrínseco", from: "Conviene recordar que", to: "Hay que recordar que", why: "paragraph nobody else touched" },
];
const mineTexts = [...baseTexts];
for (const e of MY_EDITS) {
  const i = mineTexts.findIndex((t) => t.includes(e.anchor));
  if (i < 0) throw new Error(`not in base: ${e.anchor}`);
  mineTexts[i] = mineTexts[i].replace(e.from, e.to);
  e.para = i;
}
const diffHunks = (a, b) => {
  const out = []; let pos = 0;
  for (const p of diffWordsWithSpace(a, b)) {
    if (!p.added && !p.removed) { pos += p.value.length; continue; }
    const last = out.at(-1);
    const h = last && last.end === pos && (p.added || last.after === "") ? last : (out.push({ start: pos, end: pos, before: "", after: "" }), out.at(-1));
    if (p.removed) { h.before += p.value; h.end += p.value.length; pos += p.value.length; } else h.after += p.value;
  }
  return out;
};
const mineHunks = mineTexts.map((t, i) => (t === baseTexts[i] ? [] : diffHunks(baseTexts[i], t)));

// proposals of each copy
const copies = [];
for (const who of ["rios", "soler"]) {
  const t = truth(who);
  const name = t.coauthor.replace(/^(Dra?\.)\s*/, "");
  copies.push({ who, name, docx: await readRevisions(C + t.returned_file) });
}
const all = copies.flatMap((c) => proposals(base, c.docx, { name: c.who, sender: c.name }).proposals);

// check: each copy's proposals applied to the base give back the copy's accepted text
function applyAll(text, props) {
  let out = text;
  for (const p of [...props].sort((a, b) => b.start - a.start || (a.kind.includes("insert") ? 1 : -1))) out = out.slice(0, p.start) + p.after + out.slice(p.end);
  return out;
}
const textual = (p) => !["comment", "format"].includes(p.kind);
const reconstruction = {};
for (const c of copies) {
  const U = units(c.docx);
  const props = all.filter((p) => p.copy === c.who && textual(p));
  // the whole document both ways: base + proposals, and the copy with everything accepted
  const gotDoc = B.map((b, i) => applyAll(b.rejected, props.filter((p) => p.para === i && p.kind !== "insert-paragraph"))).join("\n");
  const wantDoc = U.map((u) => u.accepted).join("\n");
  reconstruction[c.who] = gotDoc === wantDoc ? "identical" : `differs (${gotDoc.length} vs ${wantDoc.length} chars)`;
}

// sentences of a base paragraph, to group proposals that share one
const sentenceOf = (i, pos) => {
  const t = baseTexts[i];
  let s = 0;
  for (const m of t.matchAll(/[.!?](?:\s*\[[\d,–-]+\])?\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/g)) { const e = m.index + m[0].length; if (pos < e) return s; s = e; }
  return s;
};
const overlaps = (a, b) => (a.start < b.end && b.start < a.end) || (a.start === a.end && b.start <= a.start && a.start <= b.end) || (b.start === b.end && a.start <= b.start && b.start <= a.end);

const status = new Map();
const conflicts = [], agreements = [], sameSentence = [];
const text = all.filter((p) => textual(p) && !p.noise && p.kind !== "insert-paragraph");
for (const p of text) status.set(p, "apply");
for (const p of text) {
  for (const h of mineHunks[p.para] ?? []) if (overlaps(p, h)) { status.set(p, "conflict-mine"); conflicts.push({ type: "with mine", para: p.para, mine: `${h.before} → ${h.after}`, theirs: `${p.copy}: ${p.before} → ${p.after}` }); }
}
// clusters of overlapping proposals from different copies in one paragraph. Within a
// cluster, each co-author's RESULT over the whole zone is compared, not the pieces: one
// may have written in one piece what the other wrote in two.
const seen = new Set();
for (const p of text) {
  if (seen.has(p)) continue;
  const cluster = [p];
  // (one character of slack: the second piece of an edit often starts after a space)
  const near = (a, b) => overlaps({ start: a.start - 1, end: a.end + 1 }, b);
  for (let k = 0; k < cluster.length; k++) for (const q of text) if (!cluster.includes(q) && q.para === p.para && near(cluster[k], q)) cluster.push(q);
  cluster.forEach((x) => seen.add(x));
  const byCopy = Object.groupBy(cluster, (x) => x.copy);
  const names = Object.keys(byCopy);
  if (names.length < 2) continue;
  const s = Math.min(...cluster.map((x) => x.start)), e = Math.max(...cluster.map((x) => x.end));
  const zone = baseTexts[p.para];
  const result = (props) => applyAll(zone.slice(s, e), props.map((x) => ({ ...x, start: x.start - s, end: x.end - s })));
  const results = names.map((n) => result(byCopy[n]));
  const show = (n, r) => `${n}: «${zone.slice(s, e)}» → «${r}»`;
  if (results.every((r) => normNoise(r) === normNoise(results[0]))) {
    names.slice(1).forEach((n) => byCopy[n].forEach((x) => status.set(x, "duplicate")));
    agreements.push({ para: p.para, change: show(names[0], results[0]), also: show(names[1], results[1]) });
  } else {
    cluster.forEach((x) => { if (status.get(x) === "apply") status.set(x, "conflict-coauthors"); });
    conflicts.push({ type: "between co-authors", para: p.para, a: show(names[0], results[0]), b: show(names[1], results[1]) });
  }
}
for (let a = 0; a < text.length; a++) for (let b = a + 1; b < text.length; b++) {
  const p = text[a], q = text[b];
  if (p.copy === q.copy || p.para !== q.para || overlaps(p, q)) continue;
  if (sentenceOf(p.para, p.start) === sentenceOf(q.para, q.start)) sameSentence.push({ para: p.para, a: `${p.copy}: ${p.before} → ${p.after}`, b: `${q.copy}: ${q.before} → ${q.after}` });
}

// apply what does not conflict onto mine (base offsets shifted by mine's own changes)
const merged = mineTexts.map((t, i) => {
  const shift = (x) => (mineHunks[i] ?? []).filter((h) => h.end <= x).reduce((d, h) => d + h.after.length - h.before.length, 0);
  const props = text.filter((p) => p.para === i && status.get(p) === "apply").map((p) => ({ ...p, start: p.start + shift(p.start), end: p.end + shift(p.start) }));
  return applyAll(t, props);
});
const newParas = all.filter((p) => p.kind === "insert-paragraph" && !p.noise);

const hidden = all.filter((p) => p.noise);
const count = (st) => text.filter((p) => status.get(p) === st).length;
const report = {
  proposals: all.length,
  byAuthor: Object.fromEntries(copies.map((c) => [c.name, all.filter((p) => p.author === c.name).length])),
  textualVisible: text.length, applied: count("apply"), conflictWithMine: count("conflict-mine"), conflictBetweenCoauthors: count("conflict-coauthors"), duplicatesMerged: count("duplicate"),
  sameSentenceShownTogether: sameSentence.length, hiddenNoise: hidden.length, formatChanges: all.filter((p) => p.kind === "format").length, comments: all.filter((p) => p.kind === "comment").length, newParagraphs: newParas.length,
  reconstruction, myEditsKept: MY_EDITS.map((e) => merged[e.para].includes(e.to)),
};
mkdirSync("out", { recursive: true });
writeFileSync("out/merge.json", JSON.stringify({ report, conflicts, agreements, sameSentence, hidden: hidden.map((p) => ({ copy: p.copy, before: p.before, after: p.after })), myEdits: MY_EDITS }, null, 1));
writeFileSync("out/merged.txt", merged.join("\n"));
console.log(JSON.stringify(report, null, 1));
for (const c of conflicts) console.log("CONFLICT", c.type, "¶" + c.para, c.mine ?? c.a, "|", c.theirs ?? c.b);
for (const a of agreements) console.log("AGREE", "¶" + a.para, a.change, "|", a.also);
for (const s of sameSentence) console.log("SAME SENTENCE", "¶" + s.para, s.a.slice(0, 60), "|", s.b.slice(0, 60));
