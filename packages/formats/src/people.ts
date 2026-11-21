// people/people.json: the project's directory of people (record 0015). What does not
// depend on the article: name and form of citation, degrees, ORCID, e-mail and every known
// affiliation. Who signs which article, in what order and with which affiliations, is in
// each article's authors.json.
import Type from "typebox";
import { SchemaVersion, Strict } from "./common.ts";
import { IdOf } from "./ids.ts";

export const Affiliation = Strict({
  id: IdOf("af"),
  institution: Type.String({ minLength: 1, description: "Hospital, university or centre, as it is printed." }),
  department: Type.Optional(Type.String()),
  city: Type.Optional(Type.String()),
  country: Type.Optional(Type.String({ pattern: "^[A-Z]{2}$", description: "ISO 3166-1 alpha-2." })),
  ror: Type.Optional(Type.String({ pattern: "^https://ror\\.org/0[a-z0-9]{8}$", description: "ROR id of the institution." })),
});

const personCommon = {
  id: IdOf("p"),
  email: Type.Optional(Type.String({ pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" })),
  affiliations: Type.Array(IdOf("af"), { description: "Every known affiliation; each article chooses which ones it prints." }),
  notes: Type.Optional(Type.String()),
};

export const Person = Strict({
  ...personCommon,
  kind: Type.Literal("person"),
  given: Type.String({ minLength: 1 }),
  family: Type.String({ minLength: 1 }),
  citationName: Type.Optional(Type.String({ description: "Form of citation, e.g. 'Pérez-García J'. Computed from the name when absent." })),
  degrees: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { description: "Academic degrees as printed: MD, PhD…" })),
  orcid: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$", description: "ORCID iD (its check digit is verified by validate.ts)." })),
});

export const Group = Strict({
  ...personCommon,
  kind: Type.Literal("group"),
  name: Type.String({ minLength: 1, description: "Group or consortium authorship, e.g. 'Grupo de Estudio ARTRO'." }),
  members: Type.Array(IdOf("p"), { description: "People of the directory who belong to the group." }),
});

export const People = Strict({
  schemaVersion: SchemaVersion,
  affiliations: Type.Array(Affiliation, { description: "Affiliations, shared between people." }),
  people: Type.Array(Type.Union([Person, Group])),
}, { title: "SciDesk directory of people (people/people.json)" });

export type PeopleFile = Type.Static<typeof People>;
