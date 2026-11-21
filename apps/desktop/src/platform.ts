// Where the core's files come from. In the Tauri window: commands of the Rust side, which
// only reach inside the project folder the user opened. In a plain browser (the preview
// used to test the interface): a project in memory, with the Tauri side simulated (PLAN 6.1).
import { MemoryFs, bundledResources, type LocalStore, type ProjectFs } from "@scidesk/core";
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

/** Asks for a project folder (Tauri) and gives its file system and name. */
export async function openFolder(): Promise<{ fs: ProjectFs; name: string } | null> {
  const { invoke } = await import("@tauri-apps/api/core");
  const name = (await invoke("open_project")) as string | null;
  if (!name) return null;
  return { fs: new TauriFs(invoke), name };
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
  if (fresh && s) for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k?.startsWith(PREVIEW)) s.removeItem(k); }
  return new PreviewFs();
}
