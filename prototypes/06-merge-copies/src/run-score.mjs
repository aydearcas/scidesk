// Proposals of each returned copy, scored against the ground truth.
//   node src/run-score.mjs  -> table on stdout, details in out/score.json
import { writeFileSync, mkdirSync } from "node:fs";
import { readRevisions, units } from "./read-revisions.mjs";
import { proposals } from "./proposals.mjs";
import { score, truth } from "./score.mjs";

const C = "../corpus/synthetic-round-knee-oa/";
const base = await readRevisions(C + "sent.docx");
const baseUnits = units(base);
const baseTexts = baseUnits.map((u) => u.rejected);
const baseWhere = baseUnits.map((u) => u.where);
const out = {};
for (const who of ["rios", "soler"]) {
  const t = truth(who);
  const copy = await readRevisions(C + t.returned_file);
  const t0 = performance.now();
  const { proposals: props } = proposals(base, copy, { name: who, sender: t.coauthor.replace(/^(Dra?\.)\s*/, "") });
  const ms = performance.now() - t0;
  const s = score(props, baseTexts, t.edits, t.coauthor.replace(/^(Dra?\.)\s*/, ""), { copy: who, baseWhere });
  out[who] = { ms: +ms.toFixed(1), proposals: props.length, ...s };
  console.log(who, `${ms.toFixed(0)} ms`, JSON.stringify(s.summary));
  for (const r of s.rows.filter((r) => !r.found || !r.author || !r.trackedOk || !r.kindOk || !r.noiseOk || r.pieces > 1)) console.log("   ", r.id, r.type, r.tracked ? "" : "(sin marcar)", `found=${r.found} pieces=${r.pieces} author=${r.author} tracked=${r.trackedOk} kind=${r.kindOk} noise=${r.noiseOk}`, r.note ?? "");
  for (const p of s.falsePositives) console.log("    FP", p.kind, p.tracked ? "" : "(sin marcar)", p.noise ? "[ruido]" : "", JSON.stringify(p.before ?? "").slice(0, 40), "→", JSON.stringify(p.after ?? p.text ?? "").slice(0, 40));
}
mkdirSync("out", { recursive: true });
writeFileSync("out/score.json", JSON.stringify(out, null, 1));
