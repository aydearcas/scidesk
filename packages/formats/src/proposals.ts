// The single proposal model (records 0019 and 0029): everything that proposes changes to the
// text from outside (a co-author's Word copy, an LLM package's answer, a conflicted copy
// made by OneDrive or Dropbox, an old version) becomes a proposal set with the same shape,
// reviewed in the same view.
//
// On disk (record 0031): a review round with co-authors lives in
// articles/<article>/rounds/<round>/ with round.json, the returned copies in copies/ and one
// proposal set per copy in proposals/<copy>.json. Sets of other origins live in
// articles/<article>/proposals/<set>.json. Both travel with the project.
//
// Where a proposal applies: always in the coordinates of its base (the version sent, a
// snapshot): the file, the block id and ProseMirror offsets inside that block (each UTF-16
// code unit of text and each inline atom count 1), plus the text before and after, which
// lets SciDesk find the place again in the current copy and check the anchor.
import Type from "typebox";
import { AuthorRef, DateTime, SchemaVersion, Strict } from "./common.ts";
import { IdOf } from "./ids.ts";

export const PROPOSAL_KINDS = [
  "insert", "delete", "replace", "format", "comment", "split-paragraph", "join-paragraphs",
  "insert-paragraph", "delete-paragraph", "move",
] as const;

/** Result of the merge (record 0029). */
export const PROPOSAL_STATUSES = [
  "applicable", "agreement", "duplicate", "conflict-coauthors", "conflict-mine", "noise-hidden",
] as const;

/** What the user did with it. */
export const DECISIONS = ["pending", "accepted", "rejected", "edited"] as const;

const e = <T extends readonly string[]>(values: T, description?: string) =>
  Type.Enum(values as unknown as T[number][], description ? { description } : {});

const ArticleFile = Type.String({
  pattern: "^(manuscript|tables|figures|documents|supplementary)/[^\\\\]+\\.(scidoc|scitable|scifigure)$",
  description: "File of the article the block is in, relative to the article folder.",
});
const BlockOrNote = Type.String({ pattern: "^(b|n)-[a-z0-9]{1,24}$", description: "Block of the base version (a note has its own n- id)." });

/** A range of characters of a block of the base. */
export const RangeAnchor = Strict({
  file: ArticleFile,
  block: BlockOrNote,
  from: Type.Integer({ minimum: 0 }),
  to: Type.Integer({ minimum: 0 }),
});

/** A new paragraph has no characters of the base to point at: it goes after a block. */
export const InsertAnchor = Strict({
  file: ArticleFile,
  after: Type.Union([BlockOrNote, Type.Null()], { description: "Block after which it goes (null: at the start of the file)." }),
});

export const Proposal = Strict({
  id: IdOf("pr"),
  author: AuthorRef,
  tracked: Type.Boolean({ description: "It came as a tracked change (w:ins, w:del…); false: found by comparing with the base." }),
  kind: e(PROPOSAL_KINDS),
  anchor: Type.Union([RangeAnchor, InsertAnchor]),
  before: Type.String({ description: "Text of the base at the anchor." }),
  after: Type.String({ description: "Text proposed." }),
  content: Type.Optional(Type.Array(Type.Unknown(), { description: "Proposed inline content as ProseMirror JSON, when plain text is not enough (citations, formats)." })),
  format: Type.Optional(Strict({ add: Type.Array(Type.String()), remove: Type.Array(Type.String()) })),
  comment: Type.Optional(Strict({ text: Type.String(), replies: Type.Array(Strict({ author: AuthorRef, date: DateTime, text: Type.String() })) })),
  moveOf: Type.Optional(IdOf("pr", "The other half of a move.")),
  date: Type.Optional(DateTime),
  zone: Type.Optional(IdOf("z", "Zone of the three-way merge: proposals that overlap, with one character of slack.")),
  sameSentence: Type.Optional(IdOf("g", "Proposals of several co-authors in the same sentence, shown together.")),
  status: e(PROPOSAL_STATUSES),
  decision: e(DECISIONS),
  decided: Type.Optional(Strict({ by: AuthorRef, date: DateTime })),
});

export const ORIGIN_KINDS = ["docx-copy", "llm-package", "conflict-copy", "history", "scidesk"] as const;

export const ProposalSet = Strict({
  schemaVersion: SchemaVersion,
  id: IdOf("ps"),
  origin: Strict({
    kind: e(ORIGIN_KINDS),
    round: Type.Optional(IdOf("rd")),
    copy: Type.Optional(IdOf("cp")),
    file: Type.Optional(Type.String({ description: "The returned or conflicted file, relative to the article folder." })),
    package: Type.Optional(Type.String({ description: "Id of the LLM package answered." })),
  }),
  base: Strict({ snapshot: IdOf("s", "Version the proposals are computed from (the copy sent, or the snapshot restored).") }),
  created: DateTime,
  integrity: e(["ok", "mismatch", "not-checked"], "Applying every proposal to the base gives the copy with everything accepted (record 0029)."),
  hiddenNoise: Type.Integer({ minimum: 0, description: "Changes hidden as noise (spaces, quotes, dashes)." }),
  proposals: Type.Array(Proposal),
}, { title: "SciDesk proposal set" });

export const Round = Strict({
  schemaVersion: SchemaVersion,
  id: IdOf("rd"),
  name: Type.String({ minLength: 1, description: "E.g. 'Coautores, 1.ª ronda'." }),
  sent: Strict({ snapshot: IdOf("s"), date: DateTime, file: Type.Optional(Type.String({ description: "Copy of the DOCX sent, relative to the round folder." })) }),
  copies: Type.Array(Strict({
    id: IdOf("cp"),
    file: Type.String({ pattern: "^copies/[^/\\\\]+\\.docx$" }),
    returnedBy: AuthorRef,
    received: DateTime,
    sha256: Type.String({ pattern: "^[0-9a-f]{64}$" }),
  })),
}, { title: "SciDesk review round (rounds/<round>/round.json)" });

export type ProposalSetFile = Type.Static<typeof ProposalSet>;
export type RoundFile = Type.Static<typeof Round>;
