// "Open the table in its own tab": a second EditorView over the same tablePart of the
// composed document (ProseMirror's nested-editor pattern). Its steps are offset and
// dispatched to the main editor, so undo, suggestions and saving stay in one place;
// changes made in the main editor are copied back into the tab.
import { EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { StepMap } from "@tiptap/pm/transform";
import { keymap } from "@tiptap/pm/keymap";
import { baseKeymap } from "@tiptap/pm/commands";

export class TableTab {
  constructor(editor, tableId, element) {
    this.editor = editor;
    this.tableId = tableId;
    const { node } = this.#find();
    this.view = new EditorView(element, {
      state: EditorState.create({
        doc: node,
        plugins: [
          keymap({
            "Mod-z": () => (editor.commands.undo(), true),
            "Mod-y": () => (editor.commands.redo(), true),
            "Shift-Mod-z": () => (editor.commands.redo(), true),
          }),
          keymap(baseKeymap),
        ],
      }),
      dispatchTransaction: (tr) => this.#dispatchInner(tr),
    });
    this.onUpdate = () => this.#syncFromOuter();
    editor.on("update", this.onUpdate);
  }
  #find() {
    let found = null;
    this.editor.state.doc.forEach((node, offset) => {
      if (node.type.name === "tablePart" && node.attrs.id === this.tableId) found = { node, pos: offset };
    });
    if (!found) throw new Error(`table ${this.tableId} not in the document`);
    return found;
  }
  #dispatchInner(tr) {
    const { state, transactions } = this.view.state.applyTransaction(tr);
    this.view.updateState(state);
    if (tr.getMeta("fromOutside")) return;
    const { pos } = this.#find();
    const outer = this.editor.state.tr;
    const offset = StepMap.offset(pos + 1); // inner position 0 is the start of the part's content
    for (const t of transactions) for (const step of t.steps) outer.step(step.map(offset));
    if (outer.docChanged) this.editor.view.dispatch(outer);
  }
  #syncFromOuter() {
    let found;
    try {
      found = this.#find();
    } catch {
      return this.destroy(); // the table was removed from the document
    }
    const inner = this.view.state;
    const next = found.node;
    if (next.eq(inner.doc)) return;
    const start = next.content.findDiffStart(inner.doc.content);
    if (start == null) return;
    let { a: endA, b: endB } = next.content.findDiffEnd(inner.doc.content);
    const overlap = start - Math.min(endA, endB);
    if (overlap > 0) {
      endA += overlap;
      endB += overlap;
    }
    const tr = inner.tr.replace(start, endB, next.slice(start, endA)).setMeta("fromOutside", true);
    // keep the tab's own attrs (src may change on paste) in sync too
    if (JSON.stringify(next.attrs) !== JSON.stringify(inner.doc.attrs)) {
      for (const [k, v] of Object.entries(next.attrs)) tr.setDocAttribute(k, v);
    }
    this.view.dispatch(tr);
  }
  destroy() {
    this.editor.off("update", this.onUpdate);
    this.view.destroy();
  }
}
