// Export tracked changes to DOCX, check them with real Word, and import Word's own
// tracked changes back.
//   node out/roundtrip.mjs export   -> writes out/export-*.docx (+ expected texts) and
//                                      checks our own DOCX -> import round trip
//   node out/roundtrip.mjs check    -> compares out/word-inspect.json (Word's view) with expected
//   node out/roundtrip.mjs import   -> imports out/word-edited.docx, compares with Word's view
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { TextSelection } from "prosemirror-state";
import { SuggestAdapter } from "./adapters.js";
import { startDocJSON } from "./schema.js";
import { exportDocx, importDocx } from "./docx.js";

const OUT = "out";
mkdirSync(OUT, { recursive: true });

function posOf(doc, needle, offset = 0) {
  let found = null;
  doc.descendants((n, pos) => {
    if (found === null && n.isText && n.text.includes(needle)) found = pos + n.text.indexOf(needle) + offset;
  });
  if (found === null) throw new Error(`not found ${needle}`);
  return found;
}
// Paragraph texts as Word reports them (one entry per non-empty paragraph, cells included).
function paragraphs(state) {
  const list = [];
  state.doc.descendants((n) => {
    if (n.isTextblock) {
      let t = "";
      n.forEach((c) => (t += c.isText ? c.text : c.type.name === "citation" ? "{cit}" : ""));
      t = t.replaceAll("​", "");
      if (t) list.push(t);
      return false;
    }
    return true;
  });
  return list;
}
const after = (json, how) => {
  const ed = new SuggestAdapter(json);
  if (ed.changes().length) how === "accept" ? ed.acceptAll() : ed.rejectAll();
  return paragraphs(ed.state);
};
const summary = (ed) => ed.changes().map((c) => `${c.kind}:${c.author}:${c.text.replaceAll("​", "¶")}`);

const CASES = {
  insert: (ed) => ed.dispatch(ed.state.tr.insertText("aproximadamente ", posOf(ed.state.doc, "al 1 %"))),
  delete: (ed) => ed.dispatch(ed.state.tr.delete(posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11))),
  replace: (ed) => {
    const f = posOf(ed.state.doc, "1 %");
    ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, f, f + 3)));
    ed.dispatch(ed.state.tr.insertText("0,5–1 %"));
  },
  split: (ed) => ed.dispatch(ed.state.tr.split(posOf(ed.state.doc, " de la población"))),
  join: (ed) => ed.dispatch(ed.state.tr.join(posOf(ed.state.doc, "Los resultados") - 1)),
  crossDelete: (ed) => ed.dispatch(ed.state.tr.delete(posOf(ed.state.doc, "de la población"), posOf(ed.state.doc, "se muestran"))),
  bold: (ed) => {
    const f = posOf(ed.state.doc, "artritis");
    ed.dispatch(ed.state.tr.addMark(f, f + 8, ed.schema.marks.bold.create()));
  },
  tableCell: (ed) => ed.dispatch(ed.state.tr.insertText(" (DE 11)", posOf(ed.state.doc, "54 años", 7))),
  adjacentAuthors: (ed) => {
    ed.dispatch(ed.state.tr.insertText("Ana ", posOf(ed.state.doc, "afecta")));
    ed.setAuthor("Luis");
    ed.dispatch(ed.state.tr.insertText("Luis ", posOf(ed.state.doc, "afecta")));
  },
  wholeParagraph: (ed) => {
    const start = posOf(ed.state.doc, "Los resultados") - 1;
    ed.dispatch(ed.state.tr.delete(start, start + ed.state.doc.resolve(start + 1).parent.nodeSize));
  },
  twoAuthors: (ed) => {
    CASES.insert(ed);
    ed.setAuthor("Luis");
    CASES.delete(ed);
    CASES.split(ed);
  },
};

const mode = process.argv[2];
if (mode === "export") {
  const expected = {};
  let ok = 0;
  for (const [name, act] of Object.entries(CASES)) {
    const ed = new SuggestAdapter(startDocJSON());
    act(ed);
    const json = JSON.parse(JSON.stringify(ed.toJSON()));
    const buf = await exportDocx(json);
    writeFileSync(`${OUT}/export-${name}.docx`, buf);
    expected[`export-${name}.docx`] = {
      changes: summary(ed),
      authors: [...new Set(ed.changes().map((c) => c.author))].sort(),
      accepted: after(json, "accept"),
      rejected: after(json, "reject"),
    };
    // our own round trip: export -> import -> same accept/reject results and authors
    const back = await importDocx(buf);
    const ed2 = new SuggestAdapter(back);
    const same =
      JSON.stringify(after(back, "accept")) === JSON.stringify(expected[`export-${name}.docx`].accepted) &&
      JSON.stringify(after(back, "reject")) === JSON.stringify(expected[`export-${name}.docx`].rejected) &&
      JSON.stringify([...new Set(ed2.changes().map((c) => c.author))].sort()) === JSON.stringify(expected[`export-${name}.docx`].authors);
    if (same) ok++;
    console.log(`${same ? "OK   " : "FALLA"} ida y vuelta propia: ${name}`);
    if (!same) {
      console.log("   antes  :", summary(ed).join(" | "));
      console.log("   después:", summary(ed2).join(" | "));
      console.log("   aceptar:", after(back, "accept"), "esperado", expected[`export-${name}.docx`].accepted);
      console.log("   rechazar:", after(back, "reject"), "esperado", expected[`export-${name}.docx`].rejected);
    }
  }
  writeFileSync(`${OUT}/expected.json`, JSON.stringify(expected, null, 2));
  // base document without changes, for Word to edit
  writeFileSync(`${OUT}/base.docx`, await exportDocx({ doc: startDocJSON(), changes: {} }));
  console.log(`Ida y vuelta propia: ${ok}/${Object.keys(CASES).length}`);
} else if (mode === "check") {
  const expected = JSON.parse(readFileSync(`${OUT}/expected.json`, "utf8"));
  const word = JSON.parse(readFileSync(`${OUT}/word-inspect.json`, "utf8").replace(/^﻿/, ""));
  let ok = 0;
  const norm = (a) => JSON.stringify((a ?? []).map((s) => s.replace(/–/g, "-")));
  for (const w of [].concat(word)) {
    const e = expected[w.file];
    if (!e) continue;
    const authors = [...new Set(w.revisions.map((r) => r.author))].sort();
    const good = norm(w.accepted) === norm(e.accepted) && norm(w.rejected) === norm(e.rejected) && JSON.stringify(authors) === JSON.stringify(e.authors);
    if (good) ok++;
    console.log(`${good ? "OK   " : "FALLA"} Word abre y entiende ${w.file}: ${w.revisions.map((r) => `${r.type}:${r.author}:${r.text}`).join(" | ")}`);
    if (!good) {
      console.log("   Word aceptar :", w.accepted, "\n   esperado     :", e.accepted);
      console.log("   Word rechazar:", w.rejected, "\n   esperado     :", e.rejected);
      console.log("   autores Word :", authors, "esperado", e.authors);
    }
  }
  console.log(`Word: ${ok}/${Object.keys(expected).length}`);
} else if (mode === "import") {
  const word = JSON.parse(readFileSync(`${OUT}/word-edited-inspect.json`, "utf8").replace(/^﻿/, ""));
  const w = [].concat(word)[0];
  const back = await importDocx(readFileSync(`${OUT}/word-edited.docx`));
  writeFileSync(`${OUT}/word-edited.scidoc.json`, JSON.stringify(back, null, 1));
  const ed = new SuggestAdapter(back);
  console.log("Cambios de Word importados:", summary(ed));
  console.log("Revisiones según Word     :", w.revisions.map((r) => `${r.type}:${r.author}:${r.text}`));
  const norm = (a) => JSON.stringify(a.map((s) => s.replace(/–/g, "-")));
  const acc = after(back, "accept");
  const rej = after(back, "reject");
  console.log(`${norm(acc) === norm(w.accepted) ? "OK   " : "FALLA"} aceptar todo coincide con Word`, norm(acc) === norm(w.accepted) ? "" : `\n   nuestro: ${acc}\n   Word   : ${w.accepted}`);
  console.log(`${norm(rej) === norm(w.rejected) ? "OK   " : "FALLA"} rechazar todo coincide con Word`, norm(rej) === norm(w.rejected) ? "" : `\n   nuestro: ${rej}\n   Word   : ${w.rejected}`);
  // accept one change, reject the rest, and export again: Word must open it
  const ed2 = new SuggestAdapter(back);
  const first = ed2.changes()[0];
  ed2.accept(first.id);
  writeFileSync(`${OUT}/word-edited-reexport.docx`, await exportDocx(JSON.parse(JSON.stringify(ed2.toJSON()))));
  console.log(`Aceptado solo "${first.text}" y vuelto a exportar en out/word-edited-reexport.docx`);
}
