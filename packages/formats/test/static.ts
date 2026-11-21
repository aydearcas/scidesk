// Compile-time checks: the TypeScript types come from the same definitions as the
// validators (run by `npm run typecheck`).
import type { ScitableFile, ScidocFile } from "../src/scidoc.ts";

export const table: ScitableFile = {
  schemaVersion: 1, documentType: "table", lang: "es", changes: {}, comments: {},
  doc: {
    type: "tablePart", attrs: { id: "t-x" },
    content: [
      { type: "tableCaption", attrs: { id: "b-1" } },
      { type: "table", attrs: { id: "b-2" }, content: [{ type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1 }, content: [{ type: "paragraph", attrs: { id: "b-3" } }] }] }] },
    ],
  },
};

// @ts-expect-error: schemaVersion 2 does not exist yet
export const wrongVersion: ScidocFile = { ...table, schemaVersion: 2 };
// @ts-expect-error: unknown origin of a change
export const wrongOrigin: ScitableFile = { ...table, changes: { "ch-1": { author: { name: "Ana" }, date: "2026-11-21T10:00:00Z", origin: "email" } } };
