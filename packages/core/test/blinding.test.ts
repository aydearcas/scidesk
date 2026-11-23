// Checks of the blinded manuscript (R9, record 0087).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { MemoryFs } from "../src/fs.ts";
import { loadProject, saveDocument } from "../src/project.ts";
import { checkArticle, ignoreWarning } from "../src/checks.ts";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { ethicsWithCode, fold, institutionTerms, selfCitations } from "../src/blinding.ts";

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
const para = (id: string, text: string): PMNode => ({ type: "paragraph", attrs: { id, lang: null }, content: [{ type: "text", text }] });
const heading = (id: string, text: string): PMNode => ({ type: "heading", attrs: { id, level: 1, role: null }, content: [{ type: "text", text }] });
const blind = (r: ReturnType<typeof checkArticle>) => r.warnings.filter((w) => w.code.startsWith("blind-"));

describe("blinded manuscript (R9)", () => {
  it("folds case and accents without moving the text", () => {
    expect(fold("Comité de Ética")).toBe("comite de etica");
    expect(fold("Ríos 𝔄")).toHaveLength("Ríos 𝔄".length);
  });

  it("finds an institution by its name, the name without its generic opening and its distinctive words", () => {
    expect(institutionTerms("Hospital Universitario de Gran Canaria Doctor Negrín")).toEqual(
      ["Hospital Universitario de Gran Canaria Doctor Negrín", "Gran Canaria Doctor Negrín", "Canaria", "Negrín"]);
    expect(institutionTerms("Hospital Universitario La Paz")).toEqual(["Hospital Universitario La Paz", "La Paz"]);
    expect(institutionTerms("Instituto Ficticio de Ciencias de la Salud del Norte")).toContain("Ficticio");
    expect(institutionTerms("Instituto Ficticio de Ciencias de la Salud del Norte")).not.toContain("Norte");
    expect(institutionTerms("Hospital Clínic de Barcelona")).toContain("Barcelona");
    expect(institutionTerms("IDIBAPS")).toEqual(["IDIBAPS"]);
  });

  it("finds self-citations in the first person, in Spanish and English", () => {
    const found = (t: string) => selfCitations(t).map((m) => t.slice(m.index, m.index + m.length));
    expect(found("Como describimos en nuestro estudio previo, la prevalencia era alta.")).toEqual(["Como describimos en nuestro estudio previo"]);
    expect(found("En un trabajo anterior de nuestro grupo se vio lo mismo.")).toEqual(["trabajo anterior de nuestro grupo"]);
    expect(found("Hemos publicado previamente una serie de 40 casos.")).toEqual(["Hemos publicado previamente"]);
    expect(found("Nuestro grupo ha descrito la técnica.")).toEqual(["Nuestro grupo ha descrito"]);
    expect(found("As we previously reported, and in our previous study, …")).toHaveLength(1);
    expect(found("Our group has shown that …")).toEqual(["Our group has shown"]);
    // the present study is not a self-citation
    expect(found("Como describimos en los métodos, se incluyeron 120 pacientes.")).toEqual([]);
    expect(found("En nuestra cohorte, la edad media fue de 54 años. We found no differences.")).toEqual([]);
  });

  it("finds the ethics committee only with an approval code", () => {
    const n = (t: string) => ethicsWithCode(t).length;
    expect(n("El estudio fue aprobado por el Comité de Ética de la Investigación (código PI-2019-045).")).toBe(1);
    expect(n("Lo aprobó el CEIm (acta 21/045) el 3 de marzo.")).toBe(1);
    expect(n("The study was approved by the institutional review board (protocol no. 2020-118).")).toBe(1);
    expect(n("El Comité de Ética aprobó el estudio en 2021. Se incluyeron pacientes con COVID-19.")).toBe(0);
    expect(n("Se recogieron los datos entre 2019-2021 con el código PI-2019-045.")).toBe(0); // no committee in that sentence
  });

  it("warns, in the example for Reumatología Clínica (double-blind), of what gives the authors away", async () => {
    const p = await kneeOa();
    expect(blind(checkArticle(p, "main"))).toEqual([]);
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!.doc) as PMNode;
    body.content!.push(
      para("b-blind00001", "Los pacientes se reclutaron en el Hospital Ficticio del Mar, en Puerto Alba, entre 2019 y 2021."),
      para("b-blind00002", "Como describimos en nuestro estudio previo, Herrera-Gil L et al. hallaron lo mismo; más datos en lucia.herrera@example.org."),
      para("b-blind00003", "El estudio fue aprobado por el Comité de Ética de la Investigación (código PI-2019-045)."),
      para("b-blind00004", "Los centros ficticios y el hospital del mar no se nombran con mayúscula; tampoco herrera."),
      heading("b-blind00005", "Agradecimientos"),
      para("b-blind00006", "A quienes participaron."),
    );
    const figure = structuredClone(art.documents.get("figures/figura-1.scifigure")!.doc) as PMNode;
    figure.attrs = { ...figure.attrs, image: "figures/fig1_soler.png" };
    const r = checkArticle(p, "main", { "manuscript/article.scidoc": body, "figures/figura-1.scifigure": figure });
    const got = blind(r).map((w) => [w.code, w.where?.block, w.params.term ?? w.params.heading ?? w.params.file ?? ""]);
    expect(got).toEqual(expect.arrayContaining([
      ["blind-institution", "b-blind00001", "Hospital Ficticio del Mar"],
      ["blind-city", "b-blind00001", "Puerto Alba"],
      ["blind-author", "b-blind00002", "Herrera"],
      ["blind-self-citation", "b-blind00002", ""],
      ["blind-ethics", "b-blind00003", ""],
      ["blind-section", "b-blind00005", "Agradecimientos"],
      ["blind-file-name", expect.stringMatching(/^f-/), "fig1_soler.png"],
    ]));
    // one institution warning for one mention, even if the word "Ficticio" is in all three
    expect(got.filter((g) => g[0] === "blind-institution" && g[1] === "b-blind00001")).toHaveLength(1);
    // lower case is not a name
    expect(got.filter((g) => g[1] === "b-blind00004")).toEqual([]);
    // all of them only worth checking: nothing blocks submission
    expect(new Set(blind(r).map((w) => w.level))).toEqual(new Set(["review"]));

    // the export for the journal says so, until they are marked correct
    await saveDocument(p, art, "manuscript/article.scidoc", { ...art.documents.get("manuscript/article.scidoc")!, doc: body as never });
    const saved = blind(checkArticle(p, "main"));
    expect((await exportDocx(p, "main", "journal", await nodeResources())).warnings.join(" ")).toContain(`${saved.length} thing(s) in the text may identify the authors (double-blind review)`);
    await ignoreWarning(p, "main", saved.map((w) => w.id), "correct");
    expect((await exportDocx(p, "main", "journal", await nodeResources())).warnings.join(" ")).not.toMatch(/identify the authors/);
    expect((await exportDocx(p, "main", "coauthors", await nodeResources())).warnings.join(" ")).not.toMatch(/identify the authors/);

    // a journal without double-blind review: none
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    prof.review!.blind.value = "single";
    p.journals.set("reumatologia-clinica", prof);
    expect(blind(checkArticle(p, "main", { "manuscript/article.scidoc": body }))).toEqual([]);
  });
});
