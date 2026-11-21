// Journal profile (record 0014, PLAN 5.9): resources/journals/<id>.json in a project, and
// the same file in the public catalogue. Every datum carries its source and, when it was
// not checked on the day the source was read, its own date; a datum taken from the
// author guide carries the literal quote that supports it (what the LLM package must
// return, record 0018). SciDesk warns when a datum was checked more than 12 months ago.
import Type, { type TSchema } from "typebox";
import { DateOnly, Lang, SchemaVersion, Strict } from "./common.ts";
import { ARTICLE_TYPES } from "./project.ts";
import { SECTION_ROLES } from "./scidoc.ts";

const SourceId = Type.String({ pattern: "^[a-z0-9-]{1,32}$", description: "Id of a source listed in `sources`." });

/** A datum with its provenance. */
export const Sourced = <T extends TSchema>(value: T, description?: string) =>
  Strict({
    value,
    source: SourceId,
    quote: Type.Optional(Type.String({ minLength: 1, description: "Literal quote of the source that supports the value." })),
    checked: Type.Optional(DateOnly),
  }, description ? { description } : {});

export const Source = Strict({
  id: SourceId,
  kind: Type.Enum(["author-guide", "nlm-catalog", "openalex", "doaj", "csl-repository", "publisher", "scidesk", "other"]),
  url: Type.String({ pattern: "^https?://\\S+$" }),
  title: Type.Optional(Type.String()),
  lang: Type.Optional(Lang),
  accessed: DateOnly,
});

const Count = Type.Integer({ minimum: 0 });
const Limits = Strict({
  words: Type.Optional(Sourced(Count, "Words of the main text.")),
  abstractWords: Type.Optional(Sourced(Count)),
  references: Type.Optional(Sourced(Count)),
  figures: Type.Optional(Sourced(Count)),
  tables: Type.Optional(Sourced(Count)),
  figuresAndTables: Type.Optional(Sourced(Count, "When the guide counts figures and tables together.")),
  authors: Type.Optional(Sourced(Count)),
  authorsAdvised: Type.Optional(Sourced(Count, "Advised, not required.")),
  keywords: Type.Optional(Sourced(Count)),
  titleCharacters: Type.Optional(Sourced(Count)),
});

const AbstractRules = Strict({
  structured: Sourced(Type.Boolean()),
  sections: Type.Optional(Sourced(Type.Array(Strict({
    role: Type.Enum(SECTION_ROLES as unknown as (typeof SECTION_ROLES)[number][]),
    label: Type.Record(Lang, Type.String(), { description: "Heading as the journal writes it, by language." }),
  })))),
  keywordsMin: Type.Optional(Sourced(Count)),
});

const ArticleTypeRules = Strict({
  articleType: Type.Enum(ARTICLE_TYPES as unknown as (typeof ARTICLE_TYPES)[number][]),
  journalName: Type.Record(Lang, Type.String(), { description: "Name of the type in the journal's guide." }),
  limits: Limits,
  abstract: Type.Optional(AbstractRules),
  sections: Type.Optional(Sourced(Type.Array(Type.Enum(SECTION_ROLES as unknown as (typeof SECTION_ROLES)[number][])), "Fixed sections, in order.")),
  opening: Type.Optional(Sourced(Type.String(), "Fixed opening, e.g. 'Señor editor'.")),
});

const DECLARATIONS = ["funding", "conflicts", "ethics", "consent", "data-availability", "registration", "ai-use", "acknowledgements", "contributions"] as const;

export const JournalProfile = Strict({
  schemaVersion: SchemaVersion,
  id: Type.String({ pattern: "^[a-z0-9-]+$", description: "Profile id, e.g. reumatologia-clinica." }),
  extends: Type.Optional(Type.String({ pattern: "^[a-z0-9-]+$", description: "Base profile (e.g. of the publisher) whose data this one inherits (supposition of record 0014)." })),
  sources: Type.Array(Source, { minItems: 1 }),
  journal: Strict({
    title: Sourced(Type.String()),
    nlmAbbreviation: Type.Optional(Sourced(Type.String())),
    issnPrint: Type.Optional(Sourced(Type.String({ pattern: "^\\d{4}-\\d{3}[\\dX]$" }))),
    issnElectronic: Type.Optional(Sourced(Type.String({ pattern: "^\\d{4}-\\d{3}[\\dX]$" }))),
    publisher: Type.Optional(Sourced(Type.String())),
    openAccess: Type.Optional(Sourced(Type.Boolean())),
    homepage: Type.Optional(Sourced(Type.String({ pattern: "^https?://\\S+$" }))),
  }),
  citationStyle: Sourced(Strict({
    id: Type.String({ minLength: 1, description: "CSL <id> of the style." }),
    file: Type.Optional(Type.String({ pattern: "^styles/[^/]+\\.csl$", description: "The profile's own style, travelling with it, when the repository's does not match the guide (record 0026)." })),
    basedOn: Type.Optional(Type.String({ description: "CSL <id> of the style it derives from." })),
  })),
  referenceTermsLang: Type.Optional(Sourced(Lang, "Only when the journal asks for the fixed words of the references in a given language; otherwise the manuscript's.")),
  languages: Sourced(Strict({
    manuscript: Type.Array(Lang, { minItems: 1, description: "Languages a manuscript may be written in." }),
    titleAlso: Type.Optional(Type.Array(Lang)),
    abstractAlso: Type.Optional(Type.Array(Lang)),
    keywordsAlso: Type.Optional(Type.Array(Lang)),
  })),
  abstract: Type.Optional(AbstractRules),
  articleTypes: Type.Array(ArticleTypeRules),
  manuscriptFormat: Type.Optional(Strict({
    lineSpacing: Type.Optional(Sourced(Type.Number({ minimum: 1 }))),
    fontSizePt: Type.Optional(Sourced(Type.Number({ minimum: 6 }))),
    font: Type.Optional(Sourced(Type.String())),
    sideMarginsCm: Type.Optional(Sourced(Strict({ min: Type.Number(), max: Type.Optional(Type.Number()) }))),
    lineNumbers: Type.Optional(Sourced(Type.Boolean())),
    pageNumbers: Type.Optional(Sourced(Type.Boolean())),
    justified: Type.Optional(Sourced(Type.Boolean())),
    hyphenation: Type.Optional(Sourced(Type.Boolean())),
    tables: Type.Optional(Sourced(Type.Enum(["in-text", "end"]))),
    figureCaptionsList: Type.Optional(Sourced(Type.Boolean(), "Figure captions in a list at the end.")),
    englishVariant: Type.Optional(Sourced(Type.Enum(["british", "american"]))),
  })),
  review: Type.Optional(Strict({
    blind: Sourced(Type.Enum(["double", "single", "open", "none"])),
    separateTitlePage: Type.Optional(Sourced(Type.Boolean())),
  })),
  declarations: Type.Optional(Type.Array(Strict({
    kind: Type.Enum(DECLARATIONS as unknown as (typeof DECLARATIONS)[number][]),
    required: Sourced(Type.Boolean()),
    placement: Type.Optional(Sourced(Type.Enum(["manuscript", "before-references", "title-page", "separate-file", "submission-form"]))),
  }))),
  contributionsFormat: Type.Optional(Sourced(Type.Enum(["credit", "initials-sentence", "icmje"]))),
  optionalDocuments: Type.Optional(Type.Array(Strict({
    kind: Type.Enum(["highlights", "graphical-abstract", "video-abstract"]),
    rules: Sourced(Strict({ min: Type.Optional(Count), max: Type.Optional(Count), maxCharacters: Type.Optional(Count) })),
  }))),
  figures: Type.Optional(Strict({
    separateFiles: Type.Optional(Sourced(Type.Boolean())),
    formats: Type.Optional(Sourced(Type.Array(Type.String()))),
    minDpi: Type.Optional(Sourced(Strict({ photo: Type.Optional(Count), lineArt: Type.Optional(Count), combination: Type.Optional(Count) }))),
  })),
  submission: Type.Optional(Strict({ system: Sourced(Type.String()), url: Type.Optional(Sourced(Type.String({ pattern: "^https?://\\S+$" }))) })),
  notes: Type.Optional(Type.Array(Sourced(Type.String()), { description: "What the guide says that has no field, or what it leaves out." })),
}, { title: "SciDesk journal profile" });

export type JournalProfileFile = Type.Static<typeof JournalProfile>;
