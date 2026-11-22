// The composite document of the window (record 0021): compose on load, split on save.
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject } from "../src/project.ts";
import { addEmptyTable, addFigure } from "../src/outline.ts";
import { ABSTRACT_PATH, BODY_PATH, changedDocuments, composeArticle, copyPart, freePartPath, liveDocuments, saveComposite, splitArticle } from "../src/compose.ts";

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

/** The demo with a table and a figure placed after the first paragraph of the introduction. */
async function withParts() {
  const fs = new MemoryFs();
  let p = await createDemoProject(fs);
  const t = await addEmptyTable(p, "main", 2, 2);
  const f = await addFigure(p, "main", { name: "curva.png", bytes: PNG });
  const art = p.articles[0];
  const body = structuredClone(art.documents.get(BODY_PATH)!) as never as { doc: PMNode };
  const intro = body.doc.content!.findIndex((n) => n.attrs?.role === "introduction");
  body.doc.content!.splice(intro + 2, 0, t.ref, f.ref);
  await fs.write(`articles/main/${BODY_PATH}`, JSON.stringify(body));
  p = await loadProject(fs);
  return { fs, p, art: p.articles[0], table: t.ref.attrs!.id as string, figure: f.ref.attrs!.id as string, tablePath: t.path, figurePath: f.path };
}

const find = (n: PMNode, pred: (x: PMNode) => boolean): PMNode | undefined => {
  if (pred(n)) return n;
  for (const c of n.content ?? []) { const r = find(c, pred); if (r) return r; }
  return undefined;
};

describe("composite document", () => {
  it("puts the abstract after the titles and each part in the place of its reference", async () => {
    const { art, table, figure, tablePath, figurePath } = await withParts();
    const { doc, warnings } = composeArticle(art);
    expect(warnings).toEqual([]);
    const types = doc.content!.map((n) => n.type);
    expect(types[0]).toBe("title");
    expect(types[1]).toBe("abstractPart");
    expect(doc.content![1].attrs).toEqual({ src: ABSTRACT_PATH });
    const tp = doc.content!.find((n) => n.type === "tablePart")!;
    expect(tp.attrs).toMatchObject({ id: table, src: tablePath });
    expect(doc.content!.find((n) => n.type === "figurePart")!.attrs).toMatchObject({ id: figure, src: figurePath, image: "figures/figura-1.png" });
    expect(types).not.toContain("tableRef");
  });

  it("splits back into the same files: nothing to write after loading", async () => {
    const { art, fs } = await withParts();
    const { doc } = composeArticle(art);
    const split = splitArticle(doc, art);
    expect([...split.keys()].sort()).toEqual(["figures/figura-1.scifigure", ABSTRACT_PATH, BODY_PATH, "tables/tabla-1.scitable"]);
    expect(changedDocuments(split, art).size).toBe(0);
    // nor in what goes to disk
    const before = new Map(fs.files);
    expect(await saveComposite({ ...(await loadProject(fs)) }, art, doc)).toEqual([]);
    expect(fs.files).toEqual(before);
  });

  it("editing a cell, a caption or the abstract writes only that file", async () => {
    const { p, art, fs, tablePath } = await withParts();
    const { doc } = composeArticle(art);
    const cell = find(doc, (n) => n.type === "tableCell")!;
    cell.content![0].content = [{ type: "text", text: "62 (48–71)" }];
    const abs = find(doc, (n) => n.type === "abstractSection")!;
    abs.content![0].content = [{ type: "text", text: "Objetivo: describir la actividad." }];
    const written = await saveComposite(p, art, doc);
    expect(written.sort()).toEqual([ABSTRACT_PATH, tablePath]);
    const again = await loadProject(fs);
    const table = again.articles[0].documents.get(tablePath)!.doc as PMNode;
    expect(JSON.stringify(table)).toContain("62 (48–71)");
    expect(table.attrs!.src).toBeUndefined();
    expect(JSON.stringify(again.articles[0].documents.get(ABSTRACT_PATH)!.doc)).toContain("Objetivo");
  });

  it("removing a part from the text keeps its file (rule 4)", async () => {
    const { p, art, fs, tablePath } = await withParts();
    const { doc } = composeArticle(art);
    doc.content = doc.content!.filter((n) => n.type !== "tablePart");
    expect(await saveComposite(p, art, doc)).toEqual([BODY_PATH]);
    expect(await fs.readText(`articles/main/${tablePath}`)).not.toBeNull();
    expect(JSON.stringify((await loadProject(fs)).articles[0].documents.get(BODY_PATH)!.doc)).not.toContain("tableRef");
  });

  it("a copy of a table is a new table: id, file and every id inside, with its note calls", async () => {
    const { p, art, fs } = await withParts();
    const { doc } = composeArticle(art);
    const tp = doc.content!.find((n) => n.type === "tablePart")!;
    tp.content!.push({ type: "tableNote", attrs: { id: "n-orignote1", kind: "specific", lang: null }, content: [{ type: "text", text: "Mediana (RIC)." }] });
    find(tp, (n) => n.type === "tableCell")!.content![0].content = [{ type: "text", text: "62" }, { type: "noteRef", attrs: { target: "n-orignote1" } }];
    const path = freePartPath("table", art.documents.keys());
    expect(path).toBe("tables/tabla-2.scitable");
    const copy = copyPart(tp, path);
    expect(copy.attrs!.id).not.toBe(tp.attrs!.id);
    expect(copy.attrs!.src).toBe(path);
    const note = copy.content!.find((n) => n.type === "tableNote")!;
    expect(note.attrs!.id).not.toBe("n-orignote1");
    expect(find(copy, (n) => n.type === "noteRef")!.attrs!.target).toBe(note.attrs!.id);
    doc.content!.push(copy);
    // the outline and the checks see the copy before it is saved
    expect(Object.keys(liveDocuments(doc, art))).toContain(path);
    await saveComposite(p, art, doc);
    const again = await loadProject(fs);
    expect(again.normalised).toEqual([]);
    expect(again.articles[0].documents.get(path)?.documentType).toBe("table");
  });

  it("the window's demo with parts is valid and saves back to the same files", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs, "demo", { parts: true, letter: true });
    expect(p.issues.filter((i) => i.level === "error")).toEqual([]);
    const art = p.articles[0];
    const { doc, warnings } = composeArticle(art);
    expect(warnings).toEqual([]);
    expect(doc.content!.map((n) => n.type)).toEqual(expect.arrayContaining(["abstractPart", "tablePart", "figurePart"]));
    expect(changedDocuments(splitArticle(doc, art), art).size).toBe(0);
  });
});
