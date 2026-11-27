// Record 0097: where the proposals of a returned copy go in the text as it is now.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { PMNode } from "@scidesk/formats";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { importCopy } from "../src/round.ts";
import { baseBlocksOf, blockMapping, blockUnits, blocksById, decideProposals, loadProposalSets, placeProposal } from "../src/proposal-place.ts";
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
    expect(place(close)).toEqual({ problem: "changed" });
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
