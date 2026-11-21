// Where the core's files come from. In the Tauri window: commands of the Rust side, which
// only reach inside the project folder the user opened. In a plain browser (the preview
// used to test the interface): a project in memory, with the Tauri side simulated (PLAN 6.1).
import { MemoryFs, bundledResources, type ProjectFs } from "@scidesk/core";
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
