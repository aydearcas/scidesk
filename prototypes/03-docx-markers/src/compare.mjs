// For every edited copy (out/word/*.docx), what SciDesk recovers compared with the copy it
// sent (out/article-coauthors.docx): blocks found by their bookmark, with their text
// unchanged or changed, bookmarks lost, bookmarks that now span several paragraphs,
// paragraphs with no bookmark (new or split), citations found by citationID, lost,
// deleted with tracked changes, duplicated or with a result typed over, citations typed
// by hand, and what REF and SEQ fields show.
//   node src/compare.mjs [dir]  -> out/compare.json and a table on stdout
import { readdirSync, writeFileSync } from "node:fs";
import { readDocx } from "./read-docx.mjs";

const dir = process.argv[2] ?? "out/word";
const base = await readDocx(process.argv[3] ?? "out/article-coauthors.docx");
const baseText = {};
for (const p of base.paragraphs) for (const b of p.bookmarks) if (b.startsWith("_SD_b_")) baseText[b] = p.plainAccepted;
const baseCits = new Map(base.fields.filter((f) => f.kind === "citation").map((f) => [f.citationID, f]));

// word overlap (Jaccard) between two texts, to tell whether a bookmark still sits on the
// paragraph it was written for
const words = (t) => new Set(t.toLowerCase().match(/\p{L}{3,}/gu) ?? []);
const baseWords = Object.fromEntries(Object.entries(baseText).map(([k, t]) => [k, words(t)]));
const sim = (a, b) => { if (!a.size && !b.size) return 1; let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n); };
const bestMatch = (text) => {
  const w = words(text);
  let best = null, score = -1;
  for (const [k, bw] of Object.entries(baseWords)) { const s = sim(w, bw); if (s > score) { score = s; best = k; } }
  return [best, score];
};

const rows = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".docx") && !f.startsWith("~$")).sort()) {
  const d = await readDocx(`${dir}/${file}`);
  const r = { file: file.replace(".docx", ""), blocks: Object.keys(baseText).length, same: 0, changed: [], deleted: [], lost: [], multi: [], wrong: [], unmarked: [], cit: {}, refs: [], seq: [], scidesk: !!d.custom.SciDesk };
  // owner of each paragraph: the block bookmark that starts in it (the last one, after a
  // join), or else a block bookmark that spans it
  const owner = d.paragraphs.map((p) => p.bookmarks.filter((b) => b.startsWith("_SD_b_")).at(-1) ?? null);
  for (const [n, b] of Object.entries(d.bookmarks)) {
    if (!n.startsWith("_SD_b_") || b.end == null) continue;
    for (let i = b.start + 1; i <= b.end; i++) if (!owner[i]) owner[i] = n;
  }
  for (const [name, text] of Object.entries(baseText)) {
    const bm = d.bookmarks[name];
    if (!bm) { r.lost.push(name); continue; }
    const mine = d.paragraphs.filter((p, i) => owner[i] === name || (i === bm.start));
    if (mine.length > 1) r.multi.push(`${name} (${mine.length} párr.)`);
    const p = d.paragraphs[bm.start];
    const now = mine.map((q) => q.plainAccepted).join("¶");
    // is the first paragraph of the block still the block's own text?
    const own = sim(words(mine[0].plainAccepted), baseWords[name]);
    const [other, otherScore] = bestMatch(mine[0].plainAccepted);
    if (mine[0].plainAccepted.trim() && other !== name && otherScore > own + 0.2) r.wrong.push(`${name} está en «${mine[0].plainAccepted.slice(0, 40)}», que es ${other}`);
    if (p.plainAccepted === "" && p.rejected !== "") r.deleted.push(name);
    else if (now === text) r.same++;
    else r.changed.push(`${name}: «${now.slice(0, 60)}»`);
  }
  for (const [i, p] of d.paragraphs.entries()) {
    if (!owner[i] && p.accepted.trim() && !p.inTable && !/^\d+\.\s/.test(p.accepted)) r.unmarked.push(`«${p.accepted.slice(0, 50)}»`);
  }
  const cits = d.fields.filter((f) => f.kind === "citation");
  const seen = new Map();
  for (const f of cits) seen.set(f.citationID, (seen.get(f.citationID) ?? 0) + 1);
  r.cit = {
    expected: baseCits.size,
    found: cits.filter((f) => !f.deleted && baseCits.has(f.citationID)).length,
    deletedTracked: cits.filter((f) => f.deleted).length,
    lost: [...baseCits.keys()].filter((id) => !seen.has(id)).length,
    duplicated: [...seen].filter(([, n]) => n > 1).map(([id]) => id),
    resultEdited: cits.filter((f) => f.result !== baseCits.get(f.citationID)?.result).map((f) => `${f.citationID}: «${f.result}» (era «${baseCits.get(f.citationID)?.result}»)`),
    typedByHand: d.paragraphs.flatMap((p) => p.plainAccepted.match(/\([A-Z][a-zé]+( et al\.)?,? \d{4}\)/g) ?? []),
  };
  r.refs = d.fields.filter((f) => f.kind === "ref").map((f) => `${f.target}=${f.result}${f.deleted ? " (borrado)" : ""}`);
  r.seq = d.fields.filter((f) => f.kind === "seq").map((f) => `${f.label} ${f.result}${f.deleted ? " (borrado)" : ""}`);
  r.otherBookmarks = Object.keys(d.bookmarks).filter((n) => !baseText[n] && !n.startsWith("_SDn_") && !n.startsWith("_SD_t_") && !n.startsWith("_SD_f_"));
  rows.push(r);
}
writeFileSync(`${dir}-compare.json`, JSON.stringify(rows, null, 1));
for (const r of rows) {
  console.log(`\n== ${r.file}: ${r.same}/${r.blocks} iguales, ${r.changed.length} cambiados, ${r.deleted.length} borrados con marca, ${r.lost.length} perdidos, ${r.multi.length} en varios párrafos, ${r.wrong.length} en un párrafo ajeno, ${r.unmarked.length} párrafos sin marcador; citas ${r.cit.found}/${r.cit.expected} (borradas con marca ${r.cit.deletedTracked}, perdidas ${r.cit.lost}, duplicadas ${r.cit.duplicated.length}, resultado editado ${r.cit.resultEdited.length}, a mano ${r.cit.typedByHand.length}); propiedad SciDesk: ${r.scidesk ? "sí" : "no"}`);
  for (const k of ["changed", "lost", "multi", "wrong", "unmarked"]) if (r[k].length) console.log(`   ${k}: ${r[k].slice(0, 4).join(" | ")}`);
  if (r.cit.resultEdited.length) console.log(`   resultEdited: ${r.cit.resultEdited.join(" | ")}`);
  if (r.cit.typedByHand.length) console.log(`   typedByHand: ${r.cit.typedByHand.join(" | ")}`);
  console.log(`   REF: ${r.refs.join(", ")}  SEQ: ${r.seq.join(", ")}${r.otherBookmarks.length ? `  otros marcadores: ${r.otherBookmarks.join(", ")}` : ""}`);
}
