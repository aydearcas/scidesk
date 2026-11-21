// The editor's ProseMirror schema, as Tiptap extensions. Node and mark names and their
// attributes are those of the .scidoc format (packages/formats, record 0031): the editor's
// JSON is saved as it is (R34). Vertical slice: title, headings, paragraphs, bold, italic,
// superscript, subscript and citations.
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { newId } from "@scidesk/formats";
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

/** Labels of the citations ("1", "1,2"), computed by citeproc-js; never stored. */
export const citationLabels = new Map<string, string>();
const citationViews = new Map<string, Set<HTMLElement>>();
export function refreshCitationLabels() {
  for (const [id, els] of citationViews) for (const el of els) el.textContent = citationLabels.get(id) ?? "?";
}

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
  parseHTML: () => [{ tag: "sup[data-citation]" }],
  renderHTML: ({ node }) => ["sup", { "data-citation": node.attrs.id, class: "citation" }, citationLabels.get(node.attrs.id) ?? "?"],
  // a plain DOM node view, not a React component (PLAN 6.6: hundreds of citations)
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("sup");
    dom.className = "citation";
    const id = node.attrs.id as string;
    dom.textContent = citationLabels.get(id) ?? "?";
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
 * Where a table or a figure goes. In the vertical slice it is a block that is not edited
 * here: the part lives in its own file and is exported in place. Editing it inside the
 * document (the composite document, record 0021) comes with the interface skeleton.
 */
const partRef = (name: "tableRef" | "figureRef", label: string) => Node.create({
  name,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes: () => ({ id: { default: null }, src: { default: null } }),
  parseHTML: () => [{ tag: `div[data-${name}]` }],
  renderHTML: ({ node }) => ["div", { [`data-${name}`]: node.attrs.id, class: "part-ref", contenteditable: "false" }, `${label} · ${node.attrs.src}`],
});

export const extensions = [
  BlockIds,
  // paragraph first: it is the type ProseMirror creates on Enter (the first of the expression)
  Document.extend({ content: "(paragraph | heading | title | bulletList | orderedList | tableRef | figureRef)*" }),
  BulletList.extend({ addAttributes: () => ({ id: plain("id") }) }),
  OrderedList.extend({ addAttributes: () => ({ id: plain("id"), start: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute("start") ?? 1) } }) }),
  ListItem,
  partRef("tableRef", "▦ Tabla"),
  partRef("figureRef", "▣ Figura"),
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
  Bold,
  Italic,
  Superscript,
  Subscript,
  UndoRedo,
];
