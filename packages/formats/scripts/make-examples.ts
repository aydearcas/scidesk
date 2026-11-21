// Builds the examples of the formats from the synthetic data of the phase 0 prototypes, so
// that the formats are checked against data that already went through the prototypes:
//   examples/knee-oa/           project with its own library: the synthetic narrative review
//                               of prototypes/corpus (prototypes 3 and 6), with its tables,
//                               a figure, people and authors, the Reumatología Clínica
//                               profile (prototype 2's style) and the review round with the
//                               two returned copies and their proposals (prototype 6).
//   examples/composite-zotero/  project linked to Zotero: prototype 8's fixture (abstract and
//                               two tables as parts) citing prototype 5's library.
//   examples/standalone/        files outside a project: prototype 7's document edited in
//                               Word (tracked changes), a citation field and the property of
//                               a DOCX for co-authors, and a computer's local state.
// Ids come from a seeded generator, so every run writes the same bytes. Two inputs are
// outputs of prototypes that are not in the repository (prototypes/*/out/ is ignored):
// prototypes/05-zotero/out/library.json and prototypes/07-track-changes/out/word-edited.scidoc.json.
// Run those prototypes first; the examples themselves are committed, so the tests do not
// need them.
//   npm run make:examples
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { newId, seededRandom, type IdKind } from "../src/ids.ts";
import { ownReferenceUri } from "../src/docx-markers.ts";
import { normalize, walk } from "../src/validate.ts";
import type { PMNode } from "../src/scidoc.ts";
import { stableStringify } from "../src/stable-json.ts";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const PROTO = here("../../../prototypes/");
const OUT = here("../examples/");
const random = seededRandom(20261121);
const id = (k: IdKind) => newId(k, random);
const NOW = "2026-11-21T12:00:00Z";
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

function write(path: string, value: unknown) {
  const full = OUT + path;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof value === "string" || value instanceof Uint8Array ? value : stableStringify(value));
}
function copy(from: string, to: string) {
  mkdirSync(dirname(OUT + to), { recursive: true });
  copyFileSync(from, OUT + to);
}
const envelope = (documentType: string, doc: PMNode, extra: Record<string, unknown> = {}) =>
  ({ schemaVersion: 1, documentType, lang: "es", doc, changes: {}, comments: {}, ...extra });

// A 1×1 transparent PNG, standing for the figure's image.
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));

rmSync(OUT, { recursive: true, force: true });

// =================================================================== 1. knee-oa
{
  const SRC = PROTO + "corpus/synthetic-round-knee-oa/";
  const md = readFileSync(SRC + "source/article.md", "utf8");
  const [frontAndBody, refsMd] = md.split(/^## Referencias\s*$/m);
  const tables = ["table-1.json", "table-2.json"].map((f) => readJson(SRC + "source/" + f));
  const projectId = "6f1d2c4e-8a3b-4c7d-9e2f-1a5b7c9d0e3f";
  const articleId = id("a");

  // ---- library: the article's 37 Vancouver references, parsed as in prototypes 2–4
  const refIds: string[] = [];
  const references: unknown[] = [];
  for (const line of refsMd.split("\n")) {
    const m = /^(\d+)\.\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    const r = /^(.*)\.\s+(\d{4});\s*([^:(]*)(?:\(([^)]*)\))?(?::\s*([^.]*))?\.?\s*$/.exec(m[2]);
    const left = r ? r[1] : m[2];
    const firstDot = left.indexOf(". ");
    const lastDot = left.lastIndexOf(". ");
    const author = left.slice(0, firstDot).split(/,\s*/).filter((a) => a && a !== "et al").map((a) => {
      const p = a.trim().split(" ");
      return { family: p.slice(0, -1).join(" ") || p[0], given: p.length > 1 ? [...p.at(-1)!].join(" ") : "" };
    });
    const rid = id("r");
    refIds.push(rid);
    const csl: Record<string, unknown> = {
      type: "article-journal", author, title: left.slice(firstDot + 2, lastDot), "container-title-short": left.slice(lastDot + 2),
    };
    if (r) Object.assign(csl, { issued: { "date-parts": [[Number(r[2])]] }, volume: r[3]?.trim(), ...(r[4] ? { issue: r[4] } : {}), ...(r[5] ? { page: r[5] } : {}) });
    // reference 4 arrives from a Word document with EndNote citations (record 0028)
    const source = Number(m[1]) === 4
      ? { kind: "endnote-field", file: "borrador-coautora.docx", key: "x9vt2sdwfxa0wae9pqpvfz9qp0z5rvxt0z2f:118", date: NOW, unmapped: { "custom2": "PMC4229403" } }
      : { kind: "ris", file: "references/imports/revision-artrosis.ris", date: NOW };
    references.push({ id: rid, csl, source, added: NOW });
  }
  write("knee-oa/references/library.json", { schemaVersion: 1, references });
  write("knee-oa/references/imports/revision-artrosis.ris", "TY  - JOUR\nTI  - (copy of the imported file; synthetic)\nER  - \n");

  // ---- people and authors, from the article's byline (all fictitious)
  const lines = frontAndBody.split("\n").map((l) => l.trim()).filter(Boolean);
  const byline = lines[2].split(/,\s*/).map((s) => /^(.*?)(\d+)$/.exec(s)!);
  const affLines = lines.filter((l) => /^\d \S/.test(l));
  const affiliations = affLines.map((l) => {
    const [, n, rest] = /^(\d) (.*)$/.exec(l)!;
    const parts = rest.split(", ");
    return { n, id: id("af"), institution: parts[1], department: parts[0], city: parts[2], country: "ES" };
  });
  const people = byline.map(([, name, n]) => {
    const [given, ...family] = name.split(" ");
    return { id: id("p"), kind: "person", given, family: family.join(" "), affiliations: [affiliations.find((a) => a.n === n)!.id], email: `${given}.${family[0]}@example.org`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") };
  });
  Object.assign(people[0], { degrees: ["MD", "PhD"], orcid: "0000-0002-1825-0097", citationName: "Herrera-Gil L" });
  const group = { id: id("p"), kind: "group", name: "Grupo de Trabajo Ficticio de Artrosis", affiliations: [], members: [people[4].id, people[5].id] };
  write("knee-oa/people/people.json", {
    schemaVersion: 1,
    affiliations: affiliations.map(({ n, ...a }) => a),
    people: [...people, group],
  });
  const roles = [
    ["conceptualization", "writing-original-draft", "supervision"], ["investigation", "writing-review-editing"],
    ["formal-analysis", "writing-review-editing"], ["investigation"], ["visualization"], ["writing-review-editing"],
  ];
  write("knee-oa/articles/main/authors.json", {
    schemaVersion: 1,
    authors: people.map((p, i) => ({
      person: p.id, affiliations: p.affiliations, corresponding: i === 0,
      credit: roles[i].map((role, k) => ({ role, ...(k === 0 && i === 0 ? { degree: "lead" } : {}) })),
      ...(i === 1 || i === 2 ? { equalContribution: "e1" } : {}),
      conflicts: "Sin conflictos de interés.",
    })),
    acknowledged: [group.id],
  });

  // ---- body, abstract, tables and figure (as prototype 3's make-scidoc, in format v1)
  const tableIds = tables.map(() => id("t"));
  const figureId = id("f");
  let citations = 0;
  const expand = (s: string) => s.split(",").flatMap((p) => {
    const [a, b] = p.split(/[–-]/).map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => refIds[a + i - 1]) : [refIds[a - 1]];
  });
  function inline(text: string, notes?: Map<string, string>): PMNode[] {
    const out: PMNode[] = [];
    const push = (t: string, marks?: PMNode["marks"]) => t && out.push(marks ? { type: "text", text: t, marks } : { type: "text", text: t });
    const re = /\*\*(.+?)\*\*|\s?\[(\d+(?:\s*[,–-]\s*\d+)*)\]|\^\{([^}]*)\}|(tabla|figura) (\d)/g;
    let last = 0;
    for (const m of text.matchAll(re)) {
      push(text.slice(last, m.index));
      if (m[1]) push(m[1], [{ type: "bold" }]);
      else if (m[2]) { citations++; out.push({ type: "citation", attrs: { id: id("c"), items: expand(m[2].replace(/\s/g, "")).map((ref) => ({ ref })) } }); }
      else if (m[3] && notes?.has(m[3])) out.push({ type: "noteRef", attrs: { target: notes.get(m[3]) } });
      else if (m[3]) push(m[3], [{ type: "superscript" }]);
      else { push(m[4] + " "); out.push({ type: "xref", attrs: { target: m[4] === "tabla" ? tableIds[Number(m[5]) - 1] : figureId } }); }
      last = m.index! + m[0].length;
    }
    push(text.slice(last));
    return out;
  }
  const block = (type: string, text: string, attrs: Record<string, unknown> = {}, notes?: Map<string, string>): PMNode =>
    ({ type, attrs: { id: id(type === "tableNote" || type === "figureNote" ? "n" : "b"), ...attrs }, content: inline(text, notes) });

  tables.forEach((t, i) => {
    const notes = new Map<string, string>();
    const noteNodes = t.notes.map((n: string) => {
      const m = /^\^\{([a-z])\}\s*(.*)$/.exec(n);
      const nid = id("n");
      if (m) notes.set(m[1], nid);
      return { type: "tableNote", attrs: { id: nid, kind: m ? "specific" : "general", lang: null }, content: inline(m ? m[2] : n) };
    });
    const cell = (c: any) => (typeof c === "string" ? { text: c, colspan: 1, rowspan: 1 } : c);
    const row = (r: any[], header: boolean) => ({
      type: "tableRow",
      content: r.map(cell).map((c, k) => ({
        type: header ? "tableHeader" : "tableCell",
        attrs: { colspan: c.colspan, rowspan: c.rowspan, align: !header && k > 0 ? "center" : null },
        content: [block("paragraph", c.text, { lang: null }, notes)],
      })),
    });
    write(`knee-oa/articles/main/tables/tabla-${i + 1}.scitable`, envelope("table", {
      type: "tablePart", attrs: { id: tableIds[i] },
      content: [
        block("tableCaption", t.caption.replace(/^Tabla \d+\.\s*/, ""), { lang: null }),
        { type: "table", attrs: { id: id("b"), columnWidths: i === 0 ? [34, 20, 20, 26] : null }, content: [...t.header.map((r: any) => row(r, true)), ...t.body.map((r: any) => row(r, false))] },
        ...noteNodes,
      ],
    }));
  });
  write("knee-oa/articles/main/figures/figura-1.png", PNG);
  write("knee-oa/articles/main/figures/figura-1.scifigure", envelope("figure", {
    type: "figurePart",
    attrs: { id: figureId, image: "figures/figura-1.png", alt: "Gráfico de barras: proporción acumulada de rodillas con artrosis acelerada por visita", credit: null, license: null },
    content: [block("figureCaption", "Proporción acumulada de rodillas que cumplen la definición de artrosis acelerada en cada visita (datos sintéticos).", { lang: null })],
  }));

  const ROLES: Record<string, string> = { "Introducción": "introduction", "Conclusiones": "conclusions" };
  const body: PMNode[] = [];
  const abstract: PMNode[] = [];
  const keywords: string[] = [];
  let section = "";
  let figurePlaced = false;
  const chunks = frontAndBody.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  for (const [k, line] of chunks.entries()) {
    if (k === 0) { body.push(block("title", line.slice(2), { lang: "es" })); continue; }
    if (k === 1) { body.push(block("paragraph", line, { lang: null })); continue; } // synthetic-data notice
    if (/^\d /.test(line) || k === 2 || line.startsWith("Autor para correspondencia")) continue; // byline -> authors.json
    const h = /^(#+)\s+(.*)$/.exec(line);
    if (h) { section = h[2]; if (section !== "Resumen") body.push(block("heading", h[2], { level: h[1].length - 1, role: ROLES[h[2]] ?? null, lang: null })); continue; }
    if (section === "Resumen") {
      const m = /^\*\*(.+?):\*\*\s*(.*)$/.exec(line)!;
      if (m[1] === "Palabras clave") keywords.push(...m[2].split(/;\s*/));
      else abstract.push(block("heading", m[1], { level: 2, role: { "Introducción": "background", "Desarrollo": "other", "Conclusiones": "conclusions" }[m[1]], lang: null }), block("paragraph", m[2], { lang: null }));
      continue;
    }
    const slot = /^\[\[TABLE (\d+)\]\]$/.exec(line);
    if (slot) { const n = Number(slot[1]); body.push({ type: "tableRef", attrs: { id: tableIds[n - 1], src: `tables/tabla-${n}.scitable` } }); continue; }
    if (section === "Epidemiología" && !figurePlaced) {
      body.push(block("paragraph", line.replace(/\.$/, " (figura 1)."), { lang: null }));
      body.push({ type: "figureRef", attrs: { id: figureId, src: "figures/figura-1.scifigure" } });
      figurePlaced = true;
      continue;
    }
    body.push(block("paragraph", line, { lang: null }));
  }
  body.push(block("heading", "Bibliografía", { level: 1, role: "references", lang: null }));
  // the English title, as Reumatología Clínica asks (only the first title can come before it)
  body.splice(1, 0, { type: "title", attrs: { id: id("b"), lang: "en" }, content: [{ type: "text", text: "Accelerated knee osteoarthritis: a narrative review of its definition, epidemiology, risk factors and management" }] });
  write("knee-oa/articles/main/manuscript/article.scidoc", envelope("article", { type: "doc", content: body }));
  write("knee-oa/articles/main/manuscript/abstract.scidoc", envelope("abstract", {
    type: "doc",
    content: [
      { type: "abstractSection", attrs: { id: id("b"), lang: "es" }, content: [...abstract, { type: "keywords", attrs: { id: id("b") }, content: keywords.map((k) => ({ type: "keyword", content: [{ type: "text", text: k }] })) }] },
      {
        type: "abstractSection", attrs: { id: id("b"), lang: "en" },
        content: [
          { type: "paragraph", attrs: { id: id("b"), lang: null }, content: [{ type: "text", text: "Background: accelerated knee osteoarthritis (AKOA) is a phenotype in which a knee without established radiographic osteoarthritis progresses to advanced disease in less than four years." }, { type: "text", text: " (Synthetic test data.)", marks: [{ type: "italic" }] }] },
          { type: "keywords", attrs: { id: id("b") }, content: ["knee osteoarthritis", "rapid progression", "phenotype"].map((k) => ({ type: "keyword", content: [{ type: "text", text: k }] })) },
        ],
      },
    ],
  }, {}));

  // ---- article, manifest, journal profile and its own style
  write("knee-oa/articles/main/article.json", {
    schemaVersion: 1, id: articleId, articleType: "narrative-review", lang: "es", translations: ["en"],
    runningTitle: "Artrosis de rodilla acelerada", journal: "reumatologia-clinica",
    citationStyle: { id: "http://www.zotero.org/styles/reumatologia-clinica-scidesk-prototype" },
    referenceTermsLang: null,
    ignoredWarnings: [{ warning: "abbreviation-before-definition:OAI", status: "correct", note: "Se define en el resumen.", date: NOW, by: people[0].given + " " + people[0].family }],
  });
  write("knee-oa/artrosis-rodilla.scidesk", {
    format: "scidesk-project", schemaVersion: 1, id: projectId, name: "Artrosis de rodilla acelerada", created: NOW,
    articles: [{ id: articleId, folder: "main" }], library: { mode: "own" },
  });
  copy(PROTO + "02-citeproc/csl/reumatologia-clinica-2026.csl", "knee-oa/resources/journals/styles/reumatologia-clinica-2026.csl");
  write("knee-oa/resources/dictionary.txt", "AKOA\nKL\nOAI\n");
  const g = (value: unknown, extra: Record<string, unknown> = {}) => ({ value, source: "guide", ...extra });
  write("knee-oa/resources/journals/reumatologia-clinica.json", {
    schemaVersion: 1, id: "reumatologia-clinica",
    sources: [
      { id: "guide", kind: "author-guide", url: "https://www.reumatologiaclinica.org/es-guia-autores", title: "Guía para autores", lang: "es", accessed: "2026-11-20" },
      { id: "csl", kind: "csl-repository", url: "https://github.com/citation-style-language/styles/blob/master/reumatologia-clinica.csl", accessed: "2026-11-21" },
      { id: "scidesk", kind: "scidesk", url: "https://scidesk.app/", title: "Estilo propio de SciDesk (ficha 0026)", accessed: "2026-11-21" },
    ],
    journal: { title: g("Reumatología Clínica"), nlmAbbreviation: g("Reumatol Clin"), publisher: g("Elsevier") },
    citationStyle: { value: { id: "http://www.zotero.org/styles/reumatologia-clinica-scidesk-prototype", file: "styles/reumatologia-clinica-2026.csl", basedOn: "http://www.zotero.org/styles/elsevier-vancouver" }, source: "scidesk" },
    languages: g({ manuscript: ["es", "en"], titleAlso: ["en"], abstractAlso: ["en"], keywordsAlso: ["en"] }),
    abstract: {
      structured: g(true),
      sections: g([
        { role: "background-objective", label: { es: "Antecedentes y objetivo" } },
        { role: "patients-methods", label: { es: "Pacientes o Materiales y métodos" } },
        { role: "results", label: { es: "Resultados" } },
        { role: "discussion-conclusions", label: { es: "Discusión y Conclusiones" } },
      ]),
    },
    articleTypes: [
      { articleType: "original", journalName: { es: "Original" }, limits: { words: g(3000), figures: g(6), tables: g(6), references: g(30), authorsAdvised: g(6), keywords: g(6) } },
      { articleType: "brief-original", journalName: { es: "Original breve" }, limits: { words: g(1500), references: g(15), figuresAndTables: g(2), authors: g(6) } },
      { articleType: "case-report", journalName: { es: "Caso clínico" }, limits: { words: g(600), figures: g(1), tables: g(1), references: g(10) }, sections: g(["introduction", "case-presentation", "discussion", "conclusions"]) },
      { articleType: "letter", journalName: { es: "Carta al editor" }, limits: { words: g(600), figuresAndTables: g(1), references: g(10), authors: g(4) }, opening: g("Señor editor") },
    ],
    manuscriptFormat: {
      lineSpacing: g(2), fontSizePt: g(12), sideMarginsCm: g({ min: 2, max: 2.5 }), pageNumbers: g(true),
      justified: g(false), hyphenation: g(false), figureCaptionsList: g(true),
    },
    review: { blind: g("double"), separateTitlePage: g(true) },
    declarations: [{ kind: "ai-use", required: g(true), placement: g("before-references") }],
    optionalDocuments: [{ kind: "highlights", rules: g({ min: 3, max: 5, maxCharacters: 85 }) }, { kind: "graphical-abstract", rules: g({}) }],
    figures: { separateFiles: g(true), minDpi: g({ photo: 300, lineArt: 1000, combination: 500 }) },
    submission: { system: g("Editorial Manager") },
    notes: [g("La guía actual no da el límite de palabras del resumen (una versión anterior decía 250 para originales).", { checked: "2026-11-20" })],
  });

  // ---- review round: the copy sent, the two returned copies and one proposal set per copy
  const round = id("rd");
  const sentSnapshot = id("s");
  const base = "knee-oa/articles/main/rounds/ronda-1/";
  copy(SRC + "sent.docx", base + "sent.docx");
  const copies = [["rios", "edits-rios.json", people[1]], ["soler", "edits-soler.json", people[2]]] as const;
  const copyIds = copies.map(() => id("cp"));
  write(base + "round.json", {
    schemaVersion: 1, id: round, name: "Coautores, 1.ª ronda",
    sent: { snapshot: sentSnapshot, date: "2026-11-20T09:00:00Z", file: "sent.docx" },
    copies: copies.map(([name, , person], i) => {
      copy(SRC + `returned-${name}.docx`, base + `copies/${name}.docx`);
      return {
        id: copyIds[i], file: `copies/${name}.docx`, returnedBy: { name: `${person.given} ${person.family}`, person: person.id },
        received: "2026-11-21T08:00:00Z", sha256: createHash("sha256").update(readFileSync(SRC + `returned-${name}.docx`)).digest("hex"),
      };
    }),
  });
  // where each edit falls: the block whose text (each inline atom counts 1, as ProseMirror
  // counts it) contains its anchor; anchors that include a citation's printed number "[3]"
  // are matched with the number in place of the atom
  const blocks: { id: string; text: string; shown: string; file: string }[] = [];
  const addBlocks = (doc: PMNode, file: string) => {
    for (const [n] of walk(doc)) {
      if (!n.content || !n.content.every((c) => c.type === "text" || c.attrs)) continue;
      if (!n.content.some((c) => c.type === "text")) continue;
      let text = "", shown = "";
      for (const c of n.content) {
        if (c.type === "text") { text += c.text; shown += c.text; }
        else { text += "\uFFFC"; shown += c.type === "citation" ? ` [${(c.attrs!.items as { ref: string }[]).map((x) => refIds.indexOf(x.ref) + 1).join(",")}]` : "\uFFFC"; }
      }
      if (n.attrs?.id) blocks.push({ id: n.attrs.id as string, text, shown, file });
    }
  };
  addBlocks({ type: "doc", content: body }, "manuscript/article.scidoc");
  addBlocks({ type: "doc", content: abstract }, "manuscript/abstract.scidoc");
  const KIND: Record<string, string> = { split_paragraph: "split-paragraph" };
  const zones = new Map<string, string>();
  let matched = 0, total = 0;
  copies.forEach(([name, file, person], i) => {
    const edits = readJson(SRC + file).edits as any[];
    const proposals: unknown[] = [];
    for (const e of edits) {
      total++;
      const b = blocks.find((x) => x.text.includes(e.anchor) || x.shown.includes(e.anchor));
      if (!b) continue;
      const inText = b.text.includes(e.anchor);
      const at = (inText ? b.text : b.shown).indexOf(e.anchor) + Math.max(0, e.anchor.indexOf(e.target ?? ""));
      if (!inText && b.shown.slice(0, at).includes("[")) continue; // offsets would not be in ProseMirror units
      matched++;
      const kind = KIND[e.type] ?? e.type;
      const target = e.target ?? "";
      if (e.shared_passage && !zones.has(e.shared_passage)) zones.set(e.shared_passage, id("z"));
      proposals.push({
        id: id("pr"), author: { name: `${person.given} ${person.family}`, person: person.id }, tracked: e.tracked, kind,
        anchor: { file: b.file, block: b.id, from: at, to: at + (kind === "insert" ? 0 : target.length) },
        before: kind === "insert" ? "" : target,
        after: kind === "comment" || kind === "format" ? target : kind === "delete" ? "" : (e.text ?? ""),
        ...(kind === "comment" ? { comment: { text: e.comment, replies: [] } } : {}),
        ...(kind === "format" ? { format: { add: ["italic"], remove: [] } } : {}),
        ...(e.shared_passage ? { zone: zones.get(e.shared_passage) } : {}),
        status: e.noise ? "noise-hidden" : e.shared_passage ? "conflict-coauthors" : "applicable",
        decision: proposals.length < 2 ? "accepted" : "pending",
        ...(proposals.length < 2 ? { decided: { by: { name: `${people[0].given} ${people[0].family}`, person: people[0].id }, date: NOW } } : {}),
      });
    }
    write(base + `proposals/${name}.json`, {
      schemaVersion: 1, id: id("ps"), origin: { kind: "docx-copy", round, copy: copyIds[i], file: `rounds/ronda-1/copies/${name}.docx` },
      base: { snapshot: sentSnapshot }, created: NOW, integrity: "ok", hiddenNoise: proposals.filter((p: any) => p.status === "noise-hidden").length, proposals,
    });
  });
  console.log(`knee-oa: ${body.length} blocks in the body, ${citations} citations, ${refIds.length} references, ${matched}/${total} edits of the round anchored`);

  // ---- standalone: what the DOCX for co-authors carries
  const firstCitation = [...walk({ type: "doc", content: body })].find(([n]) => n.type === "citation")![0];
  const items = (firstCitation.attrs!.items as { ref: string }[]).map((x) => ({ x, entry: (references as any[]).find((r) => r.id === x.ref) }));
  write("standalone/docx-citation.json", {
    citationID: firstCitation.attrs!.id,
    properties: { formattedCitation: "<sup>1,2</sup>", plainCitation: "1,2", noteIndex: 0 },
    citationItems: items.map(({ x, entry }) => ({ id: x.ref, uris: [ownReferenceUri(projectId, x.ref)], itemData: { id: x.ref, ...entry.csl } })),
    schema: "https://github.com/citation-style-language/schema/raw/master/csl-citation.json",
  });
  write("standalone/docx-property.json", { format: 1, project: projectId, article: articleId, snapshot: sentSnapshot, profile: "coauthors" });
}

// =================================================================== 2. composite-zotero
{
  const FIX = PROTO + "08-composite-document/fixture-project/articles/main/";
  const zoteroLib = readJson(PROTO + "05-zotero/out/library.json") as any[];
  const projectId = "0b7e4f2a-3c9d-4e1f-a8b6-5d2c7e9f1a04";
  const articleId = id("a");
  // the fixture cites keys without a library: they become entries of prototype 5's library
  const keyMap: Record<string, string> = {};
  const library = zoteroLib.map((e) => ({
    id: id("r"),
    csl: e.csl,
    zotero: { key: e.zotero.key, uri: e.zotero.uri, library: e.zotero.library, dateModified: e.zotero.dateModified },
    source: { kind: "zotero", date: e.zotero.dateModified },
    added: e.zotero.dateModified,
  }));
  ["smolen2016", "aletaha2010", "fransen2005", "prevoo1995"].forEach((k, i) => (keyMap[k] = library[i].id));
  const partIds: Record<string, string> = { "tab-basal": "t-basal", "tab-resp": "t-resp" };
  const seen = new Set<string>();
  const convert = (doc: PMNode) => {
    for (const [n] of walk(doc)) {
      if (n.type === "citation") n.attrs = { id: null, items: (n.attrs!.refs as string[]).map((r) => ({ ref: keyMap[r] })) };
      if (n.type === "xref") n.attrs!.target = partIds[n.attrs!.target as string];
      if ((n.type === "tableRef" || n.type === "tablePart") && n.attrs?.id) n.attrs.id = partIds[n.attrs.id as string];
      if (n.type === "tableRef") n.attrs!.src = (n.attrs!.src as string).replace("baseline", "basal").replace("response", "respuesta");
      if (n.type === "tableNote") n.attrs = { ...n.attrs, kind: "general" };
      if (n.type === "tableHeader" || n.type === "tableCell") n.attrs = { colspan: 1, rowspan: 1, ...n.attrs };
      if (n.type === "heading") n.attrs = { ...n.attrs, role: { "Introducción": "introduction", "Resultados": "results", "Discusión": "discussion" }[n.content?.[0]?.text ?? ""] ?? null };
    }
    normalize(doc, seen, random); // record 0021, rule 1: the fixture has no block ids
    return doc;
  };
  const art = readJson(FIX + "manuscript/article.scidoc");
  const abs = readJson(FIX + "manuscript/abstract.scidoc");
  // the fixture's abstract is flat text; in v1 it is a section per language with its keywords
  const [, objective, results, kw] = abs.doc.content;
  abs.doc = {
    type: "doc",
    content: [{
      type: "abstractSection", attrs: { lang: "es" },
      content: [
        { type: "heading", attrs: { level: 2, role: "objective" }, content: [{ type: "text", text: "Objetivo" }] },
        { type: "paragraph", content: [{ type: "text", text: objective.content[0].text.replace(/^Objetivo:\s*/, "") }] },
        { type: "heading", attrs: { level: 2, role: "results" }, content: [{ type: "text", text: "Resultados" }] },
        { type: "paragraph", content: [{ type: "text", text: results.content[0].text.replace(/^Resultados:\s*/, "") }] },
        { type: "keywords", content: kw.content[0].text.replace(/^Palabras clave:\s*/, "").replace(/\.$/, "").split(/;\s*/).map((k: string) => ({ type: "keyword", content: [{ type: "text", text: k }] })) },
      ],
    }],
  };
  const base = "composite-zotero/articles/main/";
  write(base + "manuscript/article.scidoc", { ...envelope("article", convert(art.doc)), lang: "es" });
  write(base + "manuscript/abstract.scidoc", { ...envelope("abstract", convert(abs.doc)) });
  for (const [from, to] of [["baseline", "basal"], ["response", "respuesta"]]) {
    const t = readJson(FIX + `tables/${from}.scitable`);
    write(base + `tables/${to}.scitable`, envelope("table", convert(t.doc)));
  }
  write(base + "article.json", {
    schemaVersion: 1, id: articleId, articleType: "original", lang: "es", translations: [], journal: null,
    citationStyle: { id: "http://www.zotero.org/styles/vancouver" }, referenceTermsLang: null, ignoredWarnings: [],
  });
  write(base + "authors.json", { schemaVersion: 1, authors: [] });
  write("composite-zotero/people/people.json", { schemaVersion: 1, affiliations: [], people: [] });
  write("composite-zotero/references/library.json", { schemaVersion: 1, references: library });
  write("composite-zotero/cohorte-ar.scidesk", {
    format: "scidesk-project", schemaVersion: 1, id: projectId, name: "Cohorte de artritis reumatoide de inicio", created: NOW,
    articles: [{ id: articleId, folder: "main" }],
    library: { mode: "zotero", zotero: { library: "user", collection: "QK8M2T4N", name: "Cohorte AR" } },
  });
  // what this computer keeps about the project: the Zotero sync state (record 0031)
  write("standalone/local-state.json", {
    schemaVersion: 1, project: projectId,
    paths: [{ path: "C:/Users/usuario/OneDrive/Proyectos/cohorte-ar", lastOpened: NOW }],
    zotero: { serverId: zoteroLib[0].zotero.serverId, libraryVersion: Math.max(...zoteroLib.map((e) => e.zotero.version)), items: Object.fromEntries(zoteroLib.map((e) => [e.zotero.key, e.zotero.version])) },
  });
  console.log(`composite-zotero: ${library.length} references from Zotero, ${seen.size} ids assigned or kept`);
}

// =================================================================== 3. tracked changes (prototype 7)
{
  const p7 = readJson(PROTO + "07-track-changes/out/word-edited.scidoc.json");
  const changeIds: Record<string, string> = {};
  for (const k of Object.keys(p7.changes)) changeIds[k] = id("ch");
  for (const [n] of walk(p7.doc)) {
    for (const m of n.marks ?? []) if (m.attrs?.id && changeIds[m.attrs.id as string]) m.attrs.id = changeIds[m.attrs.id as string];
    if (n.type === "table_cell" || n.type === "table_header") { n.type = n.type === "table_cell" ? "tableCell" : "tableHeader"; n.attrs = { colspan: 1, rowspan: 1, align: null }; }
    if (n.type === "table_row") n.type = "tableRow";
    if (n.type === "citation") n.attrs = { id: null, items: [{ ref: "r-example" }] };
  }
  // in v1 a table is never inline in the body: prototype 7's table goes to its .scitable,
  // with a tableRef in its place, and each file keeps the changes of its own content
  const seen = new Set<string>();
  const tableIndex = p7.doc.content.findIndex((n: PMNode) => n.type === "table");
  const tableId = id("t");
  const tableDoc: PMNode = {
    type: "tablePart", attrs: { id: tableId },
    content: [{ type: "tableCaption", attrs: { lang: null }, content: [{ type: "text", text: "Tabla de prueba del prototipo 7" }] }, p7.doc.content[tableIndex]],
  };
  p7.doc.content[tableIndex] = { type: "tableRef", attrs: { id: tableId, src: "tables/prueba.scitable" } };
  normalize(p7.doc, seen, random);
  normalize(tableDoc, seen, random);
  const record = (k: string) => ({ author: { name: "Ana Torres" }, date: p7.changes[k].date, origin: "docx", source: "cp-example" });
  const registryFor = (doc: PMNode) => {
    const used = new Set<string>();
    for (const [n] of walk(doc)) for (const m of n.marks ?? []) if (/^(insertion|deletion|modification)$/.test(m.type)) used.add(m.attrs!.id as string);
    return Object.fromEntries(Object.keys(p7.changes).filter((k) => used.has(changeIds[k])).map((k) => [changeIds[k], record(k)]));
  };
  const bodyChanges = registryFor(p7.doc);
  const tableChanges = registryFor(tableDoc);
  write("standalone/tracked-changes.scidoc", { ...envelope("article", p7.doc), changes: bodyChanges });
  write("standalone/tables/prueba.scitable", { ...envelope("table", tableDoc), changes: tableChanges });
  console.log(`tracked-changes: ${Object.keys(bodyChanges).length} + ${Object.keys(tableChanges).length} changes from prototype 7 (Word edits), body and table`);
}
