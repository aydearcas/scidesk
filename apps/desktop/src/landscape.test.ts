// Landscape pages (record 0085): which blocks the selection sets, and back.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, NodeSelection, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { extensions } from "./editor.ts";
import { landscapeState, setLandscape } from "./landscape.ts";

const schema = getSchema(extensions);
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = schema.nodeFromJSON({ type: "doc", content: [
  { type: "title", content: [{ type: "text", text: "Título" }] },
  p("uno"), p("dos"), p("tres"),
  { type: "pageBreak" },
  p("cuatro"),
] });
const at = (d: PMNode, text: string, offset = 1) => { let pos = -1; d.descendants((n, q) => { if (pos < 0 && n.isTextblock && n.textContent === text) pos = q + 1 + offset; return pos < 0; }); return pos; };
const flags = (d: PMNode) => { const out: string[] = []; d.forEach((n) => out.push(`${n.textContent || n.type.name}${n.attrs.landscape ? "*" : ""}`)); return out; };
function run(state: EditorState, on?: boolean) {
  let tr: Transaction | null = null;
  const done = setLandscape(on)(state, (t) => { tr = t; });
  return { done, doc: (tr as Transaction | null)?.doc ?? state.doc };
}

describe("landscape pages", () => {
  it("set the block of the cursor, and take it back", () => {
    const s = EditorState.create({ doc, selection: TextSelection.create(doc, at(doc, "dos")) });
    expect(landscapeState(s)).toBe(false);
    const r = run(s);
    expect(flags(r.doc)).toEqual(["Título", "uno", "dos*", "tres", "pageBreak", "cuatro"]);
    const back = EditorState.create({ doc: r.doc, selection: TextSelection.create(r.doc, at(r.doc, "dos")) });
    expect(landscapeState(back)).toBe(true);
    expect(flags(run(back).doc)).toEqual(["Título", "uno", "dos", "tres", "pageBreak", "cuatro"]);
  });
  it("set every block of a selection across pages at once", () => {
    const s = EditorState.create({ doc, selection: TextSelection.create(doc, at(doc, "dos"), at(doc, "cuatro", 2)) });
    expect(flags(run(s).doc)).toEqual(["Título", "uno", "dos*", "tres*", "pageBreak*", "cuatro*"]);
  });
  it("some on and some off: all on; never the title", () => {
    const first = run(EditorState.create({ doc, selection: TextSelection.create(doc, at(doc, "uno")) })).doc;
    const s = EditorState.create({ doc: first, selection: TextSelection.create(first, at(first, "Título"), at(first, "dos")) });
    expect(landscapeState(s)).toBe(false);
    expect(flags(run(s).doc)).toEqual(["Título", "uno*", "dos*", "tres", "pageBreak", "cuatro"]);
    expect(landscapeState(EditorState.create({ doc, selection: TextSelection.create(doc, at(doc, "Título")) }))).toBeNull();
  });
  it("a whole block selected (a page break, a table) is that block", () => {
    let pos = -1;
    doc.forEach((n, q) => { if (n.type.name === "pageBreak") pos = q; });
    const s = EditorState.create({ doc, selection: NodeSelection.create(doc, pos) });
    expect(flags(run(s, true).doc)).toEqual(["Título", "uno", "dos", "tres", "pageBreak*", "cuatro"]);
  });
});
