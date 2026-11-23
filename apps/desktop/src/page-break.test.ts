// Page breaks and blank pages (record 0078): where they go and where the cursor ends.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { extensions } from "./editor.ts";
import { insertPageBreak } from "./page-break.ts";
import { actionFor, comboOf, shortcutLabel } from "./shortcuts.ts";

const schema = getSchema(extensions);
const p = (id: string, text: string) => ({ type: "paragraph", attrs: { id }, ...(text ? { content: [{ type: "text", text }] } : {}) });
const doc = schema.nodeFromJSON({ type: "doc", content: [
  { type: "title", attrs: { id: "b-t0000001" }, content: [{ type: "text", text: "Título" }] },
  p("b-p0000001", "Primero segundo"),
  { type: "bulletList", attrs: { id: "b-l0000001" }, content: [{ type: "listItem", content: [p("b-p0000002", "punto")] }] },
  p("b-p0000003", "Último"),
] });
/** The blocks as letters: B a break, the text of the others. */
const shape = (d: PMNode) => { const out: string[] = []; d.forEach((n) => out.push(n.type.name === "pageBreak" ? "B" : n.type.name === "bulletList" ? "LIST" : n.textContent || "·")); return out; };
/** Runs the command with the cursor at the offset `at` of the text that starts with `start`. */
function run(start: string, at: number, blank = false) {
  let pos = -1;
  doc.descendants((n, p0) => { if (pos < 0 && n.isTextblock && n.textContent.startsWith(start)) pos = p0 + 1 + at; return pos < 0; });
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
  let tr: Transaction | null = null;
  insertPageBreak(blank)(state, (t) => { tr = t; });
  const t = tr as unknown as Transaction;
  return { doc: t.doc, cursor: t.selection.$from.parent.textContent || "·" };
}

describe("page breaks", () => {
  it("split the paragraph at the cursor, and the cursor goes on the next page", () => {
    const r = run("Primero", "Primero ".length);
    expect(shape(r.doc)).toEqual(["Título", "Primero ", "B", "segundo", "LIST", "Último"]);
    expect(r.cursor).toBe("segundo");
  });
  it("go before a paragraph from its start, after it from its end", () => {
    expect(shape(run("Primero", 0).doc)).toEqual(["Título", "B", "Primero segundo", "LIST", "Último"]);
    expect(shape(run("Primero", "Primero segundo".length).doc)).toEqual(["Título", "Primero segundo", "B", "LIST", "Último"]);
  });
  it("go after a title or a list, never inside it", () => {
    expect(shape(run("Título", 2).doc)).toEqual(["Título", "B", "Primero segundo", "LIST", "Último"]);
    expect(shape(run("punto", 2).doc)).toEqual(["Título", "Primero segundo", "LIST", "B", "Último"]);
  });
  it("at the end of the text, leave a paragraph to write on", () => {
    const r = run("Último", "Último".length);
    expect(shape(r.doc)).toEqual(["Título", "Primero segundo", "LIST", "Último", "B", "·"]);
    expect(r.cursor).toBe("·");
  });
  it("a blank page: two breaks and an empty paragraph, with the cursor in it", () => {
    const r = run("Primero", 0, true);
    expect(shape(r.doc)).toEqual(["Título", "B", "·", "B", "Primero segundo", "LIST", "Último"]);
    expect(r.cursor).toBe("·");
  });
  it("is Ctrl+Enter in both schemes, «Ctrl+Intro» in Spanish", () => {
    const key = { key: "Enter", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
    expect(actionFor("word-es", comboOf(key))).toBe("pageBreak");
    expect(actionFor("international", comboOf(key))).toBe("pageBreak");
    expect(shortcutLabel("Mod-Enter", "es")).toMatch(/Intro$/);
  });
});
