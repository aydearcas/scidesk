// A table pasted from Word becomes a .scitable with its caption and notes (record 0042).
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject, saveDocument } from "../src/project.ts";
import { addTablePart, discardPastedPart, tablePartFromPaste, type PastedCell } from "../src/paste-table.ts";
import { articleOutline } from "../src/outline.ts";
import { exportDocx } from "../src/docx-export.ts";
import { checkArticle } from "../src/checks.ts";
import { nodeResources } from "../src/node-fs.ts";

const cell = (t: string | { text: string; sup?: boolean; bold?: boolean }[], o: Partial<PastedCell> = {}): PastedCell => ({
  header: false, colspan: 1, rowspan: 1, align: null, paras: [typeof t === "string" ? [{ text: t }] : t], ...o,
});
const pasted = () => ({
  caption: [{ text: "Tabla 3", bold: true }, { text: ". Características basales de los pacientes" }],
  rows: [
    [cell("Variable", { header: true, rowspan: 2 }), cell("Grupo", { header: true, colspan: 2, align: "center" as const })],
    [cell([{ text: "Tratados" }, { text: "a", sup: true }], { header: true, align: "center" as const }), cell("Control", { header: true, align: "center" as const })],
    [cell("Edad (años)"), cell("61", { align: "center" as const }), cell("63", { align: "center" as const })],
    [cell([{ text: "DAS28", bold: true }]), cell("4,1", { align: "right" as const }), cell("3,9", { align: "right" as const })],
  ],
  widths: [3, 1.5, 1.5],
  notes: [[{ text: "Abreviaturas: DAS28, índice de actividad de 28 articulaciones." }], [{ text: "a", sup: true }, { text: " Con metotrexato." }]],
});

describe("pasted tables", () => {
  it("become a table part: caption without 'Tabla 3.', header rows, spans, alignment, widths, notes with their calls", () => {
    const { part, warnings } = tablePartFromPaste(pasted());
    expect(warnings).toEqual([]);
    const [caption, table, general, specific] = part.content!;
    expect(caption.content).toEqual([{ type: "text", text: "Características basales de los pacientes" }]);
    expect(table.attrs!.columnWidths).toEqual([50, 25, 25]);
    const rows = table.content!;
    expect(rows.map((r) => r.content!.map((c) => c.type))).toEqual([["tableHeader", "tableHeader"], ["tableHeader", "tableHeader"], ["tableCell", "tableCell", "tableCell"], ["tableCell", "tableCell", "tableCell"]]);
    expect(rows[0].content![0].attrs).toEqual({ colspan: 1, rowspan: 2, align: null });
    expect(rows[0].content![1].attrs).toEqual({ colspan: 2, rowspan: 1, align: "center" });
    expect(rows[3].content![0].content![0].content).toEqual([{ type: "text", text: "DAS28", marks: [{ type: "bold" }] }]);
    expect(general.attrs).toMatchObject({ kind: "general" });
    expect(specific.attrs).toMatchObject({ kind: "specific" });
    expect(specific.content).toEqual([{ type: "text", text: "Con metotrexato." }]);
    // the superscript "a" in the cell is now the call of the note
    expect(rows[1].content![0].content![0].content).toEqual([{ type: "text", text: "Tratados" }, { type: "noteRef", attrs: { target: specific.attrs!.id } }]);
  });

  it("takes the caption from the first row, and says what is missing", () => {
    const t = pasted();
    const withTitleRow = { ...t, caption: null, rows: [[cell("Tabla 1. Resultados", { colspan: 3 })], ...t.rows] };
    expect(tablePartFromPaste(withTitleRow).part.content![0].content).toEqual([{ type: "text", text: "Resultados" }]);
    const bare = tablePartFromPaste({ ...t, caption: null, notes: [[{ text: "b", sup: true }, { text: " Nota sin llamada." }]] });
    expect(bare.warnings).toEqual(['the pasted table has no "Tabla N." caption: its caption is empty', "note(s) b are not called from any cell"]);
    expect(bare.part.content![0]).not.toHaveProperty("content");
  });

  it("is saved as tables/tabla-<n>.scitable, valid, and exported with the article", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const { part } = tablePartFromPaste(pasted());
    const { path, ref } = await addTablePart(p, "main", part);
    expect(path).toBe("tables/tabla-1.scitable");
    expect((await addTablePart(p, "main", tablePartFromPaste(pasted()).part)).path).toBe("tables/tabla-2.scitable");
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, ref);
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    const reloaded = await loadProject(fs); // every file validates, the ids are unique in the article
    expect(reloaded.normalised).toEqual([]);
    const out = await exportDocx(reloaded, "main", "journal", await nodeResources());
    const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
    expect(xml).toContain("Características basales de los pacientes");
    expect(xml).toContain("Con metotrexato.");
    // not cited in the text yet: the checks say so
    expect(checkArticle(reloaded, "main").warnings.some((w) => w.code === "uncited-table")).toBe(true);
  });
  it("undoing the paste takes the table's file away too (phase 1 test)", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const before = articleOutline(p, "main").unplaced.length;
    const { path } = await addTablePart(p, "main", tablePartFromPaste(pasted()).part);
    expect(articleOutline(p, "main").unplaced.length).toBe(before + 1);
    await discardPastedPart(p, "main", path);
    expect(await fs.readText(`articles/main/${path}`)).toBeNull();
    expect(articleOutline(p, "main").unplaced.length).toBe(before);
    // and the next paste takes the same name again
    expect((await addTablePart(p, "main", tablePartFromPaste(pasted()).part)).path).toBe(path);
    expect((await loadProject(fs)).articles[0].documents.has(path)).toBe(true);
  });
});
