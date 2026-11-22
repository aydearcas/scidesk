#!/usr/bin/env node
// SciDesk's command line (R33), on the same core as the app.
//   scidesk new <dir> --name <name> --title <title> [--lang es] [--type original] [--also en]
//                [--journal reumatologia-clinica] [--style <style>]   (the wizard's choices; journals: scidesk journals)
//   scidesk add-article <dir> --title <title> [--folder <name>] [--lang es] [--type …] [--also en] [--journal …] [--style …]
//                another article in the project (folder from the title by default)
//   scidesk demo <dir>                 a new project with two paragraphs, a citation and two references
//   scidesk check <dir>                validate the project and check each article (limits, words, pending, uncited)
//   scidesk table-words <dir> on|off|journal [--article main]   whether the tables' words count (record 0056)
//   scidesk ignore <dir> <warning id> [--as correct|not-applicable] [--note <text>] [--restore] [--article main]
//   scidesk export <dir> [--profile coauthors|journal|title-page|pdf] [--article main]
//                [--standard tagged|ua-1|a-2a|a-4] [--typst]   (pdf: needs the scidesk-pdf binary)
//   scidesk import <dir> <copy.docx> --by <name> [--article main]
//   scidesk show <dir> <proposals.json>
//   scidesk refs <dir> <file.ris|.nbib|.bib|.json>   import references into the own library
//   scidesk from-word <dir> <file.docx>              a new project from a Word document
//   scidesk library <dir> [--search <words>]         the library, with how often each is cited
//   scidesk ref-delete <dir> <reference id>          delete a reference that is not cited
//   scidesk authors <dir> [--article main]          who signs, with affiliations, CRediT and warnings
//   scidesk recover <dir> [--apply|--discard] [--store <folder>]   unsaved changes left by a closed window
//   scidesk styles                                   the citation styles included
//   scidesk journals [--area rheumatology,cardiology]   the journals SciDesk knows (with a profile or only
//                                                    their style); with areas, those suggested for them first
//   scidesk zotero-collections                       the collections of Zotero (local API, Zotero open)
//   scidesk zotero <dir>                             sync a library linked to a Zotero collection
//                (new … --zotero <collection key> links a new project's library to that collection)
//   scidesk areas                                    the main areas a user can choose (first start, Settings)
//   scidesk style <dir> <style> [--article main]     choose an article's style (id, file or name)
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { appLocalDataDir, readAsset, NodeFs, NodeStore, nodeResources, nodeTypstCompiler, scideskPdfBinary } from "./node-fs.ts";
import { exportPdf, manuscriptTypst, type PdfStandard } from "./typst-export.ts";
import { Recovery } from "./recovery.ts";
import { addArticle, articleFolder, createProject, loadProject, ProjectError } from "./project.ts";
import { createDemoProject } from "./demo.ts";
import { JOURNAL_CATALOG, journalTranslations } from "./new-article.ts";
import { AREAS, areaFit, splitByAreas } from "./areas.ts";
import { collectionTree, fetchTransport, syncZoteroLibrary, ZoteroLocal, zoteroLibraryMode } from "./zotero.ts";
import { exportDocx, type ExportProfile } from "./docx-export.ts";
import { importCopy } from "./round.ts";
import { exportTitlePage } from "./title-page.ts";
import { importReferences } from "./library-import.ts";
import { projectFromWord } from "./word-import.ts";
import { deleteReference, referenceUses, searchLibrary, setCitationStyle, summarize } from "./library.ts";
import { BUNDLED_STYLES, findStyle } from "./resources.ts";
import { checkAuthorship, displayName } from "./authorship.ts";
import { checkArticle, ignoreWarning, restoreWarning, setCountTableWords } from "./checks.ts";
import { titlePageModel } from "./title-page.ts";

const [cmd, dir, ...rest] = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));

async function main() {
  if (cmd === "styles") {
    for (const s of BUNDLED_STYLES) console.log(`${s.file.replace(/\.csl$/, "").padEnd(36)} ${s.format.padEnd(12)} ${s.name}${s.parent ? ` (uses ${s.parent})` : ""}`);
    return;
  }
  if (cmd === "zotero-collections") {
    for (const c of collectionTree(await new ZoteroLocal(fetchTransport()).collections())) console.log(`${c.key}  ${"  ".repeat(c.depth)}${c.name} (${c.items})`);
    return;
  }
  if (cmd === "areas") {
    for (const a of AREAS) console.log(`${a.id.padEnd(26)} ${a.group.padEnd(9)} ${String(a.openalex).padEnd(5)} ${a.name.en} / ${a.name.es}`);
    return;
  }
  if (cmd === "journals") {
    const all = process.argv.slice(3);
    const i = all.indexOf("--area");
    const areas = i >= 0 ? (all[i + 1] ?? "").split(",").map((a) => a.trim()).filter(Boolean) : [];
    const unknown = areas.filter((a) => !AREAS.some((x) => x.id === a));
    if (unknown.length) throw new Error(`unknown area ${unknown.join(", ")} (see: scidesk areas)`);
    const { suggested, others } = splitByAreas(JOURNAL_CATALOG, areas);
    const line = (j: (typeof JOURNAL_CATALOG)[number]) => console.log(`${j.id.padEnd(38)} ${j.profile ? "profile   " : "style only"}  ${j.title}${areas.length && areaFit(j.areas, areas) === 1 ? "  (general)" : ""}`);
    if (areas.length) { console.log("suggested for your areas:"); suggested.forEach(line); console.log(others.length ? "other journals:" : ""); }
    others.forEach(line);
    return;
  }
  if (!cmd || !dir) {
    console.log("usage: scidesk <new|add-article|zotero|table-words|demo|from-word|check|export|import|refs|library|ref-delete|style|authors|recover|ignore|show> <project folder> …  |  scidesk styles  |  scidesk journals  |  scidesk areas  |  scidesk zotero-collections");
    process.exit(2);
  }
  const fs = new NodeFs(dir);
  switch (cmd) {
    case "new":
    case "add-article": {
      const lang = opt("lang", "es")!;
      const entry = opt("journal") ? JOURNAL_CATALOG.find((j) => j.id === opt("journal")) : undefined;
      if (opt("journal") && !entry) throw new Error(`unknown journal ${opt("journal")} (see: scidesk journals)`);
      const profile = entry?.profile ? JSON.parse(await readAsset(`journals/${entry.profile}`)) : null;
      const style = opt("style") ? findStyle(opt("style")!)?.id : entry?.styleId;
      if (opt("style") && !style) throw new Error(`unknown style ${opt("style")} (see: scidesk styles)`);
      const choices = {
        title: opt("title", "Título del artículo")!, lang,
        articleType: opt("type", "original"), translations: opt("also")?.split(",") ?? (profile ? journalTranslations(profile, lang) : []),
        journal: profile, citationStyle: style, readStyle: (file: string) => readAsset(`styles/${file}`),
      };
      if (cmd === "add-article") {
        const before = await loadProject(fs);
        const folder = opt("folder") ?? (await articleFolder(before, choices.title));
        const p = await addArticle(before, { ...choices, folder });
        console.log(`added articles/${folder} (${p.articles.length} articles in the project)`);
        break;
      }
      let library: ReturnType<typeof zoteroLibraryMode> | undefined;
      const zotero = opt("zotero") ? new ZoteroLocal(fetchTransport()) : null;
      if (zotero) {
        const col = (await zotero.collections()).find((c) => c.key === opt("zotero"));
        if (!col) throw new Error(`no Zotero collection ${opt("zotero")} (see: scidesk zotero-collections)`);
        library = zoteroLibraryMode(col);
      }
      const p = await createProject(fs, { ...choices, name: opt("name", basename(dir))!, fileName: basename(fs.root), library });
      if (zotero) {
        const r = await syncZoteroLibrary(p, zotero);
        console.log(`linked to Zotero: ${r.total} references`);
      }
      console.log(`created ${p.manifestPath} (project ${p.manifest.id})`);
      break;
    }
    case "table-words": {
      const p = await loadProject(fs);
      const v = positional[0];
      if (!["on", "off", "journal"].includes(v ?? "")) throw new Error("usage: scidesk table-words <dir> on|off|journal [--article main]");
      const folder = opt("article", "main")!;
      await setCountTableWords(p, folder, v === "journal" ? null : v === "on");
      const r = checkArticle(p, folder);
      console.log(`${folder}: ${r.counts.main} words in the text; tables ${r.counts.tableWords}, ${r.counts.tableWordsCounted ? "counted" : "not counted"} (${r.counts.tableWordsBy})`);
      break;
    }
    case "zotero": {
      const p = await loadProject(fs);
      const r = await syncZoteroLibrary(p, new ZoteroLocal(fetchTransport()));
      console.log(`${r.total} references: ${r.added.length} added, ${r.updated.length} updated, ${r.removed.length} removed${r.keptCited.length ? `, ${r.keptCited.length} kept because cited (no longer in the collection)` : ""}`);
      for (const k of r.keptCited) console.log(`  kept: ${k.id} ${k.title}`);
      break;
    }
    case "demo": {
      await createDemoProject(fs, basename(fs.root));
      console.log(`demo project in ${fs.root}`);
      break;
    }
    case "check": {
      const p = await loadProject(fs);
      console.log(`${p.manifest.name}: ${p.articles.length} article(s), ${p.library.references.length} reference(s); ${p.issues.length} warning(s)${p.normalised.length ? `; normalised on load: ${p.normalised.length}` : ""}`);
      for (const i of p.issues) console.log(`  ${i.level} ${i.file ?? ""} ${i.path ?? ""}: ${i.message}`);
      for (const a of p.articles) {
        const r = checkArticle(p, a.folder);
        const lim = (k: string) => (r.limits[k] !== undefined ? ` / ${r.limits[k]}` : "");
        console.log(`
${a.folder}: ${r.counts.main}${lim("words")} words in the text (tables ${r.counts.tableWords}, ${r.counts.tableWordsCounted ? "counted" : "not counted"} by ${r.counts.tableWordsBy}); abstract ${r.counts.abstract.map((x) => `${x.lang} ${x.words}${lim("abstractWords")}`).join(", ") || "-"}; ${r.counts.references}${lim("references")} references, ${r.counts.tables} tables, ${r.counts.figures} figures`);
        for (const s of r.counts.sections) console.log(`    ${String(s.words).padStart(5)}  ${s.heading || "(before the first heading)"}${s.counted ? "" : "  (not counted)"}`);
        for (const w of r.warnings.filter((x) => !x.ignored)) console.log(`  ${w.level.padEnd(8)} ${w.id}  ${JSON.stringify(w.params)}`);
        const ignored = r.warnings.filter((x) => x.ignored).length;
        if (ignored) console.log(`  (${ignored} ignored)`);
      }
      break;
    }
    case "export": {
      const p = await loadProject(fs);
      const profile = opt("profile", "coauthors")!;
      if (profile === "pdf") {
        const folder = opt("article", "main")!;
        if (rest.includes("--typst")) {
          // the Typst source and its files, to look at or compile by hand
          const b = await manuscriptTypst(p, folder, await nodeResources());
          const base = `articles/${folder}/exports/${folder}-typst`;
          await fs.write(`${base}/main.typ`, b.source);
          for (const [f, bytes] of Object.entries(b.files)) await fs.write(`${base}/${f}`, bytes);
          console.log(`Typst source in ${base}/`);
        }
        const bin = scideskPdfBinary();
        if (!bin) throw new Error("the scidesk-pdf binary is not built: cargo build --release --bin scidesk-pdf --manifest-path apps/desktop/src-tauri/Cargo.toml (or set SCIDESK_PDF)");
        const r = await exportPdf(p, folder, await nodeResources(), nodeTypstCompiler(bin), { standard: opt("standard", "tagged") as PdfStandard });
        console.log(JSON.stringify({ file: r.path, pages: r.pages, kb: Math.round(r.bytes.length / 1024), warnings: r.warnings }));
        break;
      }
      if (profile === "title-page") {
        const t = await exportTitlePage(p, opt("article", "main")!, await nodeResources());
        console.log(JSON.stringify({ file: t.path, kb: Math.round(t.bytes.length / 1024), warnings: t.warnings }));
        break;
      }
      const r = await exportDocx(p, opt("article", "main")!, profile as ExportProfile, await nodeResources());
      console.log(JSON.stringify({ file: r.path, snapshot: r.snapshot, kb: Math.round(r.bytes.length / 1024), warnings: r.warnings }));
      break;
    }
    case "import": {
      const file = positional[0];
      const by = opt("by");
      if (!file || !by) throw new Error("usage: scidesk import <dir> <copy.docx> --by <name of who returned it>");
      const p = await loadProject(fs);
      const r = await importCopy(p, opt("article", "main")!, new Uint8Array(await readFile(file)), { fileName: basename(file), returnedBy: { name: by } });
      const s = r.set;
      console.log(JSON.stringify({ round: r.roundFolder, proposals: r.proposalsFile, count: s.proposals.length, tracked: s.proposals.filter((x) => x.tracked).length, untracked: s.proposals.filter((x) => !x.tracked).length, hiddenNoise: s.hiddenNoise, integrity: s.integrity }));
      break;
    }
    case "from-word": {
      const file = positional[0];
      if (!file) throw new Error("usage: scidesk from-word <empty folder> <file.docx>");
      const { report } = await projectFromWord(fs, new Uint8Array(await readFile(file)), { fileName: basename(file) });
      console.log(JSON.stringify(report));
      break;
    }
    case "refs": {
      const file = positional[0];
      if (!file) throw new Error("usage: scidesk refs <dir> <file.ris|.nbib|.bib|.json>");
      const p = await loadProject(fs);
      const r = await importReferences(p, { name: basename(file), text: await readFile(file, "utf8") });
      console.log(JSON.stringify({ format: r.format, added: r.added.length, duplicates: r.duplicates.length, copy: r.importedCopy, keptAside: r.unmapped }));
      break;
    }
    case "library": {
      const p = await loadProject(fs);
      const uses = referenceUses(p);
      const hits = searchLibrary(p.library, opt("search", "")!, Infinity);
      for (const { entry } of hits) console.log(`${entry.id}  ${String(uses.get(entry.id)?.length ?? 0).padStart(3)}×  ${summarize(entry.csl).line}`);
      console.log(`${hits.length} of ${p.library.references.length} reference(s)`);
      break;
    }
    case "ref-delete": {
      const p = await loadProject(fs);
      await deleteReference(p, positional[0] ?? "");
      console.log(`deleted ${positional[0]}`);
      break;
    }
    case "style": {
      const s = findStyle(positional[0] ?? "");
      if (!s) throw new Error(`unknown style ${positional[0] ?? ""}: see 'scidesk styles'`);
      const p = await loadProject(fs);
      await setCitationStyle(p, opt("article", "main")!, s.id);
      console.log(`${opt("article", "main")}: ${s.name} (${s.id})`);
      break;
    }
    case "authors": {
      const p = await loadProject(fs);
      const folder = opt("article", "main")!;
      const art = p.articles.find((a) => a.folder === folder);
      if (!art) throw new Error(`no article ${folder}`);
      const m = titlePageModel(p, folder);
      const byId = new Map(p.people.people.map((x) => [x.id, x]));
      art.authors.authors.forEach((a, i) => {
        const t = m.authors[i];
        console.log(`${String(i + 1).padStart(2)}. ${displayName(byId.get(a.person)!)} ${t.affiliations.join(",")}${a.corresponding ? " *" : ""}${t.equal ?? ""}  CRediT: ${a.credit.map((c) => c.role + (c.degree ? `(${c.degree})` : "")).join(", ") || "—"}`);
      });
      m.affiliations.forEach((line, i) => console.log(`    ${i + 1} ${line}`));
      for (const i of checkAuthorship(p, folder, p.people, art.authors)) console.log(`  ${i.level} ${i.code}${i.id ? ` ${displayName(byId.get(i.id) ?? { kind: "group", name: i.id } as never)}` : ""}${i.detail ? `: ${i.detail}` : ""}`);
      break;
    }
    case "recover": {
      const p = await loadProject(fs);
      const r = new Recovery(new NodeStore(opt("store", appLocalDataDir())!), p);
      const { pending, dropped } = await r.pending();
      for (const d of dropped) console.log(`dropped (${d.reason}): ${d.key}`);
      for (const x of pending) {
        const action = rest.includes("--apply") ? "apply" : rest.includes("--discard") ? "discard" : "list";
        let note = "";
        if (action === "apply") { const { snapshot } = await r.apply(x); note = snapshot ? ` -> recovered; the disk's version is in snapshot ${snapshot}` : " -> recovered"; }
        if (action === "discard") { await r.discard(x); note = " -> discarded"; }
        console.log(`${x.entry.article}/${x.entry.path}  ${x.entry.recorded}  ${x.state === "clean" ? "clean" : "the file changed on disk since"}${note}`);
      }
      if (!pending.length) console.log("nothing to recover");
      break;
    }
    case "ignore": {
      const id = positional[0];
      if (!id) throw new Error("usage: scidesk ignore <dir> <warning id> [--as correct|not-applicable] [--note <text>] [--restore]");
      const p = await loadProject(fs);
      const folder = opt("article", "main")!;
      if (rest.includes("--restore")) { await restoreWarning(p, folder, id); console.log(`restored ${id}`); break; }
      const as = opt("as", "correct") as "correct" | "not-applicable";
      await ignoreWarning(p, folder, id, as, opt("note"));
      console.log(`${id}: ${as}`);
      break;
    }
    case "show": {
      const set = JSON.parse(await readFile(positional[0] ?? "", "utf8"));
      for (const x of set.proposals) {
        if (x.status === "noise-hidden") continue;
        console.log(`${x.tracked ? "marcada   " : "sin marcar"} ${x.author.name}: ${x.kind} «${x.before}» → «${x.after}»  (${x.anchor.block ?? "tras " + x.anchor.after} ${x.anchor.from ?? ""}–${x.anchor.to ?? ""})`);
      }
      console.log(`integridad: ${set.integrity}; ruido oculto: ${set.hiddenNoise}`);
      break;
    }
    default:
      throw new Error(`unknown command ${cmd}`);
  }
}

main().catch((e) => {
  console.error(e instanceof ProjectError ? e.message : e?.stack ?? e);
  process.exit(1);
});
