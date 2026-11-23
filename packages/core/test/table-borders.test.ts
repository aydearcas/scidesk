// The lines of a table (record 0076): the styles, the cells' own borders over them, merged
// cells, and the same lines in the Word and the PDF source.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument } from "../src/project.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { resolveBorders, tableStyleOf, THICK, THIN, type GridCell } from "../src/table-borders.ts";

const cell = (header = false, extra: Partial<GridCell> = {}): GridCell => ({ colspan: 1, rowspan: 1, header, ...extra });
const grid = (rows: number, cols: number, headerRows = 1) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, () => cell(r < headerRows)));
const red = { style: "single" as const, width: 1.5, color: "#ff0000" };

describe("table lines", () => {
  it("draws each style on the grid's edges", () => {
    const three = resolveBorders("three-line", grid(3, 2));
    expect(three[0][0]).toEqual({ top: THICK, bottom: THIN, left: null, right: null });
    expect(three[1][1]).toEqual({ top: THIN, bottom: null, left: null, right: null });
    expect(three[2][0].bottom).toEqual(THICK);
    const rows = resolveBorders("rows", grid(3, 2));
    expect(rows[1][0]).toMatchObject({ top: THIN, bottom: THIN, left: null });
    const all = resolveBorders("grid", grid(2, 2));
    expect(all[1][1]).toEqual({ top: THIN, bottom: THIN, left: THIN, right: THIN });
    expect(resolveBorders("none", grid(2, 2)).flat().every((b) => !b.top && !b.bottom && !b.left && !b.right)).toBe(true);
    // no header row: three lines are the top and the bottom only
    const plain = resolveBorders("three-line", grid(2, 2, 0));
    expect(plain[0][0].bottom).toBeNull();
  });

  it("puts the cells' own borders over the style, shared edges alike, and none takes a line away", () => {
    const rows = grid(3, 2);
    rows[1][0] = cell(false, { borders: { right: red, bottom: { style: "none" } } });
    const b = resolveBorders("grid", rows);
    expect(b[1][0].right).toEqual({ style: "single", width: 1.5, color: "#FF0000" });
    // the neighbour across that edge sees the same line, and the one below no line
    expect(b[1][1].left).toEqual(b[1][0].right);
    expect(b[2][0].top).toBeNull();
    // a later cell wins on an edge it shares with an earlier one
    rows[1][1] = cell(false, { borders: { left: { style: "dashed", width: 1, color: "#0000FF" } } });
    expect(resolveBorders("grid", rows)[1][0].right).toEqual({ style: "dashed", width: 1, color: "#0000FF" });
  });

  it("follows merged cells", () => {
    // a header that spans two columns over two header cells, and a body cell that spans two rows
    const rows: GridCell[][] = [
      [cell(true, { rowspan: 2 }), cell(true, { colspan: 2 })],
      [cell(true), cell(true)],
      [cell(false, { rowspan: 2 }), cell(), cell()],
      [cell(), cell()],
    ];
    const b = resolveBorders("three-line", rows);
    expect(b[0][0]).toMatchObject({ top: THICK, bottom: THIN });
    expect(b[1][0]).toMatchObject({ top: null, bottom: THIN });
    expect(b[2][0]).toMatchObject({ top: THIN, bottom: THICK });
    expect(b[3][1].bottom).toEqual(THICK);
  });

  it("takes the table's own style, else the journal's, else three lines", () => {
    expect(tableStyleOf("grid", "rows")).toBe("grid");
    expect(tableStyleOf(null, "rows")).toBe("rows");
    expect(tableStyleOf(undefined, null)).toBe("three-line");
    expect(tableStyleOf("weird", "also weird")).toBe("three-line");
  });

  it("goes the same to the Word and the PDF", async () => {
    const p = await createDemoProject(new MemoryFs(), "lines", { parts: true });
    const art = p.articles[0];
    const path = [...art.documents.keys()].find((k) => k.endsWith(".scitable"))!;
    const file = structuredClone(art.documents.get(path)!);
    const table = (file.doc as PMNode).content!.find((n) => n.type === "table")!;
    table.attrs = { ...table.attrs, style: "grid" };
    const first = table.content![1].content![0];
    first.attrs = { ...first.attrs, borders: { bottom: { style: "double", width: 1.5, color: "#FF0000" } } };
    await saveDocument(p, art, path, file);
    const res = await nodeResources();
    const xml = await (await JSZip.loadAsync((await exportDocx(p, "main", "journal", res)).bytes)).file("word/document.xml")!.async("string");
    // grid: every cell has its four lines (0.5 pt = size 4), and the double red one (1.5 pt = size 12)
    expect(xml).toMatch(/<w:left w:val="single" w:color="000000" w:sz="4"\/>/);
    expect(xml).toMatch(/<w:bottom w:val="double" w:color="FF0000" w:sz="12"\/>/);
    expect(xml).toMatch(/<w:top w:val="double" w:color="FF0000" w:sz="12"\/>/);
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source).toContain(`bottom: (paint: rgb("#FF0000"), thickness: 3pt)`);
    expect(typst.source).not.toContain("table.hline()");
  });
});
