// The editor's ProseMirror schema, as Tiptap extensions. Node and mark names and their
// attributes are those of the .scidoc format (packages/formats, record 0031): the editor's
// JSON is saved as it is (R34): title, headings, paragraphs, lists, bold, italic, underline,
// superscript, subscript, colour and highlight, citations, cross-references and the places
// of tables and figures.
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { HIGHLIGHT_COLORS, newId } from "@scidesk/formats";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Paragraph from "@tiptap/extension-paragraph";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Text from "@tiptap/extension-text";
import { BulletList, ListItem, OrderedList } from "@tiptap/extension-list";
import { UndoRedo } from "@tiptap/extensions";
import { actionFor, comboOf, EDITOR_ACTIONS, keyScheme } from "./shortcuts.ts";

const plain = (name: string) => ({ default: null, parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`), renderHTML: (a: Record<string, unknown>) => (a[name] == null ? {} : { [`data-${name}`]: a[name] }) });

const Title = Node.create({
  name: "title",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ id: plain("id"), lang: plain("lang") }),
  parseHTML: () => [{ tag: "h1.title" }],
  renderHTML: ({ HTMLAttributes }) => ["h1", mergeAttributes(HTMLAttributes, { class: "title" }), 0],
});

/**
 * Labels of the citations ("1", "(1,2)", "(Alonso et al., 2025)"), computed by citeproc-js
 * as formatted runs; never stored. Superscript only where the style asks for it.
 */
export type LabelRun = { text: string; sup?: boolean; italic?: boolean; bold?: boolean };
export const citationLabels = new Map<string, LabelRun[]>();
const citationViews = new Map<string, Set<HTMLElement>>();
function fillCitation(el: HTMLElement, id: string) {
  const runs = citationLabels.get(id) ?? [{ text: "?" }];
  // built from text nodes, never from citeproc's HTML: reference data comes from imported files
  el.replaceChildren(...runs.map((r) => {
    if (!r.sup && !r.italic && !r.bold) return document.createTextNode(r.text);
    const e = document.createElement(r.sup ? "sup" : "span");
    e.textContent = r.text;
    if (r.italic) e.style.fontStyle = "italic";
    if (r.bold) e.style.fontWeight = "700";
    return e;
  }));
}
export function refreshCitationLabels() {
  for (const [id, els] of citationViews) for (const el of els) fillCitation(el, id);
}

/** What the shortcuts that open a dialog do (set by the window). */
export const hooks = { quickCite: () => {}, xref: () => {} };

/** Numbers of tables and figures by first cross-reference, then position (as the export). */
export const xrefLabels = new Map<string, string>();
const xrefViews = new Map<string, Set<HTMLElement>>();
export function refreshXrefLabels(doc: { content?: { type: string; attrs?: Record<string, unknown>; content?: unknown[] }[] }) {
  const order: { tables: string[]; figures: string[] } = { tables: [], figures: [] };
  const visit = (n: { type: string; attrs?: Record<string, unknown>; content?: unknown[] }) => {
    if (n.type === "xref") {
      const t = String(n.attrs?.target ?? "");
      const list = t.startsWith("t-") ? order.tables : t.startsWith("f-") ? order.figures : null;
      if (list && !list.includes(t)) list.push(t);
    }
    (n.content as typeof n[] | undefined)?.forEach(visit);
  };
  visit(doc as never);
  for (const n of doc.content ?? []) {
    const id = String(n.attrs?.id ?? "");
    if (n.type === "tableRef" && !order.tables.includes(id)) order.tables.push(id);
    if (n.type === "figureRef" && !order.figures.includes(id)) order.figures.push(id);
  }
  xrefLabels.clear();
  order.tables.forEach((id, i) => xrefLabels.set(id, String(i + 1)));
  order.figures.forEach((id, i) => xrefLabels.set(id, String(i + 1)));
  for (const [id, els] of xrefViews) for (const el of els) el.textContent = xrefLabels.get(id) ?? "?";
}

const Xref = Node.create({
  name: "xref",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ target: { default: null } }),
  parseHTML: () => [{ tag: "span[data-xref]" }],
  renderHTML: ({ node }) => ["span", { "data-xref": node.attrs.target, class: "xref" }, xrefLabels.get(node.attrs.target) ?? "?"],
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("span");
    dom.className = "xref";
    dom.dataset.xref = node.attrs.target as string;
    const id = node.attrs.target as string;
    dom.textContent = xrefLabels.get(id) ?? "?";
    if (!xrefViews.has(id)) xrefViews.set(id, new Set());
    xrefViews.get(id)!.add(dom);
    return { dom, destroy: () => xrefViews.get(id)?.delete(dom) };
  },
});

const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ id: { default: null }, items: { default: [] } }),
  parseHTML: () => [{ tag: "span[data-citation]" }, { tag: "sup[data-citation]" }],
  renderHTML: ({ node }) => ["span", { "data-citation": node.attrs.id, class: "citation" }, (citationLabels.get(node.attrs.id) ?? [{ text: "?" }]).map((r) => r.text).join("")],
  // a plain DOM node view, not a React component (PLAN 6.6: hundreds of citations)
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("span");
    dom.className = "citation";
    const id = node.attrs.id as string;
    dom.dataset.citation = id;
    fillCitation(dom, id);
    if (!citationViews.has(id)) citationViews.set(id, new Set());
    citationViews.get(id)!.add(dom);
    return { dom, destroy: () => citationViews.get(id)?.delete(dom) };
  },
});

/**
 * Every block keeps a unique id (R34, record 0021 rule 1): a block that arrives without one
 * or with one already used (Enter splits a paragraph and copies its attributes; paste
 * copies them too) gets a new one, in the same transaction.
 */
const BlockIds = Extension.create({
  name: "blockIds",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: new PluginKey("blockIds"),
      appendTransaction: (trs, _old, state) => {
        if (!trs.some((t) => t.docChanged)) return null;
        const seen = new Set<string>();
        let tr = state.tr;
        let changed = false;
        state.doc.descendants((node, pos) => {
          if (!["paragraph", "heading", "title", "bulletList", "orderedList", "citation"].includes(node.type.name)) return;
          const id = node.attrs.id as string | null;
          if (id && !seen.has(id)) { seen.add(id); return; }
          const fresh = newId(node.type.name === "citation" ? "c" : "b");
          seen.add(fresh);
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh });
          changed = true;
        });
        return changed ? tr.setMeta("addToHistory", false) : null;
      },
    }),
  ],
});

/**
 * Where a table or a figure goes. It is a block that is not edited here: the part lives in
 * its own file and is exported in place. It shows its number and caption as they will come
 * out ("Tabla 2 · Características basales"), set by the window from the article's outline.
 * Editing it inside the document (the composite document, record 0021) comes later.
 */
export interface PartInfo { label: string; caption: string; cited: boolean; uncitedText: string }
export const partInfo = new Map<string, PartInfo>();
const partViews = new Map<string, Set<HTMLElement>>();
function fillPart(el: HTMLElement, id: string) {
  const info = partInfo.get(id);
  const head = document.createElement("b");
  head.textContent = info?.label ?? el.dataset.fallback ?? "";
  const caption = document.createElement("span");
  caption.textContent = info?.caption ? ` · ${info.caption}` : "";
  const parts: globalThis.Node[] = [head, caption];
  if (info && !info.cited) {
    const flag = document.createElement("span");
    flag.className = "part-uncited";
    flag.textContent = info.uncitedText;
    parts.push(flag);
  }
  el.replaceChildren(...parts);
}
export function refreshPartLabels() {
  for (const [id, els] of partViews) for (const el of els) fillPart(el, id);
}
const partRef = (name: "tableRef" | "figureRef") => Node.create({
  name,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes: () => ({
    id: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name.toLowerCase()}`) },
    src: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-src") },
  }),
  parseHTML: () => [{ tag: `div[data-${name}]` }],
  renderHTML: ({ node }) => ["div", { [`data-${name}`]: node.attrs.id, "data-src": node.attrs.src, class: "part-ref", contenteditable: "false" }, String(node.attrs.src)],
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("div");
    dom.className = `part-ref ${name}`;
    dom.contentEditable = "false";
    const id = node.attrs.id as string;
    dom.setAttribute(`data-${name.toLowerCase()}`, id);
    dom.dataset.fallback = String(node.attrs.src ?? "");
    fillPart(dom, id);
    if (!partViews.has(id)) partViews.set(id, new Set());
    partViews.get(id)!.add(dom);
    return { dom, destroy: () => partViews.get(id)?.delete(dom) };
  },
});

/**
 * The shortcuts of the scheme in use (R19, record 0044), read on every key press so that
 * changing the scheme in Settings needs no reload. The marks' own shortcuts are removed:
 * Ctrl+B is "search" in "Word en español", not bold. The quick citation is Ctrl+Shift+C in
 * both schemes (D6, record 0043). Never Ctrl+Alt (AltGr on Spanish keyboards).
 */
const SchemeKeys = Extension.create({
  name: "schemeKeys",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      key: new PluginKey("schemeKeys"),
      props: {
        handleKeyDown: (_view, event) => {
          const action = actionFor(keyScheme.current, comboOf(event));
          if (!action || !EDITOR_ACTIONS.includes(action)) return false;
          if (action === "cite") hooks.quickCite();
          else if (action === "xref") hooks.xref();
          else editor.commands.toggleMark(action);
          event.preventDefault();
          return true;
        },
      },
    })];
  },
});
const noKeys = { addKeyboardShortcuts: () => ({}) };

/** "#c00000", "rgb(192, 0, 0)" -> "#C00000"; anything else (named colours, black) -> null. */
export function cssColor(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  let hex = /^#([0-9a-f]{6})$/i.exec(v)?.[1] ?? null;
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(v);
  if (rgb) hex = rgb.slice(1, 4).map((x) => Number(x).toString(16).padStart(2, "0")).join("");
  return hex && hex.toLowerCase() !== "000000" ? `#${hex.toUpperCase()}` : null;
}

// Record 0043: underline, colour of the text and Word's highlight, with the names and
// attributes of the .scidoc format; Word's pasted HTML is read too (color:…, mso-highlight:…).
const Underline = Mark.create({
  name: "underline",
  parseHTML: () => [{ tag: "u" }, { style: "text-decoration", getAttrs: (v) => (/underline/.test(String(v)) ? null : false) }],
  renderHTML: () => ["u", 0],
});
const TextColor = Mark.create({
  name: "textColor",
  addAttributes: () => ({ color: { default: null } }),
  parseHTML: () => [{ style: "color", getAttrs: (v) => { const c = cssColor(String(v)); return c ? { color: c } : false; } }],
  renderHTML: ({ HTMLAttributes }) => ["span", { style: `color: ${HTMLAttributes.color}`, "data-color": HTMLAttributes.color }, 0],
});
const Highlight = Mark.create({
  name: "highlight",
  addAttributes: () => ({ color: { default: "yellow" } }),
  parseHTML: () => [
    { tag: "mark", getAttrs: (el) => ({ color: (HIGHLIGHT_COLORS as readonly string[]).includes((el as HTMLElement).dataset.highlight ?? "") ? (el as HTMLElement).dataset.highlight : "yellow" }) },
    // Word: <span style="background:yellow;mso-highlight:yellow">; the browser drops the
    // unknown mso- property from the parsed style, so the attribute is read as written
    {
      tag: "span[style*='mso-highlight']",
      consuming: false,
      getAttrs: (el) => {
        const v = /mso-highlight:\s*([a-zA-Z]+)/i.exec((el as HTMLElement).getAttribute("style") ?? "")?.[1] ?? "";
        return (HIGHLIGHT_COLORS as readonly string[]).includes(v) ? { color: v } : false;
      },
    },
  ],
  renderHTML: ({ HTMLAttributes }) => ["mark", { "data-highlight": HTMLAttributes.color, class: `hl-${HTMLAttributes.color}` }, 0],
});

export const extensions = [
  BlockIds,
  SchemeKeys,
  // paragraph first: it is the type ProseMirror creates on Enter (the first of the expression)
  Document.extend({ content: "(paragraph | heading | title | bulletList | orderedList | tableRef | figureRef)*" }),
  BulletList.extend({ addAttributes: () => ({ id: plain("id") }) }),
  OrderedList.extend({ addAttributes: () => ({ id: plain("id"), start: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute("start") ?? 1) } }) }),
  ListItem,
  partRef("tableRef"),
  partRef("figureRef"),
  Text,
  Paragraph.extend({ addAttributes: () => ({ id: plain("id"), lang: plain("lang") }) }),
  Heading.extend({
    addAttributes() {
      return { ...this.parent?.(), id: plain("id"), role: plain("role"), lang: plain("lang") };
    },
  }).configure({ levels: [1, 2, 3, 4, 5, 6] }),
  Title,
  Citation,
  Xref,
  Bold.extend(noKeys),
  Italic.extend(noKeys),
  Superscript.extend(noKeys),
  Subscript.extend(noKeys),
  Underline,
  TextColor,
  Highlight,
  UndoRedo,
];
