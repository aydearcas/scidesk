// Tracked changes in the editor (record 0090): the schema, Enter then Backspace (issue #11
// of suggest-changes), the list of changes and the registry kept in the files.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { enableSuggestChanges, revertSuggestions, suggestChanges, transformToSuggestionTransaction } from "@scidesk/suggest-changes";
import { newId } from "@scidesk/formats";
import { extensions } from "./editor.ts";
import { changeAt, joinInsertedBreak, listChanges, registryFor, track } from "./track-changes.ts";

const schema = getSchema(extensions);
const p = (text: string) => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) });

/** A state with tracking on, the cursor `at` characters into the first paragraph. */
function tracking(content: unknown[], at: number) {
  const doc = schema.nodeFromJSON({ type: "doc", content });
  let state = EditorState.create({ doc, plugins: [suggestChanges()], selection: TextSelection.create(doc, 1 + at) });
  enableSuggestChanges(state, (tr) => { state = state.apply(tr); });
  return state;
}
/** What the editor does with an edit while tracking: the edit, turned into tracked changes. */
const tracked = (state: EditorState, edit: (tr: Transaction) => Transaction) => state.apply(transformToSuggestionTransaction(edit(state.tr), state, () => newId("ch")));
const run = (state: EditorState, cmd: (s: EditorState, d: (tr: Transaction) => void) => boolean) => {
  let next = state;
  const done = cmd(state, (tr) => { next = state.apply(tr); });
  return { done, state: next };
};
const texts = (s: EditorState) => { const out: string[] = []; s.doc.forEach((n) => out.push(n.textContent)); return out; };

describe("tracked changes in the editor (record 0090)", () => {
  it("lets blocks carry the marks of a tracked change", () => {
    const ins = schema.marks.insertion;
    for (const parent of ["doc", "listItem", "blockquote", "tableCell", "tablePart", "abstractPart"]) {
      expect(schema.nodes[parent]?.allowsMarkType(ins), parent).toBe(true);
    }
    // text keeps every mark
    expect(schema.nodes.paragraph.allowsMarkType(schema.marks.bold)).toBe(true);
  });

  it("marks typed text as an insertion and deleted text as a deletion", () => {
    let s = tracking([p("uno dos")], 3);
    s = tracked(s, (tr) => tr.insertText(" y"));
    s = tracked(s, (tr) => tr.delete(5 + 2, 8 + 2));
    const list = listChanges(s.doc);
    expect(list.map((c) => [c.kind, c.text])).toEqual([["insertion", "y"], ["deletion", "dos"]]);
    expect(s.doc.textContent).toBe("uno y dos"); // the deleted text stays until accepted
    expect(changeAt(EditorState.create({ doc: s.doc, selection: TextSelection.create(s.doc, 5) }))?.id).toBe(list[0].id);
  });

  it("joins the paragraphs again on Backspace right after a tracked Enter (issue #11)", () => {
    const start = tracking([p("primera segunda")], 7);
    const split = tracked(start, (tr) => tr.split(start.selection.from));
    expect(split.doc.childCount).toBe(2);
    // the cursor at the start of the second paragraph, after its inserted break
    const $second = split.selection.$from;
    expect($second.parent.textContent.replace(/​/g, "")).toBe(" segunda");
    const back = run(split, (s, d) => joinInsertedBreak(s, d, -1));
    expect(back.done).toBe(true);
    expect(texts(back.state)).toEqual(["primera segunda"]);
    expect(listChanges(back.state.doc)).toEqual([]);
    // Delete at the end of the first paragraph does the same
    const end = split.doc.child(0).content.size;
    const before = split.apply(split.tr.setSelection(TextSelection.create(split.doc, 1 + end - 1)));
    const del = run(before, (s, d) => joinInsertedBreak(s, d, 1));
    expect(del.done).toBe(true);
    expect(texts(del.state)).toEqual(["primera segunda"]);
  });

  it("leaves Backspace alone where there is no inserted break", () => {
    const s = tracking([p("uno"), p("dos")], 0);
    const second = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 6)));
    expect(run(second, (st, d) => joinInsertedBreak(st, d, -1)).done).toBe(false);
    // and when tracking is off
    const off = EditorState.create({ doc: s.doc, plugins: [suggestChanges()], selection: TextSelection.create(s.doc, 6) });
    expect(run(off, (st, d) => joinInsertedBreak(st, d, -1)).done).toBe(false);
  });

  it("rejecting everything gives the text back", () => {
    let s = tracking([p("uno dos"), p("tres")], 3);
    s = tracked(s, (tr) => tr.insertText(" y"));
    s = tracked(s, (tr) => tr.split(4));
    const r = run(s, revertSuggestions);
    expect(texts(r.state)).toEqual(["uno dos", "tres"]);
  });

  it("keeps in the files only the authors of the changes still in the text", () => {
    let s = tracking([p("uno")], 3);
    s = tracked(s, (tr) => tr.insertText(" dos"));
    const [c] = listChanges(s.doc);
    track.registry = { [c.id]: { author: { name: "Ana" }, date: "2026-11-23T10:00:00Z", origin: "local" }, "ch-gone000000": { author: { name: "Luis" }, date: "2026-11-23T10:00:00Z", origin: "local" } };
    expect(Object.keys(registryFor(s.doc))).toEqual([c.id]);
  });
});
