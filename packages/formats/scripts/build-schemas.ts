// Writes the published JSON Schema of every format to schemas/<name>.schema.json, with
// stable key order so that a change shows as a readable diff.
//   npm run build:schemas
import { mkdirSync, writeFileSync } from "node:fs";
import { FORMATS, toPublished, type FormatName } from "../src/registry.ts";
import { stableStringify } from "../src/stable-json.ts";

const out = new URL("../schemas/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const name of Object.keys(FORMATS) as FormatName[]) {
  writeFileSync(new URL(`${name}.schema.json`, out), stableStringify(toPublished(name)));
  console.log(`schemas/${name}.schema.json`);
}
