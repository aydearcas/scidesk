// Server side (Node) version of prototype 1's compare(): the page sends the grid of each
// pasted table (gridOf in ../01-paste-word-tables/src/measure.js) and the comparison with
// the reference read from the user's document happens here, so the reference (private)
// never goes to the browser. Also finds which of the 135 tables was pasted, by its text.
import { readFileSync } from "node:fs";

const P1 = new URL("../../01-paste-word-tables/private/", import.meta.url);
const truth = JSON.parse(readFileSync(new URL("truth.json", P1), "utf8"));
const wordBold = Object.fromEntries(JSON.parse(readFileSync(new URL("word-bold.json", P1), "utf8")).map((x) => [x.index, x.effectiveBold]));
const norm = (s) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const words = (grid) => new Set(norm(grid.flat().map((c) => c.paras.join(" ")).join(" ")).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const jac = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1); };

export function identify(grid) {
  const w = words(grid);
  let best = null, score = 0;
  for (const t of truth) { const s = jac(w, words(t.grid)); if (s > score) { score = s; best = t; } }
  return { truth: best, score };
}

export function compareGrid(t, got) {
  const want = t.grid, problems = [];
  let structure = got.length === want.length;
  if (!structure) problems.push(`filas: ${got.length} en lugar de ${want.length}`);
  let textCells = 0, textOk = 0, paraOk = 0;
  const fg = { b: 0, i: 0, sup: 0, sub: 0 }, fw = { b: 0, i: 0, sup: 0, sub: 0 };
  for (let r = 0; r < Math.min(got.length, want.length); r++) {
    const g = got[r], w = want[r];
    const spans = (row) => row.map((c) => `${c.colspan}x${c.rowspan}`).join(" ");
    if (spans(g) !== spans(w)) { structure = false; if (problems.length < 8) problems.push(`fila ${r + 1}: celdas ${spans(g)} en lugar de ${spans(w)}`); }
    for (let c = 0; c < Math.min(g.length, w.length); c++) {
      textCells++;
      if (norm(g[c].paras.join(" ")) === norm(w[c].paras.join(" "))) textOk++;
      else if (problems.length < 8) problems.push(`texto distinto en fila ${r + 1}, celda ${c + 1}`);
      if (g[c].paras.filter((p) => norm(p)).length === w[c].paras.filter((p) => norm(p)).length) paraOk++;
      else if (problems.length < 8) problems.push(`párrafos distintos en fila ${r + 1}, celda ${c + 1}`);
      for (const k of Object.keys(fg)) { fg[k] += g[c].fmt[k]; fw[k] += w[c].fmt[k]; }
    }
  }
  if (wordBold[t.index] !== undefined) fw.b = wordBold[t.index];
  const ratio = (k) => (fw[k] === 0 ? (fg[k] === 0 ? 1 : 0) : Math.min(fg[k], fw[k]) / Math.max(fg[k], fw[k]));
  const checks = {
    structure, text: textCells > 0 && textOk === textCells, paragraphs: textCells > 0 && paraOk === textCells,
    sup: ratio("sup") === 1, sub: ratio("sub") === 1, bold: ratio("b") >= 0.95, italic: ratio("i") >= 0.95,
    header: JSON.stringify(got.map((row, i) => (row.every((c) => c.header) ? i : -1)).filter((i) => i >= 0)) === JSON.stringify(t.headerRows ?? []),
  };
  for (const k of ["sup", "sub", "b", "i"]) if (fg[k] !== fw[k] && problems.length < 10) problems.push(`formato ${k}: ${fg[k]} caracteres en lugar de ${fw[k]}`);
  return { ok: Object.values(checks).every(Boolean), checks, problems };
}
