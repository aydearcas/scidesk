// Where the core's files come from. In the Tauri window: commands of the Rust side, which
// only reach inside the project folder the user opened. In a plain browser (the preview
// used to test the interface): a project in memory, with the Tauri side simulated (PLAN 6.1).
import { MemoryFs, bundledResources, type LocalStore, type ProjectFs, type TypstCompiler } from "@scidesk/core";
import type { JournalProfileFile } from "@scidesk/formats";
import localeEs from "@scidesk/core/assets/locales-es-ES.xml?raw";
import localeEn from "@scidesk/core/assets/locales-en-US.xml?raw";
import templateUrl from "@scidesk/core/assets/reference.dotx?url";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const ASSETS: Record<string, string> = {
  "locales-es-ES.xml": localeEs,
  "locales-en-US.xml": localeEn,
};
// each style is its own chunk, loaded the first time it is used (record 0037)
const STYLES = import.meta.glob<string>("../../../packages/core/assets/styles/*.csl", { query: "?raw", import: "default" });
export const resources = bundledResources(
  async (file) => {
    if (file.startsWith("styles/")) {
      const load = Object.entries(STYLES).find(([k]) => k.endsWith(`/${file}`))?.[1];
      if (load) return load();
    }
    const text = ASSETS[file];
    if (text === undefined) throw new Error(`asset ${file} not bundled`);
    return text;
  },
  async () => new Uint8Array(await (await fetch(templateUrl)).arrayBuffer()),
);

type Invoke = typeof import("@tauri-apps/api/core").invoke;

class TauriFs implements ProjectFs {
  constructor(private invoke: Invoke) {}
  async readText(path: string) {
    const b = await this.readBytes(path);
    return b ? new TextDecoder().decode(b) : null;
  }
  async readBytes(path: string) {
    try {
      return new Uint8Array((await this.invoke("read_file", { path })) as ArrayBuffer);
    } catch (e) {
      if (String(e) === "ENOENT") return null;
      throw e;
    }
  }
  async write(path: string, data: string | Uint8Array) {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    // the body goes raw; the path in a header (Tauri 2 raw requests)
    await this.invoke("write_file", bytes, { headers: { "x-path": encodeURIComponent(path) } });
  }
  async list(dir: string) {
    return (await this.invoke("list_files", { dir })) as string[];
  }
}

/** A project folder the window works in: its file system, its name and where it is. */
export interface Place { fs: ProjectFs; name: string; path: string }
const tauri = async () => (await import("@tauri-apps/api/core")).invoke;
const place = (invoke: Invoke, r: { name: string; path: string }): Place => ({ fs: new TauriFs(invoke), name: r.name, path: r.path });

/** Asks for a project folder (Tauri) and gives its file system, name and path. */
export async function openFolder(): Promise<Place | null> {
  const invoke = await tauri();
  const r = (await invoke("open_project")) as { name: string; path: string } | null;
  return r ? place(invoke, r) : null;
}

/** Reopens a recent project's folder; "missing" if it is not there (not synchronised yet, or moved). */
export async function openRecentFolder(path: string): Promise<Place | "missing"> {
  const invoke = await tauri();
  try {
    return place(invoke, (await invoke("open_recent", { path })) as { name: string; path: string });
  } catch (e) {
    if (String(e) === "ENOENT") return "missing";
    throw e;
  }
}
export async function foldersExist(paths: string[]): Promise<boolean[]> {
  return (await (await tauri())("recent_exists", { paths })) as boolean[];
}
export async function forgetFolder(path: string) { await (await tauri())("forget_folder", { path }); }

// ---------------------------------------------------------------- a new project's folder (record 0048)

/** The user's Documents folder, where the wizard proposes new projects. */
export async function defaultLocation(): Promise<string | null> {
  return (await (await tauri())("default_location")) as string | null;
}
/** Asks for the folder that will hold a new project. */
export async function pickLocation(): Promise<string | null> {
  return (await (await tauri())("pick_location")) as string | null;
}
/** Whether location/name can hold a new project. */
export async function folderState(location: string, name: string): Promise<"free" | "empty" | "used" | "bad"> {
  try { return (await (await tauri())("folder_state", { location, name })) as "free" | "empty" | "used"; } catch { return "bad"; }
}
/** Creates location/name (or takes it if empty) and opens it. */
export async function createProjectFolder(location: string, name: string): Promise<Place> {
  const invoke = await tauri();
  return place(invoke, (await invoke("create_project_folder", { location, name })) as { name: string; path: string });
}

// ---------------------------------------------------------------- journals and styles for a new project

const JOURNALS = import.meta.glob<string>("../../../packages/core/assets/journals/*.json", { query: "?raw", import: "default" });
/** A journal profile included with SciDesk (assets/journals/<file>). */
export async function journalProfile(file: string): Promise<JournalProfileFile> {
  const load = Object.entries(JOURNALS).find(([k]) => k.endsWith(`/${file}`))?.[1];
  if (!load) throw new Error(`journal profile ${file} not bundled`);
  return JSON.parse(await load()) as JournalProfileFile;
}
/** A bundled style's text by its file name (a journal's own style is copied into the project). */
export async function styleText(file: string): Promise<string> {
  const load = Object.entries(STYLES).find(([k]) => k.endsWith(`/${file}`))?.[1];
  if (!load) throw new Error(`style ${file} not bundled`);
  return load();
}

export const memoryFs = () => new MemoryFs();

// ---------------------------------------------------------------- this computer's store (R26)

class TauriStore implements LocalStore {
  constructor(private invoke: Invoke) {}
  async read(key: string) { return (await this.invoke("local_read", { key })) as string | null; }
  async write(key: string, text: string) { await this.invoke("local_write", { key, text }); }
  async remove(key: string) { await this.invoke("local_remove", { key }); }
  async list(prefix: string) { return (await this.invoke("local_list", { prefix })) as string[]; }
}

/** localStorage, for the browser preview; every access may throw (private window, quota). */
function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
class BrowserStore implements LocalStore {
  constructor(private prefix: string) {}
  async read(key: string) { return storage()?.getItem(this.prefix + key) ?? null; }
  async write(key: string, text: string) { storage()?.setItem(this.prefix + key, text); }
  async remove(key: string) { storage()?.removeItem(this.prefix + key); }
  async list(prefix: string) {
    const s = storage();
    if (!s) return [];
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(this.prefix + prefix)) out.push(k.slice(this.prefix.length));
    }
    return out.sort();
  }
}

/** Where the journal of unsaved changes lives: the app's local data folder, or the browser's storage. */
export async function localStore(): Promise<LocalStore> {
  if (inTauri) return new TauriStore((await import("@tauri-apps/api/core")).invoke);
  return new BrowserStore("scidesk-local:");
}

// ---------------------------------------------------------------- the browser preview's project

const PREVIEW = "scidesk-preview:";
const b64 = (bytes: Uint8Array) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * The preview's project kept in the browser's storage, so that reloading the page is like
 * reopening the project after the window closed (to try the recovery). Files that do not
 * fit stay in memory only.
 */
class PreviewFs extends MemoryFs {
  constructor() {
    super();
    const s = storage();
    if (!s) return;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREVIEW)) this.files.set(k.slice(PREVIEW.length), unb64(s.getItem(k)!));
    }
  }
  override async write(path: string, data: string | Uint8Array) {
    await super.write(path, data);
    try { storage()?.setItem(PREVIEW + path, b64((await this.readBytes(path))!)); } catch { /* quota: memory only */ }
  }
}

export const hasPreviewProject = () => {
  const s = storage();
  if (!s) return false;
  for (let i = 0; i < s.length; i++) if (s.key(i)?.startsWith(PREVIEW)) return true;
  return false;
};
export function previewFs(fresh: boolean): ProjectFs {
  const s = storage();
  // the keys first, then removed: removing while walking by index can skip keys (the
  // browser may reorder them), and a file left behind made "the folder is not empty"
  if (fresh && s) {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k?.startsWith(PREVIEW)) keys.push(k); }
    for (const k of keys) s.removeItem(k);
  }
  return new PreviewFs();
}

// ---------------------------------------------------------------- PDF (record 0040)

/** Typst in Rust, in the app; null in the browser preview, which has no Rust side. */
export async function typstCompiler(): Promise<TypstCompiler | null> {
  if (!inTauri) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return async (bundle, standard) => {
    const files = Object.fromEntries(Object.entries(bundle.files).map(([k, v]) => [k, b64(v)]));
    const r = (await invoke("compile_pdf", { source: bundle.source, files, standard })) as { pdf: string; pages: number; warnings: string[] };
    return { pdf: unb64(r.pdf), pages: r.pages, warnings: r.warnings };
  };
}
