// Journal profiles of this computer and a project's copy (record 0105).
import { describe, expect, it } from "vitest";
import type { JournalProfileFile } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject } from "../src/project.ts";
import { MemoryStore } from "../src/recovery.ts";
import { readAsset } from "../src/node-fs.ts";
import {
  copyProfile, copyState, forgetStoredProfile, knownJournals, newProfile, profileIdFor, profileIsOld, profileIssues, saveStoredGuide,
  saveStoredProfile, searchKnownJournals, setArticleJournal, storedGuide, storedProfile, storedProfiles,
} from "../src/journal-profiles.ts";
import { JOURNAL_CATALOG } from "../src/new-article.ts";

const rc = async () => JSON.parse(await readAsset("journals/reumatologia-clinica.json")) as JournalProfileFile;

describe("profiles of this computer", () => {
  it("makes a valid new profile from a title", () => {
    const p = newProfile({ title: "Journal of Rheumatology", guideUrl: "https://example.org/guide", lang: "en" });
    expect(p.id).toBe("journal-of-rheumatology");
    expect(profileIssues(p)).toEqual([]);
    expect(p.sources[0]).toMatchObject({ kind: "author-guide", url: "https://example.org/guide" });
    expect(profileIdFor("Rheumatology", ["rheumatology"])).toBe("rheumatology-2");
    expect(profileIdFor("Revista Española de Reumatología")).toBe("revista-espanola-de-reumatologia");
  });

  it("takes the style and areas of a journal of the catalogue", () => {
    const lancet = JOURNAL_CATALOG.find((j) => j.id === "the-lancet")!;
    const p = newProfile({ title: lancet.title, from: lancet });
    expect(p.id).toBe("the-lancet");
    expect(p.citationStyle.value.id).toBe(lancet.styleId);
    expect(p.areas).toEqual(lancet.areas);
  });

  it("saves, lists and forgets profiles, with the time they were saved and the guide's text apart", async () => {
    const store = new MemoryStore();
    const saved = await saveStoredProfile(store, newProfile({ title: "Zeta" }));
    await saveStoredProfile(store, newProfile({ title: "Alfa" }));
    expect(saved.updated).toMatch(/Z$/);
    expect((await storedProfiles(store)).map((p) => p.journal.title.value)).toEqual(["Alfa", "Zeta"]);
    await saveStoredGuide(store, "zeta", "Original articles: up to 3000 words.");
    expect(await storedGuide(store, "zeta")).toContain("3000");
    // the guide's text is not a profile
    expect((await storedProfiles(store)).length).toBe(2);
    await forgetStoredProfile(store, "zeta");
    expect(await storedProfile(store, "zeta")).toBeNull();
    expect(await storedGuide(store, "zeta")).toBe("");
  });

  it("refuses an invalid profile", async () => {
    const bad = newProfile({ title: "X" });
    (bad.journal.issnPrint as unknown) = { value: "1234", source: "guide" };
    await expect(saveStoredProfile(new MemoryStore(), bad)).rejects.toThrow(/invalid/);
  });

  it("puts this computer's profiles before SciDesk's catalogue, replacing the one of the same id", async () => {
    const mine = { ...(await rc()), updated: "2026-11-28T10:00:00Z" };
    const known = knownJournals([mine, newProfile({ title: "Arthritis Research" })]);
    expect(known.filter((j) => j.id === "reumatologia-clinica")).toHaveLength(1);
    expect(known[0]).toMatchObject({ id: "reumatologia-clinica", origin: "mine", areas: ["rheumatology"] });
    expect(known.find((j) => j.id === "the-lancet")?.origin).toBe("style-only");
    expect(searchKnownJournals(known, "reumatologia").map((j) => j.id)).toEqual(["reumatologia-clinica"]);
  });

  it("copies a profile under a new id", async () => {
    const copy = copyProfile(await rc(), "Reumatología Clínica (mi versión)", ["reumatologia-clinica"]);
    expect(copy.id).toBe("reumatologia-clinica-mi-version");
    expect(copy.articleTypes.length).toBeGreaterThan(0);
    expect(profileIssues(copy)).toEqual([]);
  });

  it("says when the guide was read more than a year ago", async () => {
    const p = newProfile({ title: "X" });
    p.sources[0].accessed = "2025-11-01";
    expect(profileIsOld(p, "2026-11-28")).toBe(true);
    expect(profileIsOld(p, "2026-10-01")).toBe(false);
  });
});

describe("a project's copy", () => {
  it("tells which copy is newer", async () => {
    const base = await rc();
    expect(copyState(base, null)).toBe("not-stored");
    expect(copyState(base, { ...base, updated: "2026-11-28T10:00:00Z" })).toBe("same");
    const edited = { ...structuredClone(base), notes: [{ value: "Nueva nota", source: "guide" }], updated: "2026-11-28T10:00:00Z" };
    expect(copyState(base, edited)).toBe("computer-newer");
    expect(copyState({ ...edited, updated: "2026-11-29T10:00:00Z" }, { ...base, updated: "2026-11-28T10:00:00Z" })).toBe("project-newer");
    expect(copyState(edited, { ...base, updated: undefined } as JournalProfileFile)).toBe("project-newer");
  });

  it("changes an article's journal, with the journal's style when the article had the previous one's", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    const lancet = newProfile({ title: "The Lancet", from: JOURNAL_CATALOG.find((j) => j.id === "the-lancet") });
    const r = await setArticleJournal(p, art.folder, lancet);
    expect(r.styleChanged).toBe(true);
    expect(art.article.journal).toBe("the-lancet");
    expect(art.article.citationStyle.id).toBe(lancet.citationStyle.value.id);
    // the project opens again with the copy
    const again = await loadProject(fs);
    expect(again.journals.get("the-lancet")?.journal.title.value).toBe("The Lancet");
    expect(again.articles[0].article.journal).toBe("the-lancet");
    // a style the user chose stays
    const chosen = { ...art.article, citationStyle: { id: "http://www.zotero.org/styles/apa" } };
    art.article = chosen;
    const r2 = await setArticleJournal(p, art.folder, await rc(), async (f) => readAsset(`styles/${f}`));
    expect(r2.styleChanged).toBe(false);
    expect(art.article.citationStyle.id).toBe("http://www.zotero.org/styles/apa");
    expect(await fs.readText("resources/journals/styles/reumatologia-clinica-2026.csl")).toContain("<style");
    // no journal
    await setArticleJournal(p, art.folder, null);
    expect(art.article.journal).toBeNull();
  });
});
