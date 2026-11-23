// Moving a table or a figure by dragging it (record 0077): where it may go and what it becomes.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, NodeSelection } from "@tiptap/pm/state";
import { extensions } from "./editor.ts";
import { dropTarget, firstGap, movePart } from "./part-drag.ts";

const schema = getSchema(extensions);
const p = (id: string, text: string) => ({ type: "paragraph", attrs: { id }, content: [{ type: "text", text }] });
const table = {
  type: "tablePart", attrs: { id: "t-t0000001", src: "tables/tabla-1.scitable" }, content: [
    { type: "tableCaption", attrs: { id: "b-c0000001" }, content: [{ type: "text", text: "Características" }] },
    { type: "table", attrs: { id: "b-g0000001" }, content: [{ type: "tableRow", content: [{ type: "tableCell", content: [p("b-x0000001", "1")] }] }] },
  ],
};
const doc = schema.nodeFromJSON({ type: "doc", content: [
  { type: "title", attrs: { id: "b-t0000001" }, content: [{ type: "text", text: "Título" }] },
  { type: "abstractPart", content: [{ type: "abstractSection", attrs: { lang: "es" }, content: [p("b-a0000001", "Resumen")] }] },
  p("b-p0000001", "Uno"),
  table,
  p("b-p0000002", "Dos"),
  p("b-p0000003", "Tres"),
] });
const state = EditorState.create({ doc });
const offsets = () => { const out: number[] = []; doc.forEach((_n, o) => out.push(o)); return out; };
const order = (d: typeof doc) => { const out: string[] = []; d.forEach((n) => out.push(n.type.name === "tablePart" ? "TABLE" : n.textContent)); return out; };

describe("moving a part", () => {
  const [, , uno, tablePos, dos, tres] = offsets();
  it("never goes above the title and the abstract", () => {
    expect(firstGap(doc)).toBe(uno);
    expect(movePart(state, tablePos, 0)).toBeNull();
    expect(movePart(state, tablePos, uno)?.doc && order(movePart(state, tablePos, uno)!.doc)).toEqual(["Título", "Resumen", "TABLE", "Uno", "Dos", "Tres"]);
  });
  it("stays where it is when dropped right before or after itself", () => {
    expect(dropTarget(doc, tablePos, tablePos)).toBeNull();
    expect(dropTarget(doc, tablePos, dos)).toBeNull();
    expect(movePart(state, tablePos, dos)).toBeNull();
  });
  it("moves down whole, as the same part, and is selected there", () => {
    const tr = movePart(state, tablePos, doc.content.size)!;
    expect(order(tr.doc)).toEqual(["Título", "Resumen", "Uno", "Dos", "Tres", "TABLE"]);
    const sel = tr.selection as NodeSelection;
    expect(sel).toBeInstanceOf(NodeSelection);
    expect(sel.node.type.name).toBe("tablePart");
    expect(sel.node.toJSON()).toEqual(doc.nodeAt(tablePos)!.toJSON());
  });
  it("moves between two paragraphs", () => {
    expect(order(movePart(state, tablePos, tres)!.doc)).toEqual(["Título", "Resumen", "Uno", "Dos", "TABLE", "Tres"]);
  });
  it("moves only parts", () => {
    expect(movePart(state, uno, tres)).toBeNull();
  });
});
