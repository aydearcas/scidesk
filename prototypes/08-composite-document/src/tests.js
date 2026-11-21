// Automated checks for prototype 8, run in a real browser (tests.html). Every test starts
// from the fixture files, composes them into one editor, edits, and splits again.
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { applySuggestions, revertSuggestions, enableSuggestChanges } from "@handlewithcare/prosemirror-suggest-changes";
import { createEditor } from "./editor.js";
import { compose, split, changedFiles, numbering, findAll, replaceAll } from "./composite.js";
import { TableTab } from "./table-tab.js";

const out = document.getElementById("out");
const results = [];
const log = (ok, name, detail = "") => {
  results.push({ ok, name, detail });
  out.textContent += `${ok ? "OK   " : "FALLA"} ${name}${detail ? `\n      ${detail}` : ""}\n`;
};
const short = (paths) => paths.map((p) => p.replace("articles/main/", "")).sort().join(", ") || "(ninguno)";

const fixture = await (await fetch("/api/reset", { method: "POST" })).json();

// Canonical files: what the first save after loading the fixture would write.
function setup(files = fixture) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const c = compose(files);
  const editor = createEditor(el, c.doc, structuredClone(c.changes));
  const saveAll = () => split(editor.getJSON(), editor.storage.suggestChangesBridge.registry, c.manifest);
  const disk = { ...files, ...saveAll().files };
  const dirty = () => Object.keys(changedFiles(saveAll().files, disk));
  const commit = () => Object.assign(disk, saveAll().files);
  return { editor, el, disk, dirty, commit, saveAll, manifest: c.manifest, done: () => (editor.destroy(), el.remove()) };
}
const posOf = (doc, needle, offset = 0) => {
  let f = null;
  doc.descendants((n, p) => {
    if (f === null && n.isText && n.text.includes(needle)) f = p + n.text.indexOf(needle) + offset;
  });
  if (f === null) throw new Error(`no encontrado: ${needle}`);
  return f;
};
const partPos = (doc, id) => {
  let f = null;
  doc.forEach((n, off) => n.type.name === "tablePart" && n.attrs.id === id && (f = off));
  return f;
};
async function test(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) log(true, name);
    else if (r && typeof r === "object") log(true, name, r.info);
    else log(false, name, r);
  } catch (e) {
    log(false, name, `error: ${e.message}`);
  }
}

await test("01 cargar y guardar sin cambios no escribe nada (y el formato es estable)", () => {
  const t = setup();
  const first = t.dirty();
  // load what was saved and save again: must be byte-identical
  const t2 = setup(t.disk);
  const second = Object.keys(changedFiles(t2.saveAll().files, t.disk));
  t.done(); t2.done();
  return second.length === 0 || `al reabrir cambian: ${short(second)} (en la carga del fixture: ${short(first)})`;
});

await test("02 editar una celda solo cambia su .scitable", () => {
  const t = setup();
  t.editor.view.dispatch(t.editor.state.tr.insertText(" (DE 11)", posOf(t.editor.state.doc, "Mujeres", 7)));
  const d = t.dirty(); t.done();
  return short(d) === "tables/baseline.scitable" || `cambian: ${short(d)}`;
});

await test("03 editar el resumen solo cambia abstract.scidoc", () => {
  const t = setup();
  t.editor.view.dispatch(t.editor.state.tr.insertText(" prospectiva", posOf(t.editor.state.doc, "de inicio.", 9)));
  const d = t.dirty(); t.done();
  return short(d) === "manuscript/abstract.scidoc" || `cambian: ${short(d)}`;
});

await test("04 deshacer es común a cuerpo, tabla y resumen", () => {
  const t = setup();
  const ed = t.editor;
  const steps = [["Discusión", "Discusión y "], ["Buena", "Buena "], ["Resumen", "Resumen "]];
  for (const [needle, text] of steps) {
    // closeHistory: each edit is its own undo step, as when typing with pauses
    ed.view.dispatch(closeHistory(ed.state.tr.insertText(text, posOf(ed.state.doc, needle), posOf(ed.state.doc, needle, needle.length))));
  }
  const afterEdits = short(t.dirty());
  for (let i = 0; i < 3; i++) ed.commands.undo();
  const d = t.dirty(); t.done();
  return (d.length === 0 && afterEdits.split(", ").length === 3) || `tras editar: ${afterEdits}; tras deshacer quedan: ${short(d)}`;
});

await test("05 buscar y reemplazar en todo el artículo, un solo paso de deshacer", () => {
  const t = setup();
  const ed = t.editor;
  const n = findAll(ed.state.doc, "inflamatoria").length;
  ed.view.dispatch(replaceAll(ed.state, "inflamatoria", "clínica"));
  const d = short(t.dirty());
  const left = findAll(ed.state.doc, "inflamatoria").length;
  ed.commands.undo();
  const back = t.dirty(); t.done();
  const want = "manuscript/abstract.scidoc, manuscript/article.scidoc, tables/baseline.scitable";
  return (d === want && left === 0 && back.length === 0) || `${n} coincidencias; cambian: ${d}; quedan ${left}; tras deshacer: ${short(back)}`;
});

await test("06 la numeración de citas, tablas y notas cuenta las tablas en su sitio", () => {
  const t = setup();
  const nb = numbering(t.editor.state.doc);
  const got = JSON.stringify({ refs: [...nb.refs], tables: [...nb.tables], notes: [...nb.notes.values()], last: nb.citationLabel(["smolen2016", "aletaha2010"]) });
  t.done();
  const want = JSON.stringify({ refs: [["smolen2016", 1], ["aletaha2010", 2], ["prevoo1995", 3], ["fransen2005", 4]], tables: [["tab-basal", 1], ["tab-resp", 2]], notes: ["a", "b", "a"], last: "1,2" });
  return got === want || got;
});

await test("07 seleccionar desde el texto hasta dentro de la tabla y borrar: no se mueve texto entre archivos", () => {
  const t = setup();
  const ed = t.editor;
  const from = posOf(ed.state.doc, "disminuyó en el seguimiento");
  const to = posOf(ed.state.doc, "Características basales", 5);
  // a) a raw delete step across the border is refused
  ed.view.dispatch(ed.state.tr.delete(from, to));
  const refused = t.dirty().length === 0;
  // b) the keyboard path: select across and press Backspace (clamped to the body side)
  ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, from, to)));
  ed.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", keyCode: 8, bubbles: true, cancelable: true }));
  const doc = ed.state.doc;
  doc.check();
  const caption = doc.nodeAt(partPos(doc, "tab-basal")).firstChild.textContent;
  const d = short(t.dirty());
  t.done();
  return (refused && caption === "Características basales de los pacientes" && d === "manuscript/article.scidoc") ||
    `paso crudo rechazado: ${refused}; pie: "${caption}"; cambian: ${d}`;
});

await test("08 pegar una copia de la tabla crea un archivo nuevo y no pisa el original", () => {
  const t = setup();
  const ed = t.editor;
  const pos = partPos(ed.state.doc, "tab-basal");
  const copy = ed.state.doc.nodeAt(pos);
  ed.view.dispatch(ed.state.tr.insert(ed.state.doc.content.size, copy));
  const { tables } = t.saveAll();
  const ids = new Set();
  let dupNote = false;
  ed.state.doc.descendants((n) => {
    if (n.type.name === "tableNote") (ids.has(n.attrs.id) ? (dupNote = true) : ids.add(n.attrs.id));
  });
  const d = short(t.dirty()); t.done();
  return (new Set(tables).size === 3 && !dupNote) || `tablas: ${tables.join(", ")}; notas repetidas: ${dupNote}; cambian: ${d}`;
});

await test("09 borrar la tabla entera la quita del cuerpo, conserva su archivo y deshacer la recupera", () => {
  const t = setup();
  const ed = t.editor;
  ed.view.dispatch(ed.state.tr.setSelection(NodeSelection.create(ed.state.doc, partPos(ed.state.doc, "tab-resp"))));
  ed.commands.deleteSelection();
  const { tables, files } = t.saveAll();
  const d = short(t.dirty());
  const fileKept = !("articles/main/tables/response.scitable" in changedFiles(files, t.disk)) && t.disk["articles/main/tables/response.scitable"];
  ed.commands.undo();
  const back = t.dirty(); t.done();
  return (d === "manuscript/article.scidoc" && !tables.includes("tables/response.scitable") && fileKept && back.length === 0) || `cambian: ${d}; tablas: ${tables}; tras deshacer: ${short(back)}`;
});

await test("10 sugerencias de dos autores en cuerpo y tabla: cada registro va a su archivo y sobrevive a reabrir", () => {
  const t = setup();
  const ed = t.editor;
  enableSuggestChanges(ed.state, ed.view.dispatch);
  ed.storage.suggestChangesBridge.author = "Ana";
  ed.view.dispatch(ed.state.tr.insertText("aproximadamente ", posOf(ed.state.doc, "al 0,5")));
  ed.storage.suggestChangesBridge.author = "Luis";
  ed.view.dispatch(ed.state.tr.delete(posOf(ed.state.doc, "Factor reumatoide"), posOf(ed.state.doc, "Factor reumatoide", 7)));
  t.commit();
  const body = JSON.parse(t.disk["articles/main/manuscript/article.scidoc"]).changes;
  const table = JSON.parse(t.disk["articles/main/tables/baseline.scitable"]).changes;
  const authors = (c) => Object.values(c).map((x) => x.author).join(",");
  const t2 = setup(t.disk);
  const reg = t2.editor.storage.suggestChangesBridge.registry;
  applySuggestions(t2.editor.state, t2.editor.view.dispatch);
  const text = t2.editor.state.doc.textContent;
  const ok = authors(body) === "Ana" && authors(table) === "Luis" && Object.keys(reg).length === 2 && text.includes("aproximadamente al 0,5") && !text.includes("Factor reumatoide");
  t.done(); t2.done();
  return ok || `cuerpo: ${authors(body)}; tabla: ${authors(table)}; registro al reabrir: ${Object.keys(reg).length}; texto aceptado ok: ${text.includes("aproximadamente")}`;
});

await test("11 sugerir borrar una tabla entera: la marca va en la referencia del cuerpo y rechazar la recupera", () => {
  const t = setup();
  const ed = t.editor;
  enableSuggestChanges(ed.state, ed.view.dispatch);
  const pos = partPos(ed.state.doc, "tab-resp");
  ed.view.dispatch(ed.state.tr.delete(pos, pos + ed.state.doc.nodeAt(pos).nodeSize));
  const body = JSON.parse(t.saveAll().files["articles/main/manuscript/article.scidoc"]);
  const ref = body.doc.content.find((n) => n.type === "tableRef" && n.attrs.id === "tab-resp");
  const marked = ref?.marks?.[0]?.type;
  const stillThere = partPos(ed.state.doc, "tab-resp") !== null;
  revertSuggestions(ed.state, ed.view.dispatch);
  const back = t.dirty(); t.done();
  return (marked === "deletion" && stillThere && back.length === 0) || `marca en la referencia: ${marked}; la tabla sigue a la vista: ${stillThere}; tras rechazar cambian: ${short(back)}`;
});

await test("12 la pestaña de la tabla edita el mismo documento: deshacer común y sincronía en los dos sentidos", () => {
  const t = setup();
  const ed = t.editor;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const tab = new TableTab(ed, "tab-basal", el);
  // type in the tab
  const inner = tab.view;
  let p = null;
  inner.state.doc.descendants((n, pos) => { if (p === null && n.isText && n.text === "86") p = pos + 2; });
  inner.dispatch(inner.state.tr.insertText(" (71,7)", p));
  const inMain = ed.state.doc.textContent.includes("86 (71,7)");
  const d = short(t.dirty());
  // edit the same table in the main view: the tab must follow
  ed.view.dispatch(ed.state.tr.insertText("Pacientes: ", posOf(ed.state.doc, "Mujeres")));
  const tabFollows = inner.state.doc.textContent.includes("Pacientes: Mujeres");
  ed.commands.undo();
  ed.commands.undo();
  const back = t.dirty();
  const tabBack = !inner.state.doc.textContent.includes("(71,7)") && !inner.state.doc.textContent.includes("Pacientes");
  tab.destroy(); el.remove(); t.done();
  return (inMain && d === "tables/baseline.scitable" && tabFollows && back.length === 0 && tabBack) ||
    `en el principal: ${inMain}; cambian: ${d}; la pestaña sigue: ${tabFollows}; tras deshacer: ${short(back)} / pestaña ${tabBack}`;
});

await test("13 escribir en la pestaña en modo sugerencias deja la sugerencia en el documento y en la pestaña", () => {
  const t = setup();
  const ed = t.editor;
  enableSuggestChanges(ed.state, ed.view.dispatch);
  ed.storage.suggestChangesBridge.author = "Luis";
  const el = document.createElement("div");
  document.body.appendChild(el);
  const tab = new TableTab(ed, "tab-resp", el);
  let p = null;
  tab.view.state.doc.descendants((n, pos) => { if (p === null && n.isText && n.text === "48") p = pos + 2; });
  for (const ch of " (40 %)") tab.view.dispatch(tab.view.state.tr.insertText(ch, p++));
  const json = JSON.parse(t.saveAll().files["articles/main/tables/response.scitable"]);
  const ids = Object.keys(json.changes);
  const tabMarked = el.querySelector("ins")?.textContent;
  tab.destroy(); el.remove(); t.done();
  return (ids.length === 1 && json.changes[ids[0]].author === "Luis" && tabMarked === " (40 %)") || `cambios en el archivo: ${JSON.stringify(json.changes)}; en la pestaña: "${tabMarked}"`;
});

await test("14 tiempos con un artículo largo (300 párrafos más, 6 tablas)", async () => {
  const big = structuredClone(fixture);
  const art = JSON.parse(big["articles/main/manuscript/article.scidoc"]);
  const sentence = "Los pacientes con artritis reumatoide presentaron una mejoría significativa de la actividad inflamatoria. ";
  for (let i = 0; i < 300; i++) art.doc.content.splice(5, 0, { type: "paragraph", content: [{ type: "text", text: sentence.repeat(3) + `(${i})` }] });
  for (let k = 0; k < 4; k++) {
    const src = `tables/extra${k}.scitable`;
    const tbl = JSON.parse(big["articles/main/tables/baseline.scitable"]);
    tbl.doc.attrs.id = `tab-x${k}`;
    tbl.doc.content[1].content.push(...Array.from({ length: 25 }, () => structuredClone(tbl.doc.content[1].content[2])));
    tbl.doc.content.slice(2).forEach((n, j) => (n.attrs.id = `n-x${k}${j}`));
    big[`articles/main/${src}`] = JSON.stringify(tbl);
    art.doc.content.splice(100 + k * 50, 0, { type: "tableRef", attrs: { id: `tab-x${k}`, src } });
  }
  big["articles/main/manuscript/article.scidoc"] = JSON.stringify(art);
  let t0 = performance.now();
  const t = setup(big);
  const load = performance.now() - t0;
  const ed = t.editor;
  const words = ed.state.doc.textContent.split(/\s+/).length;
  t0 = performance.now();
  for (let i = 0; i < 10; i++) t.saveAll();
  const save = (performance.now() - t0) / 10;
  ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, posOf(ed.state.doc, "(150)"))));
  const times = [];
  for (const ch of "texto nuevo escrito letra a letra ") {
    const s = performance.now();
    ed.view.dispatch(ed.state.tr.insertText(ch));
    times.push(performance.now() - s);
  }
  times.sort((a, b) => a - b);
  t.done();
  return { info: `${words} palabras: cargar y componer ${load.toFixed(0)} ms; repartir para guardar ${save.toFixed(1)} ms; pulsación: mediana ${times[times.length >> 1].toFixed(1)} ms, máx ${times.at(-1).toFixed(1)} ms` };
});

out.textContent += `\nResumen: ${results.filter((r) => r.ok).length}/${results.length} correctas\n`;
window.__results = results;
