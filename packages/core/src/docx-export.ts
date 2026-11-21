// DOCX export with the `docx` library (record 0025). Vertical slice: title, headings,
// paragraphs, lists (as paragraphs), citations and bibliography; tables, figures, the
// reference template and the journal's page format come in phase 1.
//
// Profile "coauthors" writes the marks of the format spec (section 9): a hidden bookmark
// around every block, Zotero citation fields with a URI per reference, the Zotero
// bibliography field, the ZOTERO_PREF_n and SciDesk properties, and a bookmark with the
// snapshot the copy is sent from. Profile "journal" writes plain text and no metadata.
import {
  BookmarkEnd, BookmarkStart, Document, HeadingLevel, ImportedXmlComponent, Packer, Paragraph,
  TextRun, bookmarkUniqueNumericId, type ParagraphChild,
} from "docx";
import {
  FIELDS, SCIDESK_PROPERTY, ZOTERO_PREF_PROPERTY, blockBookmark, ownReferenceUri,
  snapshotBookmark, validate, type PMNode,
} from "@scidesk/formats";
import { renderCitations, type CitationResources, type Rendering, type Run } from "./citations.ts";
import type { Project } from "./project.ts";
import { saveSnapshot } from "./snapshot.ts";

export type ExportProfile = "coauthors" | "journal";
export interface ExportResult { bytes: Uint8Array; snapshot: string | null; path: string; warnings: string[] }

const BIB_LABEL: Record<string, string> = { es: "Bibliografía", en: "References" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rPr = (r: Omit<Run, "text">) => {
  const p = (r.bold ? "<w:b/>" : "") + (r.italic ? "<w:i/>" : "") + (r.sup ? '<w:vertAlign w:val="superscript"/>' : r.sub ? '<w:vertAlign w:val="subscript"/>' : "");
  return p ? `<w:rPr>${p}</w:rPr>` : "";
};
const runXml = (r: Run) => `<w:r>${rPr(r)}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`;
const raw = (xml: string) => ImportedXmlComponent.fromXmlString(xml) as unknown as ParagraphChild;
/** A complex field with its result already formatted: Word shows it as it is. */
const fieldXml = (instr: string, result: string) =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r>` +
  `<w:r><w:fldChar w:fldCharType="separate"/></w:r>${result}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const textRun = (r: Run) => new TextRun({ text: r.text, ...(r.bold ? { bold: true } : {}), ...(r.italic ? { italics: true } : {}), ...(r.sup ? { superScript: true } : {}), ...(r.sub ? { subScript: true } : {}) });

export async function exportDocx(project: Project, folder: string, profile: ExportProfile, res: CitationResources): Promise<ExportResult> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const body = art.documents.get("manuscript/article.scidoc")!;
  const markers = profile === "coauthors";
  const warnings: string[] = [];
  const lang = art.article.lang;
  const style = art.article.citationStyle.id;
  const rendering: Rendering = await renderCitations(project.library, [body.doc as PMNode], style, art.article.referenceTermsLang ?? lang, res);
  const refById = new Map(project.library.references.map((r) => [r.id, r]));

  // R42: every export saves a snapshot, the base of the three-way merge
  const snapshot = markers ? await saveSnapshot(project, folder, `DOCX para coautores`) : null;

  // BookmarkStart/End work as paragraph children (prototype 3) but are not typed as such
  const bm = (name: string): [ParagraphChild, ParagraphChild] => {
    const id = bookmarkUniqueNumericId();
    return [new BookmarkStart(name, id) as unknown as ParagraphChild, new BookmarkEnd(id) as unknown as ParagraphChild];
  };

  function citation(n: PMNode): ParagraphChild[] {
    const r = rendering.citations.get(n.attrs!.id as string)!;
    if (!markers) return r.runs.map(textRun);
    const items = n.attrs!.items as { ref: string; locator?: string; label?: string; prefix?: string; suffix?: string; suppressAuthor?: boolean }[];
    const code = {
      citationID: n.attrs!.id,
      properties: { formattedCitation: r.html, plainCitation: r.plain, noteIndex: 0 },
      citationItems: items.map((i) => {
        const entry = refById.get(i.ref)!;
        return {
          id: i.ref,
          uris: [entry.zotero?.uri ?? ownReferenceUri(project.manifest.id, i.ref)], // record 0027
          itemData: { id: i.ref, ...entry.csl },
          ...(i.locator ? { locator: i.locator } : {}), ...(i.label ? { label: i.label } : {}),
          ...(i.prefix ? { prefix: i.prefix } : {}), ...(i.suffix ? { suffix: i.suffix } : {}),
          ...(i.suppressAuthor ? { "suppress-author": true } : {}),
        };
      }),
      schema: "https://github.com/citation-style-language/schema/raw/master/csl-citation.json" as const,
    };
    const issues = validate("docx-citation", code);
    if (issues.length) throw new Error(`invalid citation field: ${issues[0].message}`);
    return [raw(fieldXml(`${FIELDS.citation} ${JSON.stringify(code)}`, r.runs.map(runXml).join("")))];
  }

  function inlines(content: PMNode[] = []): ParagraphChild[] {
    const out: ParagraphChild[] = [];
    for (const n of content) {
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      if (marks.has("deletion")) continue; // tracked changes are exported accepted (DOCX with w:ins/w:del: V1)
      if (n.type === "text") out.push(textRun({ text: n.text!, bold: marks.has("bold"), italic: marks.has("italic"), sup: marks.has("superscript"), sub: marks.has("subscript") }));
      else if (n.type === "hardBreak") out.push(new TextRun({ break: 1 }));
      else if (n.type === "citation") out.push(...citation(n));
      else warnings.push(`'${n.type}' is not exported yet`);
    }
    return out;
  }

  const paragraphs: Paragraph[] = [];
  const block = (n: PMNode, opts: Record<string, unknown> = {}, lead: ParagraphChild[] = []) => {
    const children = [...lead, ...inlines(n.content)];
    if (markers && n.attrs?.id) {
      const [s, e] = bm(blockBookmark(n.attrs.id as string));
      children.unshift(s);
      children.push(e);
    }
    paragraphs.push(new Paragraph({ ...opts, children }));
  };
  let bibliographyPlaced = false;
  const bibliography = () => {
    bibliographyPlaced = true;
    rendering.bibliography.forEach((e, i) => {
      const runs: ParagraphChild[] = [new TextRun(`${e.label} `), ...e.runs.map(textRun)];
      const first = i === 0, last = i === rendering.bibliography.length - 1;
      const children = markers
        ? [
          ...(first ? [raw(`<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${FIELDS.bibliography} {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`)] : []),
          ...runs,
          ...(last ? [raw('<w:r><w:fldChar w:fldCharType="end"/></w:r>')] : []),
        ]
        : runs;
      paragraphs.push(new Paragraph({ indent: { left: 400, hanging: 400 }, children }));
    });
  };
  const list = (n: PMNode, depth: number) => {
    n.content?.forEach((item, k) => item.content?.forEach((child, j) => {
      if (child.type === "paragraph") block(child, { indent: { left: 360 * (depth + 1) } }, j === 0 ? [new TextRun(n.type === "orderedList" ? `${((n.attrs?.start as number) ?? 1) + k}. ` : "• ")] : []);
      else list(child, depth + 1);
    }));
  };
  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  for (const n of (body.doc as PMNode).content ?? []) {
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type === "title") block(n, { heading: HeadingLevel.TITLE });
    else if (n.type === "heading") {
      block(n, { heading: HEADINGS[((n.attrs!.level as number) ?? 1) - 1] });
      if (n.attrs!.role === "references") bibliography();
    } else if (n.type === "paragraph") block(n);
    else if (n.type === "bulletList" || n.type === "orderedList") list(n, 0);
    else warnings.push(`'${n.type}' is not exported in the vertical slice`);
  }
  if (!bibliographyPlaced && rendering.bibliography.length) {
    paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(BIB_LABEL[lang] ?? BIB_LABEL.en)] }));
    bibliography();
  }
  if (markers && snapshot && paragraphs.length) {
    // the snapshot the copy was sent from, also when the properties are lost (record 0025)
    const [s, e] = bm(snapshotBookmark(snapshot.id));
    paragraphs.unshift(new Paragraph({ children: [s, e] }));
  }

  const custom: { name: string; value: string }[] = [];
  if (markers && snapshot) {
    const pref = `<data data-version="3" zotero-version="7.0"><session id="SciDesk01"/><style id="${esc(style)}" locale="${lang === "es" ? "es-ES" : "en-US"}" hasBibliography="1" bibliographyStyleHasBeenSet="1"/><prefs><pref name="fieldType" value="Field"/><pref name="automaticJournalAbbreviations" value="true"/></prefs></data>`;
    for (let i = 0; i * 255 < pref.length; i++) custom.push({ name: `${ZOTERO_PREF_PROPERTY}${i + 1}`, value: pref.slice(i * 255, (i + 1) * 255) });
    const prop = { format: 1 as const, project: project.manifest.id, article: art.article.id, snapshot: snapshot.id, profile: "coauthors" as const };
    const propIssues = validate("docx-property", prop);
    if (propIssues.length) throw new Error(`invalid SciDesk property: ${propIssues[0].message}`);
    custom.push({ name: SCIDESK_PROPERTY, value: JSON.stringify(prop) });
  }
  const titleText = ((body.doc as PMNode).content?.find((n) => n.type === "title")?.content ?? []).map((c) => c.text ?? "").join("");
  const doc = new Document({
    ...(markers ? { title: titleText, creator: "SciDesk", lastModifiedBy: "SciDesk" } : { title: "", creator: "", lastModifiedBy: "" }),
    customProperties: custom,
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } }, children: paragraphs }],
  });
  const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));
  const name = profile === "coauthors" ? "coautores" : "revista";
  const path = `articles/${folder}/exports/${folder}-${name}${snapshot ? `-${snapshot.id}` : ""}.docx`;
  await project.fs.write(path, bytes);
  return { bytes, snapshot: snapshot?.id ?? null, path, warnings: [...new Set(warnings)] };
}
