// The library seen and edited, the quick search and the bundled styles (record 0037).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { importReferences } from "../src/library-import.ts";
import {
  addReference, applyReferenceFields, deleteReference, emptyFields, FieldError, referenceFields, referenceUses,
  searchLibrary, setCitationStyle, summarize, updateReference,
} from "../src/library.ts";
import { loadProject } from "../src/project.ts";
import { renderCitations } from "../src/citations.ts";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { BUNDLED_STYLES, findStyle } from "../src/resources.ts";

const fixture = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url), "utf8");

async function demoWithImports() {
  const fs = new MemoryFs();
  const p = await createDemoProject(fs);
  for (const f of ["refs.ris", "refs.nbib", "refs.bib", "refs.json"]) await importReferences(p, { name: f, text: fixture(f) });
  return { fs, p };
}
const byTitle = (p: Awaited<ReturnType<typeof createDemoProject>>, start: string) => p.library.references.find((r) => String(r.csl.title).startsWith(start))!;

describe("library", () => {
  it("counts where each reference is cited, also in unsaved text", async () => {
    const p = await createDemoProject(new MemoryFs());
    const [r1, r2] = p.library.references;
    const uses = referenceUses(p);
    expect(uses.get(r1.id)).toHaveLength(2);
    expect(uses.get(r2.id)).toEqual([expect.objectContaining({ article: "main", path: "manuscript/article.scidoc" })]);
    // on screen: a paragraph citing r2 only
    const live: PMNode = { type: "doc", content: [{ type: "paragraph", attrs: { id: "b-0000000001" }, content: [{ type: "citation", attrs: { id: "c-0000000001", items: [{ ref: r2.id }] } }] }] };
    const withLive = referenceUses(p, { "main/manuscript/article.scidoc": live });
    expect(withLive.get(r1.id)).toBeUndefined();
    expect(withLive.get(r2.id)).toHaveLength(1);
  });

  it("finds references by author, year, title, journal or DOI, ignoring accents and case", async () => {
    const { p } = await demoWithImports();
    const titles = (q: string) => searchLibrary(p.library, q).map((h) => String(h.entry.csl.title));
    expect(titles("benitez")).toHaveLength(2); // the demo's and the RIS record
    expect(titles("BENITEZ de inicio")).toEqual(["Una cohorte ficticia de artritis reumatoide de inicio"]);
    expect(titles("alonso 2025 seguim")).toEqual(["Seguimiento de una cohorte ficticia de artritis reumatoide"]);
    expect(titles("castro 2024")).toHaveLength(2); // the demo's and PubMed's second trial
    expect(titles("ibáñez")).toHaveLength(1);
    expect(titles("ard-2023")).toHaveLength(1); // part of a DOI
    expect(titles("Reumatol Clin cohorte")).toHaveLength(2);
    expect(titles("strunk elements")).toEqual(["The elements of style"]);
    expect(titles("castro 1999")).toEqual([]);
    expect(searchLibrary(p.library, "").length).toBe(p.library.references.length);
    // the surname weighs more than a word of the title
    const hits = searchLibrary(p.library, "castro");
    expect(summarize(hits[0].entry.csl).authors).toMatch(/^Castro/);
  });

  it("converts the form's fields to CSL-JSON and back without losing what it does not show", async () => {
    const { p } = await demoWithImports();
    for (const r of p.library.references) expect(applyReferenceFields(r.csl, referenceFields(r.csl))).toEqual(r.csl);
    const nbib = byTitle(p, "A second made-up");
    const f = referenceFields(nbib.csl);
    expect(f.authors.split("\n")).toEqual(["Castro, Raúl", "Domínguez, Lucía", "Grupo Ficticio de Ensayos"]);
    expect(f.issued).toBe("2024-03-12");
    const edited = applyReferenceFields(nbib.csl, { ...f, authors: "Castro, Raúl\nde la Fuente, Ana\nOMS", DOI: "https://doi.org/10.1136/ARD-2024-000777", issued: "2024", page: "" });
    expect(edited.author).toEqual([{ family: "Castro", given: "Raúl" }, { family: "de la Fuente", given: "Ana" }, { literal: "OMS" }]);
    expect(edited.DOI).toBe("10.1136/ARD-2024-000777");
    expect(edited.issued).toEqual({ "date-parts": [[2024]] });
    expect(edited).not.toHaveProperty("page");
    expect(edited.ISSN).toBe(nbib.csl.ISSN); // not in the form: kept
    expect(() => applyReferenceFields(nbib.csl, { ...f, DOI: "ard-2024" })).toThrow(FieldError);
    expect(() => applyReferenceFields(nbib.csl, { ...f, issued: "marzo 2024" })).toThrow(/year/);
    expect(() => applyReferenceFields({ type: "book" }, emptyFields())).toThrow(/title or an author/);
  });

  it("adds, edits and deletes references; refuses duplicates and deleting a cited one", async () => {
    const { fs, p } = await demoWithImports();
    const n = p.library.references.length;
    const added = await addReference(p, applyReferenceFields({ type: "book" }, { ...emptyFields(), type: "book", title: "Manual ficticio de reumatología", authors: "Sociedad Ficticia de Reumatología", issued: "2023", publisher: "Editorial Inventada", publisherPlace: "Madrid" }));
    expect(added.source).toMatchObject({ kind: "manual" });
    await expect(addReference(p, { type: "article-journal", title: "x", DOI: "10.1136/ard-2023-000001" })).rejects.toThrow(/already in the library/);
    const [r1, r2] = p.library.references;
    await expect(updateReference(p, r1.id, { ...r1.csl, DOI: r2.csl.DOI as string })).rejects.toThrow(/same work/);
    const ris = byTitle(p, "Seguimiento");
    await updateReference(p, ris.id, { ...ris.csl, volume: "99" });
    await expect(deleteReference(p, r1.id)).rejects.toThrow(/cited 2 time/);
    await deleteReference(p, added.id);
    const reloaded = await loadProject(fs); // still valid on disk
    expect(reloaded.library.references).toHaveLength(n);
    const ris2 = reloaded.library.references.find((r) => r.id === ris.id)!;
    expect(ris2.csl.volume).toBe("99");
    expect(ris2.source).toEqual(ris.source); // where it came from is kept
  });
});

describe("bundled styles", () => {
  it("every style is included, independent (or with its parent) and formats the demo project", async () => {
    const res = await nodeResources();
    const p = await createDemoProject(new MemoryFs());
    const doc = p.articles[0].documents.get("manuscript/article.scidoc")!.doc as PMNode;
    expect(BUNDLED_STYLES).toHaveLength(18);
    const dir = new URL("../assets/styles/", import.meta.url);
    for (const s of BUNDLED_STYLES) {
      const xml = await res.style(s.id);
      if (s.parent) {
        // a dependent style: its own file names the parent, which is bundled and is what citeproc-js gets
        const own = readFileSync(new URL(s.file, dir), "utf8");
        expect(own).toContain(`<id>${s.id}</id>`);
        expect(own).toContain(`<link href="${s.parent}" rel="independent-parent"/>`);
        expect(xml).toContain(`<id>${s.parent}</id>`);
      } else {
        expect(xml, s.file).toContain(`<id>${s.id}</id>`);
        expect(xml, s.file).toMatch(new RegExp(`citation-format="${s.format}"`));
      }
      expect(findStyle(s.file.replace(".csl", ""))).toBe(s);
      for (const lang of ["es", "en"]) {
        const r = await renderCitations(p.library, [doc], s.id, lang, res);
        expect(r.bibliography, s.name).toHaveLength(2);
        const plain = [...r.citations.values()].map((c) => c.plain);
        if (s.format === "author-date") expect(plain[0], s.name).toMatch(/Alonso/);
        else expect(plain[0], s.name).toMatch(/1/);
      }
    }
  }, 20000); // 18 styles through citeproc-js: close to 5 s alone, more with the other files in parallel

  it("changing the style changes the export at once", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    await setCitationStyle(p, "main", findStyle("apa")!.id);
    expect((await loadProject(fs)).articles[0].article.citationStyle.id).toBe("http://www.zotero.org/styles/apa");
    const out = await exportDocx(p, "main", "journal", await nodeResources());
    const JSZip = (await import("jszip")).default;
    const xml = await (await JSZip.loadAsync(out.bytes)).file("word/document.xml")!.async("string");
    expect(xml).toMatch(/Alonso/);
    expect(xml).toMatch(/2025/);
    await expect(setCitationStyle(p, "main", "http://example.org/not-a-style")).rejects.toThrow(/not included/);
  });
});
