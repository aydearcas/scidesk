// One small interface over both libraries so the scenarios are identical.
// Each adapter wraps a real EditorView running on jsdom.
import "./dom.js";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, undo } from "prosemirror-history";
import {
  suggestChanges,
  withSuggestChanges,
  enableSuggestChanges,
  applySuggestion,
  revertSuggestion,
  applySuggestions,
  revertSuggestions,
  setCanJoinSuggestion, // added by tools/patch-suggest-changes.mjs
} from "@handlewithcare/prosemirror-suggest-changes";
import * as mts from "@manuscripts/track-changes-plugin";
import { suggestSchema, manuscriptsSchema } from "./schema.js";


// Renders the document as one line: [+inserted] [-deleted] [~format], {cit}, ¶ between blocks.
export function render(doc, classify) {
  const segs = []; // { kind, s } merged when adjacent and of the same kind
  const push = (kind, s) => {
    const last = segs[segs.length - 1];
    if (last && last.kind === kind) last.s += s;
    else segs.push({ kind, s });
  };
  let firstBlock = true;
  doc.descendants((node) => {
    if (node.isTextblock) {
      if (!firstBlock) push(null, " ¶ ");
      firstBlock = false;
      const blockKind = classify(node);
      if (blockKind === "insert" || blockKind === "delete") push(blockKind, "¶");
      node.forEach((child) => {
        let s = child.isText ? child.text : child.type.name === "citation" ? "{cit}" : `{${child.type.name}}`;
        if (child.isText && child.marks.some((m) => m.type.name === "bold")) s = `*${s}*`;
        push(classify(child), s);
      });
      return false;
    }
    return true;
  });
  const wrap = { insert: "+", delete: "-", format: "~" };
  return segs.map(({ kind, s }) => (kind ? `[${wrap[kind]}${s}]` : s)).join("");
}

// ---------------------------------------------------------------- suggest-changes
export class SuggestAdapter {
  static label = "suggest-changes";
  constructor(docJSON) {
    this.schema = suggestSchema();
    this.author = "Ana";
    // Our own layer: the library only stores an id; author and date live in a
    // document-level registry keyed by that id (as Word does with w:ins/w:del).
    this.registry = {};
    this.counter = 0;
    const doc = this.schema.nodeFromJSON(docJSON.doc ?? docJSON);
    if (docJSON.changes) this.registry = structuredClone(docJSON.changes);
    this.counter = Math.max(0, ...Object.keys(this.registry).map((k) => +k.slice(1)));
    const state = EditorState.create({ schema: this.schema, doc, plugins: [history(), suggestChanges()] });
    const self = this;
    this.view = new EditorView(document.createElement("div"), {
      state,
      dispatchTransaction: withSuggestChanges(
        function (tr) {
          this.updateState(this.state.apply(tr));
          self.#register(tr);
        },
        () => `c${++self.counter}`,
      ),
    });
    enableSuggestChanges(this.view.state, this.view.dispatch);
  }
  get state() {
    return this.view.state;
  }
  setAuthor(a) {
    this.author = a;
  }
  dispatch(tr) {
    // A new suggestion joins an adjacent one only if it has the same author.
    setCanJoinSuggestion((id) => !this.registry[id] || this.registry[id].author === this.author);
    this.view.dispatch(tr);
  }
  // New ids get the current author. Ids that disappeared are left in place here and
  // dropped when saving (toJSON), so registering costs one pass over the changed range only.
  #register(tr) {
    if (!tr.docChanged) return;
    const { insertion, deletion, modification } = this.schema.marks;
    const doc = this.state.doc;
    tr.steps.forEach((step, i) => {
      const from = step.from ?? step.pos;
      const to = step.to ?? (step.pos ?? 0) + 1;
      if (from === undefined) return;
      const m = tr.mapping.slice(i);
      const a = Math.max(0, m.map(from, -1) - 1);
      const b = Math.min(doc.content.size, m.map(to, 1) + 1);
      doc.nodesBetween(a, Math.max(a, b), (n) => {
        for (const mk of n.marks) {
          if ((mk.type === insertion || mk.type === deletion || mk.type === modification) && !this.registry[mk.attrs.id]) {
            this.registry[mk.attrs.id] = { author: this.author, date: "2026-11-21T10:00:00Z" };
          }
        }
      });
    });
  }
  #ids() {
    const ids = new Set();
    this.state.doc.descendants((n) => {
      for (const m of n.marks) if (["insertion", "deletion", "modification"].includes(m.type.name)) ids.add(String(m.attrs.id));
    });
    return ids;
  }
  classify = (node) => {
    for (const m of node.marks) {
      if (m.type.name === "insertion") return "insert";
      if (m.type.name === "deletion") return "delete";
      if (m.type.name === "modification") return "format";
    }
    return null;
  };
  text() {
    return render(this.state.doc, this.classify);
  }
  changes() {
    const byId = new Map();
    this.state.doc.descendants((n) => {
      for (const m of n.marks) {
        const kind = this.classify({ marks: [m] });
        if (!kind) continue;
        const id = String(m.attrs.id);
        const c = byId.get(id) ?? { id, kind, author: this.registry[id]?.author, text: "" };
        if (n.isText) c.text += n.text;
        else if (n.isBlock) c.text += "¶";
        else c.text += `{${n.type.name}}`;
        byId.set(id, c);
      }
    });
    return [...byId.values()];
  }
  #cmd(cmd) {
    setCanJoinSuggestion(null);
    const ok = cmd(this.state, this.view.dispatch);
    if (!ok) throw new Error("command returned false");
  }
  accept(id) {
    this.#cmd(applySuggestion(isNaN(+id) ? id : id));
  }
  reject(id) {
    this.#cmd(revertSuggestion(id));
  }
  acceptAll() {
    this.#cmd(applySuggestions);
  }
  rejectAll() {
    this.#cmd(revertSuggestions);
  }
  undo() {
    undo(this.state, this.view.dispatch);
  }
  toJSON() {
    const live = this.#ids();
    const changes = Object.fromEntries(Object.entries(this.registry).filter(([id]) => live.has(id)));
    return { doc: this.state.doc.toJSON(), changes };
  }
}

// ---------------------------------------------------------------- manuscripts
export class ManuscriptsAdapter {
  static label = "manuscripts";
  constructor(docJSON) {
    this.schema = manuscriptsSchema();
    const doc = this.schema.nodeFromJSON(docJSON.doc ?? docJSON);
    const state = EditorState.create({
      schema: this.schema,
      doc,
      plugins: [history(), mts.trackChangesPlugin({ userID: "Ana", initialStatus: mts.TrackChangesStatus.enabled })],
    });
    this.view = new EditorView(document.createElement("div"), { state });
  }
  get state() {
    return this.view.state;
  }
  setAuthor(a) {
    mts.trackCommands.setUserID(a)(this.state, this.view.dispatch);
  }
  dispatch(tr) {
    this.view.dispatch(tr);
  }
  #tracked(node) {
    const markData = node.marks.find((m) => m.type.name === "tracked_insert" || m.type.name === "tracked_delete")?.attrs.dataTracked;
    const nodeData = Array.isArray(node.attrs?.dataTracked) ? node.attrs.dataTracked[0] : null;
    const formatData = node.marks.find((m) => !m.type.name.startsWith("tracked_") && m.attrs?.dataTracked)?.attrs.dataTracked;
    return markData || nodeData || (formatData ? { ...(Array.isArray(formatData) ? formatData[0] : formatData), operation: "format" } : null);
  }
  classify = (node) => {
    const d = this.#tracked(node);
    if (!d || d.status === "accepted" || d.status === "rejected") return null;
    if (d.operation === "insert" || d.operation === "node_split" || d.operation === "wrap_with_node") return "insert";
    if (d.operation === "delete") return "delete";
    return "format";
  };
  text() {
    return render(this.state.doc, this.classify);
  }
  pluginState() {
    return mts.trackChangesPluginKey.getState(this.state);
  }
  changes() {
    const cs = this.pluginState().changeSet;
    return cs.pending.map((c) => ({
      id: c.id,
      kind: c.dataTracked.operation,
      author: c.dataTracked.authorID,
      text: c.type === "text-change" ? c.text : `{${c.node?.type.name ?? c.type}}`,
    }));
  }
  #status(status, ids) {
    mts.trackCommands.setChangeStatuses(status, ids)(this.state, this.view.dispatch);
  }
  accept(id) {
    this.#status(mts.CHANGE_STATUS.accepted, [id]);
  }
  reject(id) {
    this.#status(mts.CHANGE_STATUS.rejected, [id]);
  }
  acceptAll() {
    this.#status(mts.CHANGE_STATUS.accepted, this.pluginState().changeSet.pending.map((c) => c.id));
  }
  rejectAll() {
    this.#status(mts.CHANGE_STATUS.rejected, this.pluginState().changeSet.pending.map((c) => c.id));
  }
  undo() {
    undo(this.state, this.view.dispatch);
  }
  toJSON() {
    return { doc: this.state.doc.toJSON() };
  }
}

export const ADAPTERS = [SuggestAdapter, ManuscriptsAdapter];
