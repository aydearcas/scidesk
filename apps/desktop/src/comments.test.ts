// Comments in the editor (record 0094): the mark (overlapping, as in Word), adding one to the
// selection or to the word at the cursor, the comment at the cursor, the threads in the order
// of the text, removing one, and what a paste keeps.
import { beforeEach, describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { extensions } from "./editor.ts";
import { addComment, commentAt, commentRegistryFor, comments, listComments, pastedComments, removeComment, wordAt } from "./comments.ts";
import { untracked } from "./track-changes.ts";

const schema = getSchema(extensions);
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

/** A view's state and dispatch, enough for the commands (they never touch the DOM). */
function fakeView(content: unknown[], from: number, to = from) {
  const doc = schema.nodeFromJSON({ type: "doc", content });
  const last: { tr: Transaction | null } = { tr: null };
  const view = {
    state: EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }),
    dispatch(tr: Transaction) { last.tr = tr; view.state = view.state.apply(tr); },
  };
  return { view: view as unknown as EditorView & { state: EditorState }, last };
}
const ana = { name: "Ana" };

describe("comments in the editor (record 0094)", () => {
  beforeEach(() => { comments.registry = {}; });

  it("anchors a comment to the selection, never as a tracked change", () => {
    const { view, last } = fakeView([p("La rodilla duele.")], 4, 11);
    const id = addComment(view, ana)!;
    expect(id).toMatch(/^cm-/);
    expect(comments.registry[id]).toMatchObject({ author: ana, text: "", resolved: false, replies: [], origin: "local" });
    expect(last.tr!.getMeta(untracked)).toBe(true);
    expect(listComments(view.state.doc)).toEqual([{ id, from: 4, to: 11, text: "rodilla" }]);
  });

  it("with nothing selected, takes the word at the cursor, or what is next to it; only an empty block has nothing", () => {
    const a = fakeView([p("Dolor de rodilla.")], 12);
    expect(wordAt(a.view.state)).toEqual({ from: 10, to: 17 });
    const id = addComment(a.view, ana)!;
    expect(listComments(a.view.state.doc)[0]).toMatchObject({ id, text: "rodilla" });
    // after a sign: what is written there without spaces (a table cell "5,1 (4,3–5,8)")
    const sign = fakeView([p("5,1 (4,3–5,8)")], 14);
    expect(wordAt(sign.view.state)).toEqual({ from: 5, to: 14 });
    // after an inline atom (a citation, a note call): the atom with what is next to it
    const cite = fakeView([{ type: "paragraph", content: [{ type: "text", text: "Dato (4,3)" }, { type: "citation", attrs: { id: "ci-aaaaaaaaaa", items: [{ ref: "r-aaaaaaaaaa" }] } }] }], 12);
    expect(wordAt(cite.view.state)).toEqual({ from: 6, to: 12 });
    // between spaces: the nearest word before the cursor
    const gap = fakeView([p("Dolor  de")], 7);
    expect(wordAt(gap.view.state)).toEqual({ from: 1, to: 6 });
    // an empty paragraph: nothing to anchor a comment to
    const empty = fakeView([{ type: "paragraph" }], 1);
    expect(addComment(empty.view, ana)).toBeNull();
    expect(Object.keys(comments.registry)).toEqual([id]);
  });

  it("lets comments overlap, and the cursor finds the one inside", () => {
    const { view } = fakeView([p("Artrosis de rodilla acelerada")], 1, 30);
    const outer = addComment(view, ana)!;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 13, 20)));
    const inner = addComment(view, { name: "Luis" })!;
    expect(listComments(view.state.doc).map((c) => c.id)).toEqual([outer, inner]);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 15)));
    expect(commentAt(view.state)).toBe(inner);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)));
    expect(commentAt(view.state)).toBe(outer);
    // removing the inner one leaves the outer one whole
    removeComment(view, inner);
    expect(listComments(view.state.doc)).toEqual([{ id: outer, from: 1, to: 30, text: "Artrosis de rodilla acelerada" }]);
    // the files keep only the comments still in the text
    expect(Object.keys(commentRegistryFor(view.state.doc))).toEqual([outer]);
  });

  it("lists the threads in the order of the text", () => {
    const { view } = fakeView([p("Primero"), p("Segundo")], 11, 16);
    const second = addComment(view, ana)!;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 4)));
    const first = addComment(view, ana)!;
    expect(listComments(view.state.doc).map((c) => [c.id, c.text])).toEqual([[first, "Pri"], [second, "egund"]]);
  });

  it("pastes a copy without the comment, and cut text with it", () => {
    const { view } = fakeView([p("Texto comentado")], 1, 6);
    const id = addComment(view, ana)!;
    const slice = view.state.doc.slice(1, 6);
    const marksOf = (s: Slice) => s.content.firstChild!.marks.map((m) => m.type.name);
    // copied: the comment is still in the text, so the copy goes without it
    expect(marksOf(pastedComments(slice, view.state.doc))).toEqual([]);
    // cut: it is not in the text any more, so it moves with the text
    view.dispatch(view.state.tr.delete(1, 6));
    expect(marksOf(pastedComments(slice, view.state.doc))).toEqual(["comment"]);
    // from another article (unknown id): never
    delete comments.registry[id];
    expect(marksOf(pastedComments(slice, view.state.doc))).toEqual([]);
  });
});
