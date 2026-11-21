// The vertical slice end to end, without Word: create, export, edit the DOCX as a
// co-author would (its XML), import, and check the proposals. The same circuit with real
// Word is tools/word-edit.ps1 (local only).
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { MemoryFs, safePath } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { exportDocx } from "../src/docx-export.ts";
import { readDocx } from "../src/docx-read.ts";
import { importCopy } from "../src/round.ts";
import { loadSnapshot } from "../src/snapshot.ts";
import { loadProject } from "../src/project.ts";
import { nodeResources } from "../src/node-fs.ts";

const res = await nodeResources();

async function editXml(bytes: Uint8Array, edit: (xml: string) => string) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")!.async("string");
  const out = edit(xml);
  expect(out).not.toBe(xml);
  zip.file("word/document.xml", out);
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}
const ins = (text: string, author = "Luis Pardo") => `</w:t></w:r><w:ins w:id="901" w:author="${author}" w:date="2026-11-21T10:00:00Z"><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:ins><w:r><w:t xml:space="preserve">`;
const del = (text: string, author = "Luis Pardo") => `</w:t></w:r><w:del w:id="902" w:author="${author}" w:date="2026-11-21T10:01:00Z"><w:r><w:delText xml:space="preserve">${text}</w:delText></w:r></w:del><w:r><w:t xml:space="preserve">`;

describe("vertical slice: project -> DOCX -> co-author -> proposals", () => {
  it("exports with the marks of the format spec and a snapshot", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const out = await exportDocx(p, "main", "coauthors", res);
    expect(out.warnings).toEqual([]);
    const read = await readDocx(out.bytes);
    expect(read.scidesk).toMatchObject({ format: 1, project: p.manifest.id, snapshot: out.snapshot, profile: "coauthors" });
    expect(read.snapshotBookmark).toBe(out.snapshot);
    // every block of the body has its bookmark; citations are atoms with their citationID
    const body = p.articles[0].documents.get("manuscript/article.scidoc")!;
    const ids = (body.doc.content as any[]).map((b) => b.attrs.id);
    expect(read.paragraphs.flatMap((x) => x.blocks).filter((id) => ids.includes(id))).toEqual(ids);
    const citationIds = JSON.stringify(body.doc).match(/c-[a-z0-9]{10}/g);
    expect(read.paragraphs.flatMap((x) => x.segments.filter((s) => s.citation).map((s) => s.citation))).toEqual(citationIds);
    // the snapshot holds the article as exported
    const snap = await loadSnapshot(fs, out.snapshot!);
    expect(JSON.parse(snap.files["articles/main/manuscript/article.scidoc"]).doc).toEqual(body.doc);
    // the bibliography is generated, not read back as content
    expect(read.paragraphs.some((x) => /Alonso M/.test(x.segments.map((s) => s.text).join("")))).toBe(false);
  });

  it("the journal profile has no marks and no metadata", async () => {
    const p = await createDemoProject(new MemoryFs());
    const out = await exportDocx(p, "main", "journal", res);
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).not.toMatch(/_SD|ZOTERO/);
    expect(await zip.file("docProps/custom.xml")?.async("string") ?? "").not.toMatch(/SciDesk/);
    expect(out.snapshot).toBeNull();
  });

  it("an unchanged copy gives no proposals", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const out = await exportDocx(p, "main", "coauthors", res);
    const r = await importCopy(p, "main", out.bytes, { fileName: "sin-cambios.docx", returnedBy: { name: "Ana Torres" } });
    expect(r.set.proposals).toEqual([]);
    expect(r.set.integrity).toBe("ok");
    // the round, the copy and its proposals are in the project, which still validates
    expect([...fs.files.keys()].filter((k) => k.includes("/rounds/")).sort()).toEqual([
      "articles/main/rounds/ronda-1/copies/sin-cambios.docx", "articles/main/rounds/ronda-1/proposals/sin-cambios.json", "articles/main/rounds/ronda-1/round.json",
    ]);
    await loadProject(fs);
  });

  it("finds tracked and untracked edits with their author, in ProseMirror offsets", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const out = await exportDocx(p, "main", "coauthors", res);
    const copy = await editXml(out.bytes, (xml) => xml
      .replace("población adulta y su", `población adulta${ins(" española")} y su`)
      .replace(" con índices compuestos", del(" con índices compuestos"))
      .replace("fue describir la", "fue analizar la")); // untracked
    const r = await importCopy(p, "main", copy, { fileName: "Copia de Ana.docx", returnedBy: { name: "Ana Torres" } });
    const props = r.set.proposals.map((x) => ({ author: x.author.name, tracked: x.tracked, kind: x.kind, before: x.before, after: x.after }));
    expect(props).toEqual([
      { author: "Luis Pardo", tracked: true, kind: "insert", before: "", after: " española" },
      { author: "Luis Pardo", tracked: true, kind: "delete", before: " con índices compuestos", after: "" },
      { author: "Ana Torres", tracked: false, kind: "replace", before: "describir", after: "analizar" },
    ]);
    expect(r.set.integrity).toBe("ok");
    // the anchor points at the characters of the sent block
    const body = p.articles[0].documents.get("manuscript/article.scidoc")!;
    const first = r.set.proposals[1].anchor as { block: string; from: number; to: number };
    const block = (body.doc.content as any[]).find((b) => b.attrs.id === first.block);
    expect(block.content[0].text.slice(first.from, first.to)).toBe(" con índices compuestos");
    expect(r.copyFile).toBe("articles/main/rounds/ronda-1/copies/copia-de-ana.docx");
  });

  it("hides noise and finds a new paragraph", async () => {
    const p = await createDemoProject(new MemoryFs());
    const out = await exportDocx(p, "main", "coauthors", res);
    const copy = await editXml(out.bytes, (xml) => xml
      .replace("0,5–1 %", "0,5-1 %") // a dash: noise
      .replace(/(<w:p>(?:(?!<w:p>).)*?El objetivo(?:(?!<\/w:p>).)*<\/w:p>)/s, `$1<w:p><w:r><w:t>Se incluyeron 120 pacientes.</w:t></w:r></w:p>`));
    const r = await importCopy(p, "main", copy, { fileName: "copia.docx", returnedBy: { name: "Ana Torres" } });
    expect(r.set.hiddenNoise).toBe(1);
    expect(r.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => [x.kind, x.after])).toEqual([["insert-paragraph", "Se incluyeron 120 pacientes."]]);
  });

  it("refuses a copy of another project, and files outside the project", async () => {
    const a = await createDemoProject(new MemoryFs());
    const b = await createDemoProject(new MemoryFs());
    const out = await exportDocx(a, "main", "coauthors", res);
    await expect(importCopy(b, "main", out.bytes, { fileName: "x.docx", returnedBy: { name: "X" } })).rejects.toThrow(/another project/);
    for (const bad of ["../x", "/etc/passwd", "C:/Windows/x", "a/../../b"]) expect(() => safePath(bad)).toThrow(/outside/);
  });
});
