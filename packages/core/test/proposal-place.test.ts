// Record 0097: where the proposals of a returned copy go in the text as it is now.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { baseBlocksOf, blockMapping, blockUnits, blocksById, decideProposals, loadProposalSets, placeProposal, zoneOf, type Proposal } from "../src/proposal-place.ts";
import { trackedProject } from "./tracked-fixture.ts";

const MARTA = { name: "Marta Ríos Navarro" };

/** A copy where Marta adds a sentence with tracking, rejects "crónica " and puts back "adulta". */
async function martaCopy() {
  const p = await trackedProject();
  const out = await exportDocx(p, "main", "coauthors", await nodeResources());
  const zip = await JSZip.loadAsync(out.bytes);
  let xml = await zip.file("word/document.xml")!.async("string");
  xml = xml.replace(/Primera mitad\.<\/w:t><\/w:r>/, `$&<w:ins w:id="9001" w:author="Marta Ríos Navarro" w:date="2026-11-26T09:00:00Z"><w:r><w:t xml:space="preserve"> Añadido.</w:t></w:r></w:ins>`);
  xml = xml.replace(/<w:ins [^>]*><w:r><w:t xml:space="preserve">crónica <\/w:t><\/w:r><\/w:ins>/, "");
  xml = xml.replace(/<w:del [^>]*><w:r>(<w:rPr>(?:(?!<\/w:rPr>).)*<\/w:rPr>)?<w:delText xml:space="preserve">adulta<\/w:delText><\/w:r><\/w:del>/, '<w:r>$1<w:t xml:space="preserve">adulta</w:t></w:r>');
  zip.file("word/document.xml", xml);
  const back = await importCopy(p, "main", await zip.generateAsync({ type: "uint8array" }), { fileName: "rios.docx", returnedBy: MARTA });
  return { p, back };
}
const docsOf = (p: Awaited<ReturnType<typeof trackedProject>>) => [...p.articles[0].documents.values()].map((d) => d.doc as PMNode);
const text = (n: PMNode | undefined): string => (n?.text ?? "") + (n?.content ?? []).map(text).join("");

describe("proposals in the text as it is now (record 0097)", () => {
  it("map offsets of the version sent through what changed since", () => {
    const m = blockMapping("La artritis es crónica.", "La artritis reumatoide es crónica.");
    expect(m.map("La artritis".length)).toBe("La artritis".length);
    expect(m.map("La artritis es".length)).toBe("La artritis reumatoide es".length);
    expect(m.changed(0, 2)).toBe(false);
    expect(m.changed("La artritis ".length - 2, "La artritis es".length)).toBe(true);
    // keywords: "a; b" with each keyword's ProseMirror offsets, none inside the separator
    const k = blockUnits({ type: "keywords", attrs: { id: "b-k" }, content: [
      { type: "keyword", content: [{ type: "text", text: "DAS28" }] }, { type: "keyword", content: [{ type: "text", text: "sinovitis" }] },
    ] })!;
    expect(k.text).toBe("DAS28; sinovitis");
    expect(k.pm[0]).toBe(1);
    expect(k.pm[5]).toBe(6);
    expect(k.pm[6]).toBeNull();
    expect(k.pm[7]).toBe(8);
  });

  it("go where their text is now, or say why they cannot", async () => {
    const { p, back } = await martaCopy();
    const shown = back.set.proposals.filter((x) => x.status !== "noise-hidden" && x.kind !== "comment");
    const base = await baseBlocksOf(p, "main", back.set);
    let now = blocksById(docsOf(p));
    const place = (x: (typeof shown)[number]) => placeProposal(x, (id) => base.get(id), (id) => now.get(id));
    const added = shown.find((x) => x.after === " Añadido.")!;
    const rejects = shown.find((x) => x.before === "crónica ")!;
    const putsBack = shown.find((x) => x.after.trim() === "adulta")!;
    expect(shown).toHaveLength(3);
    // nothing written since: the new sentence goes where it was; taking back a change of the copy is rejecting it
    expect(place(added)).toEqual({ block: "b-split00001", from: "Primera mitad.".length, to: "Primera mitad.".length });
    const ins = place(rejects) as { reverts?: string };
    const del = place(putsBack) as { reverts?: string };
    expect(ins.reverts).toMatch(/^ch-/);
    expect(del.reverts).toMatch(/^ch-/);
    expect(ins.reverts).not.toBe(del.reverts);

    // the author writes before the new sentence: it follows its text
    const doc = structuredClone(docsOf(p)[0]);
    now = blocksById([doc, ...docsOf(p).slice(1)]);
    const split = now.get("b-split00001")!;
    split.content![0].text = `Ya ${split.content![0].text}`;
    expect(text(split)).toContain("Ya Primera mitad.");
    expect(place(added)).toMatchObject({ from: "Ya Primera mitad.".length });
    // and where the author changed the very text a proposal is about, it stays out of the text
    split.content![0].text = split.content![0].text!.replace("Primera mitad.", "Primera parte.");
    const close = { ...added, anchor: { ...(added.anchor as { file: "manuscript/article.scidoc"; block: string; from: number; to: number }), from: 3, to: 14 }, kind: "delete" as const, before: "mera mitad.", after: "" };
    expect(place(close)).toMatchObject({ problem: "changed", zone: { base: "Primera mitad.", mine: "Ya Primera parte." } });
  });

  it("meet the proposals of another copy already in the text: the same, a conflict, or side by side", () => {
    const tx = (text: string, marks?: PMNode["marks"]) => ({ type: "text", text, ...(marks ? { marks } : {}) }) as PMNode;
    const base = { type: "paragraph", attrs: { id: "b-1" }, content: [tx("La artritis reumatoide afecta al 1 % de la población.")] } as PMNode;
    // Marta's copy is in the text: " crónica" inserted after "reumatoide", "al " deleted
    const now = { type: "paragraph", attrs: { id: "b-1" }, content: [
      tx("La artritis reumatoide"), tx(" crónica", [{ type: "insertion", attrs: { id: "ch-m1" } }]), tx(" afecta "),
      tx("al ", [{ type: "deletion", attrs: { id: "ch-m2" } }]), tx("1 % de la población."),
    ] } as PMNode;
    const at = (x: string) => text(base).indexOf(x);
    const juan = (kind: Proposal["kind"], from: number, to: number, before: string, after: string): Proposal => ({
      id: "pr-juan000001", author: { name: "Juan" }, tracked: true, kind, anchor: { file: "manuscript/article.scidoc", block: "b-1", from, to }, before, after, status: "applicable", decision: "pending",
    });
    const place = (p: Proposal) => placeProposal(p, () => base, () => now, { foreign: (id) => id.startsWith("ch-m") });
    expect(place(juan("delete", at("al 1"), at("al 1") + 3, "al ", ""))).toEqual({ agrees: ["ch-m2"] });
    expect(place(juan("insert", at(" afecta"), at(" afecta"), "", " crónica"))).toEqual({ agrees: ["ch-m1"] });
    expect(place(juan("replace", at("al 1"), at("al 1") + 6, "al 1 %", "al 2 %"))).toEqual({ conflict: ["ch-m2"] });
    expect(place(juan("replace", at("artritis"), at(" afecta") + 7, "artritis reumatoide afecta", "AR afecta"))).toEqual({ conflict: ["ch-m1"] });
    // another insertion at the same point goes before Marta's; the rest of the sentence is free
    expect(place(juan("insert", at(" afecta"), at(" afecta"), "", " grave"))).toEqual({ block: "b-1", from: at(" afecta"), to: at(" afecta") });
    expect(place(juan("replace", at("reumatoide"), at("reumatoide") + 10, "reumatoide", "reumatoidea"))).toEqual({ block: "b-1", from: at("reumatoide"), to: at("reumatoide") + 10 });
    expect(place(juan("replace", at("población"), at("población") + 9, "población", "población adulta"))).toMatchObject({ from: at("población") + " crónica".length });
    // without knowing they come from a copy, Marta's changes look like the author's
    expect(placeProposal(juan("delete", at("al 1"), at("al 1") + 3, "al ", ""), () => base, () => now)).toEqual({ problem: "tracked" });
  });

  it("on text the author changed since, give the three versions of the stretch they share (record 0100)", () => {
    const tx = (text: string) => ({ type: "text", text }) as PMNode;
    const para = (text: string) => ({ type: "paragraph", attrs: { id: "b-1" }, content: [tx(text)] }) as PMNode;
    const sent = "El objetivo fue describir la actividad durante el primer año de tratamiento.";
    const base = para(sent), now = para("El objetivo fue describir la actividad durante el primer semestre de tratamiento.");
    const at = sent.indexOf("el primer año");
    const marta = { id: "pr-marta00001", author: { name: "Marta" }, tracked: false, kind: "replace" as const, anchor: { file: "manuscript/article.scidoc", block: "b-1", from: at, to: at + "el primer año".length }, before: "el primer año", after: "los primeros doce meses", status: "applicable" as const, decision: "pending" as const };
    const r = placeProposal(marta, () => base, () => now) as { problem: string; zone: { base: string; mine: string; theirs: string; from: number; to: number; free: boolean } };
    expect(r.problem).toBe("changed");
    expect(r.zone).toMatchObject({ base: "el primer año", mine: "el primer semestre", theirs: "los primeros doce meses", free: true });
    expect(text(now).slice(r.zone.from, r.zone.to)).toBe("el primer semestre");
    // the same edit the author already made: the same text
    const same = placeProposal({ ...marta, after: "el primer semestre" }, () => base, () => now) as typeof r;
    expect(same.zone.mine).toBe(same.zone.theirs);
    // an insertion where the author inserted the same: the same text, never twice
    const sentence = "La artritis afecta al 1 %.";
    const ins = { ...marta, kind: "insert" as const, anchor: { ...marta.anchor, from: "La artritis afecta".length, to: "La artritis afecta".length }, before: "", after: " sobre todo" };
    const twice = placeProposal(ins, () => para(sentence), () => para("La artritis afecta sobre todo al 1 %.")) as typeof r;
    expect(twice.problem).toBe("changed");
    expect(twice.zone.mine.replace(/s+/g, " ").trim()).toBe(twice.zone.theirs.replace(/s+/g, " ").trim());
    // a change inside a word widens to the whole word
    expect(zoneOf("la actividad inflamatoria", "la actividad inflamatorias", 13, 25)).toMatchObject({ from: 13, to: 25, bFrom: 13, bTo: 26 });
  });

  it("keep what the user decided, and are found again with the round's copy", async () => {
    const { p, back } = await martaCopy();
    const sets = await loadProposalSets(p, "main");
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ file: back.proposalsFile, name: MARTA.name });
    const first = back.set.proposals[0].id;
    const decided = decideProposals(back.set, [first], "accepted", { name: "Laura Herrera Gil" }, "2026-11-27T10:00:00Z");
    expect(decided.proposals[0]).toMatchObject({ decision: "accepted", decided: { by: { name: "Laura Herrera Gil" } } });
    expect(back.set.proposals[0].decision).toBe("pending");
    const again = decideProposals(decided, [first], "pending", { name: "x" }, "2026-11-27T10:00:00Z");
    expect(again.proposals[0].decided).toBeUndefined();
  });
});
