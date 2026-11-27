// Record 0099: the history of versions — snapshots that store only what changed, the
// comparison of two versions, restoring one and bringing a paragraph back as a proposal.
import { describe, expect, it } from "vitest";
import { stableStringify, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument, type Project } from "../src/project.ts";
import { ensureDailySnapshot, listSnapshots, loadSnapshot, saveSnapshot } from "../src/snapshot.ts";
import { compareVersions, currentFiles, proposalsFromVersion, restoreSnapshot, sectionBlocks } from "../src/history.ts";
import { blocksById, placeProposal } from "../src/proposal-place.ts";

const BODY = "manuscript/article.scidoc";
/** Changes the text of the body's first paragraph that starts with `start`. */
async function edit(p: Project, start: string, f: (text: string) => string) {
  const art = p.articles[0];
  const file = structuredClone(art.documents.get(BODY)!);
  const para = (file.doc as PMNode).content!.find((n) => n.type === "paragraph" && n.content?.[0]?.text?.startsWith(start))!;
  para.content![0].text = f(para.content![0].text!);
  await saveDocument(p, art, BODY, file);
  return para.attrs!.id as string;
}
const gunzipSize = async (fs: MemoryFs, id: string) => (await fs.readBytes(`.scidesk/history/${id}.snapshot`))!.length;

describe("the history of versions (record 0099)", () => {
  it("stores in each snapshot only what changed since the article's previous one", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const first = await saveSnapshot(p, "main", "Primera", { kind: "named", author: { name: "Lucía" } });
    await edit(p, "La artritis", (t) => t.replace("afecta", "afecta sobre todo"));
    const second = await saveSnapshot(p, "main", "Segunda", { kind: "named" });
    // the second one keeps the body only; the rest points at the first
    expect(await gunzipSize(fs, second.id)).toBeLessThan(await gunzipSize(fs, first.id));
    const again = await loadSnapshot(fs, second.id);
    expect(again.files).toEqual(second.files);
    expect(again.files[`articles/main/${BODY}`]).toContain("afecta sobre todo");
    expect((await loadSnapshot(fs, first.id)).files[`articles/main/${BODY}`]).not.toContain("afecta sobre todo");
    // newest first, with their kind and author
    const list = await listSnapshots(fs, "main");
    expect(list.map((s) => s.label)).toEqual(["Segunda", "Primera"]);
    expect(list[1]).toMatchObject({ kind: "named", author: { name: "Lucía" } });
    // an export repeated with nothing changed is the same snapshot
    const sent = await saveSnapshot(p, "main", "DOCX para coautores", { kind: "sent", reason: "coauthors-docx" });
    expect((await saveSnapshot(p, "main", "DOCX para coautores", { kind: "sent", reason: "coauthors-docx" })).id).toBe(sent.id);
    // one automatic snapshot a day
    expect(await ensureDailySnapshot(p, "main")).toBeNull();
    expect(await ensureDailySnapshot(p, "main", new Date(Date.now() + 2 * 86400000))).not.toBeNull();
  });

  it("still reads the snapshots of the first format", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const old = { format: "scidesk-snapshot-provisional", id: "s-old0000001", created: "2026-11-20T10:00:00Z", article: "main", label: "DOCX para coautores", files: { "articles/main/x.json": "{}" } };
    const bytes = new Uint8Array(await new Response(new Blob([stableStringify(old)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    await fs.write(".scidesk/history/s-old0000001.snapshot", bytes);
    expect((await listSnapshots(fs, "main")).find((s) => s.id === "s-old0000001")).toMatchObject({ kind: "sent", reason: "coauthors-docx" });
    expect((await loadSnapshot(fs, "s-old0000001")).files).toEqual(old.files);
    // a snapshot after it stores everything again
    const next = await saveSnapshot(p, "main", "Después");
    expect(Object.keys((await loadSnapshot(fs, next.id)).files).length).toBeGreaterThan(3);
  });

  it("compare two versions by paragraphs and words, and bring a paragraph back as a proposal", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const v1 = await saveSnapshot(p, "main", "Enviado", { kind: "named" });
    const block = await edit(p, "La artritis", (t) => t.replace("afecta al", "afecta sobre todo al"));
    const blocks = compareVersions(v1.files, currentFiles(p, "main"), "main");
    const changed = blocks.filter((b) => b.status !== "same");
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ id: block, status: "changed", section: "Introducción" });
    expect(changed[0].hunks.map((h) => [h.before, h.after])).toEqual([["", "sobre todo "]]);
    // the introduction's heading takes its section with it
    const intro = blocks.find((b) => b.heading && b.after === "Introducción")!;
    expect(sectionBlocks(blocks, intro.id)).toContain(block);

    // bringing the old paragraph back: proposals on the text as it is now
    const now = await saveSnapshot(p, "main", "Antes de traer", { reason: "before-bringing" });
    const set = proposalsFromVersion(now.files, v1.files, "main", [block], { snapshot: now.id, name: "Versión «Enviado»", version: v1.id });
    expect(set.proposals.map((x) => [x.kind, x.before, x.after])).toEqual([["delete", "sobre todo ", ""]]);
    expect(set.origin.kind).toBe("history");
    const base = blocksById([JSON.parse(now.files[`articles/main/${BODY}`]).doc]);
    const current = blocksById([...p.articles[0].documents.values()].map((d) => d.doc as PMNode));
    expect(placeProposal(set.proposals[0], (id) => base.get(id), (id) => current.get(id))).toMatchObject({ block, from: "La artritis reumatoide afecta ".length });

    // a paragraph taken out since comes back after the one it followed, with its citation
    const art = p.articles[0];
    const file = structuredClone(art.documents.get(BODY)!);
    const body = (file.doc as PMNode).content!;
    const i = body.findIndex((n) => n.type === "paragraph" && n.content?.[0]?.text?.startsWith("El objetivo"));
    const [gone] = body.splice(i, 1);
    await saveDocument(p, art, BODY, file);
    const later = await saveSnapshot(p, "main", "Sin el objetivo");
    expect(compareVersions(v1.files, later.files, "main").find((b) => b.id === gone.attrs!.id)).toMatchObject({ status: "removed" });
    const back = proposalsFromVersion(later.files, v1.files, "main", [gone.attrs!.id as string], { snapshot: later.id, name: "Versión «Enviado»", version: v1.id });
    expect(back.proposals).toHaveLength(1);
    expect(back.proposals[0]).toMatchObject({ kind: "insert-paragraph", anchor: { after: block } });
    expect((back.proposals[0].content as PMNode[]).some((n) => n.type === "citation")).toBe(true);
  });

  it("restore a whole version, adding back the references it used, and undo it", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const v1 = await saveSnapshot(p, "main", "Enviado", { kind: "named" });
    await edit(p, "La artritis", (t) => `${t} Frase nueva.`);
    // a reference gone from the shared library since
    const lib = JSON.parse((await fs.readText("references/library.json"))!);
    const gone = lib.references.pop();
    await fs.write("references/library.json", stableStringify(lib));
    const r = await restoreSnapshot(p, "main", v1.id);
    expect(r.written).toBeGreaterThanOrEqual(2);
    expect(await fs.readText(`articles/main/${BODY}`)).not.toContain("Frase nueva.");
    expect(JSON.parse((await fs.readText("references/library.json"))!).references.map((x: { id: string }) => x.id)).toContain(gone.id);
    // the version before is in the history: restoring it undoes the restore
    await restoreSnapshot(p, "main", r.before);
    expect(await fs.readText(`articles/main/${BODY}`)).toContain("Frase nueva.");
    expect((await listSnapshots(fs, "main")).filter((s) => s.reason === "before-restore")).toHaveLength(2);
  });
});
