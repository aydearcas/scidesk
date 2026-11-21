// Prints how each library stores the same two changes (and a paragraph split) in the document JSON.
import { TextSelection } from "prosemirror-state";
import { ADAPTERS } from "./adapters.js";
import { startDocJSON } from "./schema.js";

function posOf(doc, needle, offset = 0) {
  let found = null;
  doc.descendants((n, pos) => {
    if (found === null && n.isText && n.text.includes(needle)) found = pos + n.text.indexOf(needle) + offset;
  });
  return found;
}
for (const A of ADAPTERS) {
  const ed = new A(startDocJSON());
  ed.dispatch(ed.state.tr.insertText("aproximadamente ", posOf(ed.state.doc, "al 1 %")));
  ed.setAuthor("Luis");
  ed.dispatch(ed.state.tr.delete(posOf(ed.state.doc, "reumatoide "), posOf(ed.state.doc, "reumatoide ", 11)));
  ed.dispatch(ed.state.tr.split(posOf(ed.state.doc, " de la población")));
  const json = ed.toJSON();
  json.doc.content = json.doc.content.slice(0, 2);
  console.log(`\n=== ${A.label}\n` + JSON.stringify(json, null, 1).replace(/​/g, "\u200b"));
}
