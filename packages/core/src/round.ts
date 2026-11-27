// Importing a returned copy into the review round of the version it was sent from
// (format spec, section 7): the copy is kept in rounds/<round>/copies/, its proposals in
// rounds/<round>/proposals/<copy>.json. The round is the one whose sent snapshot the copy
// names (SciDesk property, or the _SDs_ bookmark if Word lost the properties).
import { newId, stableStringify, validate, type PMNode, type ProposalSetFile, type RoundFile } from "@scidesk/formats";
import { readDocx, settleSentChanges } from "./docx-read.ts";
import { revisionKey, sentRevisionKeys } from "./docx-export.ts";
import { now, type Project } from "./project.ts";
import { baseBlocks, proposalsFromCopy, type BaseBlock } from "./proposals.ts";
import { loadSnapshot } from "./snapshot.ts";

async function sha256(bytes: Uint8Array) {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "copia";

/**
 * The text blocks of the version sent, in the order the export wrote them: titles, the
 * abstract, then the body with each table and figure where it is cited (record 0021).
 */
export function sentBlocks(files: Record<string, string>, folder: string): BaseBlock[] {
  const prefix = `articles/${folder}/`;
  const doc = (p: string) => (files[prefix + p] ? (JSON.parse(files[prefix + p]).doc as PMNode) : null);
  const body = doc("manuscript/article.scidoc");
  if (!body) throw new Error("the snapshot has no article.scidoc");
  const abstract = doc("manuscript/abstract.scidoc");
  const nodes = body.content ?? [];
  const out: BaseBlock[] = [];
  for (const n of nodes) if (n.type === "title") out.push(...baseBlocks("manuscript/article.scidoc", n));
  if (abstract) out.push(...baseBlocks("manuscript/abstract.scidoc", abstract));
  for (const n of nodes) {
    if (n.type === "title") continue;
    // a table or figure deleted with tracking went as deleted text (record 0095): not in the sent blocks
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type === "tableRef" || n.type === "figureRef") {
      const part = doc(n.attrs!.src as string);
      if (part) out.push(...baseBlocks(n.attrs!.src as string, part));
    } else out.push(...baseBlocks("manuscript/article.scidoc", n));
  }
  return out;
}

export interface ImportResult { round: string; roundFolder: string; copyFile: string; proposalsFile: string; set: ProposalSetFile }

export async function importCopy(project: Project, folder: string, bytes: Uint8Array, opts: { fileName: string; returnedBy: { name: string; person?: string } }): Promise<ImportResult> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const raw = await readDocx(bytes);
  const prop = raw.scidesk as { project?: string; article?: string; snapshot?: string } | null;
  if (prop?.project && prop.project !== project.manifest.id) throw new Error("the copy comes from another project");
  if (prop?.article && prop.article !== art.article.id) throw new Error("the copy comes from another article");
  const snapshotId = prop?.snapshot ?? raw.snapshotBookmark;
  if (!snapshotId) throw new Error("the copy does not say which version it was sent from (no SciDesk property or _SDs_ bookmark); the alignment by content without a base (plan B) comes in phase 2");
  const snapshot = await loadSnapshot(project.fs, snapshotId);
  const base = sentBlocks(snapshot.files, folder);
  // record 0095: the tracked changes that went in the copy are part of what was sent
  const prefix = `articles/${folder}/`;
  const sentDocs = Object.entries(snapshot.files).filter(([f]) => f.startsWith(prefix) && /\.(scidoc|scitable|scifigure)$/.test(f)).map(([, t]) => JSON.parse(t) as { changes?: Record<string, { author: { name: string }; date: string }> });
  const read = settleSentChanges(raw, sentRevisionKeys(sentDocs, snapshot.created), revisionKey);

  // the round of that snapshot, or a new one
  const roundsDir = `articles/${folder}/rounds/`;
  const roundFiles = (await project.fs.list(roundsDir)).filter((p) => p.endsWith("/round.json"));
  let round: RoundFile | null = null;
  let roundFolder = "";
  for (const f of roundFiles) {
    const r = JSON.parse((await project.fs.readText(f))!) as RoundFile;
    if (r.sent.snapshot === snapshotId) { round = r; roundFolder = f.slice(0, -"round.json".length); break; }
  }
  if (!round) {
    const n = roundFiles.length + 1;
    roundFolder = `${roundsDir}ronda-${n}/`;
    round = { schemaVersion: 1, id: newId("rd"), name: `Ronda ${n}`, sent: { snapshot: snapshotId, date: snapshot.created }, copies: [] };
  }
  const copyId = newId("cp");
  let name = slug(opts.fileName.replace(/\.docx$/i, ""));
  if (round.copies.some((c) => c.file === `copies/${name}.docx`)) name = `${name}-${copyId.slice(3, 7)}`;
  const copyFile = `copies/${name}.docx`;
  round.copies.push({ id: copyId, file: copyFile, returnedBy: opts.returnedBy, received: now(), sha256: await sha256(bytes) });

  const set = proposalsFromCopy(base, read, { round: round.id, copy: copyId, file: `${roundFolder.slice(`articles/${folder}/`.length)}${copyFile}`, returnedBy: opts.returnedBy, snapshot: snapshotId });
  const issues = validate("round", round);
  if (issues.length) throw new Error(`invalid round: ${issues[0].message}`);
  await project.fs.write(roundFolder + copyFile, bytes);
  const proposalsFile = `${roundFolder}proposals/${name}.json`;
  await project.fs.write(proposalsFile, stableStringify(set));
  await project.fs.write(roundFolder + "round.json", stableStringify(round));
  return { round: round.id, roundFolder, copyFile: roundFolder + copyFile, proposalsFile, set };
}
