// Find in the manuscript (record 0044): matches across formatting, case, and never inside a
// citation or a cross-reference.
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { extensions, findMatches } from "./editor.ts";

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
