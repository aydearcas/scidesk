// Scores Word's Combine (out/word-combined.docx, from tools/word-combine.ps1) the same way
// as SciDesk's proposals: the combined document is read as one copy whose changes are all
// tracked, and each co-author's true edits are looked for among the revisions with their name.
//   node src/score-word.mjs
import { readRevisions, units } from "./read-revisions.mjs";
import { proposals } from "./proposals.mjs";
import { score, truth } from "./score.mjs";

const C = "../corpus/synthetic-round-knee-oa/";
const base = await readRevisions(C + "sent.docx");
const B = units(base);
const combined = await readRevisions("out/word-combined.docx");
const { proposals: props, aligned } = proposals(base, combined, { name: "word", sender: "(sin marca)" });
const authors = {};
for (const p of props) authors[`${p.author}${p.tracked ? "" : " (sin marcar)"}`] = (authors[`${p.author}${p.tracked ? "" : " (sin marcar)"}`] ?? 0) + 1;
console.log(JSON.stringify({ aligned: `${aligned}/${B.length}`, proposals: props.length, byAuthor: authors, noise: props.filter((p) => p.noise).length }));
for (const who of ["rios", "soler"]) {
  const t = truth(who);
  const name = t.coauthor.replace(/^(Dra?\.)\s*/, "");
  const s = score(props, B.map((u) => u.rejected), t.edits, name, { baseWhere: B.map((u) => u.where), byAuthor: true });
  // in Word every combined change is a tracked revision: "tracked" here only means that the
  // change carries the right author, so the tracked/untracked column does not apply
  console.log(who, JSON.stringify({ edits: s.summary.edits, found: s.summary.found, onePiece: s.summary.onePiece, author: s.summary.author, kindOk: s.summary.kindOk, noiseFlagged: s.summary.noiseOk, falsePositives: s.summary.falsePositives }));
  for (const r of s.rows.filter((r) => !r.found || !r.kindOk || r.pieces > 1)) console.log("   ", r.id, r.type, r.tracked ? "" : "(sin marcar)", `found=${r.found} pieces=${r.pieces} kind=${r.kindOk}`, (r.note ?? "").slice(0, 110));
}
