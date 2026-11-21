// Importing references: RIS, NBIB, BibTeX and CSL-JSON (synthetic files in fixtures/).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { detectFormat, importReferences, parseNbib, parseReferences } from "../src/library-import.ts";
import { loadProject } from "../src/project.ts";

const fixture = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url), "utf8");

describe("reference import", () => {
  it("detects the format by extension or content", () => {
    expect(detectFormat("x.ris", "")).toBe("ris");
    expect(detectFormat("pubmed-export.txt", fixture("refs.nbib"))).toBe("nbib");
    expect(detectFormat("x.txt", fixture("refs.bib"))).toBe("bibtex");
    expect(detectFormat("x.txt", "hello")).toBeNull();
  });

  it("reads NBIB: full names, group author, continued lines, date, DOI, PMID", () => {
    const [a, b] = parseNbib(fixture("refs.nbib"));
    expect(a.csl).toMatchObject({
      type: "article-journal", title: "A second made-up trial of an imaginary treatment in early rheumatoid arthritis",
      author: [{ family: "Castro", given: "Raúl" }, { family: "Domínguez", given: "Lucía" }, { literal: "Grupo Ficticio de Ensayos" }],
      "container-title": "Annals of the rheumatic diseases", "container-title-short": "Ann Rheum Dis",
      issued: { "date-parts": [[2024, 3, 12]] }, volume: "83", issue: "4", page: "412-420", DOI: "10.1136/ard-2024-000777", PMID: "40000003", ISSN: "0003-4967",
    });
    expect(b.unmapped.warning).toBe("retracted publication");
  });

  it("normalises RIS, BibTeX and CSL-JSON to SciDesk's CSL-JSON", () => {
    const [ris, book] = parseReferences(fixture("refs.ris"), "ris");
    expect(ris.csl).toMatchObject({ type: "article-journal", "container-title-short": "Reumatol Clin", issued: { "date-parts": [[2025]] }, page: "120-127" });
    expect(book.csl.type).toBe("book");
    const [bib] = parseReferences(fixture("refs.bib"), "bibtex");
    expect(bib.csl).toMatchObject({ author: [{ family: "Ibáñez", given: "Teresa" }, { family: "Jiménez", given: "Víctor" }], "container-title": "Arthritis & Rheumatology" });
    const [web] = parseReferences(fixture("refs.json"), "csl-json");
    expect(web.csl).toMatchObject({ type: "webpage", issued: { "date-parts": [[2025]] }, accessed: { "date-parts": [[2026, 11, 20]] } });
    expect(web.csl).not.toHaveProperty("id");
    expect(web.unmapped).toHaveProperty("custom");
  });

  it("adds to the library, skips duplicates across files and keeps a copy of each file", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const before = p.library.references.length;
    const r1 = await importReferences(p, { name: "refs.ris", text: fixture("refs.ris") });
    expect(r1.added).toHaveLength(2);
    const r2 = await importReferences(p, { name: "pubmed.nbib", text: fixture("refs.nbib") });
    // the second PubMed record is the RIS article (same DOI, other case)
    expect(r2.added.map((x) => x.title)).toEqual(["A second made-up trial of an imaginary treatment in early rheumatoid arthritis"]);
    expect(r2.duplicates.map((x) => x.title)).toEqual(["Same work as the RIS record, from PubMed"]);
    const r3 = await importReferences(p, { name: "refs.ris", text: fixture("refs.ris") });
    expect(r3.added).toHaveLength(0);
    expect(r3.importedCopy).not.toBe("references/imports/refs.ris"); // the earlier copy is kept
    await importReferences(p, { name: "refs.bib", text: fixture("refs.bib") });
    await importReferences(p, { name: "refs.json", text: fixture("refs.json") });
    const reloaded = await loadProject(fs); // the library still validates
    expect(reloaded.library.references.length).toBe(before + 5);
    expect([...fs.files.keys()].filter((k) => k.startsWith("references/imports/")).length).toBe(5);
    const nbibEntry = reloaded.library.references.find((x) => x.csl.PMID === "40000003")!;
    expect(nbibEntry.source).toMatchObject({ kind: "nbib", file: "references/imports/pubmed.nbib", key: "PMID:40000003" });
  });

  it("refuses a Zotero-linked project", async () => {
    const p = await createDemoProject(new MemoryFs());
    p.manifest.library = { mode: "zotero", zotero: { library: "user", collection: "ABCD2345", name: "x" } };
    await expect(importReferences(p, { name: "refs.ris", text: fixture("refs.ris") })).rejects.toThrow(/Zotero/);
  });
});
