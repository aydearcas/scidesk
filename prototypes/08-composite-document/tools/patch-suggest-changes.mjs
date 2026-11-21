// Applies the one change SciDesk needs in @handlewithcare/prosemirror-suggest-changes 0.1.8
// (issue #26): a new suggestion only joins an adjacent one when a predicate allows it,
// so text typed by Luis next to Ana's insertion is not attributed to Ana.
// Idempotent. Run after npm install: node tools/patch-suggest-changes.mjs
import { readFileSync, writeFileSync } from "node:fs";
const dir = "node_modules/@handlewithcare/prosemirror-suggest-changes/dist/";
const file = dir + "replaceStep.js";
let s = readFileSync(file, "utf8");
if (!s.includes("setCanJoinSuggestion")) {
  s = s.replace(
    "export function suggestReplaceStep(",
    "let canJoinSuggestion = null;\nexport function setCanJoinSuggestion(fn) { canJoinSuggestion = fn; }\nconst joinable = (mark) => mark && (!canJoinSuggestion || canJoinSuggestion(mark.attrs[\"id\"])) ? mark : null;\nexport function suggestReplaceStep(",
  );
  s = s.replace(
    "const markBefore = nodeBefore?.marks.find((mark)=>mark.type === deletion || mark.type === insertion) ?? null;",
    "const markBefore = joinable(nodeBefore?.marks.find((mark)=>mark.type === deletion || mark.type === insertion)) ?? null;",
  );
  s = s.replace(
    "const markAfter = nodeAfter?.marks.find((mark)=>mark.type === deletion || mark.type === insertion) ?? null;",
    "const markAfter = joinable(nodeAfter?.marks.find((mark)=>mark.type === deletion || mark.type === insertion)) ?? null;",
  );
  if ((s.match(/joinable\(node/g) || []).length !== 2) throw new Error("patch did not apply: library changed");
  writeFileSync(file, s);
  const idx = dir + "index.js";
  writeFileSync(idx, readFileSync(idx, "utf8") + 'export { setCanJoinSuggestion } from "./replaceStep.js";\n');
  console.log("patched", file);
} else console.log("already patched");
