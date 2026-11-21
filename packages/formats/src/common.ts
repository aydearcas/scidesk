// Building blocks shared by every SciDesk format.
//
// Every format is defined once here, with TypeBox: the same definition gives the
// TypeScript types (Type.Static), the validator and the published JSON Schema
// (scripts/build-schemas.ts). See docs/formatos/especificacion-formatos.md.
import Type, { type TSchema, type TProperties } from "typebox";
import { IdOf } from "./ids.ts";

/** An object that rejects unknown keys: stored files never carry undeclared data. */
export const Strict = <P extends TProperties>(properties: P, options: Record<string, unknown> = {}) =>
  Type.Object(properties, { additionalProperties: false, ...options });

/** Version of every format defined by this package. Bumped together, with migrations. */
export const SCHEMA_VERSION = 1 as const;
export const SchemaVersion = Type.Literal(SCHEMA_VERSION, { description: "Version of the format. Files with a lower version are migrated when opened." });

/** Language tag (BCP 47, the subset SciDesk uses): "es", "en", "en-GB", "es-419". */
export const Lang = Type.String({
  pattern: "^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$",
  description: "BCP 47 language tag, e.g. es, en, en-GB, es-419.",
});

/** Date and time in UTC, ISO 8601 with a Z ("2026-11-21T14:15:09Z", milliseconds optional). */
export const DateTime = Type.String({
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?Z$",
  description: "UTC date and time, ISO 8601 with Z.",
});

/** Calendar date ("2026-11-20"). */
export const DateOnly = Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Calendar date, ISO 8601." });

/** A path relative to the folder that owns the file, with forward slashes and no "..". */
export const RelativePath = Type.String({
  pattern: "^(?!/)(?![A-Za-z]:)(?!.*(^|/)\\.\\.(/|$))[^\\\\\\u0000-\\u001f]+$",
  description: "Path relative to the owning folder; forward slashes, never absolute, never '..'.",
});

/** Who did something: a person of people.json when known, and always the name as shown. */
export const AuthorRef = Strict({
  name: Type.String({ minLength: 1, description: "Name as shown (from people.json, or the w:author of a Word copy)." }),
  person: Type.Optional(IdOf("p", "Person id in people.json, when known.")),
});

export const Uuid = Type.String({
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  description: "Random UUID (version 4), lowercase.",
});

/** Nullable helper: ProseMirror writes every attribute, null when unset. */
export const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()]);

/** Optional-and-nullable attribute (ProseMirror attribute with a null default). */
export const OptAttr = <T extends TSchema>(schema: T) => Type.Optional(Nullable(schema));
