// Record 0101: plan B — a returned copy that no longer says which version it came from (Word
// lost the SciDesk property and the bookmarks) is matched with the article's versions by its text.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { saveDocument } from "../src/project.ts";
import { CopyError, importCopy } from "../src/round.ts";
import { trackedProject } from "./tracked-fixture.ts";
import { createDemoProject } from "../src/demo.ts";
import { MemoryFs } from "../src/fs.ts";

/** The copy as another program leaves it: no SciDesk property, no bookmark of SciDesk. */
async function withoutMarks(bytes: Uint8Array, edit: (xml: string) => string = (x) => x) {
  const zip = await JSZip.loadAsync(bytes);
  let xml = await zip.file("word/document.xml")!.async("string");
  const ids = [...xml.matchAll(/<w:bookmarkStart w:name="_SD[^"]*" w:id="(\d+)"\/>/g)].map((m) => m[1]);
  xml = xml.replace(/<w:bookmarkStart w:name="_SD[^"]*" w:id="\d+"\/>/g, "");
  for (const id of ids) xml = xml.replace(`<w:bookmarkEnd w:id="${id}"/>`, "");
  zip.file("word/document.xml", edit(xml));
  const custom = await zip.file("docProps/custom.xml")?.async("string");
  if (custom) zip.file("docProps/custom.xml", custom.replace(/<property [^>]*name="SciDesk"[^>]*>(?:(?!<\/property>).)*<\/property>/s, ""));
  return zip.generateAsync({ type: "uint8array" });
}

describe("plan B: a copy that does not say which version it came from (record 0101)", () => {
  it("is matched with the version sent by its text, and gives the same proposals", async () => {
    const p = await trackedProject();
    const first = await exportDocx(p, "main", "coauthors", await nodeResources());
    // the author goes on writing and sends again
    const art = p.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    const body = (file.doc as PMNode).content!;
    const para = body.find((n) => n.type === "paragraph" && n.content?.some((c) => c.text?.startsWith("Primera mitad")))!;
    para.content = [{ type: "text", text: "Primera mitad, reescrita." }, ...para.content!.slice(1)];
    await saveDocument(p, art, "manuscript/article.scidoc", file);
    const second = await exportDocx(p, "main", "coauthors", await nodeResources());
    expect(second.snapshot).not.toBe(first.snapshot);

    // the first copy comes back without marks, with an edit of the co-author
    const edit = (xml: string) => xml.replace("Segunda mitad.", "Segunda mitad, corregida.");
    const lost = await withoutMarks(first.bytes, edit);
    expect(await (await JSZip.loadAsync(lost)).file("word/document.xml")!.async("string")).not.toContain("_SD");
    const back = await importCopy(p, "main", lost, { fileName: "rios.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.foundBy).toBe("content");
    expect(back.sent).toMatchObject({ id: first.snapshot, reason: "coauthors-docx" });
    expect(back.sent.score).toBeGreaterThan(0.8);
    // the same proposals as the copy with its marks
    const marked = await importCopy(p, "main", await (async () => { const z = await JSZip.loadAsync(first.bytes); z.file("word/document.xml", edit(await z.file("word/document.xml")!.async("string"))); return z.generateAsync({ type: "uint8array" }); })(), { fileName: "rios-marcas.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(marked.foundBy).toBe("property");
    const line = (x: { kind: string; before: string; after: string; anchor: unknown }) => `${x.kind} «${x.before}»→«${x.after}» ${JSON.stringify(x.anchor)}`;
    const shown = (s: typeof back.set) => s.proposals.filter((x) => x.status !== "noise-hidden" && x.kind !== "comment").map(line).sort();
    expect(shown(back.set)).toEqual(shown(marked.set));
    // one edit inside its paragraph (not the paragraph deleted and written again)
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden" && x.kind !== "comment").map((x) => [x.kind, x.after])).toEqual([["insert", ", corregida"]]);
    // both in the round of the first version sent
    expect(back.round).toBe(marked.round);
  });

  it("gives nothing for an untouched copy with an abstract, keywords, a table with notes and a figure", async () => {
    const p = await createDemoProject(new MemoryFs(), "corte-vertical", { parts: true });
    const out = await exportDocx(p, "main", "coauthors", await nodeResources());
    const back = await importCopy(p, "main", await withoutMarks(out.bytes), { fileName: "intacta.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.foundBy).toBe("content");
    // all of it matches: the text the export writes itself (headings, "Tabla 1. ", note letters) does not count against it
    expect(back.sent.score).toBeGreaterThan(0.99);
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => `${x.kind} «${x.before}»→«${x.after}»`)).toEqual([]);
  });

  it("keeps only what changed of a stretch replaced whole with tracking (record 0103)", async () => {
    const p = await trackedProject();
    const out = await exportDocx(p, "main", "coauthors", await nodeResources());
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    const R = 'w:author="Marta Ríos Navarro" w:date="2026-11-27T09:00:00Z"';
    // as Word's find and replace leaves it: the whole stretch deleted and written again
    zip.file("word/document.xml", xml.replace('<w:r><w:t xml:space="preserve">Primera mitad.</w:t></w:r>',
      `<w:del w:id="9101" ${R}><w:r><w:delText xml:space="preserve">Primera mitad.</w:delText></w:r></w:del><w:ins w:id="9102" ${R}><w:r><w:t xml:space="preserve">Primera mitad, revisada.</w:t></w:r></w:ins>`));
    const back = await importCopy(p, "main", await zip.generateAsync({ type: "uint8array" }), { fileName: "rios.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    const shown = back.set.proposals.filter((x) => x.status !== "noise-hidden" && x.kind !== "comment");
    expect(shown.map((x) => [x.kind, x.before, x.after, (x.anchor as { from: number }).from])).toEqual([["replace", "mitad.", "mitad, revisada.", "Primera ".length]]);
    expect(back.set.integrity).toBe("ok");
  });

  it("says so when no version of the article matches it", async () => {
    const p = await trackedProject();
    await exportDocx(p, "main", "coauthors", await nodeResources());
    const other = await trackedProject();
    const art = other.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    for (const n of (file.doc as PMNode).content!) if (n.type === "paragraph" && n.content?.[0]?.type === "text") n.content[0].text = `Otro texto ${Math.random()}`;
    await saveDocument(other, art, "manuscript/article.scidoc", file);
    const foreign = await withoutMarks((await exportDocx(other, "main", "coauthors", await nodeResources())).bytes);
    await expect(importCopy(p, "main", foreign, { fileName: "otra.docx", returnedBy: { name: "X" } })).rejects.toMatchObject({ code: "no-version" });
    await expect(importCopy(p, "main", foreign, { fileName: "otra.docx", returnedBy: { name: "X" } })).rejects.toBeInstanceOf(CopyError);
  });
});
