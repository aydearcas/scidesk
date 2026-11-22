// The editor's ProseMirror schema, as Tiptap extensions. Node and mark names and their
// attributes are those of the .scidoc format (packages/formats, record 0031): the editor's
// JSON is saved as it is (R34): title, headings, paragraphs, lists, bold, italic, underline,
// superscript, subscript, colour and highlight, citations, cross-references, and the
// abstract, tables and figures edited in place (parts.ts).
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type EditorState as EditorStateType, type Transaction as TransactionType } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { HIGHLIGHT_COLORS } from "@scidesk/formats";
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
import { partExtensions } from "./parts.ts";

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
export const hooks = { quickCite: () => {}, xref: () => {}, find: (_replace: boolean) => {} };

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
    if ((n.type === "tableRef" || n.type === "tablePart") && !order.tables.includes(id)) order.tables.push(id);
    if ((n.type === "figureRef" || n.type === "figurePart") && !order.figures.includes(id)) order.figures.push(id);
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
 * Where a table or a figure goes when its file is missing: in the composite document each
 * part is edited in place (parts.ts), and only a reference whose file cannot be read stays
 * a reference. It shows its number and the file it points to, set by the window.
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
          const combo = comboOf(event);
          const action = actionFor(keyScheme.current, combo);
          // find here too: ProseMirror keeps Ctrl+B and Ctrl+I from the window (its
          // captureKeyDown stops the browser's own bold and italic), so "Word en español"'s
          // Ctrl+B would never reach it
          if (action === "find" || action === "replace" || combo === "Mod-f") { hooks.find(action === "replace"); event.preventDefault(); return true; }
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

// ---------------------------------------------------------------- find and replace (PLAN 5.2, record 0044)

export interface FindMatch { from: number; to: number }
interface FindState { query: string; caseSensitive: boolean; matches: FindMatch[]; current: number }
export const findKey = new PluginKey<FindState>("find");

/** Every match in the text blocks; a citation or cross-reference is one character that never matches. */
export function findMatches(doc: PMNodeType, query: string, caseSensitive: boolean): FindMatch[] {
  if (!query) return [];
  const norm = (s: string) => (caseSensitive ? s : s.toLocaleLowerCase());
  const q = norm(query);
  const out: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // one character per position: text, and U+FFFC for each inline leaf (citation, xref, break)
    const text = norm(node.textBetween(0, node.content.size, undefined, "￼"));
    for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + q.length)) out.push({ from: pos + 1 + i, to: pos + 1 + i + q.length });
    return false;
  });
  return out;
}

const FindHighlight = Extension.create({
  name: "findHighlight",
  addProseMirrorPlugins: () => [
    new Plugin<FindState>({
      key: findKey,
      state: {
        init: () => ({ query: "", caseSensitive: false, matches: [], current: -1 }),
        apply(tr, value, _old, state) {
          const meta = tr.getMeta(findKey) as Partial<FindState> | undefined;
          if (!meta && !tr.docChanged) return value;
          const next = { ...value, ...meta };
          const matches = meta?.query !== undefined || meta?.caseSensitive !== undefined || tr.docChanged ? findMatches(state.doc, next.query, next.caseSensitive) : value.matches;
          const current = matches.length ? Math.min(Math.max(meta?.current ?? next.current, 0), matches.length - 1) : -1;
          return { ...next, matches, current };
        },
      },
      props: {
        decorations(state) {
          const f = findKey.getState(state);
          if (!f?.matches.length) return null;
          return DecorationSet.create(state.doc, f.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === f.current ? "find-match find-current" : "find-match" })));
        },
      },
    }),
  ],
});

/** What the find bar shows. */
export const findState = (editor: { state: EditorStateType }) => findKey.getState(editor.state) ?? { query: "", caseSensitive: false, matches: [], current: -1 };
type EditorLike = { state: EditorStateType; view: { dispatch: (tr: TransactionType) => void } };
export function setFind(editor: EditorLike, query: string, caseSensitive: boolean) {
  // the match at or after the cursor becomes the current one, as in Word
  const at = editor.state.selection.from;
  const matches = findMatches(editor.state.doc, query, caseSensitive);
  const current = Math.max(0, matches.findIndex((m) => m.from >= at));
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { query, caseSensitive, current }).setMeta("addToHistory", false));
}
/** Goes to the next (1) or previous (-1) match, or stays on the current one (0), and selects it. */
export function findStep(editor: EditorLike, dir: -1 | 0 | 1, select = true) {
  const f = findState(editor);
  if (!f.matches.length) return;
  const current = (f.current + dir + f.matches.length) % f.matches.length;
  const m = f.matches[current];
  let tr = editor.state.tr.setMeta(findKey, { current }).setMeta("addToHistory", false);
  if (select) tr = tr.setSelection(TextSelection.create(tr.doc, m.from, m.to)).scrollIntoView();
  editor.view.dispatch(tr);
}
/** Replaces the current match (and goes to the next one); returns whether something was replaced. */
export function replaceCurrent(editor: EditorLike, text: string) {
  const f = findState(editor);
  const m = f.matches[f.current];
  if (!m) return false;
  editor.view.dispatch(editor.state.tr.insertText(text, m.from, m.to).setMeta(findKey, { current: f.current }));
  findStep(editor, 0);
  return true;
}
/** Replaces every match in one step (one Ctrl+Z undoes it); returns how many. */
export function replaceAll(editor: EditorLike, text: string) {
  const { matches } = findState(editor);
  if (!matches.length) return 0;
  let tr = editor.state.tr;
  for (const m of [...matches].reverse()) tr = tr.insertText(text, m.from, m.to);
  editor.view.dispatch(tr);
  return matches.length;
}

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

// Record 0047: a fragment's own font and size, used in the free font mode. Only SciDesk's own
// spans are read back (copy and paste inside the editor): Word's pasted HTML has a font and
// a size on every run, and its text takes the document's ("combinar formato", R23). In the
// font mode adapted to the journal, the window's CSS shows them as the rest of the text.
const FontFamily = Mark.create({
  name: "fontFamily",
  addAttributes: () => ({ family: { default: null, rendered: false } }),
  parseHTML: () => [{ tag: "span[data-font-family]", getAttrs: (el) => { const f = (el as HTMLElement).dataset.fontFamily ?? ""; return /^[^;{}<>"\\]{1,64}$/.test(f) ? { family: f } : false; } }],
  renderHTML: ({ mark }) => ["span", { "data-font-family": mark.attrs.family, class: "own-font", style: `font-family: "${mark.attrs.family}", var(--doc-font)` }, 0],
});
const FontSize = Mark.create({
  name: "fontSize",
  addAttributes: () => ({ size: { default: null, rendered: false } }),
  parseHTML: () => [{ tag: "span[data-font-size]", getAttrs: (el) => { const n = Number((el as HTMLElement).dataset.fontSize); return n >= 1 && n <= 409 ? { size: Math.round(n * 2) / 2 } : false; } }],
  renderHTML: ({ mark }) => ["span", { "data-font-size": String(mark.attrs.size), class: "own-font", style: `font-size: calc(${Number(mark.attrs.size)}pt * var(--zoom))` }, 0],
});

export const extensions = [
  ...partExtensions,
  SchemeKeys,
  FindHighlight,
  // paragraph first: it is the type ProseMirror creates on Enter (the first of the expression)
  Document.extend({ content: "(paragraph | heading | title | bulletList | orderedList | abstractPart | tablePart | figurePart | tableRef | figureRef)*" }),
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
  FontFamily,
  FontSize,
  UndoRedo,
];
