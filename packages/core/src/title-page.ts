// The title page, apart from the manuscript (double-blind review, PLAN 5.3 and 5.9),
// generated from authors.json and people.json: titles, running title, authors with their
// affiliation numbers, affiliations, equal contribution, corresponding author, conflicts of
// interest, acknowledgements, the members of a group author and, when the article asks for
// it (record 0085, off by default), each author's CRediT roles, and the sections taken out of
// the blinded version (record 0088: acknowledgements, conflicts…). It is generated, not
// edited, so it carries no SciDesk marks; nothing in it is stored.
import JSZip from "jszip";
import { AlignmentType, Document, Footer, Packer, PageNumber, Paragraph, TextRun } from "docx";
import { CREDIT_ROLES, type PMNode } from "@scidesk/formats";
import { applyTemplate, type ExportResources } from "./docx-export.ts";
import type { Project } from "./project.ts";
import { omittedSections } from "./blinding.ts";
import { blockText } from "./checks.ts";

const TEXT: Record<string, Record<string, string>> = {
  es: { running: "Título corto", corresponding: "Autor para correspondencia", conflicts: "Conflictos de interés", none: "Los autores declaran no tener conflictos de interés.", equal: "Estos autores contribuyeron por igual.", ack: "Agradecimientos", members: "Miembros de", email: "Correo electrónico", missing: "Faltan los autores: añádelos en el artículo", noConflicts: "ningún autor tiene declaración de conflictos de interés", noEmail: "falta el correo del autor para correspondencia" },
  en: { running: "Running title", corresponding: "Corresponding author", conflicts: "Conflicts of interest", none: "The authors declare no conflicts of interest.", equal: "These authors contributed equally.", ack: "Acknowledgements", members: "Members of", email: "E-mail", missing: "Authors are missing: add them to the article", noConflicts: "no author has a conflicts of interest declaration", noEmail: "the corresponding author has no e-mail" },
};

/** Record 0085: the CRediT roles and degrees, as the window names them. */
const CREDIT: Record<string, { title: string; degree: Record<string, string>; roles: Record<(typeof CREDIT_ROLES)[number], string> }> = {
  es: {
    title: "Contribuciones de los autores (CRediT)",
    degree: { lead: "principal", equal: "igual", supporting: "de apoyo" },
    roles: {
      conceptualization: "Conceptualización", "data-curation": "Curación de datos", "formal-analysis": "Análisis formal", "funding-acquisition": "Obtención de fondos",
      investigation: "Investigación", methodology: "Metodología", "project-administration": "Administración del proyecto", resources: "Recursos", software: "Software",
      supervision: "Supervisión", validation: "Validación", visualization: "Visualización", "writing-original-draft": "Redacción: borrador original", "writing-review-editing": "Redacción: revisión y edición",
    },
  },
  en: {
    title: "Author contributions (CRediT)",
    degree: { lead: "lead", equal: "equal", supporting: "supporting" },
    roles: {
      conceptualization: "Conceptualization", "data-curation": "Data curation", "formal-analysis": "Formal analysis", "funding-acquisition": "Funding acquisition",
      investigation: "Investigation", methodology: "Methodology", "project-administration": "Project administration", resources: "Resources", software: "Software",
      supervision: "Supervision", validation: "Validation", visualization: "Visualization", "writing-original-draft": "Writing: original draft", "writing-review-editing": "Writing: review and editing",
    },
  },
};

type PersonLike = { id: string; kind: string; given?: string; family?: string; name?: string; email?: string; affiliations: string[]; members?: string[] };
const fullName = (p: PersonLike) => (p.kind === "group" ? p.name! : `${p.given} ${p.family}`);

export interface TitlePage { bytes: Uint8Array; path: string; warnings: string[] }

/** The title page's content as plain data (also used by tests and, later, by the interface). */
export function titlePageModel(project: Project, folder: string) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const lang = art.article.lang.startsWith("es") ? "es" : "en";
  const T = TEXT[lang];
  const people = new Map(project.people.people.map((p) => [p.id, p as PersonLike]));
  const affiliations = new Map(project.people.affiliations.map((a) => [a.id, a]));
  const region = new Intl.DisplayNames([lang], { type: "region" });
  const body = art.documents.get("manuscript/article.scidoc")!.doc as PMNode;
  const titles = (body.content ?? []).filter((n) => n.type === "title").map((n) => (n.content ?? []).map((c) => c.text ?? "").join(""));

  // affiliations numbered by order of first appearance in the author list
  const affOrder: string[] = [];
  for (const a of art.authors.authors) for (const af of a.affiliations) if (!affOrder.includes(af)) affOrder.push(af);
  const equalGroups = new Map<string, number>();
  for (const a of art.authors.authors) if (a.equalContribution) equalGroups.set(a.equalContribution, (equalGroups.get(a.equalContribution) ?? 0) + 1);
  const marks = ["†", "‡", "§", "¶"];
  const equalMark = new Map([...equalGroups.entries()].filter(([, n]) => n > 1).map(([g], i) => [g, marks[i] ?? "#"]));

  const authors = art.authors.authors.map((a) => {
    const p = people.get(a.person)!;
    return {
      name: fullName(p),
      affiliations: a.affiliations.map((af) => affOrder.indexOf(af) + 1),
      corresponding: a.corresponding,
      equal: a.equalContribution ? equalMark.get(a.equalContribution) ?? null : null,
      email: p.email ?? null,
      conflicts: a.conflicts ?? null,
      members: p.kind === "group" ? (p.members ?? []).map((m) => fullName(people.get(m)!)) : null,
    };
  });
  const affiliationLines = affOrder.map((id) => {
    const a = affiliations.get(id)!;
    return [a.department, a.institution, a.city, a.country ? region.of(a.country) : undefined].filter(Boolean).join(", ");
  });
  const conflicts = authors.filter((a) => a.conflicts).map((a) => ({ name: a.name, text: a.conflicts! }));
  // record 0085: "Ana López: Conceptualización (principal), Metodología.", only when asked for
  const C = CREDIT[lang];
  const contributions = art.authors.creditOnTitlePage
    ? art.authors.authors.filter((a) => a.credit.length).map((a) => ({
      name: fullName(people.get(a.person)!),
      roles: [...a.credit].sort((x, y) => CREDIT_ROLES.indexOf(x.role) - CREDIT_ROLES.indexOf(y.role)).map((c) => `${C.roles[c.role]}${c.degree ? ` (${C.degree[c.degree]})` : ""}`),
    }))
    : [];
  return {
    lang, T, titles, runningTitle: art.article.runningTitle ?? null, authors, affiliations: affiliationLines,
    equalNotes: [...equalMark.values()],
    corresponding: authors.filter((a) => a.corresponding),
    conflicts,
    contributionsTitle: C.title,
    contributions,
    acknowledged: (art.authors.acknowledged ?? []).map((id) => people.get(id)).filter(Boolean).map((p) => fullName(p!)),
    // record 0088: what the blinded manuscript leaves for the title page, as plain paragraphs
    moved: omittedSections(project, art).map((s) => ({
      heading: blockText(s.heading).trim(), role: s.role,
      paragraphs: s.blocks.filter((b) => b.type !== "tableRef" && b.type !== "figureRef" && b.type !== "pageBreak" && !(b.marks ?? []).some((m) => m.type === "deletion")).map((b) => blockText(b).trim()).filter(Boolean),
    })),
  };
}

export async function exportTitlePage(project: Project, folder: string, res: ExportResources): Promise<TitlePage> {
  const art = project.articles.find((a) => a.folder === folder)!;
  const m = titlePageModel(project, folder);
  const warnings: string[] = [];
  const journal = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  const fmt = journal?.manuscriptFormat;
  const tpl = applyTemplate(await (await JSZip.loadAsync(await res.template())).file("word/styles.xml")!.async("string"), { lineSpacing: fmt?.lineSpacing?.value, fontSizePt: fmt?.fontSizePt?.value, font: fmt?.font?.value });
  const marginCm = fmt?.sideMarginsCm?.value ? (fmt.sideMarginsCm.value.max ?? fmt.sideMarginsCm.value.min) : 2.5;
  const margin = Math.round((marginCm / 2.54) * 1440);

  const out: Paragraph[] = [];
  m.titles.forEach((t) => out.push(new Paragraph({ style: tpl.style("title"), children: [new TextRun(t)] })));
  if (m.runningTitle) out.push(new Paragraph({ children: [new TextRun({ text: `${m.T.running}: `, bold: true }), new TextRun(m.runningTitle)] }));
  if (!m.authors.length) warnings.push(m.T.missing);
  // the author line: Name¹,²*†, Name³
  const line: TextRun[] = [];
  m.authors.forEach((a, i) => {
    if (i) line.push(new TextRun(", "));
    line.push(new TextRun(a.name));
    const sup = [...a.affiliations.map(String), a.corresponding ? "*" : "", a.equal ?? ""].filter(Boolean).join(",");
    if (sup) line.push(new TextRun({ text: sup, superScript: true }));
  });
  if (line.length) out.push(new Paragraph({ spacing: { before: 240 }, children: line }));
  m.affiliations.forEach((a, i) => out.push(new Paragraph({ children: [new TextRun({ text: String(i + 1), superScript: true }), new TextRun(` ${a}`)] })));
  m.equalNotes.forEach((mark) => out.push(new Paragraph({ children: [new TextRun({ text: mark, superScript: true }), new TextRun(` ${m.T.equal}`)] })));
  for (const c of m.corresponding) {
    if (!c.email) warnings.push(`${c.name}: ${m.T.noEmail}`);
    out.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: `* ${m.T.corresponding}: `, bold: true }), new TextRun(c.name + (c.email ? `. ${m.T.email}: ${c.email}` : ""))] }));
  }
  for (const a of m.authors) if (a.members?.length) out.push(new Paragraph({ children: [new TextRun({ text: `${m.T.members} ${a.name}: `, bold: true }), new TextRun(a.members.join(", "))] }));
  // conflicts: one sentence when every author declares the same; none declared, no empty
  // heading (phase 1 test), only the warning
  const texts = new Set(m.conflicts.map((c) => c.text));
  const heading = (text: string) => out.push(new Paragraph({ style: tpl.style("heading 1"), children: [new TextRun(text)] }));
  const paragraphs = (list: string[]) => list.forEach((p) => out.push(new Paragraph({ children: [new TextRun(p)] })));
  // record 0088: a section the blinded manuscript leaves here, under its own heading; the
  // conflicts and the acknowledgements, together with what the authors' form says
  const moved = (role: string) => m.moved.filter((s) => s.role === role);
  for (const s of moved("conflicts")) { heading(s.heading); paragraphs(s.paragraphs); }
  if (m.conflicts.length && !moved("conflicts").length) heading(m.T.conflicts);
  if (!m.conflicts.length && !moved("conflicts").length) warnings.push(m.T.noConflicts);
  else if (texts.size === 1 && m.conflicts.length === m.authors.length) out.push(new Paragraph({ children: [new TextRun([...texts][0])] }));
  else m.conflicts.forEach((c) => out.push(new Paragraph({ children: [new TextRun({ text: `${c.name}: `, italics: true }), new TextRun(c.text)] })));
  if (m.contributions.length) {
    out.push(new Paragraph({ style: tpl.style("heading 1"), children: [new TextRun(m.contributionsTitle)] }));
    m.contributions.forEach((c) => out.push(new Paragraph({ children: [new TextRun({ text: `${c.name}: `, italics: true }), new TextRun(`${c.roles.join(", ")}.`)] })));
  }
  const ack = moved("acknowledgements");
  if (m.acknowledged.length || ack.length) {
    heading(ack[0]?.heading || m.T.ack);
    for (const s of ack) paragraphs(s.paragraphs);
    if (m.acknowledged.length) out.push(new Paragraph({ children: [new TextRun(m.acknowledged.join(", ") + ".")] }));
  }
  for (const s of m.moved) if (s.role !== "conflicts" && s.role !== "acknowledgements") { heading(s.heading); paragraphs(s.paragraphs); }

  const doc = new Document({
    externalStyles: tpl.xml,
    title: "", creator: "", lastModifiedBy: "",
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: margin, right: margin } } },
      ...(fmt?.pageNumbers?.value !== false ? { footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) } } : {}),
      children: out,
    }],
  });
  const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));
  const path = `articles/${folder}/exports/${folder}-${m.lang === "es" ? "portada" : "title-page"}.docx`;
  await project.fs.write(path, bytes);
  return { bytes, path, warnings };
}
