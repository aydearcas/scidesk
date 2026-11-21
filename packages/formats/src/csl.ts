// CSL-JSON item (CSL 1.0.2), as SciDesk stores it in library.json: without `id` (the
// SciDesk id sits next to it) and normalised on import (record 0027): dates as numbers,
// the journal abbreviation under container-title-short, no unknown variables.
import Type from "typebox";
import { Strict } from "./common.ts";

export const CSL_TYPES = [
  "article", "article-journal", "article-magazine", "article-newspaper", "bill", "book", "broadcast",
  "chapter", "classic", "collection", "dataset", "document", "entry", "entry-dictionary",
  "entry-encyclopedia", "event", "figure", "graphic", "hearing", "interview", "legal_case",
  "legislation", "manuscript", "map", "motion_picture", "musical_score", "pamphlet",
  "paper-conference", "patent", "performance", "periodical", "personal_communication", "post",
  "post-weblog", "regulation", "report", "review", "review-book", "software", "song", "speech",
  "standard", "thesis", "treaty", "webpage",
] as const;

export const CSL_NAME_VARIABLES = [
  "author", "chair", "collection-editor", "compiler", "composer", "container-author", "contributor",
  "curator", "director", "editor", "editorial-director", "editor-translator", "executive-producer",
  "guest", "host", "illustrator", "interviewer", "narrator", "organizer", "original-author",
  "performer", "producer", "recipient", "reviewed-author", "script-writer", "series-creator", "translator",
] as const;

export const CSL_DATE_VARIABLES = ["accessed", "available-date", "event-date", "issued", "original-date", "submitted"] as const;

export const CSL_STANDARD_VARIABLES = [
  "abstract", "annote", "archive", "archive_collection", "archive_location", "archive-place", "authority",
  "call-number", "chapter-number", "citation-key", "citation-label", "collection-number",
  "collection-title", "container-title", "container-title-short", "dimensions", "division", "DOI",
  "edition", "event", "event-title", "event-place", "genre", "ISBN", "ISSN", "issue", "jurisdiction",
  "keyword", "language", "license", "medium", "note", "number", "number-of-pages", "number-of-volumes",
  "original-publisher", "original-publisher-place", "original-title", "page", "page-first", "part",
  "part-title", "PMCID", "PMID", "printing", "publisher", "publisher-place", "references",
  "reviewed-genre", "reviewed-title", "scale", "section", "source", "status", "supplement", "title",
  "title-short", "URL", "version", "volume", "volume-title", "volume-title-short", "year-suffix",
] as const;

export const CslName = Strict({
  family: Type.Optional(Type.String()),
  given: Type.Optional(Type.String()),
  "dropping-particle": Type.Optional(Type.String()),
  "non-dropping-particle": Type.Optional(Type.String()),
  suffix: Type.Optional(Type.String()),
  "comma-suffix": Type.Optional(Type.Boolean()),
  "static-ordering": Type.Optional(Type.Boolean()),
  literal: Type.Optional(Type.String({ description: "Organisation or group author, written as is." })),
  "parse-names": Type.Optional(Type.Boolean()),
});

const DatePart = Type.Array(Type.Integer(), { minItems: 1, maxItems: 3, description: "[year, month?, day?]" });
export const CslDate = Strict({
  "date-parts": Type.Optional(Type.Array(DatePart, { minItems: 1, maxItems: 2, description: "One date, or two for a range." })),
  season: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 4 }), Type.String()])),
  circa: Type.Optional(Type.Union([Type.Boolean(), Type.Integer(), Type.String()])),
  literal: Type.Optional(Type.String()),
  raw: Type.Optional(Type.String()),
});

const props: Record<string, any> = { type: Type.Enum(CSL_TYPES as unknown as (typeof CSL_TYPES)[number][]) };
for (const v of CSL_NAME_VARIABLES) props[v] = Type.Optional(Type.Array(CslName));
for (const v of CSL_DATE_VARIABLES) props[v] = Type.Optional(CslDate);
for (const v of CSL_STANDARD_VARIABLES) props[v] = Type.Optional(Type.Union([Type.String(), Type.Number()]));
props.categories = Type.Optional(Type.Array(Type.String()));

export const CslItem = Strict(props, { description: "CSL-JSON item (CSL 1.0.2) without id." });
