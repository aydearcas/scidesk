// Cost per keystroke in suggestion mode on a long article (~8000 words, 300 paragraphs).
import { TextSelection } from "prosemirror-state";
import { ADAPTERS } from "./adapters.js";

const sentence = "Los pacientes con artritis reumatoide presentaron una mejoría significativa de la actividad. ";
const doc = { type: "doc", content: [] };
for (let i = 0; i < 300; i++) doc.content.push({ type: "paragraph", attrs: { id: `p-${i}` }, content: [{ type: "text", text: sentence.repeat(2) + `(${i}) ` + sentence }] });
for (const A of ADAPTERS) {
  const ed = new A(doc);
  // scatter 100 existing changes through the document first
  for (let i = 0; i < 100; i++) {
    let pos = 0, k = 0;
    ed.state.doc.forEach((n, off) => { if (k++ === i * 3) pos = off + 5; });
    ed.dispatch(ed.state.tr.insertText("x", pos));
  }
  let at = 0, k = 0;
  ed.state.doc.forEach((n, off) => { if (k++ === 150) at = off + 20; });
  ed.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, at)));
  const times = [];
  for (const ch of "aproximadamente el cuarenta por ciento de los casos ".repeat(4)) {
    const t0 = performance.now();
    ed.dispatch(ed.state.tr.insertText(ch));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)], p95 = times[Math.floor(times.length * 0.95)];
  console.log(`${A.label}: mediana ${med.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms por pulsación (${times.length} pulsaciones, ${ed.changes().length} cambios en el documento)`);
}
