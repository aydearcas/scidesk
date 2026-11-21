// Prints the warnings (not errors) of the example projects: what SciDesk would show.
//   node scripts/check-examples.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkProject } from "../src/validate.ts";

for (const project of ["knee-oa", "composite-zotero"]) {
  const dir = fileURLToPath(new URL(`../examples/${project}/`, import.meta.url));
  const files = new Map<string, unknown>();
  const visit = (rel: string) => {
    for (const name of readdirSync(dir + rel)) {
      const p = rel ? `${rel}/${name}` : name;
      if (statSync(dir + p).isDirectory()) visit(p);
      else files.set(p, /\.(json|scidesk|scidoc|scitable|scifigure)$/.test(p) ? JSON.parse(readFileSync(dir + p, "utf8")) : "(binary)");
    }
  };
  visit("");
  const issues = checkProject(files);
  console.log(`${project}: ${files.size} files, ${issues.filter((i) => i.level === "error").length} errors, ${issues.filter((i) => i.level === "warning").length} warnings`);
  for (const i of issues) console.log(`  ${i.level} ${i.file ?? ""} ${i.path ?? ""}: ${i.message}`);
}
