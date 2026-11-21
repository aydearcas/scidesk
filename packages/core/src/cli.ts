#!/usr/bin/env node
// SciDesk's command line (R33), on the same core as the app.
//   scidesk new <dir> --name <name> --title <title> [--lang es]
//   scidesk demo <dir>                 a new project with two paragraphs, a citation and two references
//   scidesk check <dir>                validate the project
//   scidesk export <dir> [--profile coauthors|journal|title-page] [--article main]
//   scidesk import <dir> <copy.docx> --by <name> [--article main]
//   scidesk show <dir> <proposals.json>
//   scidesk refs <dir> <file.ris|.nbib|.bib|.json>   import references into the own library
//   scidesk from-word <dir> <file.docx>              a new project from a Word document
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { NodeFs, nodeResources } from "./node-fs.ts";
import { createProject, loadProject, ProjectError } from "./project.ts";
import { createDemoProject } from "./demo.ts";
import { exportDocx, type ExportProfile } from "./docx-export.ts";
import { importCopy } from "./round.ts";
import { exportTitlePage } from "./title-page.ts";
import { importReferences } from "./library-import.ts";
import { projectFromWord } from "./word-import.ts";

const [cmd, dir, ...rest] = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));

async function main() {
  if (!cmd || !dir) {
    console.log("usage: scidesk <new|demo|from-word|check|export|import|refs|show> <project folder> …");
    process.exit(2);
  }
  const fs = new NodeFs(dir);
  switch (cmd) {
    case "new": {
      const p = await createProject(fs, { name: opt("name", basename(dir))!, fileName: basename(fs.root), title: opt("title", "Título del artículo")!, lang: opt("lang", "es") });
      console.log(`created ${p.manifestPath} (project ${p.manifest.id})`);
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
      break;
    }
    case "export": {
      const p = await loadProject(fs);
      const profile = opt("profile", "coauthors")!;
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
