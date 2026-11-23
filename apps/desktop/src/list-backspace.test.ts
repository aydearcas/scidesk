// Backspace at the start of the paragraph after a list (record 0085).
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { extensions } from "./editor.ts";
import { joinToListAbove } from "./list-backspace.ts";

const schema = getSchema(extensions);
const p = (text: string) => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) });
const item = (text: string, nested?: unknown) => ({ type: "listItem", content: [p(text), ...(nested ? [nested] : [])] });
const list = (...items: unknown[]) => ({ type: "bulletList", content: items });

function backspace(content: unknown[], after: string) {
  const doc = schema.nodeFromJSON({ type: "doc", content });
  let pos = -1;
  doc.forEach((n, off) => { if (n.type.name === "paragraph" && n.textContent === after && pos < 0) pos = off + 1; });
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
  let tr: Transaction | null = null;
  const done = joinToListAbove(state, (t) => { tr = t; });
  return { done, doc: (tr as Transaction | null)?.doc, cursor: (tr as Transaction | null)?.selection.$from };
}
const items = (d: PMNode) => { const out: string[] = []; d.descendants((n) => { if (n.type.name === "listItem") out.push(n.firstChild?.textContent ?? ""); return true; }); return out; };

describe("Backspace after a list", () => {
  it("an empty paragraph goes away, without a new empty item", () => {
    const r = backspace([list(item("uno"), item("dos")), p(""), p("fin")], "");
    expect(r.done).toBe(true);
    expect(items(r.doc!)).toEqual(["uno", "dos"]);
    expect(r.doc!.childCount).toBe(2);
    expect(r.cursor!.parent.textContent).toBe("dos");
    expect(r.cursor!.parentOffset).toBe(3);
  });
  it("a paragraph with text joins the last item, the cursor at the join", () => {
    const r = backspace([list(item("uno"), item("dos")), p("tres")], "tres");
    expect(items(r.doc!)).toEqual(["uno", "dostres"]);
    expect(r.cursor!.parentOffset).toBe(3);
  });
  it("into the deepest last item of a nested list", () => {
    const r = backspace([list(item("uno", list(item("a"), item("b")))), p("x")], "x");
    expect(items(r.doc!)).toEqual(["uno", "a", "bx"]);
  });
  it("leaves the other cases to the editor", () => {
    expect(backspace([p("antes"), p("x")], "x").done).toBe(false);
  });
});
