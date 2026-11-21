// Tiptap editor for the composite document: one tree that holds the abstract, the body
// and every table, each table part remembering the file it came from.
import { Editor, Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import UniqueID from "@tiptap/extension-unique-id";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { ReplaceStep, ReplaceAroundStep } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  suggestChanges,
  suggestChangesKey,
  isSuggestChangesEnabled,
  transformToSuggestionTransaction,
  setCanJoinSuggestion, // added by tools/patch-suggest-changes.mjs (prototype 7)
} from "@handlewithcare/prosemirror-suggest-changes";
import { numbering } from "./composite.js";

const SUGGESTION_MARKS = "insertion deletion modification";
export const randomId = (prefix) => `${prefix}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, "0")}`;

// ---------------------------------------------------------------- nodes
const Doc = Node.create({ name: "doc", topNode: true, content: "abstractPart? body+", marks: SUGGESTION_MARKS });

const AbstractPart = Node.create({
  name: "abstractPart",
  content: "(paragraph|heading)+",
  isolating: true,
  defining: true,
  marks: SUGGESTION_MARKS,
  addAttributes: () => ({ src: { default: null } }),
  parseHTML: () => [{ tag: "section[data-part=abstract]" }],
  renderHTML: ({ HTMLAttributes }) => ["section", mergeAttributes(HTMLAttributes, { "data-part": "abstract", class: "part part-abstract" }), 0],
});

// A table that lives in tables/*.scitable: caption, table and notes (R11).
const TablePart = Node.create({
  name: "tablePart",
  group: "body",
  content: "tableCaption table tableNote*",
  isolating: true,
  defining: true,
  addAttributes: () => ({ id: { default: null }, src: { default: null } }),
  parseHTML: () => [{ tag: "figure[data-part=table]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes(HTMLAttributes, { "data-part": "table", class: "part part-table", "data-src": HTMLAttributes.src }), 0],
});
const TableCaption = Node.create({
  name: "tableCaption",
  content: "inline*",
  parseHTML: () => [{ tag: "figcaption" }],
  renderHTML: () => ["figcaption", 0],
});
const TableNote = Node.create({
  name: "tableNote",
  content: "inline*",
  addAttributes: () => ({ id: { default: null } }),
  parseHTML: () => [{ tag: "p.table-note" }],
  renderHTML: ({ HTMLAttributes }) => ["p", mergeAttributes(HTMLAttributes, { class: "table-note" }), 0],
});
// Citations and cross-references are plain atoms; their numbers are decorations (R38).
const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ refs: { default: [] } }),
  parseHTML: () => [{ tag: "cite" }],
  renderHTML: ({ node }) => ["cite", { class: "citation", "data-refs": node.attrs.refs.join(",") }],
});
const Xref = Node.create({
  name: "xref",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ target: { default: null } }),
  parseHTML: () => [{ tag: "a.xref" }],
  renderHTML: ({ node }) => ["a", { class: "xref", "data-target": node.attrs.target }],
});

const numberingKey = new PluginKey("numbering");
const Numbering = Extension.create({
  name: "numbering",
  addProseMirrorPlugins() {
    const build = (doc) => {
      const n = numbering(doc);
      const decos = [];
      doc.descendants((node, pos) => {
        if (node.type.name === "citation") decos.push(Decoration.node(pos, pos + node.nodeSize, { "data-num": `[${n.citationLabel(node.attrs.refs)}]` }));
        else if (node.type.name === "xref") decos.push(Decoration.node(pos, pos + node.nodeSize, { "data-num": `tabla ${n.tables.get(node.attrs.target) ?? "?"}` }));
        else if (node.type.name === "tablePart") {
          const caption = node.firstChild;
          decos.push(Decoration.node(pos + 1, pos + 1 + caption.nodeSize, { "data-num": String(n.tables.get(node.attrs.id)) }));
        } else if (node.type.name === "tableNote") decos.push(Decoration.node(pos, pos + node.nodeSize, { "data-letter": n.notes.get(node.attrs.id) ?? "?" }));
      });
      return DecorationSet.create(doc, decos);
    };
    return [
      new Plugin({
        key: numberingKey,
        state: { init: (_, s) => build(s.doc), apply: (tr, old) => (tr.docChanged ? build(tr.doc) : old) },
        props: { decorations: (s) => numberingKey.getState(s) },
      }),
    ];
  },
});

// A pasted or duplicated table part gets its own file and id (and the notes inside get new
// ids from UniqueID), so two parts never write the same file.
const UniqueParts = Extension.create({
  name: "uniqueParts",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((t) => t.docChanged)) return null;
          const seen = new Set();
          let tr = null;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== "tablePart") return node.type.name === "doc";
            if (seen.has(node.attrs.src) || seen.has(node.attrs.id) || !node.attrs.src) {
              const id = randomId("tab");
              tr = tr ?? state.tr;
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id, src: `tables/${id}.scitable` });
              seen.add(`tables/${id}.scitable`);
              // the copy's notes and cell paragraphs need their own block ids too
              node.descendants((child, rel) => {
                if (child.attrs?.id !== undefined && child.type.name !== "tablePart") tr.setNodeAttribute(pos + 1 + rel, "id", randomId("b"));
              });
            } else {
              seen.add(node.attrs.src);
              seen.add(node.attrs.id);
            }
            return false;
          });
          return tr;
        },
      }),
    ];
  },
});

// A selection that starts outside a part (abstract, table) and ends inside it, or the other
// way round, is clamped to the side where it started before deleting or typing; any other
// step that would cut a part's border halfway is refused. Without this, deleting from the
// body into a table caption moves the rest of the caption into the body paragraph, i.e.
// text silently changes file.
const PART_TYPES = new Set(["tablePart", "abstractPart"]);
function partOf($pos) {
  for (let d = $pos.depth; d > 0; d--) if (PART_TYPES.has($pos.node(d).type.name)) return $pos.before(d);
  return null;
}
function crossesPart(doc, from, to) {
  if (from === to) return false;
  return partOf(doc.resolve(from)) !== partOf(doc.resolve(to));
}
const PartBoundaries = Extension.create({
  name: "partBoundaries",
  priority: 1000,
  addKeyboardShortcuts() {
    const clamp = () => {
      const { state, view } = this.editor;
      const { from, to, $from, empty } = state.selection;
      if (empty || !crossesPart(state.doc, from, to)) return false;
      const startPart = partOf($from);
      let end = to;
      if (startPart === null) {
        // started in the body: stop before the first part inside the selection
        state.doc.nodesBetween(from, to, (n, pos) => {
          if (PART_TYPES.has(n.type.name) && pos < end && pos + n.nodeSize > to) end = pos;
          return !PART_TYPES.has(n.type.name);
        });
        end = Math.max(from, end - 1);
      } else end = startPart + state.doc.nodeAt(startPart).nodeSize - 2;
      view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, Math.max(from, end))));
      return false; // let the normal Backspace/Delete run on the clamped selection
    };
    return { Backspace: clamp, Delete: clamp, "Mod-x": clamp };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (tr) =>
          !tr.steps.some((step, i) => (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) && crossesPart(tr.docs[i], step.from, step.to)),
      }),
    ];
  },
});

// ---------------------------------------------------------------- suggestions
const suggestionMark = (name, tag, extraAttrs = {}) =>
  Mark.create({
    name,
    inclusive: false,
    excludes: name === "modification" ? "deletion insertion" : SUGGESTION_MARKS,
    addAttributes: () => ({
      id: { default: null, parseHTML: (el) => el.getAttribute("data-id"), renderHTML: (a) => ({ "data-id": a.id }) },
      ...extraAttrs,
    }),
    parseHTML: () => [{ tag: `${tag}[data-id]` }],
    renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
  });
const plainAttr = () => ({ default: null, renderHTML: () => ({}) });

// Tiptap 3 lets an extension intercept every transaction before it is applied
// (`dispatchTransaction({ transaction, next })`): that is where suggestion mode lives.
// Composition (prototype 11): on macOS a dead key ("´" then "i") opens a composition: WebKit
// shows a provisional "´" and replaces it with "í" at the end. Turning each step of that into
// a suggestion breaks ProseMirror's tracking of the composition and leaves "´í". So while
// composing, transactions pass through untouched (and out of the undo history); when the
// composition ends, the net change since it started is undone and applied again as one
// ordinary transaction, which becomes a suggestion.
const compositionKey = new PluginKey("suggestComposition");
function compositionPlugin(storage) {
  const finish = (view, tries = 0) => {
    // WebKit may still report the composition as open right after compositionend: wait
    if (view.composing && tries < 40) return setTimeout(() => finish(view, tries + 1), 25);
    const start = storage.compositionStart;
    storage.compositionStart = null;
    if (!start) return;
    console.debug("[suggest] composition finished", { tries });
    const cur = view.state.doc;
    const a = start.content.findDiffStart(cur.content);
    if (a == null) return;
    let { a: endA, b: endB } = start.content.findDiffEnd(cur.content);
    const over = a - Math.min(endA, endB);
    if (over > 0) { endA += over; endB += over; }
    const inserted = cur.slice(a, endB);
    const revert = view.state.tr.replace(a, endB, start.slice(a, endA)).setMeta(suggestChangesKey, { skip: true }).setMeta("addToHistory", false);
    view.dispatch(revert);
    const tr = view.state.tr.replace(a, endA, inserted);
    tr.setSelection(TextSelection.near(tr.doc.resolve(a + inserted.size)));
    view.dispatch(tr); // goes through dispatchTransaction: becomes a suggestion
  };
  return new Plugin({
    key: compositionKey,
    props: {
      handleDOMEvents: {
        compositionstart: (view) => { if (isSuggestChangesEnabled(view.state) && !storage.compositionStart) storage.compositionStart = view.state.doc; return false; },
        compositionend: (view) => { setTimeout(() => finish(view), 0); return false; },
      },
    },
  });
}

export const SuggestChanges = Extension.create({
  name: "suggestChangesBridge",
  addStorage: () => ({ author: "Ana", registry: {}, compositionStart: null }),
  addProseMirrorPlugins() { return [suggestChanges(), compositionPlugin(this.storage)]; },
  dispatchTransaction({ transaction, next }) {
    const { editor, storage } = this;
    const state = editor.state;
    const skip = "skip" in (transaction.getMeta(suggestChangesKey) ?? {}) || transaction.getMeta("history$") || transaction.getMeta("fromOutside");
    if (!transaction.docChanged || skip || !isSuggestChangesEnabled(state)) return next(transaction);
    if (storage.compositionStart) return next(transaction.setMeta("addToHistory", false)); // composing: see compositionPlugin
    setCanJoinSuggestion((id) => !storage.registry[id] || storage.registry[id].author === storage.author);
    const tracked = transformToSuggestionTransaction(transaction, state, () => randomId("c"));
    setCanJoinSuggestion(null);
    next(tracked);
    registerAuthors(editor.state.doc, tracked, storage);
  },
});
// New change ids get the current author (proto 7). Only the ranges touched are scanned.
function registerAuthors(doc, tr, storage) {
  tr.steps.forEach((step, i) => {
    const from = step.from ?? step.pos;
    if (from === undefined) return;
    const to = step.to ?? from + 1;
    const m = tr.mapping.slice(i);
    const a = Math.max(0, m.map(from, -1) - 1);
    const b = Math.min(doc.content.size, m.map(to, 1) + 1);
    doc.nodesBetween(a, Math.max(a, b), (n) => {
      for (const mk of n.marks) {
        if (/^(insertion|deletion|modification)$/.test(mk.type.name) && !storage.registry[mk.attrs.id]) {
          storage.registry[mk.attrs.id] = { author: storage.author, date: new Date().toISOString(), origin: "local" };
        }
      }
    });
  });
}

export function extensions() {
  return [
    StarterKit.configure({
      document: false,
      paragraph: false,
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      link: false,
      trailingNode: false,
    }),
    Doc,
    Paragraph.extend({ group: "block body" }),
    Heading.extend({ group: "block body" }).configure({ levels: [1, 2, 3] }),
    AbstractPart,
    TablePart,
    TableCaption,
    TableNote,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader.extend({ marks: `${SUGGESTION_MARKS} bold italic` }),
    TableCell.extend({ marks: `${SUGGESTION_MARKS} bold italic` }),
    Citation,
    Xref,
    Numbering,
    UniqueParts,
    PartBoundaries,
    UniqueID.configure({ types: ["heading", "paragraph", "tableNote"], attributeName: "id", generateID: () => randomId("b") }),
    suggestionMark("insertion", "ins"),
    suggestionMark("deletion", "del"),
    suggestionMark("modification", "span", { type: plainAttr(), attrName: plainAttr(), previousValue: plainAttr(), newValue: plainAttr() }),
    SuggestChanges,
  ];
}

export function createEditor(element, docJSON, registry = {}) {
  const editor = new Editor({ element, extensions: extensions(), content: docJSON, enableExtensionDispatchTransaction: true });
  editor.storage.suggestChangesBridge.registry = registry;
  return editor;
}
