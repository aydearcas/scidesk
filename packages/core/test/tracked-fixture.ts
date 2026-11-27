// Record 0095: an article with tracked changes and comments of every kind the Word for
// co-authors writes (the tests, and the local check with real Word).
import { validate, type PMNode } from "@scidesk/formats";
import { MemoryFs, type ProjectFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument, type Project } from "../src/project.ts";
import { setTrackChanges } from "../src/tracking.ts";

const valid = (file: unknown) => {
  const issues = validate("scidoc", file);
  if (issues.length) throw new Error(`invalid fixture: ${issues[0].path} ${issues[0].message}`);
};
export const ME = { name: "Lucía Herrera-Gil" };
const at = (h: number) => `2026-11-2${h}T10:00:00Z`;
const ins = (id: string) => ({ type: "insertion", attrs: { id } });
const del = (id: string) => ({ type: "deletion", attrs: { id } });
const cm = (id: string) => ({ type: "comment", attrs: { id } });
const ZW = "\u200b";

export async function trackedProject(fs: ProjectFs = new MemoryFs()): Promise<Project> {
  const p = await createDemoProject(fs);
  const art = p.articles[0];
  const file = structuredClone(art.documents.get("manuscript/article.scidoc")!);
  const body = (file.doc as PMNode).content!;
  const p2 = body.findIndex((n) => n.type === "paragraph" && n.content?.[0]?.text?.startsWith("La artritis"));
  const cite = body[p2].content!.find((n) => n.type === "citation")!;
  body[p2].content = [
    { type: "text", text: "La artritis reumatoide " },
    { type: "text", text: "crónica ", marks: [ins("ch-ins01")] },
    { type: "text", text: "afecta al 0,5–1 % de la población ", marks: [cm("cm-c1")] },
    { type: "text", text: "adulta", marks: [cm("cm-c1"), del("ch-del01")] },
    { type: "text", text: " y su actividad ", marks: [cm("cm-c1")] },
    // a change of format: the old text deleted, the same text inserted in italics, one id
    { type: "text", text: "inflamatoria", marks: [del("ch-fmt01")] },
    { type: "text", text: "inflamatoria", marks: [{ type: "italic" }, ins("ch-fmt01")] },
    { type: "text", text: " se mide con índices compuestos" },
    { ...cite, marks: [del("ch-cit01")] },
    { type: "text", text: "." },
  ];
  // the comment goes on into the next paragraph
  const p3 = body[p2 + 1];
  const [first, ...rest] = p3.content!;
  p3.content = [{ type: "text", text: "El objetivo", marks: [cm("cm-c1")] }, { type: "text", text: first.text!.slice("El objetivo".length) }, ...rest];
  // a whole paragraph inserted and one deleted, and a tracked Enter (a U+200B each side)
  body.splice(p2 + 2, 0,
    { type: "paragraph", attrs: { id: "b-newpara001", lang: null }, marks: [ins("ch-par01")], content: [{ type: "text", text: "Párrafo nuevo entero." }] },
    { type: "paragraph", attrs: { id: "b-delpara001", lang: null }, marks: [del("ch-par02")], content: [{ type: "text", text: "Texto que sobraba." }] },
    { type: "paragraph", attrs: { id: "b-split00001", lang: null }, content: [{ type: "text", text: "Primera mitad." }, { type: "text", text: ZW, marks: [ins("ch-split1")] }] },
    { type: "paragraph", attrs: { id: "b-split00002", lang: null }, content: [{ type: "text", text: ZW, marks: [ins("ch-split1")] }, { type: "text", text: "Segunda mitad.", marks: [cm("cm-c2")] }] },
  );
  const ids = ["ch-ins01", "ch-del01", "ch-fmt01", "ch-cit01", "ch-par01", "ch-par02", "ch-split1"];
  file.changes = Object.fromEntries(ids.map((id, i) => [id, { author: ME, date: at(i % 4), origin: "local" as const }]));
  file.comments = {
    "cm-c1": { author: ME, date: at(1), origin: "local", text: "¿Seguro?\nMira la cifra.", resolved: false, replies: [{ author: { name: "Marta Ríos Navarro" }, date: at(2), text: "Sí, de la EULAR." }] },
    "cm-c2": { author: { name: "Marta Ríos Navarro" }, date: at(3), origin: "docx", text: "Hecho.", resolved: true, replies: [] },
  };
  valid(file);
  await saveDocument(p, art, "manuscript/article.scidoc", file);

  // the abstract's keywords: the first deleted, one inserted
  const abs = structuredClone(art.documents.get("manuscript/abstract.scidoc")!);
  const visit = (n: PMNode) => {
    if (n.type === "keywords") {
      n.content = [
        { type: "keyword", marks: [del("ch-kw02")], content: [{ type: "text", text: "artritis" }] },
        { type: "keyword", content: [{ type: "text", text: "DAS28" }] },
      ];
      n.content!.push({ type: "keyword", marks: [ins("ch-kw01")], content: [{ type: "text", text: "sinovitis" }] });
      return true;
    }
    return (n.content ?? []).some(visit);
  };
  if (!visit(abs.doc as PMNode)) throw new Error("the demo abstract has no keywords");
  abs.changes = { "ch-kw01": { author: ME, date: at(0), origin: "local" }, "ch-kw02": { author: ME, date: at(0), origin: "local" } };
  valid(abs);
  await saveDocument(p, art, "manuscript/abstract.scidoc", abs);
  await setTrackChanges(p, "main", true);
  return p;
}
