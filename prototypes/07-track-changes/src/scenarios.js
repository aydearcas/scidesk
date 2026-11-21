// Same editing scenarios against both libraries. Run: node src/scenarios.js
import { TextSelection } from "prosemirror-state";
import { ADAPTERS } from "./adapters.js";
import { startDocJSON } from "./schema.js";

const ORIGINAL =
  "La artritis reumatoide afecta al 1 % de la población {cit}. ¶ Los resultados se muestran en la tabla. ¶ Edad ¶ 54 años ¶ Mujeres ¶ 72 %";

// Absolute position of `needle` (plus offset) inside the document text.
function posOf(doc, needle, offset = 0) {
  let found = null;
  doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.isText) {
      const i = node.text.indexOf(needle);
      if (i >= 0) found = pos + i + offset;
    }
    return true;
  });
  if (found === null) throw new Error(`not found: ${needle}`);
  return found;
}
const plain = (s) =>
  s
    .replace(/\[\+([^\]]*)\]/g, "$1")
    .replace(/\[-([^\]]*)\]/g, "")
    .replace(/\[~([^\]]*)\]/g, "$1");

function typeText(ed, text, at) {
  ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, at)));
  for (const ch of text) ed.dispatch(ed.state.tr.insertText(ch));
}
function del(ed, from, to) {
  ed.dispatch(ed.state.tr.delete(from, to));
}
function backspace(ed, at, n = 1) {
  for (let i = 0; i < n; i++) ed.dispatch(ed.state.tr.delete(at - i - 1, at - i));
}

// Each scenario: act(ed) edits; expect = { marked?, accepted, rejected } (plain text after accept/reject all).
const SCENARIOS = [
  {
    name: "01 insertar texto, letra a letra",
    act: (ed) => typeText(ed, "aproximadamente ", posOf(ed.state.doc, "al 1 %")),
    accepted: ORIGINAL.replace("al 1 %", "aproximadamente al 1 %"),
    rejected: ORIGINAL,
    check: (ed) => ed.changes().length === 1 || `esperaba 1 cambio, hay ${ed.changes().length}`,
  },
  {
    name: "02 borrar una palabra",
    act: (ed) => del(ed, posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11)),
    accepted: ORIGINAL.replace("reumatoide ", ""),
    rejected: ORIGINAL,
  },
  {
    name: "03 borrar con la tecla de retroceso, letra a letra",
    act: (ed) => backspace(ed, posOf(ed.state.doc, " afecta"), 11),
    accepted: ORIGINAL.replace(" reumatoide", ""),
    rejected: ORIGINAL,
    check: (ed) => ed.changes().length === 1 || `esperaba 1 cambio, hay ${ed.changes().length}`,
  },
  {
    name: "04 sustituir (seleccionar y escribir)",
    act: (ed) => {
      const from = posOf(ed.state.doc, "1 %");
      ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, from, from + 3)));
      ed.dispatch(ed.state.tr.insertText("0,5–1 %"));
    },
    accepted: ORIGINAL.replace("al 1 %", "al 0,5–1 %"),
    rejected: ORIGINAL,
  },
  {
    name: "05 borrar dentro de mi propia inserción (debe borrarse de verdad)",
    act: (ed) => {
      typeText(ed, "XYZ ", posOf(ed.state.doc, "afecta"));
      const y = posOf(ed.state.doc, "XYZ", 1);
      del(ed, y, y + 1);
    },
    accepted: ORIGINAL.replace("afecta", "XZ afecta"),
    rejected: ORIGINAL,
    check: (ed) => !/Y/.test(ed.text()) || `queda la Y marcada: ${ed.text()}`,
  },
  {
    name: "06 otro autor borra mi inserción",
    act: (ed) => {
      typeText(ed, "XYZ ", posOf(ed.state.doc, "afecta"));
      ed.setAuthor("Luis");
      const x = posOf(ed.state.doc, "XYZ");
      del(ed, x, x + 4);
    },
    accepted: ORIGINAL,
    rejected: ORIGINAL,
    note: "Word marca un borrado dentro de la inserción; aquí basta con que aceptar y rechazar den el original",
  },
  {
    name: "07 partir un párrafo (Intro)",
    act: (ed) => ed.dispatch(ed.state.tr.split(posOf(ed.state.doc, " afecta"))),
    accepted: ORIGINAL.replace("reumatoide afecta", "reumatoide ¶  afecta"),
    rejected: ORIGINAL,
  },
  {
    name: "08 unir dos párrafos (retroceso al principio)",
    act: (ed) => {
      const p2 = posOf(ed.state.doc, "Los resultados");
      ed.dispatch(ed.state.tr.join(p2 - 1));
    },
    accepted: ORIGINAL.replace(". ¶ Los resultados", ".Los resultados"),
    rejected: ORIGINAL,
  },
  {
    name: "09 borrar de un párrafo al siguiente",
    act: (ed) => del(ed, posOf(ed.state.doc, "de la población"), posOf(ed.state.doc, "se muestran")),
    accepted: ORIGINAL.replace(/de la población \{cit\}\. ¶ Los resultados /, ""),
    rejected: ORIGINAL,
  },
  {
    name: "10 insertar una cita",
    act: (ed) => {
      const at = posOf(ed.state.doc, " se muestran");
      ed.dispatch(ed.state.tr.insert(at, ed.schema.nodes.citation.create({ refs: ["aletaha2018"] })));
    },
    accepted: ORIGINAL.replace("resultados se", "resultados{cit} se"),
    rejected: ORIGINAL,
  },
  {
    name: "11 borrar una cita",
    act: (ed) => {
      const at = posOf(ed.state.doc, "población ", 10);
      del(ed, at, at + 1);
    },
    accepted: ORIGINAL.replace(" {cit}", " "),
    rejected: ORIGINAL,
  },
  {
    name: "12 poner en negrita (cambio de formato)",
    act: (ed) => {
      const from = posOf(ed.state.doc, "artritis");
      ed.dispatch(ed.state.tr.addMark(from, from + 8, ed.schema.marks.bold.create()));
    },
    accepted: ORIGINAL.replace("artritis", "*artritis*"),
    rejected: ORIGINAL,
    check: (ed) => ed.changes().length > 0 || "el formato no queda marcado como cambio",
  },
  {
    name: "13 escribir en una celda de tabla",
    act: (ed) => typeText(ed, " (DE 11)", posOf(ed.state.doc, "54 años", 7)),
    accepted: ORIGINAL.replace("54 años", "54 años (DE 11)"),
    rejected: ORIGINAL,
  },
  {
    name: "14 dos autores: aceptar uno y rechazar otro",
    act: (ed) => {
      typeText(ed, "aproximadamente ", posOf(ed.state.doc, "al 1 %"));
      ed.setAuthor("Luis");
      del(ed, posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11));
      const cs = ed.changes();
      const ana = cs.find((c) => c.author === "Ana");
      const luis = cs.find((c) => c.author === "Luis");
      if (!ana || !luis) throw new Error(`autores mal atribuidos: ${JSON.stringify(cs)}`);
      ed.accept(ana.id);
      ed.reject(ed.changes().find((c) => c.author === "Luis").id);
    },
    final: ORIGINAL.replace("al 1 %", "aproximadamente al 1 %"),
  },
  {
    name: "14b dos autores escriben uno junto al otro",
    act: (ed) => {
      typeText(ed, "Ana ", posOf(ed.state.doc, "afecta"));
      ed.setAuthor("Luis");
      typeText(ed, "Luis ", posOf(ed.state.doc, "afecta"));
    },
    accepted: ORIGINAL.replace("afecta", "Ana Luis afecta"),
    rejected: ORIGINAL,
    check: (ed) => {
      const got = ed.changes().map((c) => `${c.author}:${c.text}`).sort().join("|");
      return got === "Ana:Ana |Luis:Luis " || `atribución: ${got}`;
    },
  },
  {
    name: "14c borrar un párrafo entero",
    act: (ed) => {
      const start = posOf(ed.state.doc, "Los resultados") - 1;
      const para = ed.state.doc.resolve(start + 1).parent;
      del(ed, start, start + para.nodeSize);
    },
    accepted: ORIGINAL.replace(" ¶ Los resultados se muestran en la tabla.", ""),
    rejected: ORIGINAL,
  },
  {
    name: "15 guardar en JSON y volver a abrir",
    act: (ed, Adapter) => {
      typeText(ed, "aproximadamente ", posOf(ed.state.doc, "al 1 %"));
      ed.setAuthor("Luis");
      del(ed, posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11));
      const before = ed.changes().map((c) => `${c.author}:${c.text}`).sort().join("|");
      const json = JSON.parse(JSON.stringify(ed.toJSON()));
      const ed2 = new Adapter(json);
      const after = ed2.changes().map((c) => `${c.author}:${c.text}`).sort().join("|");
      if (before !== after) throw new Error(`cambios distintos al reabrir: ${before} vs ${after}`);
      return ed2;
    },
    accepted: ORIGINAL.replace("al 1 %", "aproximadamente al 1 %").replace("reumatoide ", ""),
    rejected: ORIGINAL,
  },
  {
    name: "16 deshacer un cambio marcado",
    act: (ed) => {
      del(ed, posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11));
      ed.undo();
    },
    final: ORIGINAL,
    check: (ed) => ed.changes().length === 0 || `quedan cambios tras deshacer: ${ed.text()}`,
  },
];

function runOne(Adapter, sc) {
  const results = [];
  const fresh = () => new Adapter(startDocJSON());
  const exec = () => {
    const ed = fresh();
    const maybe = sc.act(ed, Adapter);
    return maybe instanceof Adapter ? maybe : ed;
  };
  try {
    if (sc.final !== undefined) {
      const ed = exec();
      const got = ed.text();
      results.push(got === sc.final ? null : `final: ${got}`);
      if (sc.check) results.push(sc.check(ed) === true ? null : sc.check(ed));
      return { ok: results.every((r) => !r), marked: got, problems: results.filter(Boolean) };
    }
    const ed = exec();
    const marked = ed.text();
    if (sc.check) {
      const c = sc.check(ed);
      if (c !== true) results.push(c);
    }
    const legibleChange = marked !== ORIGINAL && plain(marked) !== marked;
    if (!legibleChange && !sc.name.startsWith("06")) results.push("no se ve ningún cambio marcado");
    ed.acceptAll();
    const acc = ed.text();
    if (acc !== sc.accepted) results.push(`aceptar todo → ${acc}`);
    const ed2 = exec();
    ed2.rejectAll();
    const rej = ed2.text();
    if (rej !== sc.rejected) results.push(`rechazar todo → ${rej}`);
    return { ok: results.length === 0, marked, problems: results };
  } catch (e) {
    return { ok: false, marked: "", problems: [`error: ${e.message.split("\n")[0]}`] };
  }
}

const summary = {};
for (const Adapter of ADAPTERS) {
  console.log(`\n=== ${Adapter.label}`);
  let pass = 0;
  for (const sc of SCENARIOS) {
    const r = runOne(Adapter, sc);
    if (r.ok) pass++;
    console.log(`${r.ok ? "OK  " : "FALLA"} ${sc.name}`);
    console.log(`      marcado: ${r.marked}`);
    for (const p of r.problems) console.log(`      ! ${p}`);
  }
  summary[Adapter.label] = `${pass}/${SCENARIOS.length}`;
}
console.log("\nResumen:", summary);
