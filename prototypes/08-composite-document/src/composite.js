// Compose on load, split on save (PLAN.md 3.3, R32).
// compose(): the files of one article -> one ProseMirror document + one change registry.
// split():   that document -> the text of every file, so only the changed ones are written.
import { stableStringify } from "./stable-json.js";

const ARTICLE = "articles/main/";
const BLOCKS_WITH_ID = new Set(["paragraph", "heading", "tableNote"]);
const newId = () => `b-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, "0")}`;

// Every block gets a stable id when loading (missing or repeated ids are replaced), and
// stray U+200B without a suggestion mark are dropped (prototype 7). Doing it here, and not
// leaving it to the editor extension, keeps "load and save" from changing the files.
export function normalize(docJSON) {
  const seen = new Set();
  const walk = (n) => {
    if (BLOCKS_WITH_ID.has(n.type)) {
      const id = n.attrs?.id;
      if (!id || seen.has(id)) n.attrs = { ...(n.attrs ?? {}), id: newId() };
      seen.add(n.attrs.id);
    }
    if (n.content) {
      n.content = n.content
        .map((c) => (c.type === "text" && !(c.marks ?? []).some(isSuggestion) ? { ...c, text: c.text.replaceAll("\u200b", "") } : c))
        .filter((c) => c.type !== "text" || c.text.length);
      n.content.forEach(walk);
    }
  };
  walk(docJSON);
  return docJSON;
}
const isSuggestion = (m) => m.type === "insertion" || m.type === "deletion" || m.type === "modification";

export function compose(files) {
  const read = (path) => {
    const text = files[ARTICLE + path];
    if (text === undefined) throw new Error(`missing file ${path}`);
    return JSON.parse(text);
  };
  const manifest = read("article.json");
  const body = read(manifest.body);
  const abstract = read(manifest.abstract);
  const changes = { ...abstract.changes, ...body.changes };
  const content = [{ type: "abstractPart", attrs: { src: manifest.abstract }, content: abstract.doc.content }];
  const loaded = new Set();
  for (const node of body.doc.content) {
    if (node.type !== "tableRef") {
      content.push(node);
      continue;
    }
    const table = read(node.attrs.src);
    if (table.doc.attrs.id !== node.attrs.id) throw new Error(`table id mismatch in ${node.attrs.src}`);
    Object.assign(changes, table.changes);
    loaded.add(node.attrs.src);
    // marks on the reference (a whole table suggested for deletion) move to the part
    content.push({ ...table.doc, attrs: { ...table.doc.attrs, src: node.attrs.src }, ...(node.marks ? { marks: node.marks } : {}) });
  }
  return { doc: normalize({ type: "doc", content }), changes, manifest, loaded };
}

// Change ids used inside a JSON subtree.
function changeIds(json, out = new Set()) {
  for (const m of json.marks ?? []) if (isSuggestion(m)) out.add(m.attrs.id);
  for (const c of json.content ?? []) changeIds(c, out);
  return out;
}
const pick = (changes, ids) => Object.fromEntries([...ids].filter((id) => changes[id]).sort().map((id) => [id, changes[id]]));

export function split(docJSON, changes, manifest) {
  const files = {};
  const body = [];
  let abstract = null;
  const tables = [];
  for (const node of docJSON.content) {
    if (node.type === "abstractPart") abstract = node;
    else if (node.type === "tablePart") {
      const { src, ...attrs } = node.attrs;
      const { marks, ...rest } = node;
      const partDoc = { ...rest, attrs };
      tables.push(src);
      files[ARTICLE + src] = stableStringify({ schemaVersion: 1, documentType: "table", doc: partDoc, changes: pick(changes, changeIds(partDoc)) });
      body.push({ type: "tableRef", attrs: { id: attrs.id, src }, ...(marks ? { marks } : {}) });
    } else body.push(node);
  }
  const bodyDoc = { type: "doc", content: body };
  files[ARTICLE + manifest.body] = stableStringify({ schemaVersion: 1, documentType: "article", doc: bodyDoc, changes: pick(changes, changeIds(bodyDoc)) });
  if (abstract) {
    const absDoc = { type: "doc", content: abstract.content };
    files[ARTICLE + manifest.abstract] = stableStringify({ schemaVersion: 1, documentType: "abstract", doc: absDoc, changes: pick(changes, changeIds(absDoc)) });
  }
  return { files, tables };
}

// Files whose text differs from what is on disk.
export function changedFiles(files, onDisk) {
  return Object.fromEntries(Object.entries(files).filter(([path, text]) => onDisk[path] !== text));
}

// Numbers computed from the whole composed document, never stored (PLAN.md 3.2):
// citations by first appearance (tables included, where they sit), tables in order,
// table notes a, b, c… within each table.
export function numbering(doc) {
  const refs = new Map();
  const tables = new Map();
  const notes = new Map();
  let currentNotes = 0;
  doc.descendants((node) => {
    if (node.type.name === "tablePart") {
      tables.set(node.attrs.id, tables.size + 1);
      currentNotes = 0;
    } else if (node.type.name === "tableNote") notes.set(node.attrs.id, String.fromCharCode(97 + currentNotes++));
    else if (node.type.name === "citation") for (const r of node.attrs.refs) if (!refs.has(r)) refs.set(r, refs.size + 1);
    return true;
  });
  const citationLabel = (ids) => {
    const nums = [...new Set(ids.map((r) => refs.get(r)))].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(j - i >= 2 ? `${nums[i]}–${nums[j]}` : nums.slice(i, j + 1).join(","));
      i = j;
    }
    return out.join(",");
  };
  return { refs, tables, notes, citationLabel };
}

// Find and replace across the whole composed document, in one transaction (one undo step).
export function findAll(doc, needle) {
  const hits = [];
  doc.descendants((node, pos) => {
    if (!node.isText || node.marks.some((m) => m.type.name === "deletion")) return;
    let i = node.text.indexOf(needle);
    while (i >= 0) {
      hits.push({ from: pos + i, to: pos + i + needle.length });
      i = node.text.indexOf(needle, i + needle.length);
    }
  });
  return hits;
}
export function replaceAll(state, needle, replacement) {
  const tr = state.tr;
  for (const hit of findAll(state.doc, needle).reverse()) tr.insertText(replacement, hit.from, hit.to);
  return tr;
}
