// The project manifest (<name>.scidesk, at the root of the project folder) and the file of
// each article (articles/<folder>/article.json). Folder and file names on disk are fixed
// and in English (P24, layout.ts); names that come from the user's content (the project,
// an article's folder, a table) keep the user's language.
import Type from "typebox";
import { DateTime, Lang, Nullable, SchemaVersion, Strict, Uuid } from "./common.ts";
import { IdOf } from "./ids.ts";

export const PROJECT_FORMAT = "scidesk-project" as const;

export const ZoteroCollection = Strict({
  library: Type.Enum(["user", "group"]),
  libraryId: Type.Optional(Type.String({ description: "Group id, for group libraries." })),
  collection: Type.String({ pattern: "^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$", description: "Key of the collection; its subcollections are included." }),
  name: Type.String({ description: "Name of the collection when it was linked, to show it while Zotero is closed." }),
});

export const Manifest = Strict({
  format: Type.Literal(PROJECT_FORMAT, { description: "Tells a SciDesk project apart from any other JSON." }),
  schemaVersion: SchemaVersion,
  id: Uuid,
  name: Type.String({ minLength: 1, description: "Name shown by SciDesk; the folder may have another." }),
  created: DateTime,
  articles: Type.Array(Strict({
    id: IdOf("a"),
    folder: Type.String({ pattern: "^[^/\\\\:*?\"<>|\\u0000-\\u001f]+$", description: "Folder under articles/ (e.g. 'main', 'protocolo')." }),
  }), { minItems: 1, description: "Articles of the project, in the order the navigator shows them." }),
  library: Type.Union([
    Strict({ mode: Type.Literal("own") }),
    Strict({ mode: Type.Literal("zotero"), zotero: ZoteroCollection }),
  ], { description: "Own library, or linked to a Zotero collection (record 0007)." }),
}, { title: "SciDesk project manifest (<name>.scidesk)" });

export const ARTICLE_TYPES = [
  "original", "brief-original", "systematic-review", "clinical-trial", "observational", "case-report",
  "protocol", "qualitative", "narrative-review", "letter", "guideline", "other",
] as const;

export const IgnoredWarning = Strict({
  warning: Type.String({ minLength: 1, description: "Stable id of the warning (check id plus what it is about)." }),
  status: Type.Enum(["correct", "not-applicable"]),
  note: Type.Optional(Type.String()),
  date: DateTime,
  by: Type.Optional(Type.String()),
});

export const Article = Strict({
  schemaVersion: SchemaVersion,
  id: IdOf("a"),
  articleType: Type.Enum(ARTICLE_TYPES as unknown as (typeof ARTICLE_TYPES)[number][]),
  lang: Lang,
  translations: Type.Array(Lang, { description: "Other languages of the title, the abstract and the keywords (Reumatología Clínica: en)." }),
  runningTitle: Type.Optional(Type.String({ description: "Short title (R14)." })),
  journal: Nullable(Type.String({ pattern: "^[a-z0-9-]+$", description: "Target journal: id of a profile in resources/journals/." })),
  citationStyle: Strict({
    id: Type.String({ minLength: 1, description: "CSL style id (the <id> of the style), e.g. http://www.zotero.org/styles/vancouver." }),
    file: Type.Optional(Type.String({ pattern: "^resources/styles/[^/]+\\.csl$", description: "The style file, when it is not one of the styles included with SciDesk." })),
  }, { description: "The journal profile's style by default; the user may choose another." }),
  referenceTermsLang: Type.Union([Lang, Type.Null()], { description: "Language of the fixed words of the references (En:, editores…); null: the language of the manuscript (record 0026)." }),
  ignoredWarnings: Type.Array(IgnoredWarning, { description: "Warnings marked 'correct' or 'not applicable' (R12)." }),
  ignoredWords: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 100, pattern: "^\\S+$" }), { description: "Words the spell checker does not underline in this article ('Ignore', record 0061); the project dictionary is resources/dictionary.txt." })),
  documentFont: Type.Optional(Type.Union([Strict({
    family: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
    size: Type.Optional(Type.Number({ minimum: 6, maximum: 72 })),
  }), Type.Null()], { description: "The font and size the article is written in (the free font view, the Word for co-authors); what is absent follows the journal profile, then Calibri 12. The journal always gets its own (record 0074)." })),
  sectionNumbering: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("1."), Type.Literal("1"), Type.Null()], { description: "Numbered sections: '1.' (1., 1.1.), '1' (1, 1.1) or 'none'; null or absent: as the journal profile says, and none when it does not say (record 0070)." })),
  countTableWords: Type.Optional(Type.Union([Type.Boolean(), Type.Null()], { description: "Whether the words of the tables count in the text's word count; null or absent: as the journal profile says, and not when it does not say (record 0056)." })),
  trackChanges: Type.Optional(Type.Boolean({ description: "Tracked changes are on: every edit is a proposal with its author, as Word's w:trackRevisions (record 0090)." })),
  blinding: Type.Optional(Strict({
    replace: Type.Array(Strict({
      text: Type.String({ minLength: 1, maxLength: 1000, description: "The exact text, as it is written (whole words)." }),
      replacement: Type.String({ maxLength: 1000, description: "What the blinded version says instead (may be empty)." }),
      date: DateTime,
    }), { description: "Text replaced in the blinded version, everywhere it is written." }),
    omitSections: Type.Array(Type.String({ minLength: 1 }), { description: "Level-1 headings (block ids) whose sections leave the blinded version and go on the title page." }),
  }, { description: "What the blinded version for a double-blind journal changes, without touching the manuscript (R9, record 0088)." })),
}, { title: "SciDesk article (articles/<folder>/article.json)" });

export type ManifestFile = Type.Static<typeof Manifest>;
export type ArticleFile = Type.Static<typeof Article>;
