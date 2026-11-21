// Snapshots of the history (record 0013): one file per snapshot, written once and never
// changed. PROVISIONAL FORMAT for the vertical slice: a gzip of a JSON with the article's
// files as they were. The final format (only the content that is new since earlier
// snapshots) is phase 1's; it stays behind this interface.
import { newId, stableStringify } from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { now, type Project } from "./project.ts";

export interface Snapshot {
  format: "scidesk-snapshot-provisional";
  id: string;
  created: string;
  article: string;
  label: string;
  /** Files of the article and the shared files it uses, by path from the project root. */
  files: Record<string, string>;
}

const path = (id: string) => `.scidesk/history/${id}.snapshot`;

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** Saves the article as it is on disk now (shared library and people included). */
export async function saveSnapshot(project: Project, folder: string, label: string): Promise<Snapshot> {
  const paths = (await project.fs.list(`articles/${folder}`)).filter((p) => /\.(json|scidoc|scitable|scifigure)$/.test(p) && !p.includes("/rounds/") && !p.includes("/proposals/"));
  const files: Record<string, string> = {};
  for (const p of [...paths, "references/library.json", "people/people.json", project.manifestPath]) {
    const t = await project.fs.readText(p);
    if (t !== null) files[p] = t;
  }
  const snap: Snapshot = { format: "scidesk-snapshot-provisional", id: newId("s"), created: now(), article: folder, label, files };
  await project.fs.write(path(snap.id), await gzip(stableStringify(snap)));
  return snap;
}

export async function loadSnapshot(fs: ProjectFs, id: string): Promise<Snapshot> {
  const bytes = await fs.readBytes(path(id));
  if (!bytes) throw new Error(`snapshot ${id} is not in .scidesk/history/`);
  return JSON.parse(await gunzip(bytes)) as Snapshot;
}
