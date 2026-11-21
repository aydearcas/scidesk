// Bundles the scripts so every library shares one copy of the prosemirror packages
// (Node would otherwise load both the CommonJS and the ES build of prosemirror-transform).
import { build } from "esbuild";
for (const name of ["scenarios", "edge-cases", "dump-json", "roundtrip", "bench"]) {
  await build({
    entryPoints: [`src/${name}.js`],
    outfile: `out/${name}.mjs`,
    bundle: true,
    platform: "node",
    format: "esm",
    mainFields: ["module", "main"],
    external: ["jsdom", "debug"],
    logLevel: "warning",
  });
}
