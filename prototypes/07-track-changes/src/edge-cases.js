// Edge cases found in suggest-changes' open issues (#26 id reuse, #11/#35 Enter then Backspace).
import { TextSelection } from "prosemirror-state";
import { ADAPTERS } from "./adapters.js";
import { startDocJSON } from "./schema.js";

const posOf = (doc, needle, offset = 0) => {
  let f = null;
  doc.descendants((n, p) => { if (f === null && n.isText && n.text.includes(needle)) f = p + n.text.indexOf(needle) + offset; });
  return f;
};
const type = (ed, s, at) => {
  ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, at)));
  for (const ch of s) ed.dispatch(ed.state.tr.insertText(ch));
};
for (const A of ADAPTERS) {
  console.log(`\n=== ${A.label}`);
  // a) two authors typing next to each other
  let ed = new A(startDocJSON());
  type(ed, "Ana ", posOf(ed.state.doc, "afecta"));
  ed.setAuthor("Luis");
  type(ed, "Luis ", posOf(ed.state.doc, "afecta"));
  console.log("a) dos autores contiguos:", ed.text().slice(0, 60), JSON.stringify(ed.changes().map((c) => `${c.author}:${c.text}`)));
  // b) Enter then Backspace (split and immediately undo it by deleting the break)
  ed = new A(startDocJSON());
  const at = posOf(ed.state.doc, " afecta");
  ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, at)));
  ed.dispatch(ed.state.tr.split(at));
  const sel = ed.state.selection.from;
  ed.dispatch(ed.state.tr.delete(sel - 2, sel)); // what joinBackward does across the boundary
  console.log("b) Intro y retroceso:", ed.text().slice(0, 70), JSON.stringify(ed.changes().map((c) => `${c.kind}:${c.text.replaceAll("​", "¶")}`)));
}
