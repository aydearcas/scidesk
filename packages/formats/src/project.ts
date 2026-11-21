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
}, { title: "SciDesk article (articles/<folder>/article.json)" });

export type ManifestFile = Type.Static<typeof Manifest>;
export type ArticleFile = Type.Static<typeof Article>;
