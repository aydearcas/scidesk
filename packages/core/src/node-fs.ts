// ProjectFs on the disk, for the CLI and the tests (Node only).
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { safePath, type ProjectFs } from "./fs.ts";
import { safeKey, type LocalStore } from "./recovery.ts";
import type { TypstCompiler } from "./typst-export.ts";
import type { Rasterizer } from "./docx-export.ts";

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
  async remove(path: string) {
    await rm(this.abs(path), { force: true });
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
  return bundledResources((file) => readFile(new URL(file, dir), "utf8"), async (file) => new Uint8Array(await readFile(new URL(file, dir))));
}

/** A bundled asset as text: "styles/x.csl", "journals/x.json" (Node only). */
export const readAsset = (file: string) => readFile(new URL(file, new URL("../assets/", import.meta.url)), "utf8");

/**
 * The app's local data folder of this computer, where the window keeps what never travels
 * with the project (R26): the same folder as Tauri's app_local_data_dir for the app's
 * identifier.
 */
export function appLocalDataDir(): string {
  const id = "app.scidesk.desktop";
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), id);
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", id);
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), id);
}

/** LocalStore on the disk (CLI, tests): keys are relative paths under a folder. */
export class NodeStore implements LocalStore {
  private files: NodeFs;
  constructor(root: string) { this.files = new NodeFs(root); }
  async read(key: string) { return this.files.readText(safeKey(key)); }
  async write(key: string, text: string) { await this.files.write(safeKey(key), text); }
  async remove(key: string) { await rm(join(this.files.root, safeKey(key)), { force: true }); }
  async list(prefix: string) { return (await this.files.list("")).filter((k) => k.startsWith(prefix)); }
}

/**
 * The scidesk-pdf binary (apps/desktop/src-tauri, record 0040): SCIDESK_PDF, or the one
 * cargo built in this repository (release first). Null if there is none.
 */
export function scideskPdfBinary(): string | null {
  const exe = process.platform === "win32" ? "scidesk-pdf.exe" : "scidesk-pdf";
  const target = fileURLToPath(new URL("../../../apps/desktop/src-tauri/target/", import.meta.url));
  for (const p of [process.env.SCIDESK_PDF, join(target, "release", exe), join(target, "debug", exe)]) if (p && existsSync(p)) return p;
  return null;
}

/** Record 0068: a Rasterizer that runs `scidesk-pdf --raster` on a temporary file (Node only). */
export function nodeRasterizer(binary: string): Rasterizer {
  return async (bytes) => {
    const dir = await mkdtemp(join(tmpdir(), "scidesk-raster-"));
    try {
      const input = join(dir, "image"), output = join(dir, "image.png");
      await writeFile(input, bytes);
      const { stdout } = await run(binary, ["--raster", input, output]);
      const size = JSON.parse(stdout.trim().split("\n").pop() ?? "{}") as { width: number; height: number };
      return { png: new Uint8Array(await readFile(output)), width: size.width, height: size.height };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** A TypstCompiler that runs scidesk-pdf on a temporary copy of the bundle (Node only). */
export function nodeTypstCompiler(binary: string): TypstCompiler {
  return async (bundle, standard) => {
    const dir = await mkdtemp(join(tmpdir(), "scidesk-typst-"));
    try {
      await writeFile(join(dir, "main.typ"), bundle.source);
      for (const [p, bytes] of Object.entries(bundle.files)) {
        const full = join(dir, safePath(p));
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, bytes);
      }
      const pdfPath = join(dir, "out.pdf");
      const { stdout } = await run(binary, [join(dir), pdfPath, "--standard", standard]);
      const report = JSON.parse(stdout.trim().split("\n").pop() ?? "{}") as { pages: number; warnings: string[] };
      return { pdf: new Uint8Array(await readFile(pdfPath)), pages: report.pages, warnings: report.warnings ?? [] };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

function run(cmd: string, args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolveRun, reject) => {
    execFile(cmd, args, { maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        let detail = stdout;
        try { detail = (JSON.parse(stdout.trim().split("\n").pop() ?? "{}").errors ?? []).join("; ") || stdout; } catch { /* plain text */ }
        reject(new Error(`Typst could not compile the manuscript: ${detail || err.message}`));
      } else resolveRun({ stdout });
    });
  });
}
