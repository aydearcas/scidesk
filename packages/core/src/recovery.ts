// Recovery after an unexpected close (R25, record 0039). While a document has changes that
// are not on disk yet, the window keeps a copy of it in a journal, outside the project
// folder: in the app's local data folder of this computer, under the project's id (R26;
// it is never synchronised). Saving removes the entry. On opening a project, an entry
// that is still there is work that never reached the disk: it is offered back, after
// checking it against the schema and against what is on disk now.
import { formatOfPath, stableStringify, validate, type DocumentFile } from "@scidesk/formats";
import { now, saveDocument, type Project } from "./project.ts";
import { saveSnapshot } from "./snapshot.ts";

/** Storage of this computer, outside the project (the app's local data folder). Keys are relative paths. */
export interface LocalStore {
  read(key: string): Promise<string | null>;
  /** Atomic, like ProjectFs.write. */
  write(key: string, text: string): Promise<void>;
  /** No error if it does not exist. */
  remove(key: string): Promise<void>;
  /** Every key under a prefix ("" for all). */
  list(prefix: string): Promise<string[]>;
}

const KEY_SEGMENT = /^[A-Za-z0-9._-]+$/;
export function safeKey(key: string): string {
  const segs = key.split("/");
  if (!segs.length || segs.some((s) => !KEY_SEGMENT.test(s) || s === "." || s === "..")) throw new Error(`bad local key: ${key}`);
  return key;
}

/** In memory: tests. */
export class MemoryStore implements LocalStore {
  readonly entries = new Map<string, string>();
  async read(key: string) { return this.entries.get(safeKey(key)) ?? null; }
  async write(key: string, text: string) { this.entries.set(safeKey(key), text); }
  async remove(key: string) { this.entries.delete(safeKey(key)); }
  async list(prefix: string) { return [...this.entries.keys()].filter((k) => k.startsWith(prefix)).sort(); }
}

export interface RecoveryEntry {
  format: "scidesk-recovery";
  version: 1;
  project: string;
  article: string;
  /** Path of the document relative to the article folder. */
  path: string;
  /** SHA-256 of the file on disk when the unsaved changes were recorded (null if it did not exist). */
  base: string | null;
  recorded: string;
  file: DocumentFile;
}

export type RecoveryState =
  /** The disk still has what the changes started from: recovering is safe. */
  | "clean"
  /** The file changed on disk since (another computer, a synchronised copy): recovering replaces that. */
  | "disk-changed";

export interface PendingRecovery { key: string; entry: RecoveryEntry; state: RecoveryState }

export async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const sameDoc = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

/** The journal of unsaved changes of one open project. */
export class Recovery {
  readonly store: LocalStore;
  readonly project: Project;
  constructor(store: LocalStore, project: Project) {
    this.store = store;
    this.project = project;
  }

  private prefix() { return `projects/${this.project.manifest.id}/recovery/`; }
  keyOf(article: string, path: string) { return safeKey(`${this.prefix()}${article}/${path}.json`); }

  /** Records the document as it is on screen (call it shortly after each change). */
  async record(article: string, path: string, file: DocumentFile) {
    const disk = await this.project.fs.readText(`articles/${article}/${path}`);
    const entry: RecoveryEntry = {
      format: "scidesk-recovery", version: 1, project: this.project.manifest.id, article, path,
      base: disk === null ? null : await sha256(disk), recorded: now(), file,
    };
    await this.store.write(this.keyOf(article, path), JSON.stringify(entry));
  }

  /** The changes reached the disk: nothing to recover any more. */
  async clear(article: string, path: string) {
    await this.store.remove(this.keyOf(article, path));
  }

  /**
   * Work that never reached the disk, found when the project is opened. Entries that are
   * already on disk, that belong to a document or article that no longer exists, or that
   * are not valid are removed and not offered (`dropped` says which and why).
   */
  async pending(): Promise<{ pending: PendingRecovery[]; dropped: { key: string; reason: "on-disk" | "gone" | "invalid" }[] }> {
    const pending: PendingRecovery[] = [];
    const dropped: { key: string; reason: "on-disk" | "gone" | "invalid" }[] = [];
    for (const key of await this.store.list(this.prefix())) {
      let entry: RecoveryEntry | null = null;
      try { entry = JSON.parse((await this.store.read(key)) ?? "null"); } catch { entry = null; }
      const full = entry ? `articles/${entry.article}/${entry.path}` : "";
      const fmt = full ? formatOfPath(full) : null;
      if (!entry || entry.format !== "scidesk-recovery" || entry.project !== this.project.manifest.id || !fmt || validate(fmt, entry.file, full).length) {
        dropped.push({ key, reason: "invalid" });
        await this.store.remove(key);
        continue;
      }
      if (!this.project.articles.some((a) => a.folder === entry!.article)) {
        dropped.push({ key, reason: "gone" });
        await this.store.remove(key);
        continue;
      }
      const disk = await this.project.fs.readText(full);
      let diskFile: unknown = null;
      try { diskFile = disk === null ? null : JSON.parse(disk); } catch { diskFile = null; }
      if (diskFile && sameDoc((diskFile as DocumentFile).doc, entry.file.doc)) {
        dropped.push({ key, reason: "on-disk" });
        await this.store.remove(key);
        continue;
      }
      const state: RecoveryState = (disk === null ? null : await sha256(disk)) === entry.base ? "clean" : "disk-changed";
      pending.push({ key, entry, state });
    }
    pending.sort((a, b) => a.entry.recorded.localeCompare(b.entry.recorded));
    return { pending, dropped };
  }

  /**
   * Writes the recovered document. When the disk changed since, what is on disk is kept
   * first in a snapshot of the history, so that nothing is lost either way.
   */
  async apply(p: PendingRecovery): Promise<{ snapshot: string | null }> {
    const art = this.project.articles.find((a) => a.folder === p.entry.article);
    if (!art) throw new Error(`no article ${p.entry.article}`);
    const snapshot = p.state === "disk-changed" ? (await saveSnapshot(this.project, art.folder, "Antes de recuperar cambios sin guardar")).id : null;
    await saveDocument(this.project, art, p.entry.path, p.entry.file);
    await this.store.remove(p.key);
    return { snapshot };
  }

  async discard(p: PendingRecovery) {
    await this.store.remove(p.key);
  }
}
