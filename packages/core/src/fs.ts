// The only way the core touches files. Paths are relative to the project root, with forward
// slashes; implementations refuse anything that leaves the root (PLAN 6.6). The same core
// runs in Node (CLI, tests: node-fs.ts), in the app (Tauri commands) and in memory.
export interface ProjectFs {
  /** Text of a file, or null if it does not exist. */
  readText(path: string): Promise<string | null>;
  /** Bytes of a file, or null if it does not exist. */
  readBytes(path: string): Promise<Uint8Array | null>;
  /** Writes atomically: a temporary file next to it, then a rename (R25). Creates folders. */
  write(path: string, data: string | Uint8Array): Promise<void>;
  /** Every file under a folder ("" for the root), recursively, as relative paths. */
  list(dir: string): Promise<string[]>;
  /** Removes a file; nothing if it is not there. Only for what SciDesk itself just created (a pasted table undone). */
  remove(path: string): Promise<void>;
}

/** Normalises a relative path and refuses absolute paths and "..". */
export function safePath(path: string): string {
  const p = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!p || p.startsWith("/") || /^[A-Za-z]:/.test(p) || p.split("/").some((s) => s === ".." || s === "")) {
    throw new Error(`path outside the project: ${path}`);
  }
  return p;
}

/** In memory: tests and the browser preview of the app. */
export class MemoryFs implements ProjectFs {
  readonly files = new Map<string, Uint8Array>();
  constructor(initial: Record<string, string | Uint8Array> = {}) {
    for (const [k, v] of Object.entries(initial)) this.files.set(safePath(k), typeof v === "string" ? new TextEncoder().encode(v) : v);
  }
  async readText(path: string) {
    const b = this.files.get(safePath(path));
    return b ? new TextDecoder().decode(b) : null;
  }
  async readBytes(path: string) {
    return this.files.get(safePath(path)) ?? null;
  }
  async write(path: string, data: string | Uint8Array) {
    this.files.set(safePath(path), typeof data === "string" ? new TextEncoder().encode(data) : data);
  }
  async list(dir: string) {
    const prefix = dir ? safePath(dir) + "/" : "";
    return [...this.files.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
  async remove(path: string) {
    this.files.delete(safePath(path));
  }
}
