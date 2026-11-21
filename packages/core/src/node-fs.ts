// ProjectFs on the disk, for the CLI and the tests (Node only).
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { safePath, type ProjectFs } from "./fs.ts";

export class NodeFs implements ProjectFs {
  readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  private abs(path: string) {
    const full = resolve(this.root, safePath(path));
    if (full !== this.root && !full.startsWith(this.root + sep)) throw new Error(`path outside the project: ${path}`);
    return full;
  }
  async readText(path: string) {
    try { return await readFile(this.abs(path), "utf8"); } catch (e: any) { if (e.code === "ENOENT") return null; throw e; }
  }
  async readBytes(path: string) {
    try { return new Uint8Array(await readFile(this.abs(path))); } catch (e: any) { if (e.code === "ENOENT") return null; throw e; }
  }
  async write(path: string, data: string | Uint8Array) {
    const full = this.abs(path);
    await mkdir(dirname(full), { recursive: true });
    const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(tmp, data);
      await rename(tmp, full); // atomic on the same volume (R25)
    } catch (e) {
      await rm(tmp, { force: true });
      throw e;
    }
  }
  async list(dir: string) {
    const start = dir ? this.abs(dir) : this.root;
    const out: string[] = [];
    const visit = async (d: string) => {
      let names: string[];
      try { names = await readdir(d); } catch (e: any) { if (e.code === "ENOENT") return; throw e; }
      for (const name of names) {
        if (name === "node_modules") continue;
        const full = join(d, name);
        if ((await stat(full)).isDirectory()) await visit(full);
        else if (!name.endsWith(".tmp")) out.push(relative(this.root, full).split(sep).join("/"));
      }
    };
    await visit(start);
    return out.sort();
  }
}

/** The bundled styles and locales, read from packages/core/assets/ (Node only). */
export async function nodeResources() {
  const { bundledResources } = await import("./resources.ts");
  const dir = new URL("../assets/", import.meta.url);
  return bundledResources((file) => readFile(new URL(file, dir), "utf8"));
}
