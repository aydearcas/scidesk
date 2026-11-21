// The marks of the DOCX "for co-authors" (records 0025 and 0027): hidden bookmarks, Zotero
// citation fields, REF/SEQ fields and document properties. They are hints for re-import,
// never the truth: block identity is always confirmed by content.
//
// Bookmark names admit letters, digits and "_" (up to 40 characters, and Word hides those
// that start with "_"). A SciDesk id "<kind>-<suffix>" is written with its hyphen turned into
// "_": b-4e114f5c -> _SD_b_4e114f5c.
import Type from "typebox";
import { Strict, Uuid } from "./common.ts";
import { IdOf, ID_PATTERN } from "./ids.ts";

export const MARKERS = {
  /** Around the content of a block (also in cells, captions and notes), and around a whole table or figure part. */
  block: "_SD_",
  /** Around the SEQ field with the number of a table or figure; REF fields point to it. */
  number: "_SDn_",
  /** At the start of the document: the snapshot the copy was sent from. */
  snapshot: "_SDs_",
} as const;

export const BOOKMARK_MAX = 40;

const toName = (prefix: string, id: string) => {
  if (!new RegExp(ID_PATTERN).test(id)) throw new Error(`not a SciDesk id: ${id}`);
  const name = prefix + id.replace("-", "_");
  if (name.length > BOOKMARK_MAX) throw new Error(`bookmark too long: ${name}`);
  return name;
};

/** _SD_b_…, _SD_n_…, _SD_t_… or _SD_f_…: the bookmark of a block, note, table or figure. */
export const blockBookmark = (id: string) => toName(MARKERS.block, id);
/** _SDn_t_…: the bookmark around the number of a table or figure. */
export const numberBookmark = (id: string) => toName(MARKERS.number, id);
/** _SDs_s_…: the snapshot the copy was sent from. */
export const snapshotBookmark = (snapshotId: string) => toName(MARKERS.snapshot, snapshotId);

/** The id a SciDesk bookmark carries, with what it marks; null for any other bookmark. */
export function parseBookmark(name: string): { marker: keyof typeof MARKERS; id: string } | null {
  for (const [marker, prefix] of Object.entries(MARKERS) as [keyof typeof MARKERS, string][]) {
    if (!name.startsWith(prefix)) continue;
    const m = /^([a-z]{1,2})_([a-z0-9]{1,24})$/.exec(name.slice(prefix.length));
    if (m && new RegExp(ID_PATTERN).test(`${m[1]}-${m[2]}`)) return { marker, id: `${m[1]}-${m[2]}` };
  }
  return null;
}

/** Fields SciDesk writes. Labels of SEQ follow the language of the document. */
export const FIELDS = {
  citation: "ADDIN ZOTERO_ITEM CSL_CITATION",
  bibliography: "ADDIN ZOTERO_BIBL",
  seq: (label: string) => `SEQ ${label} \\* ARABIC`,
  ref: (targetId: string) => `REF ${numberBookmark(targetId)} \\h`,
} as const;

export const SEQ_LABELS: Record<string, { table: string; figure: string }> = {
  es: { table: "Tabla", figure: "Figura" },
  en: { table: "Table", figure: "Figure" },
};

/** URI of a reference that is not in the user's Zotero (record 0027): stable, own. */
export const ownReferenceUri = (projectId: string, referenceId: string) => `https://scidesk.app/ref/${projectId}/${referenceId}`;

/** The JSON of a citation field, as SciDesk writes it (Zotero's format). */
export const ZoteroCitationField = Strict({
  citationID: IdOf("c", "The id of the citation in SciDesk."),
  properties: Type.Object({
    formattedCitation: Type.String(),
    plainCitation: Type.String(),
    noteIndex: Type.Integer({ minimum: 0 }),
  }),
  citationItems: Type.Array(Type.Object({
    id: Type.Union([Type.String(), Type.Integer()]),
    uris: Type.Array(Type.String({ pattern: "^https?://\\S+$" }), { minItems: 1, description: "Always one URI (record 0027)." }),
    itemData: Type.Object({ type: Type.String() }, { description: "CSL-JSON of the reference." }),
    locator: Type.Optional(Type.String()),
    label: Type.Optional(Type.String()),
    prefix: Type.Optional(Type.String()),
    suffix: Type.Optional(Type.String()),
    "suppress-author": Type.Optional(Type.Boolean()),
  }), { minItems: 1 }),
  schema: Type.Literal("https://github.com/citation-style-language/schema/raw/master/csl-citation.json"),
}, { title: "Citation field of a SciDesk DOCX (ADDIN ZOTERO_ITEM CSL_CITATION)" });

/** Value of the custom document property "SciDesk" (JSON). */
export const DocxProperty = Strict({
  format: Type.Literal(1),
  project: Uuid,
  article: IdOf("a"),
  snapshot: IdOf("s", "Snapshot saved at export: the base of the three-way merge (R42)."),
  profile: Type.Literal("coauthors"),
}, { title: "Custom property 'SciDesk' of a DOCX for co-authors" });

export const ZOTERO_PREF_PROPERTY = "ZOTERO_PREF_"; // ZOTERO_PREF_1, _2…: chunks of 255 characters
export const SCIDESK_PROPERTY = "SciDesk";
