// A project library linked to a Zotero collection (records 0007, 0027 and 0052), through
// Zotero's local API (http://127.0.0.1:23119/api/, Zotero 7 or later, read-only here).
// The core does not open connections itself: the window gives it a transport (a command of
// the desktop app, or the dev server's proxy in the browser preview), the command line uses
// fetch. Every answer is checked against the first Zotero-Server-ID, so items from two
// Zotero installations are never mixed.
//
// Syncing reads the whole collection (with its subcollections) and compares by item key:
// a collection of 30 items costs ~60 ms (prototype 5). New items get a SciDesk id of their
// own; changed ones keep it; items no longer in the collection leave the library unless an
// article cites them, in which case they stay (with their last data) and the report says so.
import { newId, stableStringify, type LibraryFile, type ManifestFile } from "@scidesk/formats";
import { normalizeCsl } from "./library-import.ts";
import { referenceUses } from "./library.ts";
import { saveJson, type Project } from "./project.ts";
import type { PMNode } from "@scidesk/formats";

export const ZOTERO_API = "http://127.0.0.1:23119/api";

/** An HTTP answer of Zotero's local API; header names in lower case. */
export interface ZoteroResponse { status: number; headers: Record<string, string>; body: string }
/**
 * Sends a GET for a path under /api ("/users/0/collections?limit=100"), with these headers.
 * Throws when nothing answers (Zotero is closed).
 */
export type ZoteroTransport = (path: string, headers: Record<string, string>) => Promise<ZoteroResponse>;

export type ZoteroProblem = "closed" | "disabled" | "other-zotero" | "http";
export class ZoteroError extends Error {
  readonly code: ZoteroProblem;
  constructor(code: ZoteroProblem, message: string) { super(message); this.code = code; }
}

/** A transport over fetch (the command line, tests against a test Zotero). */
export const fetchTransport = (base = ZOTERO_API): ZoteroTransport => async (path, headers) => {
  const res = await fetch(`${base}${path}`, { headers });
  const h: Record<string, string> = {};
  res.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
  return { status: res.status, headers: h, body: await res.text() };
};

export interface ZoteroCollectionInfo {
  key: string;
  name: string;
  parent: string | null;
  /** Items directly in it (Zotero's count, notes and attachments included). */
  items: number;
}

/** A Zotero item as the local API gives it with format=json&include=data,csljson. */
interface ZoteroItem {
  key: string;
  version: number;
  library?: { type?: string; id?: number };
  data: { dateModified?: string; itemType?: string };
  csljson?: unknown;
}

export class ZoteroLocal {
  serverId: string | null = null;
  requests = 0;
  private readonly transport: ZoteroTransport;
  constructor(transport: ZoteroTransport) { this.transport = transport; }

  async get(path: string, params: Record<string, string | number> = {}): Promise<{ data: unknown; total: number; version: number }> {
    const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    this.requests++;
    let res: ZoteroResponse;
    try {
      res = await this.transport(`${path}${q ? `?${q}` : ""}`, this.serverId ? { "Zotero-Server-ID": this.serverId } : {});
    } catch (e) {
      throw new ZoteroError("closed", `Zotero is not running (${e instanceof Error ? e.message : String(e)})`);
    }
    if (res.status === 403) throw new ZoteroError("disabled", res.body || "Local API is not enabled");
    if (res.status === 412) throw new ZoteroError("other-zotero", "another Zotero answered");
    if (res.status < 200 || res.status >= 300) throw new ZoteroError("http", `${res.status} ${path}: ${res.body.slice(0, 200)}`);
    const id = res.headers["zotero-server-id"] ?? null;
    if (this.serverId && id && id !== this.serverId) throw new ZoteroError("other-zotero", "another Zotero answered");
    this.serverId ??= id;
    return { data: JSON.parse(res.body || "null"), total: Number(res.headers["total-results"] ?? 0), version: Number(res.headers["last-modified-version"] ?? 0) };
  }

  /** Every page of a list (100 per request). */
  async all(path: string, params: Record<string, string | number> = {}): Promise<{ items: unknown[]; version: number }> {
    const out: unknown[] = [];
    let total = Infinity;
    let version = 0;
    for (let start = 0; start < total; start += 100) {
      const r = await this.get(path, { ...params, limit: 100, start });
      const page = Array.isArray(r.data) ? r.data : [];
      out.push(...page);
      total = r.total;
      version = r.version;
      if (!page.length) break;
    }
    return { items: out, version };
  }

  /** The collections of the user's library, as a flat list. */
  async collections(): Promise<ZoteroCollectionInfo[]> {
    const { items } = await this.all("/users/0/collections");
    return (items as { key: string; data: { name: string; parentCollection: string | false }; meta?: { numItems?: number } }[]).map((c) => ({
      key: c.key, name: c.data.name, parent: c.data.parentCollection || null, items: c.meta?.numItems ?? 0,
    }));
  }

  /** The top-level items (no notes or attachments) of a collection and its subcollections. */
  async collectionItems(key: string): Promise<ZoteroItem[]> {
    const cols = await this.collections();
    const children = (k: string): string[] => cols.filter((c) => c.parent === k).flatMap((c) => [c.key, ...children(c.key)]);
    const seen = new Map<string, ZoteroItem>();
    for (const k of [key, ...children(key)]) {
      const { items } = await this.all(`/users/0/collections/${k}/items/top`, { format: "json", include: "data,csljson" });
      for (const it of items as ZoteroItem[]) seen.set(it.key, it);
    }
    return [...seen.values()];
  }
}

/** The collections in tree order, each with its depth and the items under it (subcollections included). */
export function collectionTree(cols: ZoteroCollectionInfo[]): (ZoteroCollectionInfo & { depth: number; path: string[] })[] {
  const out: (ZoteroCollectionInfo & { depth: number; path: string[] })[] = [];
  const known = new Set(cols.map((c) => c.key));
  const byName = (a: ZoteroCollectionInfo, b: ZoteroCollectionInfo) => a.name.localeCompare(b.name);
  const walk = (parent: string | null, depth: number, path: string[]) => {
    for (const c of cols.filter((x) => (parent === null ? x.parent === null || !known.has(x.parent) : x.parent === parent)).sort(byName)) {
      out.push({ ...c, depth, path });
      walk(c.key, depth + 1, [...path, c.name]);
    }
  };
  walk(null, 0, []);
  return out;
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const isoSeconds = (s: string | undefined) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString().replace(/\.\d{3}Z$/, "Z") : now());
const URI = /^https?:\/\/zotero\.org\/(users|groups)\/(local\/)?[^/]+\/items\/[A-Z0-9]{8}$/;
type Entry = LibraryFile["references"][number];

/**
 * A Zotero item as an entry of library.json: its CSL-JSON normalised as any imported
 * reference (journalAbbreviation → container-title-short, years as numbers), what does not
 * fit kept in source.unmapped, and the link that identifies it for good (key, URI).
 */
export function zoteroEntry(item: ZoteroItem, id: string, added: string): Entry {
  let c = item.csljson;
  // the local API gives csljson as text holding a one-element list; the web API, as an object
  if (typeof c === "string") c = JSON.parse(c);
  if (Array.isArray(c)) c = c[0];
  const raw = (c ?? {}) as Record<string, unknown>;
  const library = item.library?.type === "group" ? "group" : "user";
  const uri = typeof raw.id === "string" && URI.test(raw.id) ? raw.id : `http://zotero.org/${library}s/local/${item.library?.id ?? 0}/items/${item.key}`;
  const { csl, unmapped } = normalizeCsl(raw);
  const date = isoSeconds(item.data.dateModified);
  return {
    id, csl: csl as never, added,
    zotero: { key: item.key, uri, library, dateModified: date },
    source: { kind: "zotero", key: uri, date, ...(Object.keys(unmapped).length ? { unmapped } : {}) },
  };
}

export interface ZoteroSyncReport {
  added: { id: string; title: string }[];
  updated: { id: string; title: string }[];
  removed: { id: string; title: string }[];
  /** No longer in the collection, but cited: kept with their last data. */
  keptCited: { id: string; title: string }[];
  /** References in the library after syncing. */
  total: number;
  serverId: string | null;
  /** Whether library.json was written. */
  changed: boolean;
}

/** The collection the project is linked to. */
export const linkedCollection = (project: Project) => (project.manifest.library.mode === "zotero" ? project.manifest.library.zotero : null);

/**
 * Brings the project's library up to date with its Zotero collection and writes
 * library.json when something changed. `live` is what is on screen and not saved, so a
 * reference cited only there is not removed.
 */
export async function syncZoteroLibrary(project: Project, client: ZoteroLocal, live: Record<string, PMNode> = {}): Promise<ZoteroSyncReport> {
  const link = linkedCollection(project);
  if (!link) throw new Error("this project's library is not linked to Zotero");
  const items = await client.collectionItems(link.collection);
  const date = now();
  const old = project.library.references;
  const byKey = new Map(old.filter((r) => r.zotero).map((r) => [r.zotero!.key, r]));
  const title = (r: Entry) => String(r.csl.title ?? r.id);
  const report: ZoteroSyncReport = { added: [], updated: [], removed: [], keptCited: [], total: 0, serverId: client.serverId, changed: false };
  const next: Entry[] = [];
  const inZotero = new Set<string>();
  for (const it of items) {
    inZotero.add(it.key);
    const had = byKey.get(it.key);
    const entry = zoteroEntry(it, had?.id ?? newId("r"), had?.added ?? date);
    if (!had) report.added.push({ id: entry.id, title: title(entry) });
    else if (stableStringify(had.csl) !== stableStringify(entry.csl) || had.zotero?.uri !== entry.zotero?.uri) report.updated.push({ id: entry.id, title: title(entry) });
    else { next.push(had); continue; }
    next.push(entry);
  }
  const uses = referenceUses(project, live);
  for (const r of old) {
    if (r.zotero && inZotero.has(r.zotero.key)) continue;
    if (!r.zotero) { next.push(r); continue; }
    if (uses.has(r.id)) { next.push(r); report.keptCited.push({ id: r.id, title: title(r) }); }
    else report.removed.push({ id: r.id, title: title(r) });
  }
  // the library keeps its order; new items go at the end in Zotero's order
  const position = new Map(old.map((r, i) => [r.id, i]));
  next.sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity));
  report.total = next.length;
  report.changed = report.added.length + report.updated.length + report.removed.length > 0;
  if (report.changed) {
    const library: LibraryFile = { ...project.library, references: next };
    await saveJson(project, "references/library.json", library);
    project.library = library;
  }
  return report;
}

/** The manifest's library block for a project linked to a collection of the user's library. */
export const zoteroLibraryMode = (collection: ZoteroCollectionInfo): ManifestFile["library"] =>
  ({ mode: "zotero", zotero: { library: "user", collection: collection.key, name: collection.name } });
