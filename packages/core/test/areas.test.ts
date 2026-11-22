// The user's main areas and the journals suggested for them (record 0050).
import { describe, expect, it } from "vitest";
import { AREAS, JOURNAL_ONLY_AREAS, areaFit, areaName, normalizeAreas, splitByAreas } from "../src/areas.ts";
import { JOURNAL_CATALOG } from "../src/new-article.ts";

const known = new Set([...AREAS, ...JOURNAL_ONLY_AREAS].map((a) => a.id));
const ids = (js: { id: string }[]) => js.map((j) => j.id);

describe("areas", () => {
  it("have unique ids and OpenAlex codes, and a name in both languages", () => {
    const all = [...AREAS, ...JOURNAL_ONLY_AREAS];
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
    expect(new Set(all.map((a) => a.openalex)).size).toBe(all.length);
    for (const a of all) expect(a.name.es && a.name.en).toBeTruthy();
    expect(areaName("rheumatology", "es")).toBe("Reumatología");
    expect(areaName("rheumatology", "en-GB")).toBe("Rheumatology");
  });

  it("every journal of the catalog has known areas", () => {
    for (const j of JOURNAL_CATALOG) {
      expect(j.areas.length).toBeGreaterThan(0);
      for (const a of j.areas) expect(known.has(a)).toBe(true);
    }
  });

  it("keeps only areas a user can choose, once, in the order of the list", () => {
    expect(normalizeAreas(["urology", "rheumatology", "rheumatology", "general-medicine", "nope", 3])).toEqual(["rheumatology", "urology"]);
    expect(normalizeAreas(undefined)).toEqual([]);
  });

  it("a rheumatologist gets Reumatología Clínica first, then the general and multidisciplinary journals", () => {
    const { suggested, others } = splitByAreas(JOURNAL_CATALOG, ["rheumatology"]);
    expect(suggested[0].id).toBe("reumatologia-clinica");
    expect(ids(suggested)).toEqual(expect.arrayContaining(["medicina-clinica", "the-lancet", "bmj", "nature", "science"]));
    expect(ids(others)).toEqual(["cell"]);
    expect(areaFit(["general-medicine"], ["rheumatology"])).toBe(1);
  });

  it("a basic scientist is not offered general medical journals", () => {
    const { suggested, others } = splitByAreas(JOURNAL_CATALOG, ["biochemistry-genetics"]);
    expect(ids(suggested)).toEqual(["cell", "nature", "science"]);
    expect(ids(others)).toContain("the-lancet");
  });

  it("suggests nothing without areas, and keeps the catalog order", () => {
    const { suggested, others } = splitByAreas(JOURNAL_CATALOG, []);
    expect(suggested).toEqual([]);
    expect(ids(others)).toEqual(ids(JOURNAL_CATALOG));
  });
});
