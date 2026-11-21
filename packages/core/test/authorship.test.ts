// Authors and affiliations: the directory of people and who signs an article (record 0038).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { loadProject } from "../src/project.ts";
import { titlePageModel } from "../src/title-page.ts";
import {
  addAuthor, AuthorshipError, checkAuthorship, defaultCitationName, moveAuthor, newAffiliation, newGroup, newPerson,
  normalizeOrcid, removeAffiliation, removePerson, saveAuthorship, setCredit, withoutAffiliation,
} from "../src/authorship.ts";

const EXAMPLE = fileURLToPath(new URL("../../formats/examples/knee-oa/", import.meta.url));
async function kneeOa() {
  const fs = new MemoryFs();
  const visit = (rel: string) => {
    for (const name of readdirSync(EXAMPLE + rel)) {
      const p = rel ? `${rel}/${name}` : name;
      if (p.includes("/rounds/")) continue;
      if (statSync(EXAMPLE + p).isDirectory()) visit(p);
      else fs.files.set(p, new Uint8Array(readFileSync(EXAMPLE + p)));
    }
  };
  visit("");
  return { fs, p: await loadProject(fs) };
}

/** The demo project with a small directory: two hospitals, three people and a group. */
async function demoWithPeople() {
  const fs = new MemoryFs();
  const p = await createDemoProject(fs);
  const h1 = { ...newAffiliation("Hospital Ficticio del Norte"), department: "Servicio de Reumatología", city: "Valdoria", country: "ES" };
  const h2 = { ...newAffiliation("Universidad Inventada"), country: "PT" };
  const ana = { ...newPerson("Ana María", "Pérez García"), email: "ana.perez@example.org", orcid: "0000-0002-1825-0097", affiliations: [h1.id, h2.id] };
  const luis = { ...newPerson("Luis", "Soto"), affiliations: [h2.id] };
  const eva = { ...newPerson("Eva", "Martín"), affiliations: [h1.id] };
  const grupo = { ...newGroup("Grupo Ficticio de Estudio"), members: [luis.id, eva.id] };
  const people = { schemaVersion: 1 as const, affiliations: [h1, h2], people: [ana, luis, eva, grupo] };
  let authors = p.articles[0].authors;
  for (const x of [luis, ana, grupo]) authors = addAuthor(authors, x);
  return { fs, p, people, authors, h1, h2, ana, luis, eva, grupo };
}

describe("authorship", () => {
  it("suggests the form of citation and normalises ORCID iDs", () => {
    expect(defaultCitationName("Lucía", "Herrera Gil")).toBe("Herrera-Gil L");
    expect(defaultCitationName("José Luis", "Pérez")).toBe("Pérez JL");
    expect(defaultCitationName("Ana-María", "García de la Fuente")).toBe("García de la Fuente AM");
    expect(defaultCitationName("Jan", "van der Berg")).toBe("van der Berg J");
    expect(normalizeOrcid("https://orcid.org/0000-0002-1825-0097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("000000021825009x")).toBe("0000-0002-1825-009X");
    expect(normalizeOrcid("not an orcid")).toBe("not an orcid");
  });

  it("saves the directory and the author list together, and the title page follows", async () => {
    const { fs, p, people, ana, luis, grupo, h1 } = await demoWithPeople();
    // Luis, Ana, the group; then Ana moved up
    let authors = moveAuthor(addAuthor(addAuthor(addAuthor(p.articles[0].authors, luis), ana), grupo), 1, -1);
    expect(moveAuthor(authors, 0, -1)).toBe(authors);
    authors.authors[0] = { ...setCredit(setCredit(authors.authors[0], "conceptualization", "lead"), "writing-original-draft", "yes"), corresponding: true, affiliations: [h1.id] };
    authors.authors[1] = setCredit(authors.authors[1], "investigation", "supporting");
    authors.authors[2] = setCredit(authors.authors[2], "data-curation", "equal");
    authors = { ...authors, acknowledged: [] };
    const warnings = await saveAuthorship(p, "main", people, authors);
    expect(warnings.map((w) => [w.code, w.id])).toEqual([["author-no-affiliation", grupo.id]]);
    const reloaded = await loadProject(fs); // valid on disk
    expect(reloaded.articles[0].authors.authors.map((a) => a.person)).toEqual([ana.id, luis.id, grupo.id]);
    expect(reloaded.articles[0].authors).not.toHaveProperty("acknowledged");
    expect(reloaded.articles[0].authors.authors[0].credit).toEqual([{ role: "conceptualization", degree: "lead" }, { role: "writing-original-draft" }]);
    const m = titlePageModel(reloaded, "main");
    expect(m.authors.map((a) => [a.name, a.affiliations])).toEqual([["Ana María Pérez García", [1]], ["Luis Soto", [2]], ["Grupo Ficticio de Estudio", []]]);
    expect(m.affiliations[1]).toBe("Universidad Inventada, Portugal");
    expect(m.corresponding.map((a) => a.email)).toEqual(["ana.perez@example.org"]);
    expect(m.authors[2].members).toEqual(["Luis Soto", "Eva Martín"]);
  });

  it("refuses errors before writing anything", async () => {
    const { fs, p, people, authors, ana, luis, h1 } = await demoWithPeople();
    const before = new Map(fs.files);
    const bad = (patch: (x: typeof people) => void, a = authors) => {
      const copy = structuredClone(people);
      patch(copy);
      return saveAuthorship(p, "main", copy, a);
    };
    const codes = async (pr: Promise<unknown>) => { try { await pr; return []; } catch (e) { return (e as AuthorshipError).issues.map((i) => i.code); } };
    expect(await codes(bad((x) => { (x.people[0] as typeof ana).orcid = "0000-0002-1825-0098"; }))).toEqual(["orcid-checksum"]);
    expect(await codes(bad((x) => { x.people[0].email = "ana@ejemplo"; }))).toEqual(["email-format"]);
    expect(await codes(bad((x) => { x.affiliations[0].country = "España"; }))).toEqual(["country-format"]);
    expect(await codes(bad((x) => { (x.people[1] as typeof luis).given = " "; }))).toEqual(["empty-name"]);
    // a printed affiliation that is not one of the person's
    const a2 = structuredClone(authors);
    a2.authors[0].affiliations = [h1.id];
    expect(await codes(bad(() => {}, a2))).toEqual(["affiliation-not-persons"]);
    // removing someone who signs
    expect(await codes(saveAuthorship(p, "main", removePerson(people, luis.id), authors))).toEqual(["unknown-person"]);
    await expect(bad(() => {}, { ...authors, authors: [...authors.authors, authors.authors[0]] })).rejects.toThrow(/duplicate-author/);
    expect(fs.files).toEqual(before);
  });

  it("warns about what the journal will miss, and saves anyway", async () => {
    const { p, people, authors, luis, ana } = await demoWithPeople();
    const codes = (issues: { code: string }[]) => issues.map((i) => i.code).sort();
    expect(codes(checkAuthorship(p, "main", people, { schemaVersion: 1, authors: [] }))).toEqual(["no-authors"]);
    expect(codes(checkAuthorship(p, "main", people, authors))).toEqual(["author-no-affiliation", "no-corresponding"]); // the group has no affiliation
    const a = structuredClone(authors);
    a.authors[0] = { ...setCredit(a.authors[0], "software", "yes"), corresponding: true, equalContribution: "e1" };
    a.acknowledged = [ana.id];
    expect(codes(await saveAuthorship(p, "main", people, a))).toEqual(["acknowledged-signs", "author-no-affiliation", "author-no-credit", "author-no-credit", "corresponding-no-email", "equal-single"]);
    expect(p.articles[0].authors.authors[0].person).toBe(luis.id);
  });

  it("removing an affiliation takes it out of people and authors; the example checks clean", async () => {
    const { fs, p, people, authors, h1 } = await demoWithPeople();
    await saveAuthorship(p, "main", removeAffiliation(people, h1.id), withoutAffiliation(authors, h1.id));
    const reloaded = await loadProject(fs);
    expect(reloaded.people.affiliations).toHaveLength(1);
    expect(reloaded.people.people.every((x) => !x.affiliations.includes(h1.id))).toBe(true);
    const ex = await kneeOa();
    expect(checkAuthorship(ex.p, "main", ex.p.people, ex.p.articles[0].authors).filter((i) => i.level === "error")).toEqual([]);
    // saving the example unchanged writes nothing
    const before = new Map(ex.fs.files);
    await saveAuthorship(ex.p, "main", ex.p.people, ex.p.articles[0].authors);
    expect(ex.fs.files).toEqual(before);
  });
});
