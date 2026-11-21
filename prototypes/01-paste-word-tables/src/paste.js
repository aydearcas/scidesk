// Real Ctrl+V check. tools/hold-tables-on-clipboard.ps1 puts the tables on the clipboard
// one by one; this page waits for each, records what the browser hands over on paste
// (text/html), scores the result like the automated run and moves on to the next table.
import { createEditor } from "./editor.js";
import { compare, cfHtmlToMarkup } from "./measure.js";
import { cleanOfficeHtml } from "./clean.js";

const $ = (id) => document.getElementById(id);
const truth = await (await fetch("/private/truth.json")).json();
const wordBold = Object.fromEntries((await (await fetch("/private/word-bold.json")).json()).map((x) => [x.index, x.effectiveBold]));
const results = [];
let current = null;
let editor = null;
let pasted = null;

async function waitForNext() {
  $("which").textContent = "esperando a que Word copie la siguiente tabla…";
  for (;;) {
    const ready = await (await fetch("/api/ready")).json();
    if (ready.length) return ready[0];
    await new Promise((r) => setTimeout(r, 400));
  }
}
async function next() {
  current = await waitForNext();
  editor?.destroy();
  $("editor").innerHTML = "";
  pasted = null;
  editor = createEditor($("editor"), { transformPastedHTML: cleanOfficeHtml });
  editor.on("update", onPasted);
  $("which").textContent = `t${current}: haz clic en el recuadro y pulsa Ctrl+V`;
  editor.commands.focus();
}
$("editor").addEventListener("paste", (e) => (pasted = { html: e.clipboardData.getData("text/html"), types: [...e.clipboardData.types] }), true);

async function onPasted() {
  if (!pasted || current === null) return;
  const index = current;
  current = null;
  const captured = cfHtmlToMarkup(await (await fetch(`/private/clip/t${String(index).padStart(3, "0")}.html`)).text());
  const r = compare(truth[index - 1], editor.state.doc, { boldWant: wordBold[index] });
  // the automated run pasted `captured`; does a real paste hand over the same markup?
  const norm = (s) => s.replace(/\r\n/g, "\n");
  const same = norm(pasted.html) === norm(captured);
  let d = 0;
  const a = norm(pasted.html), b = norm(captured);
  while (d < a.length && a[d] === b[d]) d++;
  const res = { index, ok: r.ok, checks: r.checks, problems: r.problems, sameAsCapture: same, firstDiff: same ? null : d, around: same ? null : [a.slice(Math.max(0, d - 80), d + 80), b.slice(Math.max(0, d - 80), d + 80)], lengths: [a.length, b.length], types: pasted.types };
  results.push(res);
  await fetch(`/api/result?t=${index}`, { method: "POST", body: JSON.stringify(res) });
  await fetch(`/api/done?t=${index}`, { method: "POST" });
  $("out").textContent = results.map((x) => `t${x.index}: ${x.ok ? "bien" : "con fallos"}; mismo HTML que la captura: ${x.sameAsCapture ? "sí" : "no"}`).join("\n");
  next();
}
next();
