// .scidoc, .scitable and .scifigure: the ProseMirror document as it is (R34), wrapped in an
// envelope with the format version, the document type, its language and the registries of
// tracked changes and comments (record 0020).
//
// ProseMirror JSON: every node is { type, attrs?, content?, marks? } and text is
// { type: "text", text, marks? }. Node attributes live in `attrs`, exactly as
// ProseMirror's Node.toJSON() writes them; attributes with a null default may be written
// as null or left out. The JSON Schema checks the shape of each node and which children it
// admits; the finer content rules (a title only at the start, for example) and the
// cross-file rules (every citation points to a reference of the library) are checked by
// validate.ts, and ProseMirror itself checks its content expressions on load.
import Type, { type TSchema, type TProperties } from "typebox";
import { AuthorRef, DateTime, Lang, Nullable, OptAttr, RelativePath, SchemaVersion, Strict } from "./common.ts";
import { AnyId, IdOf } from "./ids.ts";

// ------------------------------------------------------------------ vocabularies

/** Role of a section heading (body) or of a part of a structured abstract. Sections are
 * not container nodes: a heading with a role starts the section (JATS <sec sec-type>). */
export const SECTION_ROLES = [
  "introduction", "background", "objective", "background-objective", "methods", "patients-methods",
  "results", "discussion", "conclusions", "discussion-conclusions", "case-presentation",
  "acknowledgements", "funding", "conflicts", "ethics", "consent", "data-availability",
  "registration", "ai-use", "contributions", "references", "appendix", "other",
] as const;

/** CSL locator labels (CSL 1.0.2). */
export const LOCATOR_LABELS = [
  "act", "appendix", "article-locator", "book", "canon", "chapter", "column", "elocation", "equation",
  "figure", "folio", "issue", "line", "note", "opus", "page", "paragraph", "part", "rule", "scene",
  "section", "sub-verbo", "supplement", "table", "timestamp", "title-locator", "verse", "version", "volume",
] as const;

/** Merge fields of the cover letter (PLAN 5.3). */
export const FIELD_NAMES = ["journal", "editor", "title", "article-type", "corresponding-author", "authors", "date"] as const;

/** Where a tracked change or a comment came from (the single proposal model, record 0019). */
export const ORIGINS = ["local", "docx", "llm", "conflict-copy", "history", "scidesk"] as const;

/** Every documentType of a .scidoc. Tables and figures have their own extension. */
export const DOCUMENT_TYPES = [
  "article", "abstract", "cover-letter", "title-page", "contributions", "declarations",
  "supplementary", "reviewer-response",
] as const;

export const BODY_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((t): t is Exclude<(typeof DOCUMENT_TYPES)[number], "abstract"> => t !== "abstract");

export const enumOf = <const T extends readonly string[]>(values: T, description?: string) =>
  Type.Enum(values as unknown as T[number][], description ? { description } : {});
/** Record 0073: a text block's alignment; left (or the journal's) when absent. */
const BLOCK_ALIGN = enumOf(["center", "right", "justify"]);

// ------------------------------------------------------------------ marks

/** Word's highlight colours (ST_HighlightColor), the only ones a DOCX can carry as highlight. */
export const HIGHLIGHT_COLORS = [
  "yellow", "green", "cyan", "magenta", "blue", "red", "darkBlue", "darkCyan", "darkGreen", "darkMagenta",
  "darkRed", "darkYellow", "darkGray", "lightGray", "black", "white",
] as const;

const simpleMark = (name: string, description: string) => Strict({ type: Type.Literal(name) }, { description });
const SuggestionId = IdOf("ch", "Id of the tracked change; its author, date and origin are in the `changes` registry.");

const markDefs = {
  Bold: simpleMark("bold", "Bold."),
  Italic: simpleMark("italic", "Italic."),
  Underline: simpleMark("underline", "Underline."),
  Superscript: simpleMark("superscript", "Superscript."),
  Subscript: simpleMark("subscript", "Subscript."),
  TextColor: Strict({ type: Type.Literal("textColor"), attrs: Strict({ color: Type.String({ pattern: "^#[0-9A-F]{6}$", description: "Colour of the text, #RRGGBB in capitals (w:color)." }) }) }, { description: "Colour of the text (record 0043)." }),
  Highlight: Strict({ type: Type.Literal("highlight"), attrs: Strict({ color: enumOf(HIGHLIGHT_COLORS) }) }, { description: "Highlight, with one of Word's highlight colours (w:highlight, record 0043)." }),
  FontFamily: Strict({ type: Type.Literal("fontFamily"), attrs: Strict({ family: Type.String({ minLength: 1, maxLength: 64, pattern: "^[^;{}<>\"\\\\]+$", description: "Name of the font, as Word writes it in w:rFonts (\"Arial\", \"Times New Roman\")." }) }) }, { description: "Font of a fragment, chosen in the free font mode (record 0047). The DOCX for coauthors carries it; the DOCX and PDF for the journal never do." }),
  FontSize: Strict({ type: Type.Literal("fontSize"), attrs: Strict({ size: Type.Number({ minimum: 1, maximum: 409, multipleOf: 0.5, description: "Size in points, in half points as Word (w:sz)." }) }) }, { description: "Size of a fragment, chosen in the free font mode (record 0047). The DOCX for coauthors carries it; the DOCX and PDF for the journal never do." }),
  LangMark: Strict({ type: Type.Literal("lang"), attrs: Strict({ lang: Lang }) }, { description: "Language of a fragment inside a paragraph (spell checking, hyphenation, export)." }),
  Link: Strict({ type: Type.Literal("link"), attrs: Strict({ href: Type.String({ pattern: "^(https?://|mailto:)\\S+$" }) }) }, { description: "Hyperlink (http, https or mailto only)." }),
  CommentMark: Strict({ type: Type.Literal("comment"), attrs: Strict({ id: IdOf("cm") }) }, { description: "Text anchored to a comment of the `comments` registry." }),
  Insertion: Strict({ type: Type.Literal("insertion"), attrs: Strict({ id: SuggestionId }) }, { description: "Tracked insertion (w:ins)." }),
  Deletion: Strict({ type: Type.Literal("deletion"), attrs: Strict({ id: SuggestionId }) }, { description: "Tracked deletion (w:del). The text stays in the document until accepted." }),
  Modification: Strict({
    type: Type.Literal("modification"),
    attrs: Strict({
      id: SuggestionId,
      type: Type.String({ description: "What changed, as prosemirror-suggest-changes records it (e.g. 'attr')." }),
      attrName: OptAttr(Type.String()),
      previousValue: Type.Optional(Type.Unknown()),
      newValue: Type.Optional(Type.Unknown()),
    }),
  }, { description: "Tracked change of a node attribute (heading level, cell alignment...). A change of text format is a deletion plus an insertion of the same text with the same id." }),
  TextMark: Type.Union([
    Type.Ref("Bold"), Type.Ref("Italic"), Type.Ref("Underline"), Type.Ref("Superscript"), Type.Ref("Subscript"),
    Type.Ref("TextColor"), Type.Ref("Highlight"), Type.Ref("FontFamily"), Type.Ref("FontSize"), Type.Ref("LangMark"), Type.Ref("Link"), Type.Ref("CommentMark"),
    Type.Ref("Insertion"), Type.Ref("Deletion"), Type.Ref("Modification"),
  ]),
  /** Marks a node (block or inline atom) can carry: only tracked changes and comments. */
  NodeMark: Type.Union([Type.Ref("CommentMark"), Type.Ref("Insertion"), Type.Ref("Deletion"), Type.Ref("Modification")]),
};

// ------------------------------------------------------------------ inline nodes

const nodeMarks = Type.Optional(Type.Array(Type.Ref("NodeMark")));
const inlineContent = Type.Optional(Type.Array(Type.Ref("Inline")));

const CitationItem = Strict({
  ref: IdOf("r", "Reference of references/library.json."),
  locator: Type.Optional(Type.String({ minLength: 1 })),
  label: Type.Optional(enumOf(LOCATOR_LABELS)),
  prefix: Type.Optional(Type.String()),
  suffix: Type.Optional(Type.String()),
  suppressAuthor: Type.Optional(Type.Boolean()),
});

const inlineDefs = {
  Text: Strict({
    type: Type.Literal("text"),
    text: Type.String({ minLength: 1 }),
    marks: Type.Optional(Type.Array(Type.Ref("TextMark"))),
  }),
  HardBreak: Strict({ type: Type.Literal("hardBreak"), marks: nodeMarks }, { description: "Line break inside a paragraph." }),
  Citation: Strict({
    type: Type.Literal("citation"),
    attrs: Strict({ id: IdOf("c", "Citation id; it is the citationID of the Zotero field in the DOCX."), items: Type.Array(CitationItem, { minItems: 1 }) }),
    marks: nodeMarks,
  }, { description: "A citation: never its number, which citeproc-js computes." }),
  Xref: Strict({
    type: Type.Literal("xref"),
    attrs: Strict({ target: AnyId }),
    marks: nodeMarks,
  }, { description: "Cross-reference to a table, figure, heading or equation; shows only its number (the word 'tabla' is text)." }),
  NoteRef: Strict({
    type: Type.Literal("noteRef"),
    attrs: Strict({ target: IdOf("n") }),
    marks: nodeMarks,
  }, { description: "Call to a note of the same table or figure (its letter is computed, R11)." }),
  InlineEquation: Strict({ type: Type.Literal("inlineEquation"), attrs: Strict({ latex: Type.String() }), marks: nodeMarks }),
  Field: Strict({ type: Type.Literal("field"), attrs: Strict({ name: enumOf(FIELD_NAMES) }), marks: nodeMarks }, { description: "Merge field of the cover letter." }),
  Inline: Type.Union([
    Type.Ref("Text"), Type.Ref("HardBreak"), Type.Ref("Citation"), Type.Ref("Xref"), Type.Ref("NoteRef"),
    Type.Ref("InlineEquation"), Type.Ref("Field"),
  ]),
};

// ------------------------------------------------------------------ block nodes

const BlockId = IdOf("b");
const lang = OptAttr(Lang);
const NOTE_KINDS = enumOf(["general", "specific"], "general: no call; specific: called from cells with noteRef, lettered by first call.");

const textblock = <N extends string, A extends TProperties>(name: N, attrs: A, description: string) =>
  Strict({ type: Type.Literal(name), attrs: Strict(attrs), content: inlineContent, marks: nodeMarks }, { description });

/** Children in a fixed order: `first` one by one, then any number of `rest`. The JSON
 * Schema says exactly that (prefixItems + items); the TypeScript type is the union of all. */
const ordered = <F extends TSchema[], R extends TSchema>(first: [...F], rest: R, minItems: number) => {
  const schema = Type.Array(Type.Union([...first, rest]), { minItems });
  Object.assign(schema, { prefixItems: first, items: rest });
  return schema;
};

/** Record 0076: the table styles, and the line of a cell's own border (as Word's: style, width in points, colour). */
export const TABLE_STYLES = ["three-line", "rows", "grid", "none"] as const;
export const BORDER_LINE_STYLES = ["none", "single", "double", "dashed", "dotted"] as const;
const BorderLine = Strict({
  style: enumOf(BORDER_LINE_STYLES),
  width: Type.Optional(Type.Number({ minimum: 0.25, maximum: 6, description: "Points; 0.5 when absent." })),
  color: Type.Optional(Type.String({ pattern: "^#[0-9A-Fa-f]{6}$", description: "Black when absent." })),
});
const CellAttrs = Strict({
  colspan: Type.Integer({ minimum: 1 }),
  rowspan: Type.Integer({ minimum: 1 }),
  align: OptAttr(enumOf(["left", "center", "right", "decimal"])),
  borders: OptAttr(Strict({ top: Type.Optional(BorderLine), bottom: Type.Optional(BorderLine), left: Type.Optional(BorderLine), right: Type.Optional(BorderLine) }, { description: "The cell's own borders, over the table style's (record 0076); a side with style none has no line." })),
});
const cellContent = Type.Array(Type.Union([Type.Ref("Paragraph"), Type.Ref("BulletList"), Type.Ref("OrderedList")]), { minItems: 1 });

const blockDefs = {
  Paragraph: textblock("paragraph", { id: BlockId, lang, indent: OptAttr(Type.Integer({ minimum: 1, maximum: 8 })), align: OptAttr(BLOCK_ALIGN) }, "Paragraph. `indent`: left indent in steps of 1.25 cm, as Word's \"Increase indent\" (record 0069)."),
  Heading: textblock("heading", { id: BlockId, level: Type.Integer({ minimum: 1, maximum: 6 }), role: OptAttr(enumOf(SECTION_ROLES)), lang, numbered: OptAttr(Type.Boolean()), align: OptAttr(BLOCK_ALIGN) }, "Section heading; `role` says which section it starts; `numbered: false` keeps it (and its subsections) without a number when the article numbers its sections (record 0070)."),
  Title: textblock("title", { id: BlockId, lang, align: OptAttr(BLOCK_ALIGN) }, "Title of the article; one per language, the first is the main one."),
  BulletList: Strict({ type: Type.Literal("bulletList"), attrs: Strict({ id: BlockId }), content: Type.Array(Type.Ref("ListItem"), { minItems: 1 }), marks: nodeMarks }),
  OrderedList: Strict({ type: Type.Literal("orderedList"), attrs: Strict({ id: BlockId, start: Type.Optional(Type.Integer({ minimum: 0 })) }), content: Type.Array(Type.Ref("ListItem"), { minItems: 1 }), marks: nodeMarks }),
  ListItem: Strict({
    type: Type.Literal("listItem"),
    content: ordered([Type.Ref("Paragraph")], Type.Union([Type.Ref("Paragraph"), Type.Ref("BulletList"), Type.Ref("OrderedList")]), 1),
    marks: nodeMarks,
  }),
  Equation: Strict({ type: Type.Literal("equation"), attrs: Strict({ id: IdOf("e"), latex: Type.String() }), marks: nodeMarks }, { description: "Display equation in LaTeX (phase 4; in the format from v1)." }),
  TableRef: Strict({
    type: Type.Literal("tableRef"),
    attrs: Strict({ id: IdOf("t"), src: Type.String({ pattern: "^tables/[^/]+\\.scitable$" }) }),
    marks: nodeMarks,
  }, { description: "Where a table of tables/ goes. The table itself lives in its .scitable." }),
  FigureRef: Strict({
    type: Type.Literal("figureRef"),
    attrs: Strict({ id: IdOf("f"), src: Type.String({ pattern: "^figures/[^/]+\\.scifigure$" }) }),
    marks: nodeMarks,
  }, { description: "Where a figure of figures/ goes. The caption and notes live in its .scifigure." }),
  // record 0073: a block quotation (JATS disp-quote), indented on both sides
  BlockQuote: Strict({ type: Type.Literal("blockquote"), attrs: Strict({ id: BlockId }), content: Type.Array(Type.Ref("Paragraph"), { minItems: 1 }), marks: nodeMarks }, { description: "Block quotation: one or more paragraphs set apart from the text (record 0073)." }),
  // record 0078: a page break between two blocks (Word: w:br w:type="page"; Typst: pagebreak())
  PageBreak: Strict({ type: Type.Literal("pageBreak"), attrs: Strict({ id: BlockId }), marks: nodeMarks }, { description: "Page break: what follows starts on a new page (record 0078). Two in a row with an empty paragraph between make a blank page." }),
  Body: Type.Union([
    Type.Ref("Paragraph"), Type.Ref("Heading"), Type.Ref("Title"), Type.Ref("BulletList"), Type.Ref("OrderedList"), Type.Ref("BlockQuote"),
    Type.Ref("Equation"), Type.Ref("TableRef"), Type.Ref("FigureRef"), Type.Ref("PageBreak"),
  ]),

  // --- tables (.scitable)
  TablePart: Strict({
    type: Type.Literal("tablePart"),
    attrs: Strict({ id: IdOf("t"), src: OptAttr(Type.String()) }),
    content: ordered([Type.Ref("TableCaption"), Type.Ref("Table")], Type.Ref("TableNote"), 2),
    marks: nodeMarks,
  }, { description: "A table with its caption and notes. In the file, `src` is absent; in the composite document it says which file the part goes back to." }),
  TableCaption: textblock("tableCaption", { id: BlockId, lang }, "Caption of a table (without 'Tabla 1.', which is computed)."),
  TableNote: textblock("tableNote", { id: IdOf("n"), kind: NOTE_KINDS, lang }, "Note under a table: an object, not a lettered paragraph (R11)."),
  Table: Strict({
    type: Type.Literal("table"),
    attrs: Strict({
      id: BlockId,
      columnWidths: OptAttr(Type.Array(Type.Number({ exclusiveMinimum: 0 }), { minItems: 1, description: "Relative widths of the columns (record 0022); null lets the export decide." })),
      style: OptAttr(enumOf(TABLE_STYLES, "The table's lines (record 0076): three-line (top, under the header, bottom), rows (also between rows), grid (all), none; absent: the journal's, else three-line.")),
    }),
    content: Type.Array(Type.Ref("TableRow"), { minItems: 1 }),
    marks: nodeMarks,
  }),
  TableRow: Strict({ type: Type.Literal("tableRow"), content: Type.Array(Type.Union([Type.Ref("TableCell"), Type.Ref("TableHeader")]), { minItems: 1 }), marks: nodeMarks }),
  TableCell: Strict({ type: Type.Literal("tableCell"), attrs: CellAttrs, content: cellContent, marks: nodeMarks }),
  TableHeader: Strict({ type: Type.Literal("tableHeader"), attrs: CellAttrs, content: cellContent, marks: nodeMarks }, { description: "Header cell; a row of header cells is repeated on every page." }),

  // --- figures (.scifigure)
  FigurePart: Strict({
    type: Type.Literal("figurePart"),
    attrs: Strict({
      id: IdOf("f"),
      src: OptAttr(Type.String()),
      image: Type.String({ pattern: "^figures/[^/]+\\.(png|jpe?g|tiff?|svg|eps|pdf)$", description: "Image file, relative to the article folder." }),
      alt: OptAttr(Type.String({ description: "Text alternative (accessible PDF)." })),
      credit: OptAttr(Type.String({ description: "Source of the figure, if it is not original." })),
      license: OptAttr(Type.String({ description: "Licence or permission (SPDX id when there is one)." })),
    }),
    content: ordered([Type.Ref("FigureCaption")], Type.Ref("FigureNote"), 1),
    marks: nodeMarks,
  }, { description: "A figure: image file, caption and notes." }),
  FigureCaption: textblock("figureCaption", { id: BlockId, lang }, "Caption of a figure (without 'Figura 1.')."),
  FigureNote: textblock("figureNote", { id: IdOf("n"), kind: NOTE_KINDS, lang }, "Note under a figure."),

  // --- abstract (abstract.scidoc)
  AbstractSection: Strict({
    type: Type.Literal("abstractSection"),
    attrs: Strict({ id: BlockId, lang: Lang }),
    content: Type.Array(Type.Union([Type.Ref("Heading"), Type.Ref("Paragraph"), Type.Ref("Keywords")]), { minItems: 1 }),
    marks: nodeMarks,
  }, { description: "The abstract in one language, with its keywords." }),
  Keywords: Strict({ type: Type.Literal("keywords"), attrs: Strict({ id: BlockId }), content: Type.Array(Type.Ref("Keyword"), { minItems: 1 }), marks: nodeMarks }),
  Keyword: Strict({ type: Type.Literal("keyword"), content: inlineContent, marks: nodeMarks }),
  AbstractPart: Strict({
    type: Type.Literal("abstractPart"),
    attrs: Strict({ src: Type.String() }),
    content: Type.Array(Type.Ref("AbstractSection"), { minItems: 1 }),
  }, { description: "The abstract inside the composite document (memory only)." }),
};

// ------------------------------------------------------------------ envelopes

const ChangeRecord = Strict({
  author: AuthorRef,
  date: DateTime,
  origin: enumOf(ORIGINS),
  source: Type.Optional(Type.String({ description: "What it came from: a proposal set (ps-…), a returned copy (cp-…) or a snapshot (s-…)." })),
});

const CommentReply = Strict({ author: AuthorRef, date: DateTime, text: Type.String() });
const CommentRecord = Strict({
  author: AuthorRef,
  date: DateTime,
  origin: enumOf(ORIGINS),
  text: Type.String(),
  resolved: Type.Boolean(),
  replies: Type.Array(CommentReply),
});

const changes = Type.Record(Type.String({ pattern: "^ch-[a-z0-9]{1,24}$" }), ChangeRecord, { description: "Who made each tracked change, when and from where. Entries whose id is no longer in `doc` are dropped on save." });
const comments = Type.Record(Type.String({ pattern: "^cm-[a-z0-9]{1,24}$" }), CommentRecord, { description: "Comments anchored with the `comment` mark." });

const envelopeCommon = {
  schemaVersion: SchemaVersion,
  lang: Lang,
  changes,
  comments,
};

const docDefs = {
  BodyDoc: Strict({ type: Type.Literal("doc"), content: Type.Array(Type.Ref("Body")) }),
  AbstractDoc: Strict({ type: Type.Literal("doc"), content: Type.Array(Type.Ref("AbstractSection"), { description: "One section per language; none for an article without abstract (a letter, record 0048)." }) }),
  CompositeDoc: Strict({
    type: Type.Literal("doc"),
    content: Type.Array(Type.Union([Type.Ref("AbstractPart"), Type.Ref("Body"), Type.Ref("TablePart"), Type.Ref("FigurePart")])),
  }, { description: "The composite document built in memory: abstract, body, tables and figures in one tree (record 0021). Not a file." }),
  ScidocFile: Type.Union([
    Strict({ ...envelopeCommon, documentType: Type.Literal("abstract"), doc: Type.Ref("AbstractDoc") }),
    Strict({ ...envelopeCommon, documentType: enumOf(BODY_DOCUMENT_TYPES), doc: Type.Ref("BodyDoc") }),
  ]),
  ScitableFile: Strict({ ...envelopeCommon, documentType: Type.Literal("table"), doc: Type.Ref("TablePart") }),
  ScifigureFile: Strict({ ...envelopeCommon, documentType: Type.Literal("figure"), doc: Type.Ref("FigurePart") }),
};

export const documentDefs = { ...markDefs, ...inlineDefs, ...blockDefs, ...docDefs };

export const Scidoc = Type.Cyclic(documentDefs, "ScidocFile", { title: "SciDesk document (.scidoc)" });
export const Scitable = Type.Cyclic(documentDefs, "ScitableFile", { title: "SciDesk table (.scitable)" });
export const Scifigure = Type.Cyclic(documentDefs, "ScifigureFile", { title: "SciDesk figure (.scifigure)" });
export const Composite = Type.Cyclic(documentDefs, "CompositeDoc", { title: "SciDesk composite document (memory only)" });

// TypeScript types of the files, inferred from the same definitions.
export type ScidocFile = Type.Static<typeof Scidoc>;
export type ScitableFile = Type.Static<typeof Scitable>;
export type ScifigureFile = Type.Static<typeof Scifigure>;
export type CompositeDoc = Type.Static<typeof Composite>;
export type DocumentFile = ScidocFile | ScitableFile | ScifigureFile;

/** Loose view of a ProseMirror node, for code that walks any tree (validate.ts). */
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}
