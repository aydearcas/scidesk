// Snapshots of the history (records 0013 and 0099): one file per snapshot in
// .scidesk/history/<id>.snapshot, written once and never changed, so syncing the folder only
// ever adds files. Each one is a gzip of a JSON with its name, date, author and kind, the
// article's files by path with the SHA-256 of their content, and only the content that the
// article's previous snapshot did not have: a file that did not change says which snapshot
// holds it (`in`). The provisional format of the vertical slice (every file in full) is
// still read.
import { newId, stableStringify } from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { now, type Project } from "./project.ts";

/** A version the user named, one sent out (an export for co-authors or the journal), or one made by itself. */
export type SnapshotKind = "named" | "sent" | "auto";
/**
 * Why an automatic or sent snapshot was made, for the window to name it in the user's language
 * (the label says it in Spanish, for the command line and older snapshots).
 */
export type SnapshotReason =
  | "coauthors-docx" | "journal-docx" | "journal-pdf" | "daily" | "before-import" | "before-restore"
  | "before-bringing" | "before-recovery" | "before-adapting" | "before-deleting" | "before-journal";

export interface SnapshotInfo {
  id: string;
  created: string;
  article: string;
  label: string;
  kind: SnapshotKind;
  reason?: SnapshotReason;
  author?: { name: string; person?: string };
}
export interface Snapshot extends SnapshotInfo {
  format: "scidesk-snapshot" | "scidesk-snapshot-provisional";
  /** Files of the article and the shared files it uses, by path from the project root. */
  files: Record<string, string>;
}

interface Stored extends SnapshotInfo {
  format: "scidesk-snapshot";
  version: 1;
  /** When it was made, in milliseconds (`created` has seconds), and the article's snapshot before it: their order. */
  at: number;
  prev?: string;
  files: Record<string, { sha: string; in?: string }>;
  contents: Record<string, string>;
}
interface Provisional { format: "scidesk-snapshot-provisional"; id: string; created: string; article: string; label: string; files: Record<string, string> }

const DIR = ".scidesk/history/";
const path = (id: string) => `${DIR}${id}.snapshot`;

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}
async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Snapshot files never change: what was read of each one is kept for the rest of the session. */
const cache = new WeakMap<ProjectFs, Map<string, Stored | Provisional>>();
async function readStored(fs: ProjectFs, id: string): Promise<Stored | Provisional> {
  let byId = cache.get(fs);
  if (!byId) { byId = new Map(); cache.set(fs, byId); }
  const hit = byId.get(id);
  if (hit) return hit;
  const bytes = await fs.readBytes(path(id));
  if (!bytes) throw new Error(`snapshot ${id} is not in .scidesk/history/`);
  const s = JSON.parse(await gunzip(bytes)) as Stored | Provisional;
  byId.set(id, s);
  return s;
}

/** What an older snapshot was made for, from its label. */
function provisionalInfo(s: Provisional): SnapshotInfo {
  const sent = /^DOCX para coautores$/.test(s.label);
  return { id: s.id, created: s.created, article: s.article, label: s.label, kind: sent ? "sent" : "auto", ...(sent ? { reason: "coauthors-docx" as const } : {}) };
}
const infoOf = (s: Stored | Provisional): SnapshotInfo => {
  if (s.format === "scidesk-snapshot-provisional") return provisionalInfo(s);
  const { id, created, article, label, kind, reason, author } = s;
  return { id, created, article, label, kind, ...(reason ? { reason } : {}), ...(author ? { author } : {}) };
};

/** The snapshots of the project (of one article, if given), newest first. */
export async function listSnapshots(fs: ProjectFs, folder?: string): Promise<SnapshotInfo[]> {
  const ids = (await fs.list(DIR)).map((p) => /([^/]+)\.snapshot$/.exec(p)?.[1]).filter((x): x is string => !!x);
  const found: (Stored | Provisional)[] = [];
  for (const id of ids) {
    try {
      const s = await readStored(fs, id);
      if (!folder || s.article === folder) found.push(s);
    } catch { /* a file that cannot be read is not a version */ }
  }
  const at = (s: Stored | Provisional) => (s.format === "scidesk-snapshot" ? s.at : Date.parse(s.created));
  const prev = (s: Stored | Provisional) => (s.format === "scidesk-snapshot" ? s.prev : undefined);
  found.sort((a, b) => at(b) - at(a) || (prev(a) === b.id ? -1 : prev(b) === a.id ? 1 : b.id.localeCompare(a.id)));
  return found.map(infoOf);
}

/**
 * Saves the article as it is on disk now (shared library and people included). Only what
 * changed since the article's latest snapshot is stored again.
 */
export async function saveSnapshot(project: Project, folder: string, label: string, opts: { kind?: SnapshotKind; reason?: SnapshotReason; author?: { name: string; person?: string } } = {}): Promise<Snapshot> {
  const paths = (await project.fs.list(`articles/${folder}`)).filter((p) => /\.(json|scidoc|scitable|scifigure)$/.test(p) && !p.includes("/rounds/") && !p.includes("/proposals/"));
  const files: Record<string, string> = {};
  for (const p of [...paths, "references/library.json", "people/people.json", project.manifestPath]) {
    const t = await project.fs.readText(p);
    if (t !== null) files[p] = t;
  }
  // where each content already is: the article's latest snapshot in this format
  const latest = (await listSnapshots(project.fs, folder))[0];
  const prev = latest ? await readStored(project.fs, latest.id) : null;
  const known = prev?.format === "scidesk-snapshot" ? prev : null;
  const stored: Stored["files"] = {};
  const contents: Stored["contents"] = {};
  for (const [p, text] of Object.entries(files)) {
    const sha = await sha256(text);
    const was = known?.files[p];
    if (was && was.sha === sha) stored[p] = { sha, in: was.in ?? known!.id };
    else { stored[p] = { sha }; contents[sha] = text; }
  }
  // the same files as the latest snapshot, made for the same reason (an export repeated): that one
  if (known && opts.kind !== "named" && known.reason === opts.reason && known.kind === (opts.kind ?? "auto") && Object.keys(contents).length === 0 && Object.keys(known.files).length === Object.keys(stored).length) {
    return loadSnapshot(project.fs, known.id);
  }
  const info: SnapshotInfo = {
    id: newId("s"), created: now(), article: folder, label, kind: opts.kind ?? "auto",
    ...(opts.reason ? { reason: opts.reason } : {}), ...(opts.author?.name ? { author: opts.author } : {}),
  };
  const snap: Stored = { format: "scidesk-snapshot", version: 1, ...info, at: Date.now(), ...(latest ? { prev: latest.id } : {}), files: stored, contents };
  await project.fs.write(path(info.id), await gzip(stableStringify(snap)));
  cache.get(project.fs)?.set(info.id, snap);
  return { ...info, format: "scidesk-snapshot", files };
}

/** A snapshot with every file in full (the contents it shares with older ones read from them). */
export async function loadSnapshot(fs: ProjectFs, id: string): Promise<Snapshot> {
  const s = await readStored(fs, id);
  if (s.format === "scidesk-snapshot-provisional") return { ...provisionalInfo(s), format: s.format, files: s.files };
  const files: Record<string, string> = {};
  for (const [p, f] of Object.entries(s.files)) {
    const holder = f.in ? await readStored(fs, f.in) : s;
    const text = holder.format === "scidesk-snapshot" ? holder.contents[f.sha] : holder.files[p];
    if (text === undefined) throw new Error(`snapshot ${id}: the content of ${p} is not in ${f.in ?? id}`);
    files[p] = text;
  }
  return { ...infoOf(s), format: s.format, files };
}

/** The day's automatic snapshot of the article, if it has none from today (local time) yet. */
export async function ensureDailySnapshot(project: Project, folder: string, today = new Date()): Promise<Snapshot | null> {
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const latest = (await listSnapshots(project.fs, folder))[0];
  if (latest && day(new Date(latest.created)) === day(today)) return null;
  return saveSnapshot(project, folder, "Copia del día", { kind: "auto", reason: "daily" });
}
