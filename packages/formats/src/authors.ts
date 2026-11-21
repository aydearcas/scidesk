// articles/<article>/authors.json: who signs this article, in what order, with which of
// their affiliations, their CRediT roles, correspondence, equal contribution and conflicts
// of interest (PLAN 4.1 and 5.3). The people themselves are in people/people.json.
import Type from "typebox";
import { SchemaVersion, Strict } from "./common.ts";
import { IdOf } from "./ids.ts";

/** The 14 CRediT roles (NISO Z39.104-2022). */
export const CREDIT_ROLES = [
  "conceptualization", "data-curation", "formal-analysis", "funding-acquisition", "investigation",
  "methodology", "project-administration", "resources", "software", "supervision", "validation",
  "visualization", "writing-original-draft", "writing-review-editing",
] as const;

export const CreditRole = Strict({
  role: Type.Enum(CREDIT_ROLES as unknown as (typeof CREDIT_ROLES)[number][]),
  degree: Type.Optional(Type.Enum(["lead", "equal", "supporting"], { description: "CRediT degree of contribution." })),
});

export const ArticleAuthor = Strict({
  person: IdOf("p", "Person or group of people.json."),
  affiliations: Type.Array(IdOf("af"), { description: "Affiliations printed for this article, in order; a subset of the person's." }),
  corresponding: Type.Boolean(),
  equalContribution: Type.Optional(Type.String({ pattern: "^[a-z0-9-]{1,24}$", description: "Authors with the same token contributed equally." })),
  credit: Type.Array(CreditRole),
  conflicts: Type.Optional(Type.String({ description: "Declaration of conflicts of interest of this author." })),
});

export const Authors = Strict({
  schemaVersion: SchemaVersion,
  authors: Type.Array(ArticleAuthor, { description: "In the order they sign." }),
  acknowledged: Type.Optional(Type.Array(IdOf("p"), { description: "People thanked who do not sign." })),
}, { title: "SciDesk authors of an article (articles/<article>/authors.json)" });

export type AuthorsFile = Type.Static<typeof Authors>;
