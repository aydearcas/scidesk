// Find in the manuscript (record 0044): matches across formatting, case, and never inside a
// citation or a cross-reference.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { extensions, findMatches, sectionRange } from "./editor.ts";

const schema = getSchema(extensions);
const doc = schema.nodeFromJSON({ type: "doc", content: [
  { type: "heading", attrs: { id: "b-h0000001", level: 1, role: "introduction" }, content: [{ type: "text", text: "Introducción" }] },
  { type: "paragraph", attrs: { id: "b-p0000001" }, content: [
    { type: "text", text: "La artritis " },
    { type: "text", text: "reuma", marks: [{ type: "bold" }] },
    { type: "text", text: "toide de inicio" },
    { type: "citation", attrs: { id: "c-c0000001", items: [{ ref: "r-r0000001" }] } },
    { type: "text", text: " y la Artritis psoriásica." },
  ] },
] });
const text = (m: { from: number; to: number }) => doc.textBetween(m.from, m.to);

describe("find in the manuscript", () => {
  it("finds across formatting, without case by default", () => {
    const m = findMatches(doc, "artritis", false);
    expect(m.map(text)).toEqual(["artritis", "Artritis"]);
    expect(findMatches(doc, "reumatoide", false).map(text)).toEqual(["reumatoide"]);
    expect(findMatches(doc, "intro", false).map(text)).toEqual(["Intro"]);
  });
  it("matches case when asked", () => {
    expect(findMatches(doc, "Artritis", true).map(text)).toEqual(["Artritis"]);
  });
  it("never matches across a citation", () => {
    expect(findMatches(doc, "inicio y", false)).toEqual([]);
    expect(findMatches(doc, "", false)).toEqual([]);
  });
});

describe("only in this section (record 0066)", () => {
  const h = (level: number, text: string, id: string) => ({ type: "heading", attrs: { id, level }, content: [{ type: "text", text }] });
  const p = (text: string, id: string) => ({ type: "paragraph", attrs: { id }, content: [{ type: "text", text }] });
  const d = schema.nodeFromJSON({ type: "doc", content: [
    p("Antes del primer título, artritis.", "b-s0000001"),
    h(1, "Métodos", "b-s0000002"), p("Artritis en métodos.", "b-s0000003"),
    h(2, "Pacientes", "b-s0000004"), p("Artritis en pacientes.", "b-s0000005"),
    h(1, "Resultados", "b-s0000006"), p("Artritis en resultados.", "b-s0000007"),
  ] });
  const at = (text: string) => { let pos = -1; d.descendants((n, q) => { if (pos < 0 && n.isText && n.text!.includes(text)) pos = q + n.text!.indexOf(text); }); return pos; };
  const inRange = (r: { from: number; to: number }) => findMatches(d, "artritis", false).filter((m) => m.from >= r.from && m.to <= r.to).map((m) => d.resolve(m.from).parent.textContent);
  it("a section runs to the next heading of the same level or higher, with its subsections", () => {
    const methods = sectionRange(d, at("en métodos"));
    expect(methods.title).toBe("Métodos");
    expect(inRange(methods)).toEqual(["Artritis en métodos.", "Artritis en pacientes."]);
    const patients = sectionRange(d, at("en pacientes"));
    expect([patients.title, inRange(patients)]).toEqual(["Pacientes", ["Artritis en pacientes."]]);
    expect(inRange(sectionRange(d, at("en resultados")))).toEqual(["Artritis en resultados."]);
    const before = sectionRange(d, at("Antes"));
    expect([before.title, inRange(before)]).toEqual(["", ["Antes del primer título, artritis."]]);
  });
});
