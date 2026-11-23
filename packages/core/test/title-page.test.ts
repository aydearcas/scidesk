// The title page of the knee-oa example (authors, affiliations, group author, equal
// contribution, corresponding author, conflicts and acknowledgements).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { loadProject } from "../src/project.ts";
import { exportDocx } from "../src/docx-export.ts";
import { exportTitlePage, titlePageModel } from "../src/title-page.ts";
import { nodeResources } from "../src/node-fs.ts";

const res = await nodeResources();
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
  return loadProject(fs);
}
const textOf = async (bytes: Uint8Array) => [...(await (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string")).matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

describe("title page", () => {
  it("numbers affiliations by first appearance and marks correspondence and equal contribution", async () => {
    const m = titlePageModel(await kneeOa(), "main");
    expect(m.titles).toHaveLength(2);
    expect(m.authors.map((a) => [a.name, a.affiliations, a.corresponding, a.equal])).toEqual([
      ["Lucía Herrera Gil", [1], true, null],
      ["Marta Ríos Navarro", [2], false, "†"],
      ["Javier Soler Benítez", [1], false, "†"],
      ["Andrés Calvo Mora", [3], false, null],
      ["Elena Vidal Ortega", [2], false, null],
      ["Pablo Navas Cuesta", [3], false, null],
    ]);
    expect(m.affiliations[0]).toBe("Servicio de Reumatología, Hospital Universitario Ficticio de Santa Aurelia, Santa Aurelia, España");
    expect(m.corresponding.map((c) => c.email)).toEqual(["lucia.herrera@example.org"]);
    expect(m.acknowledged).toEqual(["Grupo de Trabajo Ficticio de Artrosis"]);
  });

  it("lists the CRediT roles only when the article asks for it (record 0085)", async () => {
    const p = await kneeOa();
    const art = p.articles[0];
    art.authors.authors[0].credit = [{ role: "methodology" }, { role: "conceptualization", degree: "lead" }];
    expect(titlePageModel(p, "main").contributions).toEqual([]);
    expect(await textOf((await exportTitlePage(p, "main", res)).bytes)).not.toContain("CRediT");
    art.authors.creditOnTitlePage = true;
    expect(titlePageModel(p, "main").contributions[0]).toEqual({ name: "Lucía Herrera Gil", roles: ["Conceptualización (principal)", "Metodología"] });
    const text = await textOf((await exportTitlePage(p, "main", res)).bytes);
    expect(text).toContain("Contribuciones de los autores (CRediT)Lucía Herrera Gil: Conceptualización (principal), Metodología.");
  });

  it("writes the DOCX, with one conflicts sentence when every author declares the same, and no metadata", async () => {
    const p = await kneeOa();
    const t = await exportTitlePage(p, "main", res);
    expect(t.warnings).toEqual([]);
    expect(t.path).toBe("articles/main/exports/main-portada.docx");
    const text = await textOf(t.bytes);
    expect(text).toContain("Lucía Herrera Gil1,*, Marta Ríos Navarro2,†");
    expect(text).toContain("Autor para correspondencia: Lucía Herrera Gil. Correo electrónico: lucia.herrera@example.org");
    expect(text.match(/Sin conflictos de interés\./g)).toHaveLength(1);
    expect(text).toContain("Título corto: Artrosis de rodilla acelerada");
    const core = await (await JSZip.loadAsync(t.bytes)).file("docProps/core.xml")!.async("string");
    expect(core).not.toMatch(/<dc:creator>[^<]+</);
  });

  it("the manuscript for the journal names no author (double-blind)", async () => {
    const p = await kneeOa();
    const text = await textOf((await exportDocx(p, "main", "journal", res)).bytes);
    for (const person of p.people.people) if (person.kind === "person") expect(text).not.toContain(`${person.given} ${person.family}`);
  });
});
