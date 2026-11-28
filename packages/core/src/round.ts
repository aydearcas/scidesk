// Importing a returned copy into the review round of the version it was sent from
// (format spec, section 7): the copy is kept in rounds/<round>/copies/, its proposals in
// rounds/<round>/proposals/<copy>.json. The round is the one whose sent snapshot the copy
// names (SciDesk property, or the _SDs_ bookmark if Word lost the properties).
import { newId, stableStringify, validate, type PMNode, type ProposalSetFile, type RoundFile } from "@scidesk/formats";
import { readDocx, rejectedText, settleSentChanges, type DocxRead } from "./docx-read.ts";
import { revisionKey, sentRevisionKeys } from "./docx-export.ts";
import { now, type Project } from "./project.ts";
import { baseBlocks, GENERATED, GENERATED_LEAD, proposalsFromCopy, type BaseBlock, type SentComment } from "./proposals.ts";
import { listSnapshots, loadSnapshot, type SnapshotInfo } from "./snapshot.ts";

async function sha256(bytes: Uint8Array) {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "copia";

/**
 * The text blocks of the version sent, in the order the export wrote them: titles, the
 * abstract, then the body with each table and figure where it is cited (record 0021).
 */
export function sentBlocks(files: Record<string, string>, folder: string): BaseBlock[] {
  const prefix = `articles/${folder}/`;
  const doc = (p: string) => (files[prefix + p] ? (JSON.parse(files[prefix + p]).doc as PMNode) : null);
  const body = doc("manuscript/article.scidoc");
  if (!body) throw new Error("the snapshot has no article.scidoc");
  const abstract = doc("manuscript/abstract.scidoc");
  const nodes = body.content ?? [];
  const out: BaseBlock[] = [];
  for (const n of nodes) if (n.type === "title") out.push(...baseBlocks("manuscript/article.scidoc", n));
  if (abstract) out.push(...baseBlocks("manuscript/abstract.scidoc", abstract));
  for (const n of nodes) {
    if (n.type === "title") continue;
    // a table or figure deleted with tracking went as deleted text (record 0095): not in the sent blocks
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type === "tableRef" || n.type === "figureRef") {
      const part = doc(n.attrs!.src as string);
      if (part) out.push(...baseBlocks(n.attrs!.src as string, part));
    } else out.push(...baseBlocks("manuscript/article.scidoc", n));
  }
  return out;
}

export interface ImportResult {
  round: string; roundFolder: string; copyFile: string; proposalsFile: string; set: ProposalSetFile;
  /**
   * How the version sent was found: the copy's SciDesk property, its _SDs_ bookmark, or, when
   * Word lost both (record 0101), by comparing its text with the article's versions.
   */
  foundBy: "property" | "bookmark" | "content";
  /** The version the copy came from (with how much of the copy's text it matches, found by content). */
  sent: SnapshotInfo & { score?: number };
}

/** Why a copy cannot be imported, for the window to say it in the user's language. */
export class CopyError extends Error {
  readonly code: "other-project" | "other-article" | "no-version";
  constructor(code: CopyError["code"], message: string) { super(message); this.code = code; }
}

const flat = (s: string) => s.normalize("NFC").replace(/[\u00a0\u2009\u202f\s]+/g, " ").trim();

/**
 * Plan B (records 0029 and 0101): the version a copy came from when it does not say so. Each
 * version of the article is scored by how much of the copy's text (its paragraphs with the
 * tracked changes rejected, or accepted) is exactly a block of it; the best one wins, those
 * sent to co-authors first and then the newest. Null when none matches half of the copy.
 */
export async function findSentVersion(project: Project, folder: string, read: DocxRead): Promise<(SnapshotInfo & { score: number }) | null> {
  // each paragraph with its tracked changes rejected and accepted, without the text the export writes itself
  const copy = read.paragraphs
    .map((p) => [flat(rejectedText(p)), flat(p.segments.filter((x) => x.kind !== "del").map((x) => x.text).join(""))])
    .filter(([a, b]) => (a || b) && !GENERATED.has(a) && !/^\[figures\/[^\]]+\]$/.test(a))
    .map((vs) => [...new Set(vs.flatMap((v) => [v, v.replace(GENERATED_LEAD, "")]))].filter(Boolean));
  const total = copy.reduce((n, vs) => n + Math.max(...vs.map((v) => v.length)), 0);
  if (!total) return null;
  let best: (SnapshotInfo & { score: number }) | null = null;
  const rank = (s: SnapshotInfo) => (s.reason === "coauthors-docx" ? 2 : s.kind === "sent" ? 1 : 0);
  for (const info of await listSnapshots(project.fs, folder)) {
    let blocks: BaseBlock[];
    try { blocks = sentBlocks((await loadSnapshot(project.fs, info.id)).files, folder); } catch { continue; }
    const left = new Map<string, number>();
    for (const b of blocks) { const k = flat(b.text); if (k) left.set(k, (left.get(k) ?? 0) + 1); }
    let matched = 0;
    for (const vs of copy) {
      const hit = vs.find((x) => (left.get(x) ?? 0) > 0);
      if (!hit) continue;
      left.set(hit, left.get(hit)! - 1);
      matched += Math.max(...vs.map((v) => v.length));
    }
    const score = matched / total;
    // newest first: a later one wins only with a better score, or the same one and a better kind
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && rank(info) > rank(best))) best = { ...info, score };
  }
  return best && best.score >= 0.5 ? best : null;
}

export async function importCopy(project: Project, folder: string, bytes: Uint8Array, opts: { fileName: string; returnedBy: { name: string; person?: string } }): Promise<ImportResult> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const raw = await readDocx(bytes);
  const prop = raw.scidesk as { project?: string; article?: string; snapshot?: string } | null;
  if (prop?.project && prop.project !== project.manifest.id) throw new CopyError("other-project", "the copy comes from another project");
  if (prop?.article && prop.article !== art.article.id) throw new CopyError("other-article", "the copy comes from another article");
  // the version it came from: as the copy says, or (plan B, record 0101) by its text
  let foundBy: ImportResult["foundBy"] = prop?.snapshot ? "property" : "bookmark";
  let snapshotId = prop?.snapshot ?? raw.snapshotBookmark;
  let score: number | undefined;
  if (snapshotId && !(await listSnapshots(project.fs, folder)).some((s) => s.id === snapshotId)) snapshotId = null;
  if (!snapshotId) {
    const found = await findSentVersion(project, folder, raw);
    if (!found) throw new CopyError("no-version", "the copy does not say which version it was sent from, and no version of the article matches its text");
    snapshotId = found.id;
    score = found.score;
    foundBy = "content";
  }
  const snapshot = await loadSnapshot(project.fs, snapshotId);
  const base = sentBlocks(snapshot.files, folder);
  // record 0095: the tracked changes that went in the copy are part of what was sent
  const prefix = `articles/${folder}/`;
  const sentDocs = Object.entries(snapshot.files).filter(([f]) => f.startsWith(prefix) && /\.(scidoc|scitable|scifigure)$/.test(f)).map(([, t]) => JSON.parse(t) as { changes?: Record<string, { author: { name: string }; date: string }>; comments?: Record<string, SentComment> });
  const read = settleSentChanges(raw, sentRevisionKeys(sentDocs, snapshot.created), revisionKey);
  // record 0096: and so did its comments
  const sentComments = Object.assign({}, ...sentDocs.map((d) => d.comments ?? {})) as Record<string, SentComment>;

  // the round of that snapshot, or a new one
  const { round, folder: roundFolder } = await roundFor(project, folder, snapshotId, snapshot.created);
  // record 0102: a copy from someone the round was sent to is theirs (their person, if known)
  const recipient = (round.recipients ?? []).find((r) => sameName(r.name, opts.returnedBy.name));
  if (recipient?.person && !opts.returnedBy.person) opts = { ...opts, returnedBy: { ...opts.returnedBy, person: recipient.person } };
  const copyId = newId("cp");
  let name = slug(opts.fileName.replace(/\.docx$/i, ""));
  if (round.copies.some((c) => c.file === `copies/${name}.docx`)) name = `${name}-${copyId.slice(3, 7)}`;
  const copyFile = `copies/${name}.docx`;
  round.copies.push({ id: copyId, file: copyFile, returnedBy: opts.returnedBy, received: now(), sha256: await sha256(bytes) });

  const set = proposalsFromCopy(base, read, { round: round.id, copy: copyId, file: `${roundFolder.slice(`articles/${folder}/`.length)}${copyFile}`, returnedBy: opts.returnedBy, snapshot: snapshotId, sentComments });
  const issues = validate("round", round);
  if (issues.length) throw new Error(`invalid round: ${issues[0].message}`);
  await project.fs.write(roundFolder + copyFile, bytes);
  const proposalsFile = `${roundFolder}proposals/${name}.json`;
  await project.fs.write(proposalsFile, stableStringify(set));
  await project.fs.write(roundFolder + "round.json", stableStringify(round));
  const { files: _files, format: _format, ...sent } = snapshot;
  return { round: round.id, roundFolder, copyFile: roundFolder + copyFile, proposalsFile, set, foundBy, sent: { ...sent, ...(score !== undefined ? { score } : {}) } };
}

// ---------------------------------------------------------------- the rounds and their board (record 0102)

/** Two names of one person, whatever their accents, case and spaces. */
export const sameName = (a: string, b: string) => {
  const n = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return n(a) === n(b);
};

export interface RoundEntry { folder: string; round: RoundFile }

/** The article's rounds, the oldest first, with the folder of each one (ending in "/"). */
export async function roundsOf(project: Project, folder: string): Promise<RoundEntry[]> {
  const out: RoundEntry[] = [];
  for (const f of (await project.fs.list(`articles/${folder}/rounds/`)).filter((p) => p.endsWith("/round.json"))) {
    try { out.push({ folder: f.slice(0, -"round.json".length), round: JSON.parse((await project.fs.readText(f))!) as RoundFile }); } catch { /* not a round */ }
  }
  return out.sort((a, b) => a.round.sent.date.localeCompare(b.round.sent.date));
}

/** The round of the version sent `snapshot`, or a new one ("Ronda N", not written yet). */
export async function roundFor(project: Project, folder: string, snapshot: string, date: string): Promise<{ round: RoundFile; folder: string; created: boolean }> {
  const all = await roundsOf(project, folder);
  const found = all.find((r) => r.round.sent.snapshot === snapshot);
  if (found) return { ...found, created: false };
  let n = all.length + 1;
  const taken = new Set(all.map((r) => r.folder));
  while (taken.has(`articles/${folder}/rounds/ronda-${n}/`)) n++;
  return { round: { schemaVersion: 1, id: newId("rd"), name: `Ronda ${n}`, sent: { snapshot, date }, copies: [] }, folder: `articles/${folder}/rounds/ronda-${n}/`, created: true };
}

/** Who signs the article, but the user: whom a round is sent to unless the user says otherwise. */
export function defaultRecipients(project: Project, folder: string, me = ""): NonNullable<RoundFile["recipients"]> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) return [];
  const out: NonNullable<RoundFile["recipients"]> = [];
  for (const a of art.authors?.authors ?? []) {
    const p = project.people.people.find((x) => x.id === a.person);
    if (!p) continue;
    const name = p.kind === "group" ? p.name : `${p.given} ${p.family}`.trim();
    if (me && sameName(name, me)) continue;
    out.push({ name, person: p.id, ...(p.email ? { email: p.email } : {}) });
  }
  return out;
}

/**
 * Notes a round for a version sent to co-authors (made after the export, or the one there
 * is), with whom it was sent to and the deadline, if any; written at once.
 */
export async function noteRound(project: Project, folder: string, snapshot: string, date: string, patch: { name?: string; recipients?: RoundFile["recipients"]; deadline?: string | null }): Promise<RoundEntry> {
  const { round, folder: dir } = await roundFor(project, folder, snapshot, date);
  const next: RoundFile = { ...round };
  if (patch.name?.trim()) next.name = patch.name.trim();
  if (patch.recipients) next.recipients = patch.recipients;
  if (patch.deadline === null) delete next.deadline; else if (patch.deadline) next.deadline = patch.deadline;
  const issues = validate("round", next);
  if (issues.length) throw new Error(`invalid round: ${issues[0].path} ${issues[0].message}`);
  await project.fs.write(`${dir}round.json`, stableStringify(next));
  return { folder: dir, round: next };
}

/** One line of the round board: someone the round was sent to, or someone who returned a copy anyway. */
export interface BoardRow {
  name: string;
  person?: string;
  email?: string;
  /** Sent to them (false: a copy came back from someone not on the list). */
  sent: boolean;
  /** Their copies in this round, the latest last. */
  copies: RoundFile["copies"];
  /** Proposals of their copies still to decide (null when their proposals are not loaded). */
  pending: number | null;
}

/**
 * The round board (record 0102; R5): each person the round was sent to, with the copies they
 * returned and how many of their proposals are left to decide, and then whoever returned a
 * copy without being on the list. `pendingOf` counts the pending proposals of a copy.
 */
export function roundBoard(round: RoundFile, pendingOf: (copy: string) => number | null): BoardRow[] {
  const mine = (c: RoundFile["copies"][number], r: { name: string; person?: string }) => (r.person && c.returnedBy.person === r.person) || sameName(c.returnedBy.name, r.name);
  const rows: BoardRow[] = [];
  const claimed = new Set<string>();
  for (const r of round.recipients ?? []) {
    const copies = round.copies.filter((c) => !claimed.has(c.id) && mine(c, r)).sort((a, b) => a.received.localeCompare(b.received));
    copies.forEach((c) => claimed.add(c.id));
    rows.push({ name: r.name, ...(r.person ? { person: r.person } : {}), ...(r.email ? { email: r.email } : {}), sent: true, copies, pending: sum(copies.map((c) => pendingOf(c.id))) });
  }
  for (const c of round.copies) {
    if (claimed.has(c.id)) continue;
    const row = rows.find((x) => !x.sent && mine(c, x));
    if (row) { row.copies.push(c); row.pending = sum([row.pending, pendingOf(c.id)]); }
    else rows.push({ name: c.returnedBy.name, ...(c.returnedBy.person ? { person: c.returnedBy.person } : {}), sent: false, copies: [c], pending: pendingOf(c.id) });
  }
  return rows;
}
const sum = (xs: (number | null)[]) => (xs.some((x) => x === null) ? null : xs.reduce<number>((a, b) => a + (b ?? 0), 0));
