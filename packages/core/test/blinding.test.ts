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
import JSZip from "jszip";
import { blindedArticle, ethicsWithCode, fold, institutionTerms, selfCitations, setBlindOmitted, setBlindReplacement } from "../src/blinding.ts";
import { manuscriptTypst } from "../src/typst-export.ts";
import { exportTitlePage, titlePageModel } from "../src/title-page.ts";

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
    // the code, for the blinded version
    const code = (t: string) => ethicsWithCode(t).map((m) => t.slice(m.code.index, m.code.index + m.code.length));
    expect(code("Lo aprobó el CEIm (acta 21/045) el 3 de marzo.")).toEqual(["21/045"]);
    expect(code("Aprobado. El Comité de Ética de la Investigación lo aprobó (código PI-2019-045).")).toEqual(["PI-2019-045"]);
    expect(code("The study was approved by the IRB (protocol no. 2020-118).")).toEqual(["2020-118"]);
    expect(code("Approved by the ethics committee, HUFM-22/07.")).toEqual(["HUFM-22/07"]);
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
      ["blind-author", "b-blind00002", "Herrera-Gil L"],
      ["blind-author", "b-blind00002", "lucia.herrera@example.org"],
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

  it("replaces in the blinded version only, and takes sections to the title page (record 0088)", async () => {
    const p = await kneeOa();
    const art = p.articles[0];
    const file = art.documents.get("manuscript/article.scidoc")!;
    const body = structuredClone(file.doc) as PMNode;
    body.content!.push(
      para("b-blind00001", "Los pacientes se reclutaron en el Hospital Ficticio del Mar, en Puerto Alba; el Ficticio es su centro."),
      // the name split by a mark: replaced all the same, with the first mark
      { type: "paragraph", attrs: { id: "b-blind00002", lang: null }, content: [
        { type: "text", text: "Como en el Hospital " }, { type: "text", text: "Ficticio del Mar", marks: [{ type: "italic" }] }, { type: "text", text: "." }] },
      para("b-blind00003", "El estudio fue aprobado por el Comité de Ética de la Investigación (código PI-2019-045)."),
      heading("b-blind00005", "Agradecimientos"),
      para("b-blind00006", "A quienes participaron."),
    );
    await saveDocument(p, art, "manuscript/article.scidoc", { ...file, doc: body as never });
    const before = blind(checkArticle(p, "main"));
    // every form written is its own warning: the full name and the word alone
    expect(before.filter((w) => w.code === "blind-institution" && w.where?.block === "b-blind00001").map((w) => w.params.match).sort()).toEqual(["Ficticio", "Hospital Ficticio del Mar"]);
    expect(before.find((w) => w.code === "blind-ethics")!.params.match).toBe("PI-2019-045");

    await setBlindReplacement(p, "main", "Hospital Ficticio del Mar", "[centro eliminado para la revisión]");
    await setBlindReplacement(p, "main", "Ficticio", "[centro]");
    await setBlindReplacement(p, "main", "Puerto Alba", "[ciudad eliminada para la revisión]");
    await setBlindReplacement(p, "main", "PI-2019-045", "[código eliminado para la revisión]");
    await setBlindOmitted(p, "main", "b-blind00005", true);
    const after = blind(checkArticle(p, "main"));
    const handled = (block: string, code: string) => after.filter((w) => w.where?.block === block && w.code === code).map((w) => w.ignored?.status);
    expect(handled("b-blind00001", "blind-institution")).toEqual(["replaced", "replaced"]);
    expect(handled("b-blind00002", "blind-institution")).toEqual(["replaced"]);
    expect(handled("b-blind00005", "blind-section")).toEqual(["omitted"]);
    expect(after.filter((w) => !w.ignored && ["b-blind00001", "b-blind00002", "b-blind00003", "b-blind00005"].includes(w.where?.block ?? ""))).toEqual([]);

    // the blinded version; the manuscript as it was
    const blinded = blindedArticle(p, art);
    const block = (a: typeof art, id: string) => (a.documents.get("manuscript/article.scidoc")!.doc as PMNode).content!.find((b) => b.attrs?.id === id);
    const text = (a: typeof art, id: string) => { const n = block(a, id); return n ? (n.content ?? []).map((c) => c.text).join("") : null; };
    expect(text(blinded, "b-blind00001")).toBe("Los pacientes se reclutaron en el [centro eliminado para la revisión], en [ciudad eliminada para la revisión]; el [centro] es su centro.");
    expect(block(blinded, "b-blind00002")!.content).toEqual([{ type: "text", text: "Como en el [centro eliminado para la revisión]" }, { type: "text", text: "." }]);
    expect(text(blinded, "b-blind00003")).toBe("El estudio fue aprobado por el Comité de Ética de la Investigación (código [código eliminado para la revisión]).");
    expect(text(blinded, "b-blind00005")).toBeNull();
    expect(text(blinded, "b-blind00006")).toBeNull();
    expect(text(art, "b-blind00001")).toContain("Hospital Ficticio del Mar");
    expect(text(art, "b-blind00006")).toBe("A quienes participaron.");

    // the Word and the PDF for the journal get it; the Word for the co-authors does not
    const wordText = async (bytes: Uint8Array) => (await (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string")).replace(/<[^>]+>/g, "");
    const res = await nodeResources();
    const journal = await exportDocx(p, "main", "journal", res);
    const journalText = await wordText(journal.bytes);
    expect(journalText).toContain("[centro eliminado para la revisión]");
    expect(journalText).not.toContain("Ficticio del Mar");
    expect(journalText).not.toContain("A quienes participaron");
    const coauthors = await wordText((await exportDocx(p, "main", "coauthors", res)).bytes);
    expect(coauthors).toContain("Hospital Ficticio del Mar");
    expect(coauthors).toContain("A quienes participaron");
    const typst = (await manuscriptTypst(p, "main", res)).source;
    expect(typst).toContain("código eliminado para la revisión");
    expect(typst).not.toContain("PI-2019-045");

    // the section goes on the title page
    expect(titlePageModel(p, "main").moved).toEqual([{ heading: "Agradecimientos", role: "acknowledgements", paragraphs: ["A quienes participaron."] }]);
    expect(await wordText((await exportTitlePage(p, "main", res)).bytes)).toContain("A quienes participaron.");

    // undone: back in the blinded version
    await setBlindReplacement(p, "main", "PI-2019-045", null);
    await setBlindOmitted(p, "main", "b-blind00005", false);
    expect(text(blindedArticle(p, art), "b-blind00003")).toContain("PI-2019-045");
    expect(text(blindedArticle(p, art), "b-blind00006")).toBe("A quienes participaron.");
    expect(titlePageModel(p, "main").moved).toEqual([]);

    // without double-blind review, the article as it is
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    prof.review!.blind.value = "single";
    p.journals.set("reumatologia-clinica", prof);
    expect(blindedArticle(p, art)).toBe(art);
  });

  it("replaces across a citation, checks the text alternative and strips the images' metadata (record 0089)", async () => {
    const p = await kneeOa();
    const art = p.articles[0];
    const file = art.documents.get("manuscript/article.scidoc")!;
    const body = structuredClone(file.doc) as PMNode;
    const citation: PMNode = { type: "citation", attrs: { id: "c-blind00001", items: [{ ref: p.library.references[0].id }] } };
    body.content!.push({ type: "paragraph", attrs: { id: "b-blind00007", lang: null }, content: [
      { type: "text", text: "Como describimos" }, citation, { type: "text", text: " en nuestro estudio previo, la prevalencia era alta." }] });
    await saveDocument(p, art, "manuscript/article.scidoc", { ...file, doc: body as never });
    const figPath = "figures/figura-1.scifigure";
    const fig = art.documents.get(figPath)!;
    await saveDocument(p, art, figPath, { ...fig, doc: { ...(fig.doc as PMNode), attrs: { ...(fig.doc as PMNode).attrs, alt: "Evolución en el Hospital Ficticio del Mar" } } as never });
    // the figure's PNG says who made it
    const pngPath = "articles/main/figures/figura-1.png";
    const png = (await p.fs.readBytes(pngPath))!;
    const tEXt = new TextEncoder().encode("Author\0Lucia Herrera");
    const chunk = new Uint8Array(12 + tEXt.length);
    new DataView(chunk.buffer).setUint32(0, tEXt.length);
    chunk.set(new TextEncoder().encode("tEXt"), 4);
    chunk.set(tEXt, 8);
    await p.fs.write(pngPath, new Uint8Array([...png.subarray(0, 33), ...chunk, ...png.subarray(33)]));

    const warnings = blind(checkArticle(p, "main"));
    const self = warnings.find((w) => w.code === "blind-self-citation" && w.where?.block === "b-blind00007")!;
    expect(self.params.match).toBe("Como describimos en nuestro estudio previo");
    const alt = warnings.find((w) => w.code === "blind-institution" && w.params.field === "alt")!;
    expect(alt.params.match).toBe("Hospital Ficticio del Mar");
    expect(alt.where?.path).toBe(figPath);

    await setBlindReplacement(p, "main", String(self.params.match), "[eliminado para la revisión]");
    await setBlindReplacement(p, "main", "Hospital Ficticio del Mar", "[centro eliminado para la revisión]");
    const blinded = blindedArticle(p, art);
    // the citation stays, after the replacement
    expect((blinded.documents.get("manuscript/article.scidoc")!.doc as PMNode).content!.find((b) => b.attrs?.id === "b-blind00007")!.content)
      .toEqual([{ type: "text", text: "[eliminado para la revisión]" }, citation, { type: "text", text: ", la prevalencia era alta." }]);
    expect((blinded.documents.get(figPath)!.doc as PMNode).attrs!.alt).toBe("Evolución en el [centro eliminado para la revisión]");
    expect(blind(checkArticle(p, "main")).filter((w) => !w.ignored && (w.where?.block === "b-blind00007" || w.params.field === "alt"))).toEqual([]);

    // Reumatología Clínica takes the figures apart: written next to the Word, clean and with a neutral name
    const res = await nodeResources();
    const asText = (b: Uint8Array | null | undefined) => new TextDecoder().decode(b ?? new Uint8Array());
    const apart = await exportDocx(p, "main", "journal", res);
    expect(apart.figureFiles).toEqual(["articles/main/exports/main-revista-figuras/figura-1.png"]);
    const written = await p.fs.readBytes(apart.figureFiles![0]);
    expect(asText(written!.subarray(1, 4))).toBe("PNG");
    expect(asText(written)).not.toContain("Herrera");
    expect((await exportDocx(p, "main", "coauthors", res)).figureFiles).toBeUndefined();

    // a journal that takes them in the Word: no metadata in the image, the text alternative
    // replaced; the co-authors' Word as it is
    const prof = structuredClone(p.journals.get("reumatologia-clinica")!);
    prof.manuscriptFormat!.figureCaptionsList = { ...prof.manuscriptFormat!.figureCaptionsList!, value: false };
    p.journals.set("reumatologia-clinica", prof);
    const media = async (bytes: Uint8Array) => {
      const z = await JSZip.loadAsync(bytes);
      const files = Object.keys(z.files).filter((f) => f.startsWith("word/media/"));
      return { files, text: (await Promise.all(files.map((f) => z.file(f)!.async("string")))).join(""), xml: await z.file("word/document.xml")!.async("string") };
    };
    const journal = await media((await exportDocx(p, "main", "journal", res)).bytes);
    expect(journal.files.length).toBe(1);
    expect(journal.text).not.toContain("Herrera");
    expect(journal.xml).toContain("Evolución en el [centro eliminado para la revisión]");
    expect(journal.xml).not.toContain("Ficticio del Mar");
    const coauthors = await media((await exportDocx(p, "main", "coauthors", res)).bytes);
    expect(coauthors.text).toContain("Lucia Herrera");
    // and in the PDF
    const bundle = await manuscriptTypst(p, "main", res);
    expect(bundle.files["figures/figura-1.png"]).toBeDefined();
    expect(asText(bundle.files["figures/figura-1.png"])).not.toContain("Herrera");
    expect(bundle.source).toContain("Evolución en el [centro eliminado para la revisión]");
  });
});
