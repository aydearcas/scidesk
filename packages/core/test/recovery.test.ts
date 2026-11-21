// Recovery after an unexpected close: the journal of unsaved changes (record 0039).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DocumentFile, PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject, saveDocument } from "../src/project.ts";
import { loadSnapshot } from "../src/snapshot.ts";
import { MemoryStore, Recovery, safeKey } from "../src/recovery.ts";
import { NodeStore } from "../src/node-fs.ts";

const BODY = "manuscript/article.scidoc";
const text = (f: DocumentFile) => JSON.stringify(f.doc);

/** The body with one more paragraph, as the editor would have it. */
function edited(file: DocumentFile, words: string): DocumentFile {
  const f = structuredClone(file);
  (f.doc as PMNode).content!.push({ type: "paragraph", attrs: { id: `b-${words.length.toString().padStart(10, "0")}`, lang: null }, content: [{ type: "text", text: words }] });
  return f;
}

async function setup() {
  const fs = new MemoryFs();
  const p = await createDemoProject(fs);
  const store = new MemoryStore();
  return { fs, p, store, r: new Recovery(store, p), body: p.articles[0].documents.get(BODY)! };
}

describe("recovery", () => {
  it("gives back changes that never reached the disk", async () => {
    const { fs, p, store, r, body } = await setup();
    await r.record("main", BODY, edited(body, "Una frase que no llegó a guardarse."));
    expect([...store.entries.keys()]).toEqual([`projects/${p.manifest.id}/recovery/main/${BODY}.json`]);
    // the window closes without saving; the project is opened again
    const again = new Recovery(store, await loadProject(fs));
    const { pending } = await again.pending();
    expect(pending.map((x) => x.state)).toEqual(["clean"]);
    expect(await again.apply(pending[0])).toEqual({ snapshot: null });
    const reloaded = await loadProject(fs);
    expect(text(reloaded.articles[0].documents.get(BODY)!)).toContain("Una frase que no llegó a guardarse.");
    expect(store.entries.size).toBe(0);
  });

  it("offers nothing once the changes are saved, also when the window closed between saving and clearing", async () => {
    const { fs, p, store, r, body } = await setup();
    const f = edited(body, "Guardada.");
    await r.record("main", BODY, f);
    await saveDocument(p, p.articles[0], BODY, f);
    await r.clear("main", BODY);
    expect((await r.pending()).pending).toEqual([]);
    // saved, but closed before clearing: the entry is the disk's content
    await r.record("main", BODY, f);
    const { pending, dropped } = await new Recovery(store, await loadProject(fs)).pending();
    expect(pending).toEqual([]);
    expect(dropped.map((d) => d.reason)).toEqual(["on-disk"]);
    expect(store.entries.size).toBe(0);
  });

  it("when the file changed on disk since, keeps the disk's version in a snapshot before recovering", async () => {
    const { fs, p, store, r, body } = await setup();
    await r.record("main", BODY, edited(body, "Mía, sin guardar."));
    // meanwhile another computer saved something else (a synchronised folder)
    await saveDocument(p, p.articles[0], BODY, edited(body, "Del otro equipo."));
    const again = new Recovery(store, await loadProject(fs));
    const { pending } = await again.pending();
    expect(pending[0].state).toBe("disk-changed");
    const { snapshot } = await again.apply(pending[0]);
    const snap = await loadSnapshot(fs, snapshot!);
    expect(snap.files[`articles/main/${BODY}`]).toContain("Del otro equipo.");
    const now = text((await loadProject(fs)).articles[0].documents.get(BODY)!);
    expect(now).toContain("Mía, sin guardar.");
    expect(now).not.toContain("Del otro equipo.");
  });

  it("drops entries that are not valid, of an article that is gone or of another project", async () => {
    const { p, store, r, body } = await setup();
    const prefix = `projects/${p.manifest.id}/recovery/`;
    await store.write(`${prefix}main/${BODY}.json`, "{ not json");
    await store.write(`${prefix}main/manuscript/abstract.scidoc.json`, JSON.stringify({ format: "scidesk-recovery", version: 1, project: p.manifest.id, article: "main", path: "manuscript/abstract.scidoc", base: null, recorded: "2026-11-21T10:00:00Z", file: { schemaVersion: 1, doc: { type: "nonsense" } } }));
    const other = edited(body, "x");
    await store.write(`${prefix}gone/${BODY}.json`, JSON.stringify({ format: "scidesk-recovery", version: 1, project: p.manifest.id, article: "gone", path: BODY, base: null, recorded: "2026-11-21T10:00:00Z", file: other }));
    await store.write(`projects/00000000-0000-4000-8000-000000000000/recovery/main/${BODY}.json`, "{}");
    const { pending, dropped } = await r.pending();
    expect(pending).toEqual([]);
    expect(dropped.map((d) => d.reason).sort()).toEqual(["gone", "invalid", "invalid"]);
    expect(await store.list("")).toEqual(["projects/00000000-0000-4000-8000-000000000000/recovery/main/manuscript/article.scidoc.json"]);
  });

  it("keys stay inside the store; on disk they are files of the app's data folder", async () => {
    for (const bad of ["../x", "a/../b", "/abs", "C:/x", "a\\b", "a//b", ""]) expect(() => safeKey(bad), bad).toThrow();
    const dir = mkdtempSync(join(tmpdir(), "scidesk-store-"));
    try {
      const s = new NodeStore(dir);
      await s.write("projects/p/recovery/main/x.json", "{}");
      expect(await s.list("projects/p/")).toEqual(["projects/p/recovery/main/x.json"]);
      expect(await s.read("projects/p/recovery/main/x.json")).toBe("{}");
      await s.remove("projects/p/recovery/main/x.json");
      await s.remove("projects/p/recovery/main/x.json"); // twice is fine
      expect(await s.list("")).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
