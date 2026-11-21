import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  FORMATS, blockBookmark, checkDocument, checkProject, formatOfPath, newId, normalize, numberBookmark,
  orcidChecksumOk, parseBookmark, seededRandom, snapshotBookmark, stableStringify, toPublished, validate,
  type FormatName, type PMNode,
} from "../src/index.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const EXAMPLES = root + "examples/";
const PROTO = root + "../../prototypes/";

function loadProject(dir: string): Map<string, unknown> {
  const files = new Map<string, unknown>();
  const visit = (rel: string) => {
    for (const name of readdirSync(dir + rel)) {
      const p = rel ? `${rel}/${name}` : name;
      if (statSync(dir + p).isDirectory()) visit(p);
      else files.set(p, /\.(json|scidesk|scidoc|scitable|scifigure)$/.test(p) ? JSON.parse(readFileSync(dir + p, "utf8")) : "(binary)");
    }
  };
  visit("");
  return files;
}
const errors = <T extends { level: string }>(issues: T[]) => issues.filter((i) => i.level === "error");
const clone = <T>(v: T): T => structuredClone(v);

describe("example projects built from the prototypes' synthetic data", () => {
  for (const project of ["knee-oa", "composite-zotero"]) {
    it(`${project} passes every check`, () => {
      const files = loadProject(`${EXAMPLES}${project}/`);
      const issues = checkProject(files);
      expect(errors(issues)).toEqual([]);
      // every JSON file of the project is a known format
      for (const p of files.keys()) if (/\.(json|scidesk|scidoc|scitable|scifigure)$/.test(p)) expect(formatOfPath(p), p).not.toBeNull();
    });
  }

  it("standalone files validate", () => {
    const cases: [FormatName, string][] = [
      ["scidoc", "tracked-changes.scidoc"], ["scitable", "tables/prueba.scitable"], ["docx-citation", "docx-citation.json"],
      ["docx-property", "docx-property.json"], ["local-state", "local-state.json"],
    ];
    for (const [fmt, file] of cases) {
      const value = JSON.parse(readFileSync(`${EXAMPLES}standalone/${file}`, "utf8"));
      expect(validate(fmt, value, file)).toEqual([]);
      if (fmt === "scidoc" || fmt === "scitable") expect(errors(checkDocument(value, file))).toEqual([]);
    }
  });

  it("the tracked changes of prototype 7 keep their marks, each file with its own registry", () => {
    let total = 0;
    for (const file of ["tracked-changes.scidoc", "tables/prueba.scitable"]) {
      const d = JSON.parse(readFileSync(`${EXAMPLES}standalone/${file}`, "utf8"));
      const used = new Set<string>();
      JSON.stringify(d.doc, (k, v) => (k === "marks" && v.forEach((m: any) => /insertion|deletion/.test(m.type) && used.add(m.attrs.id)), v));
      expect([...used].sort()).toEqual(Object.keys(d.changes).sort());
      total += used.size;
    }
    expect(total).toBe(8);
  });
});

describe("the published JSON Schema is what SciDesk validates with", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const published = Object.fromEntries((Object.keys(FORMATS) as FormatName[]).map((n) => [n, toPublished(n)]));

  it("schemas/ is up to date (run npm run build:schemas)", () => {
    for (const [name, schema] of Object.entries(published)) {
      expect(readFileSync(`${root}schemas/${name}.schema.json`, "utf8"), name).toBe(stableStringify(schema));
    }
  });

  it("an independent validator (Ajv, JSON Schema 2020-12) agrees on every example", () => {
    const validators = Object.fromEntries(Object.entries(published).map(([n, s]) => [n, ajv.compile(s)]));
    for (const project of ["knee-oa", "composite-zotero"]) {
      for (const [p, value] of loadProject(`${EXAMPLES}${project}/`)) {
        const fmt = formatOfPath(p);
        if (!fmt) continue;
        expect(validators[fmt](value), `${project}/${p}: ${JSON.stringify(validators[fmt].errors?.slice(0, 2))}`).toBe(true);
      }
    }
    const bad = { schemaVersion: 1, documentType: "table", lang: "es", changes: {}, comments: {}, doc: { type: "tablePart", attrs: { id: "t-x" }, content: [] } };
    expect(validators.scitable(bad)).toBe(false);
    expect(validate("scitable", bad)).not.toEqual([]);
  });
});

describe("rules that catch real mistakes", () => {
  const knee = loadProject(`${EXAMPLES}knee-oa/`);
  const body = knee.get("articles/main/manuscript/article.scidoc") as any;
  const table = knee.get("articles/main/tables/tabla-1.scitable") as any;
  const withFile = (path: string, value: unknown) => new Map([...knee, [path, value]]);

  it("rejects a number stored instead of a citation", () => {
    const d = clone(body);
    d.doc.content[3].content.push({ type: "text", text: "[3]", attrs: { n: 3 } });
    expect(validate("scidoc", d)).not.toEqual([]);
  });
  it("says precisely what is wrong in the prototypes' raw files (they predate v1)", () => {
    const p7 = JSON.parse(readFileSync(`${PROTO}07-track-changes/out/word-edited.scidoc.json`, "utf8"));
    expect(validate("scidoc", { schemaVersion: 1, documentType: "article", lang: "es", comments: {}, ...p7 })).toEqual([
      { level: "error", file: undefined, path: "/doc/content/0/content/1/marks/0/attrs/id", message: 'must match pattern "^ch-[a-z0-9]{1,24}$"' },
    ]);
    const d = clone(body);
    d.doc.content.push(table.doc.content[1]); // a table straight in the body, not through a tableRef
    expect(validate("scidoc", d)[0].message).toMatch(/^a 'table' cannot go inside a 'doc'/);
  });
  it("rejects a citation of a reference that is not in the library", () => {
    const d = clone(body);
    d.doc.content[3].content.push({ type: "citation", attrs: { id: "c-new", items: [{ ref: "r-missing" }] } });
    expect(errors(checkProject(withFile("articles/main/manuscript/article.scidoc", d))).map((i) => i.message)).toContain("citation of r-missing, which is not in the library");
  });
  it("rejects a tracked change without its author in the registry", () => {
    const d = clone(body);
    d.doc.content[3].content[0].marks = [{ type: "insertion", attrs: { id: "ch-nobody" } }];
    expect(errors(checkDocument(d)).map((i) => i.message)).toContain("tracked change ch-nobody is not in the changes registry");
  });
  it("rejects a repeated block id between the body and a table (the composite document)", () => {
    const t = clone(table);
    t.doc.content[0].attrs.id = body.doc.content[3].attrs.id;
    expect(errors(checkProject(withFile("articles/main/tables/tabla-1.scitable", t))).length).toBeGreaterThan(0);
  });
  it("rejects a row that does not cover the table's columns", () => {
    const t = clone(table);
    t.doc.content[1].content[2].content.pop();
    expect(errors(checkDocument(t)).some((i) => /covers 3 columns/.test(i.message))).toBe(true);
  });
  it("rejects a note call to a note of another table", () => {
    const t = clone(table);
    const cell = t.doc.content[1].content[2].content[0].content[0];
    cell.content = [...(cell.content ?? []), { type: "noteRef", attrs: { target: "n-elsewhere" } }];
    expect(errors(checkDocument(t)).some((i) => /not a note of this table/.test(i.message))).toBe(true);
  });
  it("rejects a cross-reference to nothing and a title after the text", () => {
    const d = clone(body);
    d.doc.content[3].content.push({ type: "xref", attrs: { target: "t-gone" } });
    d.doc.content.push({ type: "title", attrs: { id: "b-late", lang: "es" } });
    const msgs = errors(checkProject(withFile("articles/main/manuscript/article.scidoc", d))).map((i) => i.message);
    expect(msgs.some((m) => /cross-reference to t-gone/.test(m)) || msgs.some((m) => /title can only be at the start/.test(m))).toBe(true);
    expect(errors(checkDocument(d)).some((i) => /title can only be at the start/.test(i.message))).toBe(true);
  });
  it("rejects an affiliation an author does not have, and a wrong ORCID", () => {
    const people = clone(knee.get("people/people.json") as any);
    people.people[0].orcid = "0000-0002-1825-0098";
    expect(errors(checkProject(withFile("people/people.json", people))).some((i) => /check digit/.test(i.message))).toBe(true);
    const authors = clone(knee.get("articles/main/authors.json") as any);
    authors.authors[0].affiliations = [people.affiliations[2].id];
    expect(errors(checkProject(withFile("articles/main/authors.json", authors))).some((i) => /is not one of the person's/.test(i.message))).toBe(true);
  });
  it("rejects machine state in library.json (it belongs to each computer)", () => {
    const lib = clone(loadProject(`${EXAMPLES}composite-zotero/`).get("references/library.json") as any);
    lib.references[0].zotero.serverId = "YtkYpNy6ednQ";
    expect(validate("library", lib)).not.toEqual([]);
  });
  it("rejects a Zotero citation field without URI (record 0027)", () => {
    const f = JSON.parse(readFileSync(`${EXAMPLES}standalone/docx-citation.json`, "utf8"));
    f.citationItems[0].uris = [];
    expect(validate("docx-citation", f)).not.toEqual([]);
  });
});

describe("normalisation on load (record 0021, rule 1)", () => {
  it("gives ids to prototype 8's fixture, renames repeated ones and keeps a part's id with its reference", () => {
    const fix = `${PROTO}08-composite-document/fixture-project/articles/main/`;
    const seen = new Set<string>();
    const random = seededRandom(1);
    const art = JSON.parse(readFileSync(fix + "manuscript/article.scidoc", "utf8")).doc as PMNode;
    const t1 = JSON.parse(readFileSync(fix + "tables/baseline.scitable", "utf8")).doc as PMNode;
    const t2 = JSON.parse(readFileSync(fix + "tables/response.scitable", "utf8")).doc as PMNode;
    for (const d of [art, t1, t2]) for (const n of [d, ...(d.content ?? [])]) if (n.attrs?.id) n.attrs.id = String(n.attrs.id).replace(/^tab-/, "t-");
    t2.content!.at(-1)!.attrs!.id = "n-a"; // as if the note had been copied from the other table
    const log = [art, t1, t2].flatMap((d) => normalize(d, seen, random));
    expect(log.some((l) => /missing id/.test(l))).toBe(true);
    expect(log.some((l) => /repeated id n-a/.test(l))).toBe(true);
    expect(t1.attrs!.id).toBe("t-basal");
  });
  it("removes U+200B without a mark and keeps marked ones", () => {
    const doc: PMNode = { type: "paragraph", attrs: { id: "b-1" }, content: [
      { type: "text", text: "a​b" },
      { type: "text", text: "​", marks: [{ type: "insertion", attrs: { id: "ch-1" } }] },
    ] };
    normalize(doc);
    expect(doc.content!.map((c) => c.text)).toEqual(["ab", "​"]);
  });
});

describe("ids and DOCX markers", () => {
  it("bookmarks carry the id and fit Word's 40 characters", () => {
    const random = seededRandom(7);
    for (const kind of ["b", "n", "t", "f", "s"] as const) {
      const id = newId(kind, random);
      for (const name of [blockBookmark(id), numberBookmark(id), snapshotBookmark(id)]) {
        expect(name.length).toBeLessThanOrEqual(40);
        expect(name).toMatch(/^_[A-Za-z0-9_]+$/);
        expect(parseBookmark(name)?.id).toBe(id);
      }
    }
    expect(blockBookmark("b-4e114f5c")).toBe("_SD_b_4e114f5c"); // record 0025's example
    expect(parseBookmark("_Toc123456")).toBeNull();
  });
  it("checks the ORCID check digit", () => {
    expect(orcidChecksumOk("0000-0002-1825-0097")).toBe(true);
    expect(orcidChecksumOk("0000-0002-1000-000X")).toBe(true);
    expect(orcidChecksumOk("0000-0002-1825-0098")).toBe(false);
  });
});
