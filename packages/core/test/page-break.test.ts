// Page breaks and blank pages (record 0078): in the format, the Word, back from a co-author's copy, and the PDF source.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { exportDocx } from "../src/docx-export.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { saveDocument } from "../src/project.ts";

describe("page breaks", () => {
  it("go to the Word as Word's own, come back from a copy without proposals, and to the PDF", async () => {
    const p = await createDemoProject(new MemoryFs());
    const art = p.articles[0];
    const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    const body = (file.doc as PMNode).content!;
    // a page break before the first heading, and a blank page before the second
    const headings = body.filter((n) => n.type === "heading");
    body.splice(body.indexOf(headings[0]), 0, { type: "pageBreak", attrs: { id: "b-break00001" } });
    body.splice(body.indexOf(headings[1]), 0,
      { type: "pageBreak", attrs: { id: "b-break00002" } },
      { type: "paragraph", attrs: { id: "b-blank00001" } },
      { type: "pageBreak", attrs: { id: "b-break00003" } });
    expect(validate("scidoc", file)).toEqual([]);
    await saveDocument(p, art, "manuscript/article.scidoc", file);
    const res = await nodeResources();
    for (const profile of ["coauthors", "journal"] as const) {
      const out = await exportDocx(p, "main", profile, res);
      const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
      expect(xml.match(/<w:br w:type="page"\/>/g)).toHaveLength(3);
      // each in a paragraph of its own, as Word's Ctrl+Enter
      expect(xml).toMatch(/<w:p>(?:<w:pPr>(?:(?!<\/w:p>).)*?<\/w:pPr>)?(?:<w:bookmarkStart [^>]*\/>)?<w:r><w:br w:type="page"\/><\/w:r>(?:<w:bookmarkEnd [^>]*\/>)?<\/w:p>/);
    }
    const out = await exportDocx(p, "main", "coauthors", res);
    const back = await importCopy(p, "main", out.bytes, { fileName: "breaks.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => `${x.kind} «${x.before}»→«${x.after}»`)).toEqual([]);
    expect(back.set.integrity ?? "ok").not.toBe("mismatch");
    const typst = await manuscriptTypst(p, "main", res);
    expect(typst.source.match(/#pagebreak\(\);/g)).toHaveLength(3);
  });
});
