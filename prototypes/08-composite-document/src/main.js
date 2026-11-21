// Prototype UI: the whole article in one editor, a table in its own tab, and what is on disk.
import { applySuggestions, revertSuggestions, enableSuggestChanges, disableSuggestChanges, isSuggestChangesEnabled } from "@handlewithcare/prosemirror-suggest-changes";
import { createEditor } from "./editor.js";
import { compose, split, changedFiles, findAll, replaceAll } from "./composite.js";
import { TableTab } from "./table-tab.js";

const $ = (id) => document.getElementById(id);
let editor, manifest, onDisk, tab, loaded;

async function load(reset) {
  onDisk = await (await fetch(reset ? "/api/reset" : "/api/project", { method: reset ? "POST" : "GET" })).json();
  const c = compose(onDisk);
  manifest = c.manifest;
  loaded = c.loaded;
  tab?.destroy();
  tab = null;
  editor?.destroy();
  editor = createEditor($("editor"), c.doc, c.changes);
  editor.on("update", status);
  editor.on("selectionUpdate", status);
  window.__proto = { editor, get onDisk() { return onDisk; }, save, load };
  showDisk();
  status();
}
async function save() {
  const { files, tables } = split(editor.getJSON(), editor.storage.suggestChangesBridge.registry, manifest);
  const toWrite = changedFiles(files, onDisk);
  if (Object.keys(toWrite).length) {
    await fetch("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files: toWrite }) });
    Object.assign(onDisk, toWrite);
  }
  const orphans = Object.keys(onDisk).filter((p) => p.endsWith(".scitable") && !tables.some((t) => p.endsWith(t)));
  $("saved").textContent =
    (Object.keys(toWrite).length ? `Guardado: ${Object.keys(toWrite).map((p) => p.replace("articles/main/", "")).join(", ")}` : "Guardado: nada que escribir") +
    (orphans.length ? ` · Tablas sin referencia (se conservan): ${orphans.map((p) => p.split("/").pop()).join(", ")}` : "");
  showDisk();
  status();
  return Object.keys(toWrite);
}
function showDisk() {
  const sel = $("diskfile");
  const cur = sel.value;
  sel.innerHTML = Object.keys(onDisk).sort().map((p) => `<option>${p}</option>`).join("");
  if (cur && onDisk[cur] !== undefined) sel.value = cur;
  $("disk").textContent = onDisk[sel.value] ?? "";
}
function status() {
  const st = editor.state;
  const pending = split(editor.getJSON(), editor.storage.suggestChangesBridge.registry, manifest);
  const dirty = Object.keys(changedFiles(pending.files, onDisk)).map((p) => p.replace("articles/main/", ""));
  $("status").textContent = `Sugerencias: ${isSuggestChangesEnabled(st) ? "sí" : "no"} · Autor: ${editor.storage.suggestChangesBridge.author} · Sin guardar: ${dirty.join(", ") || "nada"}`;
}

$("save").onclick = save;
$("reset").onclick = () => load(true);
$("undo").onclick = () => editor.commands.undo();
$("redo").onclick = () => editor.commands.redo();
$("suggest").onclick = () => {
  const st = editor.state;
  (isSuggestChangesEnabled(st) ? disableSuggestChanges : enableSuggestChanges)(st, editor.view.dispatch);
  status();
};
$("author").onchange = (e) => {
  editor.storage.suggestChangesBridge.author = e.target.value;
  status();
};
$("acceptAll").onclick = () => applySuggestions(editor.state, editor.view.dispatch);
$("rejectAll").onclick = () => revertSuggestions(editor.state, editor.view.dispatch);
$("find").oninput = () => ($("hits").textContent = $("find").value ? `${findAll(editor.state.doc, $("find").value).length} coincidencias` : "");
$("replace").onclick = () => {
  editor.view.dispatch(replaceAll(editor.state, $("find").value, $("with").value));
  $("find").oninput();
};
$("openTable").onclick = () => {
  tab?.destroy();
  $("tab").innerHTML = "";
  tab = new TableTab(editor, $("tableId").value, $("tab"));
  $("tabTitle").textContent = `Pestaña: ${$("tableId").value}`;
};
$("diskfile").onchange = showDisk;
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    save();
  }
});
load(false);
