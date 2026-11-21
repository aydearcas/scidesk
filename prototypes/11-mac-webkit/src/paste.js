// The real paste from Word for Mac in WebKit: what the browser hands over (types, HTML),
// pasted with prototype 1's cleaner and without it. The grids of the pasted tables go to
// the PC, which says which of the 135 tables it is and compares it with the reference.
import { createEditor } from "../../01-paste-word-tables/src/editor.js";
import { cleanOfficeHtml } from "../../01-paste-word-tables/src/clean.js";
import { tablesIn, gridOf } from "../../01-paste-word-tables/src/measure.js";

const $ = (id) => document.getElementById(id);
let editor = createEditor($("editor"), { transformPastedHTML: cleanOfficeHtml });
let rawEditor = createEditor($("raw"));
let pasted = null;
const lines = [];

$("editor").addEventListener("paste", (e) => {
  const d = e.clipboardData;
  pasted = { types: [...d.types], html: d.getData("text/html"), rtf: d.types.includes("text/rtf") ? d.getData("text/rtf") : "" };
}, true);

editor.on("update", async () => {
  if (!pasted) return;
  const p = pasted;
  pasted = null;
  // the same HTML, with no cleaner, in a hidden editor
  rawEditor.commands.setContent("<p></p>");
  rawEditor.view.pasteHTML(p.html);
  const grids = (ed) => tablesIn(ed.state.doc).map(gridOf);
  const res = await (await fetch("/api/paste", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ua: navigator.userAgent, types: p.types, html: p.html, rtf: p.rtf, cleaned: grids(editor), raw: grids(rawEditor) }) })).json();
  const show = (list) => list.map((t) => `tabla ${t.table} (parecido ${t.match}): ${t.ok ? "BIEN" : "con fallos"}${t.ok ? "" : " — " + Object.entries(t.checks).filter(([, v]) => !v).map(([k]) => k).join(", ")}`).join("; ") || "ninguna tabla";
  lines.unshift(`${new Date().toLocaleTimeString()} · tipos: ${p.types.join(", ")}\n   con limpiador: ${show(res.cleaned)}\n   sin limpiador: ${show(res.raw)}`);
  $("out").textContent = lines.join("\n");
  setTimeout(() => editor.commands.setContent("<p></p>"), 300);
});
$("clear").onclick = () => editor.commands.setContent("<p></p>");
