// references/library.json: the project's library, common to every article (record 0015).
// Each entry: SciDesk's own id, the CSL-JSON, and where it came from. In Zotero mode the
// `zotero` block keeps what identifies the item for good (key, URI, library); the sync
// state that belongs to one Zotero installation (item version, Zotero-Server-ID) stays on
// each computer (local-state.ts), so that switching between two computers does not
// rewrite this file (record 0031, correcting 0027).
import Type from "typebox";
import { DateTime, SchemaVersion, Strict } from "./common.ts";
import { CslItem } from "./csl.ts";
import { IdOf } from "./ids.ts";

export const ZoteroLink = Strict({
  key: Type.String({ pattern: "^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$", description: "Zotero item key." }),
  uri: Type.String({ pattern: "^https?://zotero\\.org/(users|groups)/(local/)?[^/]+/items/[A-Z0-9]{8}$", description: "Item URI; it goes in every citation of the DOCX (record 0027)." }),
  library: Type.Enum(["user", "group"]),
  libraryId: Type.Optional(Type.String({ description: "Group id, for group libraries." })),
  dateModified: DateTime,
});

export const IMPORT_KINDS = [
  "endnote-field", "zotero-field", "mendeley-field", "ris", "nbib", "bibtex", "csl-json", "endnote-xml",
  "pubmed", "crossref", "zotero", "manual", "project",
] as const;

export const ImportSource = Strict({
  kind: Type.Enum(IMPORT_KINDS as unknown as (typeof IMPORT_KINDS)[number][], { description: "How the reference entered the library." }),
  file: Type.Optional(Type.String({ description: "Copy of the imported file in references/imports/, or the name of the Word document the citation came from." })),
  key: Type.Optional(Type.String({ description: "Identity in the source: EndNote '<db-id>:<rec-number>', the URI of a Zotero/Mendeley field, a PMID or DOI." })),
  date: DateTime,
  unmapped: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Fields of the source that were not converted to CSL-JSON, shown to the user instead of dropped (record 0028)." })),
});

export const LibraryEntry = Strict({
  id: IdOf("r"),
  csl: CslItem,
  zotero: Type.Optional(ZoteroLink),
  source: Type.Optional(ImportSource),
  added: DateTime,
});

export const Library = Strict({
  schemaVersion: SchemaVersion,
  references: Type.Array(LibraryEntry),
}, { title: "SciDesk library (references/library.json)" });

export type LibraryFile = Type.Static<typeof Library>;
