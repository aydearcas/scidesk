// Pastes every captured table into a fresh editor (view.pasteHTML runs the same path as
// Ctrl+V: transformPastedHTML, parse, transformPasted) and scores it against the DOCX.
import { createEditor } from "./editor.js";
import { compare, cfHtmlToMarkup } from "./measure.js";
import { cleanOfficeHtml } from "./clean.js";

const out = document.getElementById("out");
const print = (s) => (out.textContent += s + "\n");
const truth = await (await fetch("/private/truth.json")).json();
const wordBold = Object.fromEntries((await (await fetch("/private/word-bold.json")).json()).map((x) => [x.index, x.effectiveBold]));
const variant = new URLSearchParams(location.search).get("variant") ?? "raw";
const only = new URLSearchParams(location.search).get("tables");
const list = only ? only.split(",").map(Number) : truth.map((t) => t.index);

const summary = { variant, tables: 0, ok: 0, checks: {}, ms: [] };
const failures = [];
for (const i of list) {
  const t = truth[i - 1];
  const cf = await (await fetch(`/private/clip/t${String(i).padStart(3, "0")}.html`)).text();
  const html = cfHtmlToMarkup(cf);
  const el = document.createElement("div");
  document.body.appendChild(el);
  const editor = createEditor(el, variant === "clean" ? { transformPastedHTML: cleanOfficeHtml } : {});
  const t0 = performance.now();
  editor.view.pasteHTML(html);
  const ms = performance.now() - t0;
  const r = compare(t, editor.state.doc, { boldWant: wordBold[i] });
  editor.destroy();
  el.remove();
  summary.tables++;
  summary.ms.push(ms);
  if (r.ok) summary.ok++;
  for (const [k, v] of Object.entries(r.checks)) summary.checks[k] = (summary.checks[k] ?? 0) + (v ? 1 : 0);
  if (!r.ok) failures.push({ index: i, rows: t.rows, cols: t.cols, cells: t.cells, checks: r.checks, problems: r.problems });
}
summary.ms.sort((a, b) => a - b);
const res = {
  variant,
  tables: summary.tables,
  ok: summary.ok,
  checks: summary.checks,
  pasteMs: { median: +summary.ms[summary.ms.length >> 1].toFixed(1), max: +summary.ms.at(-1).toFixed(1) },
  failures,
};
window.__result = res;
print(`Variante: ${variant}. Tablas bien: ${res.ok}/${res.tables}`);
print(`Por comprobación: ${JSON.stringify(res.checks)}`);
print(`Tiempo de pegado: mediana ${res.pasteMs.median} ms, máximo ${res.pasteMs.max} ms`);
for (const f of failures.slice(0, 40)) print(`  t${f.index} (${f.rows}x${f.cols}): ${Object.entries(f.checks).filter(([, v]) => !v).map(([k]) => k).join(", ")} — ${f.problems.slice(0, 3).join(" | ")}`);
