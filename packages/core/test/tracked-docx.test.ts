// Record 0095: the Word for co-authors carries the tracked changes (w:ins, w:del, w:rPrChange,
// paragraph marks, rows) and the comments with their replies; the journal gets them accepted;
// a returned copy gives proposals only for what the co-author did.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { exportDocx, placeComments } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { articleComments } from "../src/comments.ts";
import { ME, trackedProject } from "./tracked-fixture.ts";

const part = async (bytes: Uint8Array, name: string) => (await (await JSZip.loadAsync(bytes)).file(name)?.async("string")) ?? "";
const text = (xml: string) => [...xml.matchAll(/<w:(?:t|delText)(?: [^>]*)?>([^<]*)</g)].map((m) => m[1]).join("");

describe("tracked changes and comments in the Word for co-authors", () => {
  it("go as Word's revisions and comments, with their authors and dates", async () => {
    const p = await trackedProject();
    const out = await exportDocx(p, "main", "coauthors", await nodeResources());
    const xml = await part(out.bytes, "word/document.xml");
    const rev = (kind: string, author = ME.name) => new RegExp(`<w:${kind} w:id="\\d+" w:author="${author}" w:date="2026-11-2\\dT10:00:00Z"`);
    expect(xml).toMatch(new RegExp(`${rev("ins").source}><w:r><w:t xml:space="preserve">crónica </w:t></w:r></w:ins>`));
    expect(xml).toMatch(new RegExp(`${rev("del").source}><w:r><w:delText xml:space="preserve">adulta</w:delText></w:r></w:del>`));
    // the change of format
    expect(xml).toMatch(/<w:r><w:rPr><w:i\/><w:rPrChange w:id="\d+" w:author="Lucía Herrera-Gil" w:date="[^"]+"><w:rPr\/><\/w:rPrChange><\/w:rPr><w:t xml:space="preserve">inflamatoria<\/w:t><\/w:r>/);
    // the deleted citation is a deleted field, its instruction too
    expect(xml).toMatch(/<w:del [^>]*><w:r><w:fldChar w:fldCharType="begin"\/><\/w:r><w:r><w:delInstrText xml:space="preserve"> ADDIN ZOTERO_ITEM/);
    // whole paragraphs and the tracked Enter: the paragraph mark's revision; no U+200B
    expect(xml).toMatch(/<w:p>(?:(?!<\/w:p>).)*<w:rPr><w:ins w:id="\d+" w:author="Lucía Herrera-Gil"[^>]*\/><\/w:rPr>(?:(?!<\/w:p>).)*Párrafo nuevo entero\./);
    expect(xml).toMatch(/<w:p>(?:(?!<\/w:p>).)*<w:rPr><w:del w:id="\d+"[^>]*\/><\/w:rPr>(?:(?!<\/w:p>).)*<w:delText xml:space="preserve">Texto que sobraba\./);
    expect(xml).toMatch(/<w:p>(?:(?!<\/w:p>).)*<w:rPr><w:ins w:id="\d+"[^>]*\/><\/w:rPr>(?:(?!<\/w:p>).)*Primera mitad\.<\/w:t>/);
    expect(xml).not.toContain("\u200b");
    // revision ids are unique
    const revIds = [...xml.matchAll(/<w:(?:ins|del|rPrChange) w:id="(\d+)"/g)].map((m) => m[1]);
    expect(new Set(revIds).size).toBe(revIds.length);

    // comments: one range each, the reply on the same text, one reference each
    for (const id of ["0", "1", "2"]) {
      expect(xml.match(new RegExp(`<w:commentRangeStart w:id="${id}"/>`, "g"))).toHaveLength(1);
      expect(xml.match(new RegExp(`<w:commentRangeEnd w:id="${id}"/>`, "g"))).toHaveLength(1);
      expect(xml.match(new RegExp(`<w:commentReference w:id="${id}"/>`, "g"))).toHaveLength(1);
    }
    // the first comment spans from "afecta" to "El objetivo" of the next paragraph
    const range = xml.slice(xml.indexOf('<w:commentRangeStart w:id="0"/>'), xml.indexOf('<w:commentRangeEnd w:id="0"/>'));
    expect(text(range)).toMatch(/^afecta al 0,5–1 % de la población adulta y su actividad .*El objetivo$/);
    const comments = await part(out.bytes, "word/comments.xml");
    const first = /<w:comment w:id="0"[^>]*>/.exec(comments)![0];
    for (const a of ['w:author="Lucía Herrera-Gil"', 'w:initials="LHG"', 'w:date="2026-11-21T10:00:00']) expect(first).toContain(a);
    expect(text(comments)).toBe("¿Seguro?Mira la cifra.Sí, de la EULAR.Hecho.");
    const extended = await part(out.bytes, "word/commentsExtended.xml");
    expect(extended).toMatch(/w15:paraIdParent=/);
    expect(extended).toMatch(/w15:done="1"/);
    // the article tracks changes: so does the co-authors' Word
    expect(await part(out.bytes, "word/settings.xml")).toContain("<w:trackRevisions/>");
    // the keywords: the first deleted with the separator after it, "sinovitis" inserted with the one before it
    expect(xml).toMatch(/<w:del [^>]*><w:r><w:delText xml:space="preserve">artritis<\/w:delText><\/w:r><\/w:del><w:del [^>]*><w:r><w:delText xml:space="preserve">; <\/w:delText><\/w:r><\/w:del><w:r><w:t xml:space="preserve">DAS28<\/w:t><\/w:r><w:ins [^>]*><w:r><w:t xml:space="preserve">; <\/w:t><\/w:r><\/w:ins><w:ins [^>]*><w:r><w:t xml:space="preserve">sinovitis<\/w:t>/);
  });

  it("go to the journal accepted, without comments", async () => {
    const p = await trackedProject();
    const out = await exportDocx(p, "main", "journal", await nodeResources());
    const xml = await part(out.bytes, "word/document.xml");
    expect(xml).not.toMatch(/<w:ins |<w:del |<w:rPrChange|commentRange/);
    const all = text(xml);
    expect(all).toContain("La artritis reumatoide crónica afecta al 0,5–1 % de la población  y su actividad inflamatoria se mide con índices compuestos.");
    expect(all).toContain("Párrafo nuevo entero.");
    expect(all).not.toContain("Texto que sobraba.");
    expect(all).toContain("Palabras clave: DAS28; sinovitis");
    expect(await part(out.bytes, "word/comments.xml")).toBe("");
  });

  it("come back from an untouched copy without proposals, and from a co-author's copy with hers only", async () => {
    const p = await trackedProject();
    const out = await exportDocx(p, "main", "coauthors", await nodeResources());
    const back = await importCopy(p, "main", out.bytes, { fileName: "intacta.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    expect(back.set.proposals.filter((x) => x.status !== "noise-hidden").map((x) => `${x.kind} «${x.before}»→«${x.after}»`)).toEqual([]);
    expect(back.set.integrity).toBe("ok");

    // the co-author adds a sentence with tracking, rejects "crónica " and accepts the deletion of "adulta"
    const zip = await JSZip.loadAsync(out.bytes);
    let xml = await zip.file("word/document.xml")!.async("string");
    xml = xml.replace(/Primera mitad\.<\/w:t><\/w:r>/, `$&<w:ins w:id="9001" w:author="Marta Ríos Navarro" w:date="2026-11-26T09:00:00Z"><w:r><w:t xml:space="preserve"> Añadido.</w:t></w:r></w:ins>`);
    xml = xml.replace(/<w:ins [^>]*><w:r><w:t xml:space="preserve">crónica <\/w:t><\/w:r><\/w:ins>/, "");
    xml = xml.replace(/<w:del [^>]*><w:r><w:delText xml:space="preserve">adulta<\/w:delText><\/w:r><\/w:del>/, "");
    zip.file("word/document.xml", xml);
    const copy = await zip.generateAsync({ type: "uint8array" });
    const hers = await importCopy(p, "main", copy, { fileName: "rios.docx", returnedBy: { name: "Marta Ríos Navarro" } });
    const shown = hers.set.proposals.filter((x) => x.status !== "noise-hidden");
    expect(shown.map((x) => `${x.tracked ? "tracked" : "untracked"} ${x.kind} «${x.before}»→«${x.after}» ${x.author.name}`).sort()).toEqual([
      "tracked insert «»→« Añadido.» Marta Ríos Navarro",
      "untracked delete «crónica »→«» Marta Ríos Navarro",
    ]);
    expect(hers.set.integrity).toBe("ok");
    // offsets are the block's own: past the deleted "adulta", the inserted sentence is where it is
    const added = shown.find((x) => x.after === " Añadido.")!.anchor as { block: string; from: number };
    expect(added).toMatchObject({ block: "b-split00001", from: "Primera mitad.".length });
  });

  it("are listed in reading order with the text they are anchored to (scidesk comments)", async () => {
    const p = await trackedProject();
    const list = articleComments(p, "main");
    expect(list.map((c) => [c.id, c.quote, c.record.replies.length, c.record.resolved])).toEqual([
      ["cm-c1", "afecta al 0,5–1 % de la población adulta y su actividad El objetivo", 1, false],
      ["cm-c2", "Segunda mitad.", 0, true],
    ]);
  });

  it("place each comment's end at the last piece of its text", () => {
    const xml = '<w:p><w:commentRangeStart w:id="0"/><w:r/><w:commentRangeEnd w:id="0"/></w:p><w:p><w:r/><w:commentRangeEnd w:id="0"/></w:p>';
    expect(placeComments(xml, [{ word: 0, replies: [1] }], "Refdecomentario")).toBe(
      '<w:p><w:commentRangeStart w:id="0"/><w:commentRangeStart w:id="1"/><w:r/></w:p><w:p><w:r/>' +
      '<w:commentRangeEnd w:id="0"/><w:r><w:rPr><w:rStyle w:val="Refdecomentario"/></w:rPr><w:commentReference w:id="0"/></w:r>' +
      '<w:commentRangeEnd w:id="1"/><w:r><w:rPr><w:rStyle w:val="Refdecomentario"/></w:rPr><w:commentReference w:id="1"/></w:r></w:p>');
  });
});
