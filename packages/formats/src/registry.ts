// Every published format: its file, its JSON Schema id and its definition. The published
// JSON Schema (schemas/*.schema.json) and the validator SciDesk uses are the same object:
// toPublished() of the definition (validate.ts compiles it), so what is published is
// exactly what is checked (R34).
import type { TSchema } from "typebox";
import { Authors } from "./authors.ts";
import { DocxProperty, ZoteroCitationField } from "./docx-markers.ts";
import { JournalProfile } from "./journal-profile.ts";
import { Library } from "./library.ts";
import { LocalProjectState } from "./local-state.ts";
import { People } from "./people.ts";
import { Article, Manifest } from "./project.ts";
import { ProposalSet, Round } from "./proposals.ts";
import { Scidoc, Scifigure, Scitable } from "./scidoc.ts";

export const SCHEMA_BASE = "https://scidesk.app/schema/v1/";

export const FORMATS = {
  scidoc: { schema: Scidoc, files: "*.scidoc" },
  scitable: { schema: Scitable, files: "tables/*.scitable" },
  scifigure: { schema: Scifigure, files: "figures/*.scifigure" },
  manifest: { schema: Manifest, files: "*.scidesk" },
  article: { schema: Article, files: "articles/*/article.json" },
  authors: { schema: Authors, files: "articles/*/authors.json" },
  people: { schema: People, files: "people/people.json" },
  library: { schema: Library, files: "references/library.json" },
  "journal-profile": { schema: JournalProfile, files: "resources/journals/*.json" },
  round: { schema: Round, files: "articles/*/rounds/*/round.json" },
  "proposal-set": { schema: ProposalSet, files: "articles/*/rounds/*/proposals/*.json, articles/*/proposals/*.json" },
  "docx-citation": { schema: ZoteroCitationField, files: "(inside a DOCX: citation field)" },
  "docx-property": { schema: DocxProperty, files: "(inside a DOCX: custom property SciDesk)" },
  "local-state": { schema: LocalProjectState, files: "(app data folder) projects/<id>/state.json" },
} as const satisfies Record<string, { schema: TSchema; files: string }>;

export type FormatName = keyof typeof FORMATS;

/** Plain, standard JSON Schema 2020-12 from a TypeBox definition. */
export function toPublished(name: FormatName): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(FORMATS[name].schema)) as Record<string, any>;
  const defs: string[] = raw.$defs ? Object.keys(raw.$defs) : [];
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string" && defs.includes(v)) out[k] = `#/$defs/${v}`;
      else if (k === "$id") continue; // TypeBox names each definition with a relative $id
      else out[k] = walk(v);
    }
    return out;
  };
  const body = walk(raw) as Record<string, unknown>;
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `${SCHEMA_BASE}${name}.schema.json`, ...body };
}
