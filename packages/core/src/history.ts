// The history of versions (records 0013 and 0099): comparing two versions of an article by
// paragraphs and words, restoring a whole version, and bringing back a paragraph or a section
// of one as proposals (record 0019: an old version is one more source of proposals, reviewed
// as a co-author's copy).
import { newId, stableStringify, validate, type DocumentFile, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { hunks, pmOffset, type BaseBlock, type Hunk } from "./proposals.ts";
import { now, type Project } from "./project.ts";
import { sentBlocks } from "./round.ts";
import { loadSnapshot, saveSnapshot } from "./snapshot.ts";
import { blocksById } from "./proposal-place.ts";

/** A block in the comparison of two versions, in the order of the newer one. */
export interface VersionBlock {
  id: string;
  file: string;
  /** Same text; changed; only in the newer version; only in the older one. */
  status: "same" | "changed" | "added" | "removed";
  before: string;
  after: string;
  /** For a changed block: what changed, in the older text's offsets. */
  hunks: Hunk[];
  /** The heading of the section it is in (its own text, for a heading), and that heading's block. */
  section: string | null;
  sectionId: string | null;
  heading: boolean;
}

/** The article's files as the history stores them, from what is loaded now. */
export function currentFiles(project: Project, folder: string): Record<string, string> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const out: Record<string, string> = {};
  for (const [p, d] of art.documents) out[`articles/${folder}/${p}`] = JSON.stringify(d);
  return out;
}

/** The ids of the headings in a version's documents. */
function headingIds(files: Record<string, string>, folder: string): Set<string> {
  const out = new Set<string>();
  const visit = (n: PMNode) => { if (n.type === "heading" && n.attrs?.id) out.add(n.attrs.id as string); n.content?.forEach(visit); };
  for (const [p, t] of Object.entries(files)) if (p.startsWith(`articles/${folder}/`) && /\.(scidoc|scitable|scifigure)$/.test(p)) visit((JSON.parse(t) as DocumentFile).doc as PMNode);
  return out;
}

/**
 * The blocks of two versions of an article side by side (blocks keep their id from one version
 * to the next): those of the newer one in its order, with the ones that are only in the older
 * one after the block that came before them.
 */
export function compareVersions(older: Record<string, string>, newer: Record<string, string>, folder: string): VersionBlock[] {
  const a = sentBlocks(older, folder), b = sentBlocks(newer, folder);
  const heads = new Set([...headingIds(older, folder), ...headingIds(newer, folder)]);
  const inA = new Map(a.map((x) => [x.id, x])), inB = new Map(b.map((x) => [x.id, x]));
  const out: VersionBlock[] = [];
  // removed blocks wait for the block they followed
  const removedAfter = new Map<string | null, BaseBlock[]>();
  let prev: string | null = null;
  for (const x of a) {
    if (inB.has(x.id)) { prev = x.id; continue; }
    removedAfter.set(prev, [...(removedAfter.get(prev) ?? []), x]);
  }
  const block = (x: BaseBlock, status: VersionBlock["status"], before: string, after: string): VersionBlock => ({
    id: x.id, file: x.file, status, before, after, hunks: status === "changed" ? hunks(before, after) : [], section: null, sectionId: null, heading: heads.has(x.id),
  });
  for (const x of removedAfter.get(null) ?? []) out.push(block(x, "removed", x.text, ""));
  for (const y of b) {
    const x = inA.get(y.id);
    out.push(x ? block(y, x.text === y.text ? "same" : "changed", x.text, y.text) : block(y, "added", "", y.text));
    for (const r of removedAfter.get(y.id) ?? []) out.push(block(r, "removed", r.text, ""));
  }
  let section: string | null = null, sectionId: string | null = null;
  for (const x of out) {
    if (x.heading) { section = (x.after || x.before).trim() || section; sectionId = x.id; }
    x.section = section;
    x.sectionId = sectionId;
  }
  return out;
}

/** The blocks of the section that starts at heading `id` (up to the next heading), in a comparison. */
export function sectionBlocks(blocks: VersionBlock[], id: string): string[] {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return [];
  const out = [id];
  for (let j = i + 1; j < blocks.length && !blocks[j].heading; j++) out.push(blocks[j].id);
  return out;
}

/**
 * Proposals that bring blocks of an old version back into the text as it is now: the current
 * text is the base (its snapshot `snapshot`), and the old version is the "copy".
 */
export function proposalsFromVersion(current: Record<string, string>, old: Record<string, string>, folder: string, ids: string[], info: { snapshot: string; name: string; version: string }): ProposalSetFile {
  const cur = sentBlocks(current, folder), was = sentBlocks(old, folder);
  const inCur = new Map(cur.map((x) => [x.id, x])), inWas = new Map(was.map((x) => [x.id, x]));
  // the old blocks themselves: what comes back keeps its citations, cross-references and formats
  const oldNodes = blocksById(Object.entries(old).filter(([p]) => p.startsWith(`articles/${folder}/`) && /\.(scidoc|scitable|scifigure)$/.test(p)).map(([, t]) => (JSON.parse(t) as DocumentFile).doc as PMNode));
  const date = now();
  const author = { name: info.name };
  const proposals: ProposalSetFile["proposals"] = [];
  const push = (p: Omit<ProposalSetFile["proposals"][number], "id" | "status" | "decision" | "author" | "tracked" | "date">) =>
    proposals.push({ id: newId("pr"), author, tracked: false, ...p, date, status: "applicable", decision: "pending" });
  for (const id of ids) {
    const c = inCur.get(id), w = inWas.get(id);
    if (c && w) {
      // offsets of the old text: each hunk's place there, after what the earlier ones changed
      let delta = 0;
      for (const h of hunks(c.text, w.text)) {
        const point = h.from === h.to;
        const from = pmOffset(c, h.from, !point), to = point ? from : pmOffset(c, h.to);
        const oldFrom = h.from + delta;
        delta += h.after.length - h.before.length;
        const content = h.after ? inlineSlice(oldNodes.get(id), pmOffset(w, oldFrom, true), pmOffset(w, oldFrom + h.after.length)) : null;
        push({ kind: h.before && h.after ? "replace" : h.before ? "delete" : "insert", anchor: { file: c.file, block: c.id, from, to }, before: h.before, after: h.after, ...(content ? { content } : {}) });
      }
    } else if (w && w.text.trim()) {
      // a paragraph that is not in the text any more: after the block it followed, as far as it is still there
      const i = was.indexOf(w);
      const after = was.slice(0, i).reverse().find((x) => inCur.has(x.id)) ?? null;
      const node = oldNodes.get(id);
      const content = node?.type === "paragraph" ? inlineSlice(node, 0, Infinity) : null;
      push({ kind: "insert-paragraph", anchor: { file: after?.file ?? w.file, after: after?.id ?? null }, before: "", after: w.text, ...(content ? { content } : {}) });
    } else if (c) {
      push({ kind: "delete-paragraph", anchor: { file: c.file, block: c.id, from: 0, to: c.text.length }, before: c.text, after: "" });
    }
  }
  const set: ProposalSetFile = {
    schemaVersion: 1, id: newId("ps"), origin: { kind: "history" }, base: { snapshot: info.snapshot },
    created: date, integrity: "not-checked", hiddenNoise: 0, proposals,
  };
  const issues = validate("proposal-set", set);
  if (issues.length) throw new Error(`invalid proposal set: ${issues[0].path} ${issues[0].message}`);
  return set;
}

/**
 * The inline content of a text block between two ProseMirror offsets, as JSON: deleted text
 * left out, and no tracked-change or comment marks (they belong to the old version). Null when
 * it is plain text, which the proposal's text already says.
 */
function inlineSlice(block: PMNode | undefined, from: number, to: number): PMNode[] | null {
  if (!block?.content) return null;
  const out: PMNode[] = [];
  let pos = 0;
  for (const n of block.content) {
    const size = n.type === "text" ? n.text!.length : 1;
    const a = Math.max(from, pos), b = Math.min(to, pos + size);
    pos += size;
    if (b <= a) continue;
    const marks = n.marks ?? [];
    if (marks.some((m) => m.type === "deletion")) continue;
    const kept = marks.filter((m) => !/^(insertion|deletion|modification|comment)$/.test(m.type));
    const piece: PMNode = n.type === "text" ? { ...n, text: n.text!.slice(a - (pos - size), b - (pos - size)).replaceAll("\u200b", "") } : { ...n };
    if (n.type === "text" && !piece.text) continue;
    if (kept.length) piece.marks = kept; else delete piece.marks;
    out.push(piece);
  }
  return out.length && out.some((n) => n.type !== "text" || n.marks?.length) ? out : null;
}

/** Writes a proposal set that brings blocks of an old version back; its path. */
export async function saveVersionProposals(project: Project, folder: string, set: ProposalSetFile, version: string): Promise<string> {
  const dir = `articles/${folder}/proposals/`;
  const taken = new Set(await project.fs.list(dir));
  let n = 1;
  while (taken.has(`${dir}version-${version}-${n}.json`)) n++;
  const file = `${dir}version-${version}-${n}.json`;
  await project.fs.write(file, stableStringify(set));
  return file;
}

/**
 * Restores an article as it was in a snapshot: its files are written back (files made since
 * stay, out of the text), and the references and people that version uses and are no longer
 * in the shared files are added back, never taking any out (other articles use them). A
 * snapshot of the article as it was before is saved first: restoring that one undoes this.
 */
export async function restoreSnapshot(project: Project, folder: string, id: string, opts: { label?: string; author?: { name: string } } = {}): Promise<{ before: string; written: number }> {
  const snap = await loadSnapshot(project.fs, id);
  if (snap.article !== folder) throw new Error(`snapshot ${id} is of the article ${snap.article}, not ${folder}`);
  const before = await saveSnapshot(project, folder, opts.label ?? "Antes de restaurar una versión", { kind: "auto", reason: "before-restore", ...(opts.author ? { author: opts.author } : {}) });
  let written = 0;
  const prefix = `articles/${folder}/`;
  for (const [p, text] of Object.entries(snap.files)) {
    if (!p.startsWith(prefix)) continue;
    if ((await project.fs.readText(p)) === text) continue;
    await project.fs.write(p, text);
    written++;
  }
  // the shared files: what the version had and is missing now, added back
  const merge = async (p: string, lists: string[]) => {
    const old = snap.files[p];
    const nowText = await project.fs.readText(p);
    if (!old || !nowText) return;
    const was = JSON.parse(old) as Record<string, { id: string }[]>, is = JSON.parse(nowText) as Record<string, { id: string }[]>;
    let added = 0;
    for (const key of lists) {
      const ids = new Set((is[key] ?? []).map((x) => x.id));
      for (const x of was[key] ?? []) if (!ids.has(x.id)) { (is[key] ??= []).push(x); added++; }
    }
    if (added) { await project.fs.write(p, stableStringify(is)); written++; }
  };
  await merge("references/library.json", ["references"]);
  await merge("people/people.json", ["affiliations", "people"]);
  return { before: before.id, written };
}
