// The window of phase 1 (record 0044, design proposal sections 3, 4, 7 and 9): title bar
// with classic menus and Export, view bar, concept navigator, central tabs (manuscript,
// library, authors, settings), right panel with Warnings, Review and Details, and status
// bar. All the work (open, write, cite, save, export, import a copy, paste from Word,
// autosave and recovery) is the vertical slice's and later records', unchanged.
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  addArticle, addEmptyTable, readiness, setCountTableWords, linkedCollection, syncZoteroLibrary, ZoteroError, ZoteroLocal, zoteroLibraryMode, addFigure, addTablePart, discardPastedPart, deletePartFile, saveSnapshot, articleOutline, changedDocuments, checkArticle, composeArticle, liveDocuments, saveComposite, splitArticle, tablePartFromPaste, createDemoProject, ignoreWarning, restoreWarning, setBlindOmitted, setBlindReplacement, deleteReference, exportDocx, exportTitlePage, importCopy, importReferences, loadProject, projectFromWord,
  exportPdf, manuscriptTypst, omitsAuthor, documentFontsOf, setDocumentFont, fontList, sectionNumberingOf, sectionLabel, roleFromName, BODY_ORDER, CLOSING_ORDER, sectionNumbers as numbersOfSections, setSectionNumbering, type SectionNumbering, Recovery, referenceUses, renderCitations, setCitationStyle, styleResources, createProject, tableShape, ignoreWord, unignoreWord, setArticleLang,
  setTrackChanges, registries,
  type ArticleData, type ArticleOutline, type CheckReport, type CheckWarning, type OutlinePart, type PendingRecovery, type Project, type ReferenceUse, type Rendering,
} from "@scidesk/core";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Fragment, Slice, type Node as PMNodeType } from "@tiptap/pm/model";
import { autocorrectOptions } from "./autocorrect.ts";
import { unwrapPdfText } from "./pdf-paste.ts";
import { closeHistory } from "@tiptap/pm/history";
import { addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, deleteColumn, deleteRow, isInTable, mergeCells, splitCell, toggleHeaderRow } from "@tiptap/pm/tables";
import { newId, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { citationLabels, extensions, findStep, hooks, partInfo, refreshCitationLabels, refreshPartLabels, refreshXrefLabels, xrefLabels } from "./editor.ts";
import { numberable, setSectionNumberStyle } from "./section-numbers.ts";
import { addSection, addSubsection, canMoveSection, childIndexAt, headingIndex, moveSection, moveSectionTo, removeHeading, roleOfNode, setSectionRole, topHeadings } from "./sections-edit.ts";
import { FindBar } from "./FindBar.tsx";
import { addNote, blockInsertPos, clearImages, partAround, partContext, placed, relabel, setAlign, setPartAttrs } from "./parts.ts";
import { cellInfo, TableContextBar, TableTabView, UnplacedTableTab, type CellInfo, type PasteNotice, type TableCommand } from "./TableTab.tsx";
import { AuthorsDialog, type Tab as AuthorsTab } from "./AuthorsDialog.tsx";
import { ChecksPanel } from "./ChecksPanel.tsx";
import { DetailsPanel, type Selected } from "./DetailsPanel.tsx";
import { SelectionBubble, XrefPicker } from "./EditorMenus.tsx";
import { Icon, type IconName } from "./icons.tsx";
import { cleanOfficeHtml, isOfficeHtml, keepSourceFonts, readPaste } from "./paste.ts";
import { LibraryFilters, LibraryPanel, type LibraryFilter } from "./LibraryPanel.tsx";
import { ContextMenu, MenuBar, MenuButton, type MenuDef, type MenuEntry } from "./Menus.tsx";
import { Navigator, type NavTarget } from "./Navigator.tsx";
import { QuickCite, type CiteItem } from "./QuickCite.tsx";
import { ReviewPanel } from "./ReviewPanel.tsx";
import { Ribbon } from "./Ribbon.tsx";
import { SettingsView } from "./SettingsView.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { actionFor, BROWSER_KEYS, comboOf, EDITOR_ACTIONS, plainKeyOf, SCHEMES, shortcutLabel, type Action } from "./shortcuts.ts";
import { effectiveScheme, useSettings } from "./settings.ts";
import { createProjectFolder, foldersExist, forgetFolder, hasPreviewProject, inTauri, localStore, memoryFs, openFolder, openRecentFolder, previewFs, resources, styleText, typstCompiler, zoteroTransport } from "./platform.ts";
import { Home, shortPath } from "./Home.tsx";
import { FirstRun } from "./FirstRun.tsx";
import { PreviewPane } from "./PreviewPane.tsx";
import { checkWords, misspelledAt, refresh, setProjectWords, spellOptions, suggestions } from "./spellcheck.ts";
import { foreignStretch, langAtCursor, otherLang, setLanguage } from "./lang.ts";
import { EnglishVariants } from "./EnglishVariants.tsx";
import { DocumentFontDialog } from "./DocumentFontDialog.tsx";
import { formatDictionary, parseDictionary } from "@scidesk/spell";
import { PROJECT_LAYOUT } from "@scidesk/formats";

const PROJECT_DICTIONARY = PROJECT_LAYOUT.dictionary;
import { NewArticle, type NewArticleChoice } from "./NewArticle.tsx";
import { forgetRecent, loadRecent, PREVIEW_PLACE, rememberProject, roundOf, updateRecentArticle, type RecentArticle, type RecentProject } from "./recent.ts";
import { setJournalTableStyle } from "./table-lines.ts";
import { partDrag } from "./part-drag.ts";
import { insertPageBreak } from "./page-break.ts";
import { landscapeState, landscapeText, refreshLandscapeLabels, setLandscape } from "./landscape.ts";
import { revealIn } from "./reveal.ts";
import { changeAt, changeInfo, decide, isTracking, setTracking, stepChange, track, type ChangeRecord } from "./track-changes.ts";
import { TrackNameDialog } from "./TrackNameDialog.tsx";

const BODY = "manuscript/article.scidoc";
/**
 * Autosave (R25, record 0039): the journal of unsaved changes is written shortly after
 * each change, and the document is saved after a pause in the typing, or at the latest
 * after a while of continuous typing.
 */
const JOURNAL_MS = 300;
const AUTOSAVE_IDLE_MS = 2000;
const AUTOSAVE_MAX_MS = 20000;
/** The sheet is A4: 21 cm wide, in CSS px. Zoom goes from 20 % (several pages side by side, record 0049) to 300 %; "fit" fills the width of the desk. */
const A4_PX = (210 / 25.4) * 96;
export const ZOOM_STEPS = [20, 25, 33, 50, 75, 100, 125, 150, 175, 200, 250, 300];
export const MIN_ZOOM = 20;
const clampZoom = (z: number) => Math.round(Math.min(300, Math.max(MIN_ZOOM, z)));
/**
 * Pages (record 0049) need CSS columns that wrap into rows (column-height, column-wrap):
 * Chromium, so WebView2 in Windows. Elsewhere (WebKit, for now) the sheet stays continuous.
 */
const PAGED = typeof CSS !== "undefined" && CSS.supports("column-wrap", "wrap") && CSS.supports("column-height", "1px");
/** Grey space between two sheets, in CSS px (not zoomed, as in Word). */
const SHEET_GAP = 16;
/** The sheet's side margins, 2.5 cm (record 0046), in CSS pixels at 100 %. */
const MARGIN_PX = (25 / 25.4) * 96;
/**
 * Record 0085: "fit" with little room (the right panel open on a laptop) fills the width with
 * the text and 1 cm of each margin, as Word's "text width", up to 100 %; the rest of the
 * margins is cut evenly on both sides. With room for the whole sheet at 100 % or more, the sheet.
 */
export function fitZoomFor(room: number): number {
  const sheet = room / A4_PX;
  const text = room / (A4_PX - 2 * (MARGIN_PX - 96 / 2.54));
  return Math.floor(Math.min(200, Math.max(50, (sheet >= 1 ? sheet : Math.min(1, text)) * 100)));
}

/** A manuscript is "doc:<article folder>": one tab per article of the project (record 0015); a table's own tab is "table:<id>". */
// file:<path>: a table not placed in the text, in an editor of its own over its file
type CenterTab = `doc:${string}` | `table:${string}` | `file:${string}` | "library" | "authors" | "settings";
type View = "article" | "library";
type RightTab = "warnings" | "review" | "details";
const TAB_ICONS: Record<string, IconName> = { library: "library", authors: "users", settings: "settings" };
const isDoc = (k: string): k is `doc:${string}` => k.startsWith("doc:");
const isTableTab = (k: string): k is `table:${string}` => k.startsWith("table:");
const isFileTab = (k: string): k is `file:${string}` => k.startsWith("file:");
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml" };
/** The title of an article as saved (the tab of an article that is not on screen). */
const savedTitle = (a: ArticleData) => {
  const title = ((a.documents.get(BODY)?.doc as PMNode | undefined)?.content ?? []).find((n) => n.type === "title");
  const text = (n: PMNode): string => (n.type === "text" ? n.text ?? "" : (n.content ?? []).map(text).join(""));
  return title ? text(title).trim() : "";
};

const docxUrl = (bytes: Uint8Array) => URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));


/** The core's warnings are in English (it also serves the command line): the ones a user meets, in the interface's language (phase 1 test). */
function coreWarning(w: string, t: TFunction): string {
  let m = /^(\d+) pending marker\(s\) left in the text/.exec(w);
  if (m) return t("corePending", { count: Number(m[1]) });
  m = /^(\d+) thing\(s\) in the text may identify the authors/.exec(w);
  if (m) return t("coreBlinding", { count: Number(m[1]) });
  if (/^the pasted table has no "Tabla N\." caption/.test(w)) return t("corePasteNoCaption");
  m = /^(\d+) table\(s\) without a "Tabla N\." caption/.exec(w);
  if (m) return t("coreUncaptioned", { count: Number(m[1]) });
  return w;
}
const coreWarnings = (ws: string[], t: TFunction) => ws.map((w) => coreWarning(w, t)).join("; ");

export function App() {
  const { t, i18n } = useTranslation();
  const [settings, updateSettings, settingsLoaded] = useSettings();
  const scheme = effectiveScheme(settings);
  const keys = (a: Action) => shortcutLabel(SCHEMES[scheme][a], i18n.language);
  const [project, setProject] = useState<Project | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessageState] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rendering, setRendering] = useState<Rendering | null>(null);
  // record 0070: the sections' numbers (for the navigator) and the article's numbering
  const [sectionNos, setSectionNos] = useState<Map<string, string>>(new Map());
  const [numberingTick, setNumberingTick] = useState(0);
  const [proposals, setProposals] = useState<{ set: ProposalSetFile; name: string } | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [outline, setOutline] = useState<ArticleOutline | null>(null);
  const [uses, setUses] = useState<Map<string, number>>(new Map());
  const [useSites, setUseSites] = useState<Map<string, ReferenceUse[]>>(new Map());
  // the quick citation dialog: the citation being edited (its position), or a new one
  // the citation being written: in the manuscript or in a table's tab (record 0067), and where
  const [citing, setCiting] = useState<{ view: EditorView; pos: number | null; items: CiteItem[] } | null>(null);
  const tabViews = useRef(new Map<string, EditorView>());
  // the writing of each unplaced table open in its tab, to do before it goes back into the text
  const unplacedFlush = useRef(new Map<string, () => Promise<void>>());
  const [xrefOpen, setXrefOpen] = useState(false);
  // find and replace in the manuscript; `focus` changes each time it is asked for again
  const [finding, setFinding] = useState<{ replace: boolean; focus: number } | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  // every message replaces the previous one, with its file link or none
  const [messageAction, setMessageAction] = useState<{ label: string; run: () => void } | null>(null);
  const setMessage = (text: string, file: { url: string; name: string } | null = null, action: { label: string; run: () => void } | null = null) => { setMessageState(text); setDownload(file); setMessageAction(action); };
  const refsInput = useRef<HTMLInputElement>(null);
  const figureInput = useRef<HTMLInputElement>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  // record 0058: the preview compiles again after each recomputation (a pause in typing)
  const [previewTick, setPreviewTick] = useState(0);
  const [cursorBlocks, setCursorBlocks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [recoveries, setRecoveries] = useState<PendingRecovery[]>([]);
  // the window's layout
  const [view, setView] = useState<View>("article");
  const [tabs, setTabs] = useState<CenterTab[]>([]);
  const [tab, setTab] = useState<CenterTab>("doc:");
  // the article on screen; the editor keeps the state (and the undo history) of the others
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const editorStates = useRef(new Map<string, EditorState>());
  const [rightTab, setRightTab] = useState<RightTab>("warnings");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [navActive, setNavActive] = useState<NavTarget | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [authorsTab, setAuthorsTab] = useState<AuthorsTab>("authors");
  const [authorsKey, setAuthorsKey] = useState(0);
  const [authorsDirty, setAuthorsDirty] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tab?: EditorView; spell?: { from: number; to: number; word: string; dict: string; suggestions: string[]; foreign: { from: number; to: number; text: string; lang: string } | null } } | null>(null);
  const [showSections, setShowSections] = useState(false);
  // the start screen (record 0048): where the open project is, the recent projects, the wizard
  const place = useRef<string | null>(null);
  const rounds = useRef(new Map<string, RecentArticle["round"]>());
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [wizard, setWizard] = useState(false);
  // the table cells selected (Details, sheet 8), and what each paste from Word kept and dropped
  const [cells, setCells] = useState<CellInfo | null>(null);
  const [pasteNotices, setPasteNotices] = useState<Map<string, PasteNotice>>(new Map());
  const lastPaste = useRef<{ doc: unknown; tables: string[] } | null>(null);
  const recovery = useRef<Recovery | null>(null);
  // edits counted, so that a save that ran while typing does not mark newer text as saved
  const editVersion = useRef(0);
  const savingNow = useRef(false);
  const dirtySince = useRef<number | null>(null);
  // a click in the text shows what it selects in "Details"
  const pointerInEditor = useRef(false);
  const article = project?.articles.find((a) => a.folder === activeFolder) ?? project?.articles[0] ?? null;
  const docTab: CenterTab = `doc:${article?.folder ?? ""}`;
  // pasting from Word with tables (record 0042): set below, called by the editor
  const pasteTables = useRef<(html: string) => boolean>(() => false);
  // record 0065: text from a PDF put back into paragraphs; the message says so
  const pdfPasted = useRef<(paragraphs: number) => void>(() => {});
  // record 0066: the last paste from Word (to redo it keeping its fonts), and the redo under way
  const wordPaste = useRef<{ html: string; before: PMNodeType; from: number; to: number; after: PMNodeType | null } | null>(null);
  const keepSourceNext = useRef(false);
  const wordPasted = useRef<() => void>(() => {});

  const editor = useEditor({
    editorProps: {
      // Word's HTML, cleaned (prototype 1); with tables, each becomes a .scitable
      transformPastedHTML: (html, view) => {
        // record 0066: a paste from Word without tables can be redone keeping its fonts
        if (isOfficeHtml(html) && !/<table\b/i.test(html) && !keepSourceNext.current) {
          wordPaste.current = { html, before: view.state.doc, from: view.state.selection.from, to: view.state.selection.to, after: null };
          setTimeout(() => wordPasted.current(), 0);
        }
        return cleanOfficeHtml(keepSourceNext.current ? keepSourceFonts(html) : html);
      },
      // record 0065: plain text copied from a PDF, in paragraphs again (Ctrl+Shift+V: the lines as they are)
      clipboardTextParser: (text, _context, plain, view) => {
        const paragraphs = plain ? null : unwrapPdfText(text);
        if (!paragraphs) return null as unknown as Slice;
        const { schema } = view.state;
        setTimeout(() => pdfPasted.current(paragraphs.length), 0);
        return new Slice(Fragment.from(paragraphs.map((p) => schema.nodes.paragraph.create(null, p ? schema.text(p) : null))), 1, 1);
      },
      handlePaste: (view, event) => {
        // Ctrl+Shift+V: only the text, as ProseMirror does by itself
        if ((view as unknown as { input?: { shiftKey?: boolean } }).input?.shiftKey) return false;
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (!isOfficeHtml(html) || !/<table\b/i.test(html)) return false;
        event.preventDefault();
        return pasteTables.current(html);
      },
      attributes: { "aria-label": "manuscript" },
    },
    extensions,
    content: { type: "doc", content: [] },
    onUpdate: () => { editVersion.current++; dirtySince.current ??= Date.now(); setDirty(true); },
    // a document with something the editor cannot show is an error, never a blank page
    enableContentCheck: true,
    onContentError: ({ error }) => setError(`${t("cannotShow")}: ${error.message}`),
  }, []);
  useEffect(() => { editor?.view.dom.setAttribute("aria-label", t("ui.manuscript")); }, [editor, t]);

  const recompute = useCallback(async () => {
    if (!project || !article || !editor) return;
    try {
      // the article on screen: one tree, and the files it will be saved to (record 0021)
      const doc = editor.getJSON() as PMNode;
      const live = liveDocuments(doc, article);
      const r = await renderCitations(project.library, [doc], article.article.citationStyle.id, article.article.referenceTermsLang ?? article.article.lang, await styleResources(project, article, resources));
      refreshXrefLabels(doc as never);
      setSectionNos(numbersOfSections(doc, sectionNumberingOf(project, article.folder).value));
      citationLabels.clear();
      for (const [id, c] of r.citations) citationLabels.set(id, c.runs);
      refreshCitationLabels();
      setRendering(r);
      // how often each reference is cited, with what is on screen and not saved yet
      const sites = referenceUses(project, Object.fromEntries(Object.entries(live).map(([p, d]) => [`${article.folder}/${p}`, d])));
      setUseSites(sites);
      setUses(new Map([...sites].map(([id, u]) => [id, u.length])));
      // the checks, with what is on screen (record 0041)
      const rep = checkArticle(project, article.folder, live);
      setReport(rep);
      // the navigator, and the places of tables and figures with their numbers
      const o = articleOutline(project, article.folder, live);
      setOutline(o);
      setPreviewTick((n) => n + 1);
      if (place.current) void localStore().then((st) => updateRecentArticle(st, place.current!, summaryOf(project, article, rep, o.title?.text ?? ""))).catch(() => {});
      // a reference left in the text whose file is missing
      partInfo.clear();
      doc.content?.forEach((n) => {
        if (n.type !== "tableRef" && n.type !== "figureRef") return;
        const id = String(n.attrs!.id);
        partInfo.set(id, { label: t(n.type === "tableRef" ? "ui.tableN" : "ui.figureN", { n: xrefLabels.get(id) ?? "?" }), caption: t("ui.partMissing", { path: String(n.attrs!.src) }), cited: true, uncitedText: "" });
      });
      refreshPartLabels();
    } catch (e) {
      setError(String(e));
    }
  }, [project, article, editor, t]);

  // citations are renumbered after a pause (~200 ms, PLAN 7.6)
  useEffect(() => {
    if (!editor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onUpdate = () => { clearTimeout(timer); timer = setTimeout(recompute, 200); };
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); clearTimeout(timer); };
  }, [editor, recompute]);

  // what the selection is, for "Details"
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const down = () => { pointerInEditor.current = true; };
    const onSelection = () => {
      setCells(cellInfo(editor.state));
      const sel = editor.state.selection;
      let next: Selected | null = null;
      let atom = false;
      if (sel instanceof NodeSelection) {
        const n = sel.node;
        atom = true;
        if (n.type.name === "citation") next = { kind: "citation", id: n.attrs.id as string, items: n.attrs.items as CiteItem[] };
        else if (/^(table|figure)(Ref|Part)$/.test(n.type.name)) next = { kind: "part", id: n.attrs.id as string, part: n.type.name.startsWith("table") ? "table" : "figure" };
        else if (n.type.name === "xref") next = { kind: "xref", target: n.attrs.target as string };
        else atom = false;
      }
      // the cursor inside a table, a figure or the abstract shows it, without leaving the tab the user is on
      if (!next) {
        const part = partAround(sel.$from);
        if (part) next = { kind: "part", id: part.node.attrs.id as string, part: part.node.type.name === "tablePart" ? "table" : "figure" };
        else for (let d = sel.$from.depth; d > 0; d--) if (sel.$from.node(d).type.name === "abstractSection") { next = { kind: "abstract", lang: String(sel.$from.node(d).attrs.lang) }; break; }
      }
      if (next) {
        const n = next;
        setSelected((s) => (JSON.stringify(s) === JSON.stringify(n) ? s : n));
        if (pointerInEditor.current && atom) setRightTab("details");
      } else setSelected((s) => (s && (s.kind === "citation" || s.kind === "part" || s.kind === "xref" || s.kind === "abstract") ? null : s));
      pointerInEditor.current = false;
    };
    dom.addEventListener("mousedown", down);
    editor.on("selectionUpdate", onSelection);
    return () => { dom.removeEventListener("mousedown", down); editor.off("selectionUpdate", onSelection); };
  }, [editor]);

  /** A document in the editor with a fresh undo history (Ctrl+Z never goes back to another document). */
  const freshState = useCallback((doc: PMNode) => {
    try {
      return EditorState.create({ doc: editor!.schema.nodeFromJSON(doc), plugins: editor!.state.plugins });
    } catch (e) {
      setError(`${t("cannotShow")}: ${e instanceof Error ? e.message : String(e)}`);
      return EditorState.create({ doc: editor!.schema.nodeFromJSON({ type: "doc", content: [] }), plugins: editor!.state.plugins });
    }
  }, [editor, t]);
  const loadDoc = useCallback((doc: PMNode) => { if (editor) editor.view.updateState(freshState(doc)); }, [editor, freshState]);
  /**
   * The article as one tree (record 0021). The parts learn first the article they belong to:
   * its language (for "Tabla 1."), its files (a copy never takes one) and where its images are.
   */
  const composed = useCallback((p: Project, a: ArticleData): PMNode => {
    clearImages();
    partContext.lang = a.article.lang;
    partContext.files = () => a.documents.keys();
    partContext.image = async (path) => {
      const type = IMAGE_TYPES[path.split(".").pop()!.toLowerCase()];
      const bytes = type ? await p.fs.readBytes(`articles/${a.folder}/${path}`) : null;
      return bytes ? URL.createObjectURL(new Blob([bytes as BlobPart], { type })) : null;
    };
    const c = composeArticle(a);
    if (c.warnings.length) setError(c.warnings.join("; "));
    // record 0090: who made each tracked change of this article
    track.registry = registries(a).changes as Record<string, ChangeRecord>;
    return c.doc;
  }, []);
  // the texts of the parts follow the interface language
  useEffect(() => {
    document.documentElement.style.setProperty("--ph-title", JSON.stringify(t("ui.titlePlaceholder")));
    document.documentElement.style.setProperty("--page-break-label", JSON.stringify(t("ui.pageBreak")));
    landscapeText.label = t("ui.landscape.label");
  }, [t]);
  useEffect(() => {
    partContext.uncited = t("ui.notCitedFlag");
    partContext.noImage = (path) => t("ui.noImage", { path });
    partContext.captionHint = (kind) => t(kind === "table" ? "ui.tableTitleHint" : "ui.figureCaptionHint");
    partDrag.title = (kind) => t(kind === "table" ? "ui.moveTable" : "ui.moveFigure");
    if (editor) relabel(editor.view);
  }, [editor, t]);

  /** Shows a project; `focus` is the article on screen (the first by default). */
  const show = useCallback(async (p: Project, where: string | null = null, focus: string | null = null) => {
    place.current = where;
    setProject(p);
    setProposals(null);
    setError("");
    setSelected(null);
    setNavActive(null);
    // every manuscript of the project in its tab, the first on screen
    const first = p.articles.find((a) => a.folder === focus) ?? p.articles[0];
    setTabs(p.articles.map((a) => `doc:${a.folder}` as CenterTab));
    setTab(`doc:${first.folder}`);
    setActiveFolder(first.folder);
    editorStates.current.clear();
    setView("article");
    journaled.current.clear();
    loadDoc(composed(p, first));
    syncTracking(first);
    setDirty(false);
    dirtySince.current = null;
    setLastSaved(null);
    // work that never reached the disk the last time the project was open
    const store = await localStore();
    const rec = new Recovery(store, p);
    recovery.current = rec;
    setRecoveries((await rec.pending()).pending);
    // first in the recent projects of this computer, with a summary of each article
    rounds.current.clear();
    if (where) {
      const articles: RecentArticle[] = [];
      for (const a of p.articles) {
        rounds.current.set(a.folder, await roundOf(p, a.folder));
        const r = checkArticle(p, a.folder);
        articles.push(summaryOf(p, a, r, savedTitle(a)));
      }
      await rememberProject(store, { path: where, id: p.manifest.id, name: p.manifest.name, articles }).catch(() => {});
    }
  }, [loadDoc, composed]); // eslint-disable-line react-hooks/exhaustive-deps
  /** What the start screen shows of an article. */
  const summaryOf = (p: Project, a: ArticleData, report: CheckReport, title: string): RecentArticle => {
    const ready = readiness(report);
    return {
      folder: a.folder, title, articleType: a.article.articleType, words: report.counts.main, limit: report.limits.words ?? null,
      journal: a.article.journal ? p.journals.get(a.article.journal)?.journal.title.value ?? a.article.journal : null,
      round: rounds.current.get(a.folder) ?? null,
      ready: ready.ready, blocking: ready.blocking, pending: ready.pending, missing: ready.missing,
    };
  };
  useEffect(() => { void recompute(); }, [project, recompute]);
  /** Record 0058: the Typst source of the article on screen, saved or not. */
  const previewBundle = useCallback(async () => {
    if (!project || !article || !editor) return null;
    return manuscriptTypst(project, article.folder, resources, { live: liveDocuments(editor.getJSON() as PMNode, article) });
  }, [project, article, editor]);
  // the ids around the cursor, innermost first, for the preview to follow it
  useEffect(() => {
    if (!editor || !settings.preview) return;
    const onSel = () => {
      const $from = editor.state.selection.$from;
      const ids: string[] = [];
      for (let d = $from.depth; d > 0; d--) { const id = $from.node(d).attrs.id; if (typeof id === "string") ids.push(id); }
      setCursorBlocks((old) => (old.join() === ids.join() ? old : ids));
    };
    onSel();
    editor.on("selectionUpdate", onSel);
    return () => { editor.off("selectionUpdate", onSel); };
  }, [editor, settings.preview]);
  // record 0060: the language at the cursor, for the status bar and the Review menu
  const [cursorLang, setCursorLang] = useState<{ lang: string; fragment: boolean } | null>(null);
  // record 0063: the dialog that makes the English British or American
  const [variantsOpen, setVariantsOpen] = useState<"GB" | "US" | null>(null);
  // record 0090: tracked changes on, and the name they carry asked for the first time
  const [tracking, setTrackingOn] = useState(false);
  const [askName, setAskName] = useState(false);
  // record 0074: the document font dialog, and a tick to re-read article.json after it
  const [docFontOpen, setDocFontOpen] = useState(false);
  const [fontTick, setFontTick] = useState(0);
  // record 0085: whether the blocks of the selection are on landscape pages (null: none can be)
  const [cursorLandscape, setCursorLandscape] = useState<boolean | null>(null);
  useEffect(() => { if (editor) refreshLandscapeLabels(editor.view); }, [editor, t]);
  useEffect(() => {
    if (!editor) return;
    const onSel = () => {
      const l = langAtCursor(editor.state);
      setCursorLang((old) => (old && old.lang === l.lang && old.fragment === l.fragment ? old : l));
      setCursorLandscape(landscapeState(editor.state));
    };
    onSel();
    editor.on("selectionUpdate", onSel);
    editor.on("transaction", onSel);
    return () => { editor.off("selectionUpdate", onSel); editor.off("transaction", onSel); };
  }, [editor, article]);
  // record 0057: the spell checker follows the article's language and the setting
  useEffect(() => {
    spellOptions.enabled = settings.spellcheck;
    autocorrectOptions.enabled = settings.autocorrect;
    spellOptions.lang = article?.article.lang ?? "es";
    spellOptions.ignore = new Set(article?.article.ignoredWords ?? []);
    if (editor && !editor.isDestroyed) refresh(editor.view);
  }, [editor, article, settings.spellcheck, settings.autocorrect]);
  // and the project's dictionary, which every language accepts
  useEffect(() => {
    if (!project) return;
    void project.fs.readText(PROJECT_DICTIONARY).then((text) => setProjectWords(parseDictionary(text), editor?.view)).catch(() => {});
  }, [project, editor]);

  const run = <A extends unknown[]>(f: (...a: A) => Promise<void>) => async (...a: A) => {
    setError("");
    try { await f(...a); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  // paths of the article whose unsaved state went to the journal of recovery
  const journaled = useRef(new Set<string>());
  /** Writes the files of the article that changed: the body, the abstract, each table and figure (record 0021). */
  const save = async () => {
    if (!project || !article || !editor || savingNow.current) return;
    savingNow.current = true;
    setSaving(true);
    const version = editVersion.current;
    try {
      await saveComposite(project, article, editor.getJSON() as PMNode, { changes: track.registry });
      if (version === editVersion.current) {
        // everything on screen is on disk: nothing left to recover
        for (const path of journaled.current) await recovery.current?.clear(article.folder, path);
        journaled.current.clear();
        setDirty(false);
        dirtySince.current = null;
      }
      setLastSaved(new Date());
    } finally {
      savingNow.current = false;
      setSaving(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // the journal shortly after each change; the save after a pause, or after a while of typing
  useEffect(() => {
    if (!editor || !project || !article) return;
    let journal: ReturnType<typeof setTimeout> | undefined;
    let autosave: ReturnType<typeof setTimeout> | undefined;
    const onUpdate = () => {
      clearTimeout(journal);
      // each file whose content differs from the disk, as it would be saved
      journal = setTimeout(() => {
        for (const [path, file] of changedDocuments(splitArticle(editor.getJSON() as PMNode, article, { changes: track.registry }), article)) {
          journaled.current.add(path);
          void recovery.current?.record(article.folder, path, file).catch(() => {});
        }
      }, JOURNAL_MS);
      clearTimeout(autosave);
      const waited = Date.now() - (dirtySince.current ?? Date.now());
      autosave = setTimeout(() => {
        saveRef.current().catch((e) => setError(`${t("autosaveFailed")}: ${e instanceof Error ? e.message : String(e)}`));
      }, waited > AUTOSAVE_MAX_MS ? 0 : AUTOSAVE_IDLE_MS);
    };
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); clearTimeout(journal); clearTimeout(autosave); };
  }, [editor, project, article, t]);

  const recover = run(async (p: PendingRecovery, keep: boolean) => {
    const rec = recovery.current;
    if (!rec) return;
    setRecoveries((list) => list.filter((x) => x.key !== p.key));
    if (!keep) { await rec.discard(p); setMessage(t("recoveryDiscarded")); return; }
    const { snapshot } = await rec.apply(p);
    if (p.entry.article === article?.folder && project) {
      loadDoc(composed(project, article));
      syncTracking(article);
      setDirty(false);
      void recompute();
    } else editorStates.current.delete(p.entry.article); // shown from the disk when its tab is opened
    setMessage(snapshot ? t("recoveredWithSnapshot", { snapshot }) : t("recovered"));
  });

  // in the browser preview the demo lives in the browser's storage: reloading the page is reopening it
  // with a second article, a letter, to try two manuscripts in their tabs (record 0044)
  // one at a time: two clicks would build two demos over the same browser storage
  const opening = useRef(false);
  const openDemo = run(async () => {
    if (opening.current) return;
    opening.current = true;
    try { await show(await createDemoProject(inTauri ? memoryFs() : previewFs(true), "corte-vertical", { letter: true, parts: true }), inTauri ? null : PREVIEW_PLACE); } finally { opening.current = false; }
  });
  const reopenPreview = run(async () => show(await loadProject(previewFs(false)), PREVIEW_PLACE));
  const wordInput = useRef<HTMLInputElement>(null);
  // a new project from a Word document: in the app, into an empty folder the user chooses
  const fromWord = run(async () => {
    const file = wordInput.current?.files?.[0];
    if (wordInput.current) wordInput.current.value = "";
    if (!file) return;
    const target = inTauri ? await openFolder() : { fs: memoryFs(), path: null };
    if (!target) return;
    const { project: p, report } = await projectFromWord(target.fs, new Uint8Array(await file.arrayBuffer()), { fileName: file.name, checkLang: checkWords });
    await show(p, target.path);
    setMessage(t("fromWordDone", { headings: report.headings, tables: report.tables, figures: report.figures }) + (report.warnings.length ? ` — ${coreWarnings(report.warnings, t)}` : ""));
  });
  const open = run(async () => {
    if (!inTauri) return;
    if (dirty) await save();
    const r = await openFolder();
    if (r) await show(await loadProject(r.fs), r.path);
  });

  // ---------------------------------------------------------------- the start screen (record 0048)

  const refreshRecent = useCallback(async () => {
    const list = await loadRecent(await localStore());
    setRecent(list);
    const folders = list.filter((r) => r.path !== PREVIEW_PLACE);
    const there = inTauri && folders.length ? await foldersExist(folders.map((r) => r.path)).catch(() => folders.map(() => true)) : [];
    const gone = new Set(folders.filter((_, i) => inTauri && !there[i]).map((r) => r.path));
    if (!inTauri) for (const r of folders) gone.add(r.path); // a folder cannot be opened from the browser preview
    if (list.some((r) => r.path === PREVIEW_PLACE) && !hasPreviewProject()) gone.add(PREVIEW_PLACE);
    setMissing(gone);
  }, []);
  useEffect(() => { if (!project) void refreshRecent(); }, [project, refreshRecent]);
  const openRecent = run(async (r: RecentProject) => {
    if (r.path === PREVIEW_PLACE) { await show(await loadProject(previewFs(false)), PREVIEW_PLACE); return; }
    const found = await openRecentFolder(r.path);
    if (found === "missing") { setMissing((m) => new Set(m).add(r.path)); setMessage(t("ui.home.missingNow", { name: r.name })); return; }
    await show(await loadProject(found.fs), found.path);
  });
  const locateRecent = run(async (r: RecentProject) => {
    const found = await openFolder();
    if (!found) return;
    const p = await loadProject(found.fs);
    // the same project somewhere else: it takes the old entry's place
    if (!r.id || r.id === p.manifest.id) await forgetRecent(await localStore(), r.path);
    else setMessage(t("ui.home.locatedOther", { name: p.manifest.name, old: r.name }));
    await show(p, found.path);
  });
  const forgetRecentProject = run(async (r: RecentProject) => {
    await forgetRecent(await localStore(), r.path);
    if (inTauri && r.path !== PREVIEW_PLACE) await forgetFolder(r.path).catch(() => {});
    await refreshRecent();
  });
  const closeProject = run(async () => {
    if (!project) return;
    if (dirty) await save();
    place.current = null;
    recovery.current = null;
    editorStates.current.clear();
    setProject(null);
    setTabs((ts) => ts.filter((k) => k === "settings"));
    setTab("doc:");
    setActiveFolder(null);
    setReport(null);
    setOutline(null);
    setRendering(null);
    setProposals(null);
    setRecoveries([]);
    setSelected(null);
  });
  const newArticle = run(async () => {
    if (project && dirty) await save();
    setWizard(true);
  });
  /** What the wizard chose: the folder, the project, and the references from a file. */
  const createArticle = async (c: NewArticleChoice) => {
    // record 0051: another article in the open project, with its library and people
    if (c.inProject && project) {
      let p = await addArticle(project, {
        folder: c.folder, title: c.title, lang: c.lang, translations: c.translations, articleType: c.articleType,
        journal: c.profile, citationStyle: c.citationStyle, readStyle: styleText,
      });
      let note = t("ui.wizard.added", { folder: c.folder });
      let failed = "";
      if (c.references) {
        try {
          const r = await importReferences(p, { name: c.references.name, text: await c.references.text() });
          note = t("ui.wizard.addedRefs", { folder: c.folder, added: r.added.length, duplicates: r.duplicates.length });
          p = await loadProject(p.fs);
        } catch (e) { failed = e instanceof Error ? e.message : String(e); }
      }
      setWizard(false);
      await show(p, place.current, c.folder);
      setMessage(note);
      if (failed) setError(failed);
      return;
    }
    const target = inTauri ? await createProjectFolder(c.location!, c.folder) : { fs: previewFs(true), path: PREVIEW_PLACE, name: c.folder };
    let p = await createProject(target.fs, {
      // the name the user gave the folder, not the title cut at 80 characters (phase 1 test)
      name: c.folder, fileName: c.folder, title: c.title, lang: c.lang, translations: c.translations, articleType: c.articleType,
      journal: c.profile, citationStyle: c.citationStyle, readStyle: styleText,
      library: c.zotero ? zoteroLibraryMode(c.zotero) : undefined,
    });
    const where = target.path === PREVIEW_PLACE ? t("ui.home.previewPlace") : shortPath(target.path);
    let note = t("ui.wizard.created", { path: where });
    let failed = "";
    // record 0052: the linked library is filled from the collection at once
    if (c.zotero) {
      try {
        const r = await syncZoteroLibrary(p, new ZoteroLocal(zoteroTransport));
        note = t("ui.wizard.zoteroLinked", { path: where, name: c.zotero.name, count: r.total });
        zoteroSyncedFor.current = p;
      } catch (e) { failed = e instanceof Error ? e.message : String(e); }
    }
    if (c.references) {
      try {
        const r = await importReferences(p, { name: c.references.name, text: await c.references.text() });
        note = t("ui.wizard.createdRefs", { path: where, added: r.added.length, duplicates: r.duplicates.length });
        p = await loadProject(target.fs);
      } catch (e) { failed = e instanceof Error ? e.message : String(e); }
    }
    setWizard(false);
    await show(p, target.path);
    setMessage(note);
    if (failed) setError(failed);
  };

  // ---------------------------------------------------------------- tabs and panels

  const openTab = (k: CenterTab) => {
    setTabs((ts) => (ts.includes(k) ? ts : [...ts, k]));
    setTab(k);
  };
  const openTableTab = (id: string) => openTab(`table:${id}`);
  /** An unplaced table's file, written and its tab closed (before it goes back into the text or is deleted). */
  const closeFileTab = async (src: string) => {
    await unplacedFlush.current.get(src)?.();
    const k: CenterTab = `file:${src}`;
    setTabs((ts) => ts.filter((x) => x !== k));
    setTab((cur) => (cur === k ? docTab : cur));
  };
  /**
   * Shows another article's manuscript: what is on screen is saved first, its editor state
   * (with its undo history) is kept, and the other article's is restored or loaded.
   */
  const switchArticle = run(async (folder: string) => {
    if (!project || !editor) return;
    if (folder === article?.folder) { openTab(`doc:${folder}`); return; }
    const next = project.articles.find((a) => a.folder === folder);
    if (!next) return;
    if (dirty) await save();
    if (article) editorStates.current.set(article.folder, editor.state);
    // a table's tab belongs to the article it is in
    setTabs((ts) => ts.filter((k) => !isTableTab(k) && !isFileTab(k)));
    const kept = editorStates.current.get(folder);
    const doc = composed(project, next);
    editor.view.updateState(kept ?? freshState(doc));
    syncTracking(next);
    journaled.current.clear();
    editVersion.current++;
    dirtySince.current = null;
    setDirty(false);
    setLastSaved(null);
    setSelected(null);
    setNavActive(null);
    setProposals(null);
    setActiveFolder(folder);
    openTab(`doc:${folder}`);
  });
  const selectTab = (k: CenterTab) => { if (isDoc(k)) void switchArticle(k.slice(4)); else setTab(k); };
  // a table's tab whose table left the text closes by itself
  const tableGone = (k: CenterTab) => { setTabs((ts) => ts.filter((x) => x !== k)); setTab((cur) => (cur === k ? docTab : cur)); };
  const closeTab = (k: CenterTab) => {
    const docs = tabs.filter(isDoc);
    // a manuscript tab closes only while another one stays open
    if (isDoc(k) && docs.length < 2) return;
    setTabs((ts) => ts.filter((x) => x !== k));
    if (isDoc(k)) {
      editorStates.current.delete(k.slice(4));
      if (k === docTab) void switchArticle(docs.find((d) => d !== k)!.slice(4));
    } else if (tab === k) setTab(docTab);
    if (k === "library" && view === "library") setView("article");
  };
  const chooseView = (v: View) => {
    setView(v);
    if (!settings.left) updateSettings({ left: true });
    openTab(v === "library" ? "library" : docTab);
  };
  const showRight = (r: RightTab) => { setRightTab(r); if (!settings.right) updateSettings({ right: true }); };

  // ---------------------------------------------------------------- going to things in the text

  /**
   * Selects the first node that matches and shows it. `focus: false` leaves the focus where
   * it is: Tiptap's focus() gives it to the text a frame later, which would take it from a
   * dialog opened right after (Enter would then split the paragraph).
   */
  const selectNode = (match: (n: { type: { name: string }; attrs: Record<string, unknown> }) => boolean, focus = true) => {
    if (!editor) return false;
    let target = -1;
    editor.state.doc.descendants((node, pos) => {
      if (target >= 0) return false;
      if (match(node as never)) target = pos;
      return true;
    });
    if (target < 0) return false;
    openTab(docTab);
    const node = editor.state.doc.nodeAt(target)!;
    const chain = focus ? editor.chain().focus() : editor.chain();
    // a block: the cursor at its first text (inside a table, figure or abstract: its first line)
    (node.isAtom ? chain.setNodeSelection(target) : chain.command(({ tr }) => { tr.setSelection(TextSelection.near(tr.doc.resolve(target + 1))); return true; })).scrollIntoView().run();
    // a heading at the top of the page, not just inside it
    // (only the desk scrolls: scrollIntoView moved the whole window near the end of the text)
    requestAnimationFrame(() => {
      const el = editor.view.nodeDOM(target) as HTMLElement | null;
      if (el && deskRef.current) revealIn(deskRef.current, el, node.isInline ? "center" : "start", true);
    });
    return true;
  };
  const goToBlock = (block: string) => selectNode((n) => n.attrs.id === block);
  const goToPart = (id: string) => selectNode((n) => /^(table|figure)(Ref|Part)$/.test(n.type.name) && n.attrs.id === id);
  const goToCitation = (id: string, focus = true) => selectNode((n) => n.type.name === "citation" && n.attrs.id === id, focus);
  // a warning takes to its block: in the text, or to the table or figure it is in
  const goTo = (w: CheckWarning) => {
    if (!w.where) return;
    // every block is in the one tree: the body's, the abstract's and those of each part
    if (!goToBlock(w.where.block)) selectNode((n) => /^(table|figure)(Ref|Part)$/.test(n.type.name) && n.attrs.src === w.where!.path);
    // a pending marker: selected, ready to be typed over (phase 1 test)
    else if (w.code === "pending" && typeof w.params.marker === "string") selectMarker(w.where.block, w.params.marker);
  };
  const selectMarker = (block: string, marker: string) => {
    if (!editor) return;
    const found: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (found.length) return false;
      if (node.attrs.id !== block) return true;
      node.descendants((child, at) => {
        if (found.length || !child.isText) return !found.length;
        const i = child.text!.indexOf(marker);
        if (i >= 0) found.push({ from: pos + 1 + at + i, to: pos + 1 + at + i + marker.length });
        return false;
      });
      return false;
    });
    if (found.length) editor.chain().focus().setTextSelection(found[0]).run();
  };
  const onNav = (target: NavTarget) => {
    setNavActive(target);
    if (target.kind === "block") goToBlock(target.block);
    else if (target.kind === "part") { goToPart(target.id); setSelected({ kind: "part", id: target.id, part: target.part }); showRight("details"); }
    else if (target.kind === "abstract") {
      const block = outline?.abstract.find((a) => a.lang === target.lang)?.block;
      if (block) goToBlock(block);
      setSelected({ kind: "abstract", lang: target.lang });
      showRight("details");
    } else if (target.kind === "unplaced") placeAgain(target.src);
    else if (target.kind === "title-page") { setSelected({ kind: "title-page" }); showRight("details"); }
    else { setAuthorsTab(target.kind === "credit" ? "credit" : "authors"); openTab("authors"); }
  };

  // ---------------------------------------------------------------- citing and inserting

  // quick citation: on a selected citation it edits that one, otherwise it inserts a new one
  const openQuickCite = useCallback(() => {
    if (!editor || !project) return;
    // record 0067: in a table's tab, into the tab's view (which passes it on to the manuscript)
    const view = (isTableTab(tab) && tabViews.current.get(tab.slice(6))) || (isFileTab(tab) && tabViews.current.get(tab)) || editor.view;
    const sel = view.state.selection;
    if (sel instanceof NodeSelection && sel.node.type.name === "citation") setCiting({ view, pos: sel.from, items: sel.node.attrs.items as CiteItem[] });
    else setCiting({ view, pos: null, items: [] });
  }, [editor, project, tab]);
  const openXref = useCallback(() => { if (project) setXrefOpen(true); }, [project]);
  const openFind = (replace: boolean) => { openTab(docTab); setFinding({ replace, focus: Date.now() }); };
  useEffect(() => { hooks.quickCite = openQuickCite; hooks.xref = openXref; });
  useEffect(() => { hooks.find = (replace) => openFind(replace); });
  useEffect(() => { hooks.tracking = () => void toggleTracking(); });
  useEffect(() => { track.author = { name: settings.userName.trim() }; }, [settings.userName]);
  const finishCitation = (items: CiteItem[]) => {
    if (!editor || !citing) return;
    const { view, pos } = citing;
    setCiting(null);
    if (view.isDestroyed) return;
    const { state } = view;
    const tr = state.tr;
    if (pos === null) {
      // with text selected, the citation goes after it (record 0067): it backs that text, never replaces it
      const node = state.schema.nodes.citation.create({ id: newId("c"), items });
      if (state.selection.empty) tr.replaceSelectionWith(node);
      else { const at = state.selection.to; tr.insert(at, node).setSelection(TextSelection.near(tr.doc.resolve(at + node.nodeSize))); }
    } else tr.setNodeMarkup(pos, undefined, { ...state.doc.nodeAt(pos)!.attrs, items });
    view.dispatch(tr.scrollIntoView());
    view.focus();
  };
  const closeQuickCite = () => { const v = citing?.view; setCiting(null); if (v && !v.isDestroyed) v.focus(); else editor?.commands.focus(); };
  /** Record 0067: "omit author" on every reference of a citation, or on none. */
  const setOmitAuthor = (view: EditorView, pos: number, on: boolean) => {
    const node = view.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "citation") return;
    const items = (node.attrs.items as CiteItem[]).map(({ suppressAuthor: _s, ...i }) => (on ? { ...i, suppressAuthor: true } : i));
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, items }));
    view.focus();
  };
  // a cross-reference: "tabla " and the number, unless the word is already typed before it
  const insertXref = (p: OutlinePart, kind: "table" | "figure") => {
    setXrefOpen(false);
    if (!editor) return;
    openTab(docTab);
    const word = t(kind === "table" ? "ui.tableWord" : "ui.figureWord");
    const { from } = editor.state.selection;
    const before = editor.state.doc.textBetween(Math.max(0, from - word.length - 1), from, " ", " ").toLowerCase();
    const typed = before.endsWith(`${word.toLowerCase()} `);
    const content: object[] = [...(typed ? [] : [{ type: "text", text: `${word} ` }]), { type: "xref", attrs: { target: p.id } }];
    editor.chain().focus().insertContent(content as never).run();
  };
  /**
   * A table or figure goes into the text as its part (record 0021): at the cursor in the
   * body, or after the part the cursor is in; then the cursor goes to its caption.
   */
  const insertPart = (path: string) => {
    if (!editor || !article) return;
    const part = article.documents.get(path)?.doc as PMNode | undefined;
    if (!part) return;
    openTab(docTab);
    const at = blockInsertPos(editor.state);
    const node = placed(part, path) as never;
    (at === null ? editor.chain().focus().insertContent(node) : editor.chain().focus().insertContentAt(at, node)).run();
    goToPart(String(part.attrs!.id));
  };
  const insertTable = run(async () => {
    if (!project || !article || !editor) return;
    const { path } = await addEmptyTable(project, article.folder);
    insertPart(path);
    setMessage(t("ui.tableAdded", { path }));
  });
  // a table or figure that left the text (its file was kept) comes back at the cursor
  const placeAgain = (path: string) => {
    // open in its tab: its last changes to the file first, and the tab closes
    void closeFileTab(path).then(() => { insertPart(path); setMessage(t("ui.placedAgain", { path })); });
  };
  /**
   * "Adapt to the journal" (record 0047): a fragment's own font and size are removed from the
   * whole article in one step (Ctrl+Z undoes it), after saving and keeping a snapshot.
   */
  const adaptFonts = run(async () => {
    if (!project || !article || !editor) return;
    const types = [editor.schema.marks.fontFamily, editor.schema.marks.fontSize];
    let count = 0;
    editor.state.doc.descendants((n) => { if (n.isText && n.marks.some((m) => types.includes(m.type))) count++; });
    if (!count) { setMessage(t("ui.adaptNothing")); return; }
    await save();
    const snap = await saveSnapshot(project, article.folder, t("ui.adaptSnapshot"));
    const tr = editor.state.tr;
    for (const type of types) tr.removeMark(0, tr.doc.content.size, type);
    editor.view.dispatch(tr);
    setMessage(t("ui.adapted", { count, snapshot: snap.id }));
  });
  const removePart = (id: string) => {
    if (!editor) return;
    let at = -1;
    let src = "";
    editor.state.doc.forEach((n, offset) => { if (/^(table|figure)(Ref|Part)$/.test(n.type.name) && n.attrs.id === id) { at = offset; src = String(n.attrs.src); } });
    if (at < 0) return;
    editor.chain().focus().command(({ tr }) => { tr.delete(at, at + tr.doc.nodeAt(at)!.nodeSize); return true; }).run();
    setSelected(null);
    setMessage(t("ui.removedFromText", { path: src }));
  };
  const insertFigure = run(async () => {
    const file = figureInput.current?.files?.[0];
    if (figureInput.current) figureInput.current.value = "";
    if (!file || !project || !article || !editor) return;
    const { path } = await addFigure(project, article.folder, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    insertPart(path);
    setMessage(t("ui.figureAdded", { path }));
  });

  const chooseStyle = run(async (id: string) => {
    if (!project || !article) return;
    await setCitationStyle(project, article.folder, id);
    await recompute();
  });
  const ignore = async (w: CheckWarning | CheckWarning[], status: "correct" | "not-applicable", note: string) => {
    if (!project || !article) return;
    await ignoreWarning(project, article.folder, Array.isArray(w) ? w.map((x) => x.id) : w.id, status, note);
    await recompute();
  };
  /** Record 0056: whether the tables' words count in this article (null: as the journal says). */
  const tableWords = async (value: boolean | null) => {
    if (!project || !article) return;
    await setCountTableWords(project, article.folder, value);
    await recompute();
  };
  const restore = async (w: CheckWarning) => {
    if (!project || !article) return;
    // record 0088: what the blinded version changes is undone there
    if (w.ignored?.status === "replaced") await setBlindReplacement(project, article.folder, String(w.params.match), null);
    else if (w.ignored?.status === "omitted" && w.where) await setBlindOmitted(project, article.folder, w.where.block, false);
    else await restoreWarning(project, article.folder, w.id);
    await recompute();
  };
  /** Record 0088: replaces a warning's text in the blinded version only (null: takes its section to the title page). */
  const blind = async (w: CheckWarning, replacement: string | null) => {
    if (!project || !article) return;
    if (replacement === null) {
      if (!w.where) return;
      await setBlindOmitted(project, article.folder, w.where.block, true);
      setMessage(t("blinding.moved", { heading: w.params.heading }));
    } else {
      await setBlindReplacement(project, article.folder, String(w.params.match), replacement);
      setMessage(t("blinding.replaced", { text: w.params.match, replacement }));
    }
    await recompute();
  };
  pdfPasted.current = (n: number) => setMessage(t("ui.pdfPasted", { count: n }));
  // record 0066: "Keep source formatting", offered after a paste from Word in the free font mode
  wordPasted.current = () => {
    const w = wordPaste.current;
    if (!w || !editor || settings.fontMode !== "free") return;
    w.after = editor.state.doc;
    setMessage(t("ui.keepSource.pasted"), null, { label: t("ui.keepSource.action"), run: keepSourceFormatting });
  };
  const keepSourceFormatting = () => {
    const w = wordPaste.current;
    if (!editor || !w || editor.state.doc !== w.after) { setMessage(t("ui.keepSource.stale")); return; }
    // back to before the paste (undo, or the document as it was if the paste joined other typing)
    editor.commands.undo();
    if (!editor.state.doc.eq(w.before)) editor.view.dispatch(editor.state.tr.replaceWith(0, editor.state.doc.content.size, w.before.content));
    editor.commands.setTextSelection({ from: w.from, to: w.to });
    keepSourceNext.current = true;
    try { editor.view.pasteHTML(w.html); } finally { keepSourceNext.current = false; }
    wordPaste.current = null;
    setMessage(t("ui.keepSource.done"));
  };
  pasteTables.current = (html: string) => {
    if (!project || !article || !editor) return false;
    const images = (html.match(/<img\b/gi) ?? []).length;
    void run(async () => {
      const segments = readPaste(cleanOfficeHtml(html));
      const warnings: string[] = [];
      // the tables' files first (each saved and valid), then everything inserted in one step
      const content: ({ kind: "html"; html: string } | { kind: "node"; node: object })[] = [];
      let tables = 0;
      const pasted: { id: string; path: string; part: PMNode }[] = [];
      for (const s of segments) {
        if (s.kind === "html") { content.push(s); continue; }
        const { part, warnings: w } = tablePartFromPaste(s.table);
        const { path } = await addTablePart(project, article.folder, part);
        warnings.push(...w);
        content.push({ kind: "node", node: placed(part, path) });
        pasted.push({ id: String(part.attrs!.id), path, part });
        tables++;
      }
      // inside a table, a figure or the abstract, the pasted tables go after it
      const at = blockInsertPos(editor.state);
      // the paste is a step of its own in the undo history: "Undo the paste" (and Ctrl+Z) never
      // takes with it what was typed just before (ProseMirror joins edits less than 500 ms apart)
      let chain = editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; });
      if (at !== null) chain = chain.insertContentAt(at, { type: "paragraph" }).setTextSelection(at + 1);
      for (const c of content) chain = chain.insertContent(c.kind === "html" ? c.html : (c.node as never));
      chain.run();
      // what each table kept and dropped, shown in its tab with "Undo the paste" (sheet 8)
      lastPaste.current = { doc: editor.state.doc, tables: pasted.map((x) => x.id) };
      const dropped = droppedFormatting(html);
      setPasteNotices((m) => {
        const next = new Map(m);
        for (const x of pasted) next.set(x.id, { tables: pasted.map((y) => y.id), number: null, path: x.path, kept: keptOf(x.part), dropped });
        return next;
      });
      const extra = (images ? ` — ${t("pastedImagesDropped", { count: images })}` : "") + (warnings.length ? ` — ${coreWarnings([...new Set(warnings)], t)}` : "");
      setMessage(`${t("ui.pasteNotice.toast", { count: tables })}${dropped ? `. ${t("ui.pasteNotice.dropped")} ${dropped}` : ""}${extra}`, null, { label: t("ui.pasteNotice.undo"), run: () => undoPaste(pasted.map((x) => x.id), pasted.map((x) => x.path)) });
    })();
    return true;
  };
  /** What a pasted table kept, in words: caption, header rows, merged cells, alignment, widths, notes. */
  const keptOf = (part: PMNode) => {
    const s = tableShape(part);
    const items = [
      s.captioned ? t("ui.pasteNotice.caption") : "",
      s.headerRows ? t("ui.pasteNotice.headerRows", { count: s.headerRows }) : "",
      s.merged ? t("ui.pasteNotice.merged", { count: s.merged }) : "",
      s.aligned ? t("ui.pasteNotice.alignment") : "",
      s.widths ? t("ui.pasteNotice.widths") : "",
      s.specificNotes ? t("ui.pasteNotice.notes", { count: s.specificNotes }) : "",
      s.generalNotes ? t("ui.pasteNotice.generalNotes", { count: s.generalNotes }) : "",
    ].filter(Boolean);
    try { return new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(items); } catch { return items.join(", "); }
  };
  /** The formatting of Word's HTML that a table of SciDesk does not keep (record 0022): shading, vertical borders, fonts. */
  const droppedFormatting = (all: string) => {
    // only the tables: Word's <style> before them names fonts (Cambria Math…) that no cell uses
    const at = all.search(/<table\b/i);
    const html = at >= 0 ? all.slice(at) : "";
    const items: string[] = [];
    if (/(background(-color)?\s*:\s*(?!transparent|white|#fff(fff)?\b|auto|none)[^;"']+|mso-shading|bgcolor=)/i.test(html)) items.push(t("ui.pasteNotice.shading"));
    if (/border-(left|right)\s*:\s*(?!none)[^;"']*(solid|windowtext|\dpt)/i.test(html)) items.push(t("ui.pasteNotice.borders"));
    const font = /font-family\s*:\s*(?:&quot;|["'])?([^;"',&]+)/i.exec(html)?.[1]?.trim();
    if (font) items.push(t("ui.pasteNotice.font", { font }));
    if (!items.length) return "";
    let text = items.join(", ");
    try { text = new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(items); } catch { /* the plain list */ }
    return text + t("ui.pasteNotice.journalFormat");
  };
  /**
   * Undo the paste: Ctrl+Z's step if nothing changed since; otherwise the pasted tables leave
   * the text. Their files go too (phase 1 test: they stayed "not placed in the text"): the paste
   * created them, so undoing it leaves the project as before.
   */
  const undoPaste = (ids: string[], paths = ids.map((id) => pasteNotices.get(id)?.path).filter((p): p is string => !!p)) => {
    if (!editor) return;
    if (lastPaste.current && lastPaste.current.doc === editor.state.doc && ids.every((id) => lastPaste.current!.tables.includes(id))) {
      editor.commands.undo();
      setMessage(t("ui.pasteNotice.undone"));
    } else {
      for (const id of ids) removePart(id);
      setMessage(t("ui.pasteNotice.undoneRemoved"));
    }
    lastPaste.current = null;
    setPasteNotices((m) => { const next = new Map(m); for (const id of ids) next.delete(id); return next; });
    // the files, once the tables are out of the text (a Ctrl+Y afterwards writes them again)
    if (project && article) {
      const folder = article.folder;
      void run(async () => {
        for (const path of paths) await discardPastedPart(project, folder, path);
        await recompute();
      })();
    }
  };
  const libraryChanged = (msg: string) => { setLibraryVersion((v) => v + 1); setMessage(msg); void recompute(); };
  /**
   * Record 0052: brings a library linked to Zotero up to date. On opening (`quiet`), a closed
   * Zotero is only mentioned: the copy in library.json is used as it is.
   */
  const syncZotero = async (quiet: boolean) => {
    const link = project && linkedCollection(project);
    if (!project || !link) return;
    const live = article && editor ? liveDocuments(editor.getJSON() as PMNode, article) : {};
    try {
      const r = await syncZoteroLibrary(project, new ZoteroLocal(zoteroTransport), article ? Object.fromEntries(Object.entries(live).map(([p, d]) => [`${article.folder}/${p}`, d])) : {});
      const kept = r.keptCited.length ? ` ${t("ui.zoteroKeptCited", { count: r.keptCited.length, titles: r.keptCited.map((k) => `«${k.title}»`).join(", ") })}` : "";
      if (r.changed) libraryChanged(t("ui.zoteroSynced", { name: link.name, added: r.added.length, updated: r.updated.length, removed: r.removed.length }) + kept);
      else if (!quiet || kept) setMessage(t("ui.zoteroUpToDate", { name: link.name, count: r.total }) + kept);
    } catch (e) {
      if (quiet && e instanceof ZoteroError) setMessage(t(`ui.zoteroOffline.${e.code === "disabled" ? "disabled" : "closed"}`, { name: link.name }));
      else setError(e instanceof Error ? e.message : String(e));
    }
  };
  const zoteroSyncedFor = useRef<Project | null>(null);
  useEffect(() => {
    if (!project || !editor || !article || zoteroSyncedFor.current === project || !linkedCollection(project)) return;
    zoteroSyncedFor.current = project;
    void syncZotero(true);
  }, [project, editor, article]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeReference = async (id: string) => {
    if (!project || !article || !editor) return;
    const live = liveDocuments(editor.getJSON() as PMNode, article);
    await deleteReference(project, id, Object.fromEntries(Object.entries(live).map(([p, d]) => [`${article.folder}/${p}`, d])));
    if (selected?.kind === "reference" && selected.id === id) setSelected(null);
    libraryChanged(t("refDeleted"));
  };

  // ---------------------------------------------------------------- exporting and importing

  const exportAs = (kind: "coauthors" | "journal" | "title-page") => run(async () => {
    if (!project || !article) return;
    await save();
    const r = kind === "title-page"
      ? { ...(await exportTitlePage(project, article.folder, resources)), snapshot: null }
      : await exportDocx(project, article.folder, kind, resources);
    // in the browser preview the file is offered as a link, never downloaded on its own
    // record 0089: the figures the journal takes apart, written next to the Word
    const figures = "figureFiles" in r && r.figureFiles?.length ? t("exportedFigures", { count: r.figureFiles.length, folder: r.figureFiles[0].replace(/\/[^/]*$/, "") }) : "";
    setMessage(t(r.snapshot ? "exported" : "exportedPlain", { path: r.path, snapshot: r.snapshot }) + figures + (r.warnings.length ? ` — ${coreWarnings(r.warnings, t)}` : ""),
      inTauri ? null : { url: docxUrl(r.bytes), name: r.path.split("/").pop()! });
  });
  // the PDF for the journal (record 0040): Typst in Rust; the browser preview offers the Typst source instead
  const exportPdfFile = run(async () => {
    if (!project || !article) return;
    await save();
    const compile = await typstCompiler();
    if (!compile) {
      const b = await manuscriptTypst(project, article.folder, resources);
      setMessage(t("pdfInBrowser") + (b.warnings.length ? ` — ${coreWarnings(b.warnings, t)}` : ""), { url: URL.createObjectURL(new Blob([b.source], { type: "text/plain" })), name: `${article.folder}.typ` });
      return;
    }
    const r = await exportPdf(project, article.folder, resources, compile);
    setMessage(t("pdfExported", { path: r.path, pages: r.pages }) + (r.warnings.length ? ` — ${coreWarnings(r.warnings, t)}` : ""));
  });
  const importReturnedCopy = async (file: File, returnedBy: string) => {
    if (!project || !article) return;
    const r = await importCopy(project, article.folder, new Uint8Array(await file.arrayBuffer()), { fileName: file.name, returnedBy: { name: returnedBy } });
    setProposals({ set: r.set, name: returnedBy });
  };

  const onRefs = run(async () => {
    const file = refsInput.current?.files?.[0];
    if (!file || !project) return;
    const r = await importReferences(project, { name: file.name, text: await file.text() });
    setLibraryVersion((v) => v + 1);
    void recompute();
    setMessage(t("refsImported", { added: r.added.length, duplicates: r.duplicates.length, format: r.format.toUpperCase() }) + (r.unmapped.length ? ` — ${t("keptAside", { n: r.unmapped.length })}` : ""));
    if (refsInput.current) refsInput.current.value = "";
  });

  // ---------------------------------------------------------------- shortcuts outside the text

  const shortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});
  shortcutRef.current = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const combo = comboOf(e);
    const plain = plainKeyOf(e);
    const action = actionFor(scheme, combo);
    // our find bar, on the manuscript: the scheme's key, and Ctrl+F in both schemes
    if (action === "find" || action === "replace" || combo === "Mod-f") {
      e.preventDefault();
      if (project) openFind(action === "replace");
      return;
    }
    if ((plain === "F3" || plain === "Shift-F3") && finding && editor) { e.preventDefault(); findStep(editor, plain === "F3" ? 1 : -1); return; }
    // Esc closes the find bar also when the focus has left it (a button that became disabled)
    if (e.key === "Escape" && finding && !document.querySelector(".overlay, .context-menu, .menu-list")) { e.preventDefault(); setFinding(null); editor?.commands.focus(); return; }
    // not the web view's own find bar or print dialog, which act on the whole window (record 0044)
    if (!action) { if (BROWSER_KEYS.includes(combo ?? plain ?? "")) e.preventDefault(); return; }
    // new and open (record 0048), but not over the wizard, nor Ctrl+A in a text field
    if (action === "newArticle" || action === "openProject") {
      const field = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable=true]");
      if (wizard || (field && action === "openProject")) return;
      e.preventDefault();
      if (action === "newArticle") void newArticle(); else void open();
      return;
    }
    if (action === "save") { e.preventDefault(); void run(save)(); }
    else if (action === "cite" && project && !citing) { e.preventDefault(); openQuickCite(); }
    else if (action === "xref" && project) { e.preventDefault(); openXref(); }
    // a text format pressed outside the text does nothing (and not the browser's Ctrl+S)
    else if (EDITOR_ACTIONS.includes(action)) e.preventDefault();
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => shortcutRef.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  // ---------------------------------------------------------------- zoom of the sheet

  // "fit": the A4 sheet fills the width of the desk (Word's "page width"), between 50 and 200 %
  const deskRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(100);
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    const measure = () => {
      const style = getComputedStyle(desk);
      const room = desk.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
      if (room > 0) setFitZoom(fitZoomFor(room));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    return () => ro.disconnect();
  }, [project]);
  const zoom = settings.zoom === "fit" ? fitZoom : settings.zoom;
  // pages as in Word (the user's request, record 0049): A4 sheets, and as many side by side as
  // fit in the desk when zooming out (1, 2, 3…); the browser splits the text into the pages
  const [deskWidth, setDeskWidth] = useState(0);
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    const measure = () => { const st = getComputedStyle(desk); setDeskWidth(desk.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    return () => ro.disconnect();
  }, [project]);
  /** Record 0085: the sheet is wider than the desk ("fit" by the text): its margins are cut evenly. */
  // (never when the text itself would be cut: then the desk scrolls sideways, as before)
  const cropSheet = settings.zoom === "fit" && deskWidth > 0 && (A4_PX * zoom) / 100 > deskWidth && ((A4_PX - 2 * MARGIN_PX) * zoom) / 100 <= deskWidth;
  const perRow = PAGED ? Math.max(1, Math.min(6, Math.floor((deskWidth + SHEET_GAP) / ((A4_PX * zoom) / 100 + SHEET_GAP)))) : 1;
  /**
   * Zoom keeps still what is under the pointer (Ctrl + wheel) or at the centre of the desk
   * (buttons, menu): the text position there is noted before and scrolled back after.
   */
  const zoomAnchor = useRef<{ x: number; y: number; pos: number | null; before: { left: number; top: number } | null; rx: number; ry: number } | null>(null);
  const noteZoomAnchor = (clientX?: number, clientY?: number) => {
    const desk = deskRef.current;
    if (!desk || !editor) return;
    const r = desk.getBoundingClientRect();
    const x = clientX ?? r.left + desk.clientWidth / 2;
    const y = clientY ?? r.top + desk.clientHeight / 2;
    const at = editor.view.posAtCoords({ left: x, top: y });
    let before: { left: number; top: number } | null = null;
    try { before = at ? editor.view.coordsAtPos(at.pos) : null; } catch { before = null; }
    zoomAnchor.current = { x, y, pos: at?.pos ?? null, before, rx: (desk.scrollLeft + x - r.left) / Math.max(1, desk.scrollWidth), ry: (desk.scrollTop + y - r.top) / Math.max(1, desk.scrollHeight) };
  };
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--zoom", String(zoom / 100));
    const a = zoomAnchor.current;
    zoomAnchor.current = null;
    const desk = deskRef.current;
    if (!a || !desk || !editor) return;
    let after: { left: number; top: number } | null = null;
    try { after = a.pos !== null && a.before ? editor.view.coordsAtPos(a.pos) : null; } catch { after = null; }
    if (after && a.before) {
      desk.scrollLeft += after.left - a.before.left;
      desk.scrollTop += after.top - a.before.top;
    } else {
      const r = desk.getBoundingClientRect();
      desk.scrollLeft = a.rx * desk.scrollWidth - (a.x - r.left);
      desk.scrollTop = a.ry * desk.scrollHeight - (a.y - r.top);
    }
  }, [zoom, perRow, editor]);
  const setZoom = (z: "fit" | number) => { noteZoomAnchor(); updateSettings({ zoom: z === "fit" ? "fit" : clampZoom(z) }); };
  const zoomStep = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((s) => s > zoom) ?? 300 : [...ZOOM_STEPS].reverse().find((s) => s < zoom) ?? MIN_ZOOM;
    setZoom(next);
  };
  // Ctrl + wheel zooms the sheet, as in Word (not the whole window, which the web view would do)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const noteZoomAnchorRef = useRef(noteZoomAnchor);
  noteZoomAnchorRef.current = noteZoomAnchor;
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      noteZoomAnchorRef.current(e.clientX, e.clientY);
      updateSettings({ zoom: clampZoom(zoomRef.current + (e.deltaY < 0 ? 10 : -10)) });
    };
    desk.addEventListener("wheel", onWheel, { passive: false });
    return () => desk.removeEventListener("wheel", onWheel);
  }, [project, updateSettings]);
  const pagesRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLSpanElement>(null);
  const [pageCount, setPageCount] = useState(1);
  /** The sheet (row and column of the grid) a point of the window falls in. */
  const sheetAt = (clientX: number, clientY: number) => {
    const box = pagesRef.current?.getBoundingClientRect();
    if (!box) return null;
    const w = (A4_PX * zoom) / 100 + SHEET_GAP;
    const h = (A4_PX * 297 / 210 * zoom) / 100 + SHEET_GAP;
    return { col: Math.floor((clientX - box.left) / w), row: Math.floor((clientY - box.top) / h) };
  };
  useLayoutEffect(() => {
    if (!PAGED || !editor) return;
    const count = () => {
      const end = endRef.current?.getBoundingClientRect();
      const at = end ? sheetAt(end.left + 1, end.top + 1) : null;
      setPageCount(at ? Math.max(1, at.row * perRow + Math.min(at.col, perRow - 1) + 1) : 1);
    };
    count();
    editor.on("update", count);
    const ro = new ResizeObserver(count);
    if (pagesRef.current) ro.observe(pagesRef.current);
    return () => { editor.off("update", count); ro.disconnect(); };
  });
  /** The left and right edges of the text on the sheet under the pointer (record 0046: 2.5 cm margins). */
  const textColumn = (clientX: number, clientY: number): { left: number; right: number } | null => {
    if (!editor) return null;
    if (PAGED) {
      const at = sheetAt(clientX, clientY);
      const box = pagesRef.current?.getBoundingClientRect();
      if (!at || !box) return null;
      const sheet = box.left + Math.min(Math.max(at.col, 0), perRow - 1) * ((A4_PX * zoom) / 100 + SHEET_GAP);
      return { left: sheet + (MARGIN_PX * zoom) / 100, right: sheet + ((A4_PX - MARGIN_PX) * zoom) / 100 };
    }
    const pm = editor.view.dom.getBoundingClientRect();
    return { left: pm.left, right: pm.right };
  };
  /** The text position under the pointer, as if it were just inside the text when it is in a side margin. */
  const pointerPos = (clientX: number, clientY: number): number | null => {
    const col = textColumn(clientX, clientY);
    if (!editor || !col) return null;
    const x = Math.min(Math.max(clientX, col.left + 1), col.right - 1);
    return editor.view.posAtCoords({ left: x, top: clientY })?.pos ?? null;
  };
  // dragging a table or a figure (record 0077) finds its gap with the sheets of this render
  useEffect(() => { partDrag.pointerPos = pointerPos; });
  /**
   * A press in a side margin, level with a line of text: the start of that line (left margin)
   * or its end (right margin), as if the press had been just inside the text; with Shift, the
   * selection is extended there. Dragging then extends the selection, to the start or end of
   * each line while the pointer is in a margin, scrolling the sheet near its top or bottom.
   * Returns false when the press is not beside a line.
   */
  const marginClick = (e: React.MouseEvent): boolean => {
    if (!editor) return false;
    const col = textColumn(e.clientX, e.clientY);
    if (!col || (e.clientX >= col.left && e.clientX <= col.right)) return false;
    if (!PAGED) {
      const pm = editor.view.dom.getBoundingClientRect();
      if (e.clientY < pm.top || e.clientY > pm.bottom) return false;
    }
    const pos = pointerPos(e.clientX, e.clientY);
    if (pos === null) return false;
    // the line must really be there: the position's own box at the height of the press
    const line = editor.view.coordsAtPos(pos);
    if (e.clientY < line.top - 4 || e.clientY > line.bottom + 4) return false;
    e.preventDefault();
    const view = editor.view;
    const anchor = e.shiftKey ? view.state.selection.anchor : pos;
    const select = (head: number) => {
      const { state } = view;
      const size = state.doc.content.size;
      const $a = state.doc.resolve(Math.min(anchor, size)), $h = state.doc.resolve(Math.min(head, size));
      const sel = head === anchor ? TextSelection.near($h) : TextSelection.between($a, $h);
      if (!sel.eq(state.selection)) view.dispatch(state.tr.setSelection(sel));
    };
    select(pos);
    view.focus();
    const desk = deskRef.current;
    const move = (m: MouseEvent) => {
      if (desk) {
        const box = desk.getBoundingClientRect();
        if (m.clientY < box.top + 24) desk.scrollTop -= 24;
        else if (m.clientY > box.bottom - 24) desk.scrollTop += 24;
      }
      const head = pointerPos(m.clientX, m.clientY);
      if (head !== null) select(head);
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return true;
  };
  // a click on the empty part of the sheet, below the text, puts the cursor at the end
  const onPaperDown = (e: React.MouseEvent) => {
    if (!editor || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.classList.contains("paper") && !t.classList.contains("page")) return;
    if (marginClick(e)) return;
    if (PAGED) {
      // only after the end of the text: on its page below it, or on a later page
      const end = endRef.current?.getBoundingClientRect();
      const at = sheetAt(e.clientX, e.clientY);
      const last = end ? sheetAt(end.left + 1, end.top + 1) : null;
      if (!at || !last || !end) return;
      const page = at.row * perRow + at.col;
      const lastPage = last.row * perRow + last.col;
      if (page < lastPage || (page === lastPage && e.clientY < end.top)) return;
    } else {
      const pm = editor.view.dom.getBoundingClientRect();
      if (e.clientY < pm.bottom) return;
    }
    e.preventDefault();
    editor.commands.focus("end");
  };

  // ---------------------------------------------------------------- menus

  const exportItems: MenuEntry[] = [
    { label: t("ui.export.coauthors"), hint: t("ui.export.coauthorsHint"), onSelect: () => void exportAs("coauthors")(), disabled: !project },
    { label: t("ui.export.journal"), hint: t("ui.export.journalHint"), onSelect: () => void exportAs("journal")(), disabled: !project },
    { label: t("ui.export.pdf"), hint: inTauri ? t("ui.export.pdfHint") : t("ui.export.pdfHintBrowser"), onSelect: () => void exportPdfFile(), disabled: !project },
    { label: t("ui.export.titlePage"), hint: t("ui.export.titlePageHint"), onSelect: () => void exportAs("title-page")(), disabled: !project },
  ];
  const noProject = !project;
  const pageBreakHere = (blank: boolean) => { if (!editor) return; insertPageBreak(blank)(editor.state, editor.view.dispatch); editor.view.focus(); };
  /** Record 0085: the blocks of the selection on landscape pages, or back (on: by default, the opposite). */
  const landscapeHere = (on?: boolean) => { if (!editor) return; setLandscape(on)(editor.state, editor.view.dispatch); editor.view.focus(); };
  const menus: MenuDef[] = [
    { id: "file", label: t("ui.menu.file"), items: [
      { label: t("ui.newArticle"), shortcut: keys("newArticle"), onSelect: () => void newArticle() },
      { label: t("fromWord"), onSelect: () => wordInput.current?.click() },
      ...(inTauri ? [{ label: t("ui.openFolder"), shortcut: keys("openProject"), onSelect: () => void open() }] : []),
      "-",
      { label: t("demo"), onSelect: () => void openDemo() },
      ...(!inTauri && hasPreviewProject() ? [{ label: t("reopenPreview"), onSelect: () => void reopenPreview() }] : []),
      { label: t("ui.closeProject"), onSelect: () => void closeProject(), disabled: noProject },
      "-",
      { label: t("ui.saveNow"), shortcut: keys("save"), onSelect: () => void run(save)(), disabled: noProject },
      "-",
      ...exportItems.map((e) => (e === "-" || "heading" in e ? e : { ...e, hint: undefined, label: `${t("ui.exportPrefix")} ${e.label}` })),
    ] },
    { id: "edit", label: t("ui.menu.edit"), items: [
      { label: t("ui.undo"), shortcut: keys("undo"), onSelect: () => editor?.chain().focus().undo().run(), disabled: noProject },
      { label: t("ui.redo"), shortcut: keys("redo"), onSelect: () => editor?.chain().focus().redo().run(), disabled: noProject },
      "-",
      { label: t("ui.pastePlain"), shortcut: shortcutLabel("Mod-Shift-v", i18n.language), onSelect: () => {}, disabled: true, title: t("ui.pastePlainHint") },
      { label: t("ui.selectAll"), shortcut: shortcutLabel("Mod-a", i18n.language), onSelect: () => editor?.chain().focus().selectAll().run(), disabled: noProject },
      "-",
      { label: t("ui.find.find"), shortcut: keys("find"), onSelect: () => openFind(false), disabled: noProject },
      { label: t("ui.find.findReplace"), shortcut: keys("replace"), onSelect: () => openFind(true), disabled: noProject },
    ] },
    { id: "insert", label: t("ui.menu.insert"), items: [
      { label: t("ui.cite"), shortcut: keys("cite"), onSelect: openQuickCite, disabled: noProject },
      { label: t("ui.xref"), shortcut: keys("xref"), onSelect: openXref, disabled: noProject },
      "-",
      { label: t("ui.insertTable"), onSelect: () => void insertTable(), disabled: noProject },
      { label: t("ui.insertFigure"), onSelect: () => figureInput.current?.click(), disabled: noProject },
      "-",
      // record 0078: as Word's Insert › Blank page and Page break
      { label: t("ui.blankPage"), onSelect: () => pageBreakHere(true), disabled: noProject || !isDoc(tab) },
      { label: t("ui.pageBreak"), shortcut: keys("pageBreak"), onSelect: () => pageBreakHere(false), disabled: noProject || !isDoc(tab) },
      { label: t("ui.landscape.page"), title: t("ui.landscape.hint"), checked: cursorLandscape === true, onSelect: () => landscapeHere(), disabled: noProject || !isDoc(tab) || cursorLandscape === null },
      "-",
      { label: t("ui.pending"), onSelect: () => editor?.chain().focus().insertContent(t("ui.pendingMarker")).run(), disabled: noProject },
    ] },
    { id: "references", label: t("ui.menu.references"), items: [
      { label: t("ui.cite"), shortcut: keys("cite"), onSelect: openQuickCite, disabled: noProject },
      { label: t("importRefs"), onSelect: () => refsInput.current?.click(), disabled: noProject },
      { label: t("ui.openLibrary"), onSelect: () => chooseView("library"), disabled: noProject },
    ] },
    { id: "review", label: t("ui.menu.review"), items: [
      { label: t("ui.warnings"), onSelect: () => showRight("warnings"), disabled: noProject },
      { label: t("importCopy"), onSelect: () => showRight("review"), disabled: noProject },
      { label: t("ui.authorsGroup"), onSelect: () => { setAuthorsTab("authors"); openTab("authors"); }, disabled: noProject },
      "-",
      // record 0090: tracked changes, as Word's Review tab
      { label: t("ui.track.toggle"), shortcut: keys("suggestions"), checked: tracking, onSelect: () => void toggleTracking(), disabled: noProject },
      { label: t("ui.track.acceptHere"), onSelect: () => decideHere(true), disabled: noProject || !(editor && changeAt(editor.state)) },
      { label: t("ui.track.rejectHere"), onSelect: () => decideHere(false), disabled: noProject || !(editor && changeAt(editor.state)) },
      { label: t("ui.track.next"), onSelect: () => moveToChange(1), disabled: noProject },
      { label: t("ui.track.previous"), onSelect: () => moveToChange(-1), disabled: noProject },
      { label: t("ui.track.acceptAll"), onSelect: () => decideAll(true), disabled: noProject },
      { label: t("ui.track.rejectAll"), onSelect: () => decideAll(false), disabled: noProject },
      "-",
      { label: t("ui.spell.toggle"), checked: settings.spellcheck, onSelect: () => updateSettings({ spellcheck: !settings.spellcheck }) },
      { label: t("ui.autocorrect.toggle"), title: t("ui.autocorrect.hint"), checked: settings.autocorrect, onSelect: () => updateSettings({ autocorrect: !settings.autocorrect }) },
      // record 0060: the language of the selection, or of the paragraph
      { label: t("ui.lang.setEs"), title: t("ui.lang.hint"), checked: !!cursorLang && cursorLang.lang.startsWith("es"), onSelect: () => editor && setLanguage(editor, "es"), disabled: noProject },
      { label: t("ui.lang.setEnUS"), title: t("ui.lang.hint"), checked: !!cursorLang && cursorLang.lang.startsWith("en") && !/^en-gb$/i.test(cursorLang.lang), onSelect: () => editor && setLanguage(editor, "en-US"), disabled: noProject },
      { label: t("ui.lang.setEnGB"), title: t("ui.lang.hint"), checked: !!cursorLang && /^en-gb$/i.test(cursorLang.lang), onSelect: () => editor && setLanguage(editor, "en-GB"), disabled: noProject },
      { label: t("ui.variants.menu"), onSelect: () => setVariantsOpen(/^en-gb$/i.test(article?.article.lang ?? "") ? "GB" : "US"), disabled: noProject },
    ] },
    { id: "view", label: t("ui.menu.view"), items: [
      { label: t("ui.views.article"), checked: view === "article", onSelect: () => chooseView("article"), disabled: noProject },
      { label: t("ui.views.library"), checked: view === "library", onSelect: () => chooseView("library"), disabled: noProject },
      "-",
      { label: t("ui.preview.toggle"), checked: settings.preview, onSelect: () => updateSettings({ preview: !settings.preview }) },
      { label: t("ui.leftPanel"), checked: settings.left, onSelect: () => updateSettings({ left: !settings.left }) },
      { label: t("ui.rightPanel"), checked: settings.right, onSelect: () => updateSettings({ right: !settings.right }) },
      "-",
      { label: t("ui.fontModes.journal"), checked: settings.fontMode === "journal", onSelect: () => updateSettings({ fontMode: "journal" }) },
      { label: t("ui.fontModes.free"), checked: settings.fontMode === "free", onSelect: () => updateSettings({ fontMode: "free" }) },
      { label: t("ui.docFont.menu"), onSelect: () => setDocFontOpen(true), disabled: noProject },
      "-",
      { label: t("ui.zoomFit"), checked: settings.zoom === "fit", onSelect: () => setZoom("fit") },
      { label: "100 %", checked: settings.zoom === 100, onSelect: () => setZoom(100) },
      { label: t("ui.zoomIn"), onSelect: () => zoomStep(1), disabled: zoom >= 300 },
      { label: t("ui.zoomOut"), onSelect: () => zoomStep(-1), disabled: zoom <= MIN_ZOOM },
    ] },
    { id: "help", label: t("ui.menu.help"), items: [
      { label: t("ui.shortcutsHelp"), onSelect: () => openTab("settings") },
      { label: t("ui.about"), onSelect: () => setMessage(`SciDesk 0.1 · AGPL-3.0 · ${t("attribution")}`) },
    ] },
  ];

  // the right-click menu, on what is under the pointer
  const onContextMenu = (e: React.MouseEvent) => {
    if (!editor || !project) return;
    e.preventDefault();
    const at = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    const node = at && at.inside >= 0 ? editor.state.doc.nodeAt(at.inside) : null;
    // without focus(): it would take the focus back from the menu a frame later
    if (node?.isAtom && at) editor.commands.setNodeSelection(at.inside);
    else if (at && editor.state.selection.empty) editor.commands.setTextSelection(at.pos);
    // a word the spell checker underlines: its suggestions first (record 0057)
    const wrong = at ? misspelledAt(editor.state, at.pos) : null;
    const x = e.clientX, y = e.clientY;
    if (!wrong) { setContextMenu({ x, y }); return; }
    // record 0060: a word of the other language, and the words around it that are too
    const other = otherLang(wrong.dict);
    void Promise.all([
      suggestions(wrong.dict, wrong.word).catch(() => [] as string[]),
      other ? foreignStretch(editor.state, wrong.from, other).catch(() => null) : Promise.resolve(null),
    ]).then(([s, f]) => setContextMenu({ x, y, spell: { ...wrong, suggestions: s, foreign: f && other ? { ...f, lang: other } : null } }));
  };
  // record 0070: the article's numbering (its own, its journal's or none); the editor draws it
  const sectionNumbering = project && article ? sectionNumberingOf(project, article.folder) : null;
  // record 0074: the document's fonts; the text shows the journal's when adapted, the article's own in the free mode
  void fontTick;
  const docFonts = project && article ? documentFontsOf(project, article.folder) : null;
  const viewFont = docFonts ? (settings.fontMode === "free" ? docFonts.writing : docFonts.journal) : null;
  void numberingTick; // the setting lives in article.json: a change re-renders through the tick
  useEffect(() => {
    if (editor && !editor.isDestroyed && sectionNumbering) setSectionNumberStyle(editor.view, sectionNumbering.value);
  }, [editor, sectionNumbering?.value]);
  // record 0071: menus that float over the window (add a section, a section's own menu, its type)
  const [floatMenu, setFloatMenu] = useState<{ x: number; y: number; items: MenuEntry[]; label: string } | null>(null);
  const roleName = (role: string) => (role === "other" ? t("ui.sections.otherType") : sectionLabel(role, i18n.language));
  const ADD_BODY = ["introduction", "objective", "methods", "case-presentation", "results", "discussion", "conclusions"];
  /** The types a new section can have: those not in the article yet (appendices, any number), and "other". */
  const addItems = (after?: number): MenuEntry[] => {
    if (!editor || !article) return [];
    const doc = editor.state.doc;
    const present = new Set(topHeadings(doc).headings.filter((h) => h.level === 1).map((h) => h.role));
    const lang = article.article.lang;
    const entry = (role: string): MenuEntry => ({ label: roleName(role), onSelect: () => { openTab(docTab); addSection(editor, role, lang, after); } });
    return [
      ...ADD_BODY.filter((r) => !present.has(r)).map(entry),
      "-",
      ...CLOSING_ORDER.filter((r) => r === "appendix" || !present.has(r)).map(entry),
      "-",
      { label: t("ui.sections.other"), onSelect: () => { openTab(docTab); addSection(editor, "other", lang, after ?? childIndexAt(doc, editor.state.selection.from)); } },
    ];
  };
  /** A heading's type: as its name says, or one chosen. */
  const typeItems = (index: number): MenuEntry[] => {
    if (!editor) return [];
    const node = editor.state.doc.child(index);
    const own = node.attrs.role as string | null;
    const guessed = roleFromName(node.textContent);
    return [
      { label: guessed ? t("ui.sections.byName", { type: roleName(guessed) }) : t("ui.sections.byNameNone"), checked: own === null, onSelect: () => setSectionRole(editor, index, null) },
      "-",
      ...[...BODY_ORDER, ...CLOSING_ORDER, "other"].map((r) => ({ label: roleName(r), checked: own === r, onSelect: () => setSectionRole(editor, index, r) })),
    ];
  };
  /** A section's own menu, from the navigator (by its heading's id) or the heading's context menu. */
  const sectionItems = (index: number, x: number, y: number): MenuEntry[] => {
    if (!editor || !article || index < 0) return [];
    const doc = editor.state.doc;
    const node = doc.child(index);
    const role = roleOfNode(node);
    const reopen = (items: MenuEntry[], label: string) => () => setFloatMenu({ x, y, items, label });
    return [
      { label: t("ui.sections.addMenu"), onSelect: reopen(addItems(index), t("ui.sections.add")) },
      ...((node.attrs.level as number) < 3 ? [{ label: t("ui.sections.addSub"), onSelect: () => { openTab(docTab); addSubsection(editor, index, article.article.lang); } }] : []),
      "-",
      { label: t("ui.sections.up"), disabled: !canMoveSection(doc, index, -1), onSelect: () => { openTab(docTab); moveSection(editor, index, -1); } },
      { label: t("ui.sections.down"), disabled: !canMoveSection(doc, index, 1), onSelect: () => { openTab(docTab); moveSection(editor, index, 1); } },
      "-",
      { label: t("ui.sections.type", { type: role ? roleName(role) : t("ui.sections.none") }), onSelect: reopen(typeItems(index), t("ui.sections.typeMenu")) },
      { label: t("ui.sections.removeHeading"), onSelect: () => removeHeading(editor, index) },
    ];
  };
  /**
   * A table or figure's menu in the navigator (the user's request after the phase 1 test). In
   * the text: go to it, open it in its tab, take it out of the text. Not placed in the text:
   * put it back at the cursor, or delete its file (a snapshot first), never at a mere click.
   */
  const partMenuItems = (target: { kind: "part"; id: string; part: "table" | "figure" } | { kind: "unplaced"; src: string }, x: number, y: number): MenuEntry[] => {
    if (target.kind === "part") {
      const table = target.part === "table";
      // record 0085: its landscape page, from here too
      let placed: { pos: number; on: boolean } | null = null;
      editor?.state.doc.forEach((n, pos) => { if (!placed && n.attrs.id === target.id && /^(table|figure)(Part|Ref)$/.test(n.type.name)) placed = { pos, on: !!n.attrs.landscape }; });
      const at = placed as { pos: number; on: boolean } | null;
      return [
        { label: t(table ? "ui.partMenu.goToTable" : "ui.partMenu.goToFigure"), onSelect: () => onNav(target) },
        ...(table ? [{ label: t("ui.openInTab"), strong: true, onSelect: () => openTableTab(target.id) }] : []),
        ...(at && editor ? [{ label: t(table ? "ui.landscape.table" : "ui.landscape.figure"), title: t("ui.landscape.hint"), checked: at.on,
          onSelect: () => editor.view.dispatch(editor.state.tr.setNodeAttribute(at.pos, "landscape", at.on ? null : true)) }] : []),
        "-",
        { label: t(table ? "ui.removeTableFromText" : "ui.partMenu.removeFigureFromText"), onSelect: () => removePart(target.id) },
      ];
    }
    const { src } = target;
    const isTable = outline?.unplaced.find((u) => u.src === src)?.kind === "table";
    return [
      { label: t("ui.partMenu.insert"), strong: true, onSelect: () => { openTab(docTab); placeAgain(src); } },
      ...(isTable ? [{ label: t("ui.openInTab"), onSelect: () => openTab(`file:${src}`) }] : []),
      "-",
      { label: t("ui.partMenu.delete"), onSelect: () => setFloatMenu({ x, y, label: src, items: [
        { heading: t("ui.partMenu.confirm", { path: src.split("/").pop() }) },
        { label: t("ui.partMenu.deleteNow"), onSelect: () => void deleteUnplaced(src) },
        { label: t("ui.partMenu.cancel"), onSelect: () => {} },
      ] }) },
    ];
  };
  const deleteUnplaced = run(async (src: string) => {
    if (!project || !article) return;
    await closeFileTab(src);
    await save();
    const snap = await saveSnapshot(project, article.folder, t("ui.partMenu.confirm", { path: src }));
    await deletePartFile(project, article.folder, src);
    await recompute();
    setMessage(t("ui.partMenu.deleted", { path: src, snapshot: snap.id }));
  });
  // record 0076: the journal's table style, the default of tables without their own
  const journalTableStyle = (project && article?.article.journal ? project.journals.get(article.article.journal)?.manuscriptFormat?.tableStyle?.value : null) ?? null;
  useEffect(() => { if (editor && !editor.isDestroyed) setJournalTableStyle(editor.view, journalTableStyle); }, [editor, journalTableStyle]);
  const changeNumbering = run(async (value: SectionNumbering | null) => {
    if (!project || !article) return;
    await setSectionNumbering(project, article.folder, value);
    setNumberingTick((n) => n + 1);
    void recompute();
  });
  /** Record 0067: the right-click menu in a table's tab, on what is under the pointer. */
  const onTabContextMenu = (e: React.MouseEvent, view: EditorView) => {
    if (!project) return;
    e.preventDefault();
    const at = view.posAtCoords({ left: e.clientX, top: e.clientY });
    const node = at && at.inside >= 0 ? view.state.doc.nodeAt(at.inside) : null;
    if (node?.isAtom && at) view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, at.inside)));
    else if (at && view.state.selection.empty) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos))));
    setContextMenu({ x: e.clientX, y: e.clientY, tab: view });
  };
  /** Record 0057: a word into resources/dictionary.txt, which every language of the project accepts. */
  const addToDictionary = run(async (word: string) => {
    if (!project) return;
    const before = await project.fs.readText(PROJECT_DICTIONARY);
    const words = [...parseDictionary(before), word];
    await project.fs.write(PROJECT_DICTIONARY, formatDictionary(words, before));
    await setProjectWords(words, editor?.view);
    setMessage(t("ui.spell.added", { word }));
  });
  /** Record 0061: the word is not underlined in this article any more (article.json); the message undoes it. */
  const ignoreInArticle = run(async (word: string) => {
    if (!project || !article) return;
    const apply = async (on: boolean) => {
      await (on ? ignoreWord : unignoreWord)(project, article.folder, word);
      spellOptions.ignore = new Set(article.article.ignoredWords ?? []);
      if (editor && !editor.isDestroyed) refresh(editor.view);
    };
    await apply(true);
    setMessage(t("ui.spell.ignored", { word }), null, { label: t("ui.undo"), run: () => void apply(false).then(() => setMessage(t("ui.spell.unignored", { word }))) });
  });
  // ---------------------------------------------------------------- tracked changes (record 0090)
  // back to the text after a menu (as the page break)
  const refocus = () => editor?.view.focus();
  /** Tracking as the article left it (article.json, as Word keeps it in the document). */
  const syncTracking = (a: ArticleData) => {
    if (!editor) return;
    const on = !!a.article.trackChanges;
    if (isTracking(editor.state) !== on) setTracking(editor, on);
    setTrackingOn(on);
  };
  /** The name of who signs first, to start the name dialog from. */
  const firstAuthorName = () => {
    const first = article?.authors.authors[0];
    const p = first && project?.people.people.find((x) => x.id === first.person);
    return p ? (p.kind === "person" ? `${p.given} ${p.family}` : p.name) : "";
  };
  /** Turns tracked changes on or off; the first time, the name they carry is asked for. */
  const toggleTracking = run(async (name?: string) => {
    if (!editor || !project || !article) return;
    const on = !isTracking(editor.state);
    const who = (name ?? settings.userName).trim();
    if (on && !who) { setAskName(true); return; }
    if (name) { updateSettings({ userName: who }); track.author = { name: who }; }
    setTracking(editor, on);
    setTrackingOn(on);
    await setTrackChanges(project, article.folder, on);
    setMessage(t(on ? "ui.track.on" : "ui.track.off", { name: who }));
    refocus();
  });
  const changeHere = editor && project ? changeAt(editor.state) : null;
  const decideHere = (accept: boolean, id = changeHere?.id) => {
    if (!editor || !id) return;
    decide(editor, accept, id);
    refocus();
  };
  const decideAll = (accept: boolean) => {
    if (!editor) return;
    decide(editor, accept);
    refocus();
  };
  const moveToChange = (dir: 1 | -1) => {
    if (!editor) return;
    if (!stepChange(editor, dir)) setMessage(t("ui.track.none"));
    refocus();
  };

  /** Record 0090: on a tracked change, accepting or rejecting it comes first. */
  const contextItems = (): MenuEntry[] => {
    if (!editor) return [];
    const inTab = contextMenu?.tab && !contextMenu.tab.isDestroyed ? contextMenu.tab : null;
    const here = changeAt((inTab ?? editor.view).state);
    const info = here ? changeInfo(here.id) : null;
    const changeItems: MenuEntry[] = here ? [
      { heading: info ? t("ui.track.by", { name: info.author.name, date: new Date(info.date).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" }) }) : t("ui.track.change") },
      { label: t("ui.track.accept"), onSelect: () => decideHere(true, here.id) },
      { label: t("ui.track.reject"), onSelect: () => decideHere(false, here.id) },
      "-",
    ] : [];
    return [...changeItems, ...baseContextItems()];
  };
  const baseContextItems = (): MenuEntry[] => {
    if (!editor) return [];
    // in a table's tab (record 0067), the same commands act on the tab's view
    const inTab = contextMenu?.tab && !contextMenu.tab.isDestroyed ? contextMenu.tab : null;
    const view = inTab ?? editor.view;
    const sel = view.state.selection;
    const onCitation = sel instanceof NodeSelection && sel.node.type.name === "citation";
    const exec = (cmd: "cut" | "copy") => { view.focus(); document.execCommand(cmd); };
    // a whole table or figure selected (its handle, or a click on its edge) is that part too
    const part = inTab ? null
      : sel instanceof NodeSelection && /^(table|figure)Part$/.test(sel.node.type.name) ? { node: sel.node, pos: sel.from }
      : partAround(sel.$from);
    const inTable = isInTable(view.state);
    const cmd = (key: string, c: TableCommand): MenuEntry => ({ label: t(`ui.${key}`), onSelect: () => { c(view.state, view.dispatch); view.focus(); }, disabled: !c(view.state) });
    const tableItems: MenuEntry[] = inTable ? [
      cmd("rowAbove", addRowBefore), cmd("rowBelow", addRowAfter), cmd("colLeft", addColumnBefore), cmd("colRight", addColumnAfter),
      cmd("deleteRow", deleteRow), cmd("deleteCol", deleteColumn), cmd("mergeCells", mergeCells), cmd("splitCell", splitCell), cmd("headerRow", toggleHeaderRow),
      "-",
    ] : [];
    // once the menu has closed and given the focus back: a cursor moved before that is lost
    const afterMenu = (f: () => void) => () => setTimeout(() => { view.focus(); f(); }, 0);
    const noteItems: MenuEntry[] = part || inTab ? [
      { label: t("ui.generalNote"), onSelect: afterMenu(() => addNote(view.state, view.dispatch, "general")) },
      ...(inTable ? [{ label: t("ui.specificNote"), title: t("ui.specificNoteHint"), onSelect: afterMenu(() => addNote(view.state, view.dispatch, "specific")) }] : []),
    ] : [];
    const partItems: MenuEntry[] = part ? [
      ...noteItems,
      ...(part.node.type.name === "tablePart" ? [{ label: t("ui.openInTab"), onSelect: () => openTableTab(String(part.node.attrs.id)) }] : []),
      { label: t("ui.removeFromText"), onSelect: () => removePart(String(part.node.attrs.id)) },
      "-",
    ] : [];
    const spell = contextMenu?.spell;
    const spellItems: MenuEntry[] = spell ? [
      ...(spell.suggestions.length
        ? spell.suggestions.slice(0, 6).map((s) => ({ label: s, onSelect: () => { editor.chain().focus().insertContentAt({ from: spell.from, to: spell.to }, s).run(); } }))
        : [{ label: t("ui.spell.noSuggestions"), onSelect: () => {}, disabled: true }]),
      { label: t("ui.spell.ignore", { word: spell.word }), onSelect: () => void ignoreInArticle(spell.word) },
      { label: t("ui.spell.addToProject", { word: spell.word }), onSelect: () => void addToDictionary(spell.word) },
      ...(spell.foreign ? [{ label: t(`ui.lang.markAs.${spell.foreign.lang}`, { text: spell.foreign.text.length > 40 ? `${spell.foreign.text.slice(0, 38)}…` : spell.foreign.text }), onSelect: () => { const f = spell.foreign!; editor.chain().focus().setTextSelection({ from: f.from, to: f.to }).run(); setLanguage(editor, f.lang); } }] : []),
      "-",
    ] : [];
    // record 0070: "Number this section" on a heading that can carry a number
    const $sel = sel.$from;
    const headingAt = !inTab && $sel.depth >= 1 && $sel.parent.type.name === "heading" && numberable($sel.parent) ? $sel.parent : null;
    const topIndex = !inTab && $sel.depth === 1 && $sel.parent.type.name === "heading" ? $sel.index(0) : -1;
    const sectionMenu: MenuEntry[] = topIndex >= 0 && contextMenu ? [{ label: t("ui.sections.menu"), onSelect: () => setFloatMenu({ x: contextMenu.x, y: contextMenu.y, items: sectionItems(topIndex, contextMenu.x, contextMenu.y), label: t("ui.sections.section") }) }] : [];
    const numberItem: MenuEntry[] = headingAt && sectionNumbering && sectionNumbering.value !== "none" ? [{
      label: t("ui.numbering.thisSection"), checked: headingAt.attrs.numbered !== false,
      onSelect: () => { view.dispatch(view.state.tr.setNodeAttribute($sel.before($sel.depth), "numbered", headingAt.attrs.numbered === false ? null : false)); view.focus(); },
    }, "-"] : [];
    // record 0067: "omit author", with the styles that print it (or to take it off a citation that has it)
    const citeItems = onCitation ? (sel.node.attrs.items as CiteItem[]) : [];
    const omitted = citeItems.length > 0 && citeItems.every((i) => i.suppressAuthor);
    const omitItem: MenuEntry[] = onCitation && (omitsAuthor(rendering?.format ?? null) || citeItems.some((i) => i.suppressAuthor))
      ? [{ label: t("omitAuthor"), checked: omitted, title: t("omitAuthorHint"), onSelect: () => setOmitAuthor(view, sel.from, !omitted) }] : [];
    const citeEntries: MenuEntry[] = onCitation ? [
      { label: t("ui.editCitation"), shortcut: keys("cite"), onSelect: openQuickCite },
      ...omitItem,
      { label: t("ui.removeCitation"), onSelect: () => { view.dispatch(view.state.tr.deleteSelection()); view.focus(); } },
    ] : [{ label: t("ui.cite"), shortcut: keys("cite"), onSelect: openQuickCite }];
    const pendingItem: MenuEntry = { label: t("ui.pending"), onSelect: () => { view.dispatch(view.state.tr.insertText(t("ui.pendingMarker"))); view.focus(); } };
    // record 0085: the page of the table, the figure or the selected text in landscape
    const onLandscape = inTab ? null : landscapeState(view.state);
    const landscapeItem: MenuEntry[] = onLandscape === null ? [] : [{
      label: t(part?.node.type.name === "tablePart" ? "ui.landscape.table" : part?.node.type.name === "figurePart" ? "ui.landscape.figure" : "ui.landscape.page"),
      title: t("ui.landscape.hint"), checked: onLandscape,
      onSelect: () => { setLandscape()(view.state, view.dispatch); view.focus(); },
    }];
    const clipboard: MenuEntry[] = [
      { label: t("ui.cut"), shortcut: shortcutLabel("Mod-x", i18n.language), onSelect: () => exec("cut"), disabled: sel.empty },
      { label: t("ui.copy"), shortcut: shortcutLabel("Mod-c", i18n.language), onSelect: () => exec("copy"), disabled: sel.empty },
      ...(inTab ? [] : [{ label: t("ui.selectAll"), shortcut: shortcutLabel("Mod-a", i18n.language), onSelect: () => editor.chain().focus().selectAll().run() }]),
    ];
    // record 0079: in a table (of the text or in its tab), the items in titled groups, as the user asked
    if (inTab || part?.node.type.name === "tablePart") {
      const tableId = part ? String(part.node.attrs.id) : null;
      // the whole table selected: only what acts on the table (a citation, a note or a pending
      // marker would be typed over the selection and take the table away)
      if (!inTab && tableId && sel instanceof NodeSelection) return [
        { label: t("ui.openInTab"), strong: true, onSelect: () => openTableTab(tableId) },
        ...landscapeItem,
        { label: t("ui.removeTableFromText"), onSelect: () => removePart(tableId) },
        "-",
        { label: t("ui.insertTable"), onSelect: () => void insertTable() },
        "-",
        ...clipboard,
      ];
      return [
        ...(inTab ? [] : spellItems),
        { heading: t("ui.tableMenu.edit") },
        ...tableItems.filter((x) => x !== "-"),
        ...(inTab ? [] : [{ label: t("ui.insertTable"), onSelect: () => void insertTable() }]),
        { heading: t("ui.tableMenu.footer") },
        ...noteItems,
        { heading: t("ui.tableMenu.references") },
        ...citeEntries,
        ...(inTab ? [] : [{ label: t("ui.xref"), shortcut: keys("xref"), onSelect: openXref }]),
        pendingItem,
        "-",
        ...(tableId ? [
          { label: t("ui.openInTab"), strong: true, onSelect: () => openTableTab(tableId) },
          ...landscapeItem,
          { label: t("ui.removeTableFromText"), onSelect: () => removePart(tableId) },
          "-" as const,
        ] : []),
        ...clipboard,
      ];
    }
    // the whole figure selected: as with a table, nothing that would be typed over it
    if (!inTab && part?.node.type.name === "figurePart" && sel instanceof NodeSelection) return [
      ...landscapeItem,
      { label: t("ui.partMenu.removeFigureFromText"), onSelect: () => removePart(String(part.node.attrs.id)) },
      "-",
      ...clipboard,
    ];
    return [
      ...(inTab ? [] : spellItems),
      ...numberItem,
      ...(sectionMenu.length ? [...sectionMenu, "-" as const] : []),
      ...tableItems,
      ...(inTab ? (noteItems.length ? [...noteItems, "-" as const] : []) : partItems),
      ...(onCitation ? [
        { label: t("ui.editCitation"), shortcut: keys("cite"), onSelect: openQuickCite },
        ...omitItem,
        { label: t("ui.removeCitation"), onSelect: () => { view.dispatch(view.state.tr.deleteSelection()); view.focus(); } },
        "-" as const,
      ] : [{ label: t("ui.cite"), shortcut: keys("cite"), onSelect: openQuickCite }]),
      ...(inTab ? [] : [{ label: t("ui.xref"), shortcut: keys("xref"), onSelect: openXref }]),
      // at the cursor, or after the table or figure the cursor is in (as Insert › Insert table)
      ...(inTab ? [] : [{ label: t("ui.insertTable"), onSelect: () => void insertTable() }]),
      { label: t("ui.pending"), onSelect: () => { view.dispatch(view.state.tr.insertText(t("ui.pendingMarker"))); view.focus(); } },
      ...(landscapeItem.length ? ["-" as const, ...landscapeItem] : []),
      "-",
      { label: t("ui.cut"), shortcut: shortcutLabel("Mod-x", i18n.language), onSelect: () => exec("cut"), disabled: sel.empty },
      { label: t("ui.copy"), shortcut: shortcutLabel("Mod-c", i18n.language), onSelect: () => exec("copy"), disabled: sel.empty },
      ...(inTab ? [] : [{ label: t("ui.selectAll"), shortcut: shortcutLabel("Mod-a", i18n.language), onSelect: () => editor.chain().focus().selectAll().run() }]),
    ];
  };

  // ---------------------------------------------------------------- panel widths

  const drag = (side: "left" | "right") => (e: React.PointerEvent) => {
    e.preventDefault();
    const start = e.clientX;
    const from = side === "left" ? settings.leftWidth : settings.rightWidth;
    const el = document.documentElement;
    let width = from;
    const move = (m: PointerEvent) => {
      width = Math.max(200, Math.min(520, from + (side === "left" ? m.clientX - start : start - m.clientX)));
      el.style.setProperty(side === "left" ? "--left-width" : "--right-width", `${width}px`);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      updateSettings(side === "left" ? { leftWidth: width } : { rightWidth: width });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  useEffect(() => {
    document.documentElement.style.setProperty("--left-width", `${settings.leftWidth}px`);
    document.documentElement.style.setProperty("--right-width", `${settings.rightWidth}px`);
  }, [settings.leftWidth, settings.rightWidth]);

  // ---------------------------------------------------------------- the window

  const activeWarnings = report?.warnings.filter((w) => !w.ignored && w.level !== "info").length ?? 0;
  const shownProposals = proposals?.set.proposals.filter((p) => p.status !== "noise-hidden").length ?? 0;
  const titleText = outline?.title?.text || t("ui.untitled");
  const left = !!project && settings.left;
  const right = !!project && settings.right;
  const targets = { tables: outline?.tables ?? [], figures: outline?.figures ?? [] };
  const tabLabel = (k: CenterTab) => {
    if (isTableTab(k)) {
      const p = outline?.tables.find((x) => x.id === k.slice(6));
      return p ? `${t("ui.tableN", { n: p.number })}${p.caption ? ` · ${p.caption}` : ""}` : t("ui.tableTools");
    }
    if (isFileTab(k)) {
      const u = outline?.unplaced.find((x) => x.src === k.slice(5));
      return `${u?.caption || k.slice(5)} · ${t("ui.unplacedShort")}`;
    }
    if (!isDoc(k)) return k === "library" ? t("library") : k === "authors" ? t("ui.authorsGroup") : t("ui.settings");
    const a = project?.articles.find((x) => x.folder === k.slice(4));
    const title = a === article ? outline?.title?.text : a ? savedTitle(a) : "";
    return title || t("ui.manuscript");
  };

  return (
    <div className={`app${settings.fontMode === "journal" ? " fonts-journal" : ""}${left ? " with-left" : ""}${right ? " with-right" : ""}${project ? " with-ribbon" : ""}`}
      style={viewFont ? { ["--doc-font" as string]: `${fontList(viewFont.family).map((f) => `"${f}"`).join(", ")}, ${/times|cambria|georgia|garamond|serif/i.test(viewFont.family) ? "serif" : "sans-serif"}`, ["--doc-size" as string]: `${viewFont.size}pt` } : undefined}>
      <header className="titlebar">
        <span className="brand"><span className="brand-mark" aria-hidden="true">S</span>SciDesk</span>
        <MenuBar menus={menus} label={t("ui.menus")} />
        <span className="crumb" title={project ? `${project.manifest.name} › ${titleText}` : undefined}>
          {project && <><span>{project.manifest.name}</span><Icon name="chevronRight" size={14} /><b>{titleText}</b></>}
        </span>
        {!inTauri && <span className="preview-badge" title={t("previewNote")}>{t("ui.browserPreview")}</span>}
        {/* Settings at the top right, left of Export, with a gear (the user's choice, 22/11/2026) */}
        <button className={`icon-button settings-button${tab === "settings" ? " on" : ""}`} aria-pressed={tab === "settings"} title={t("ui.settings")} aria-label={t("ui.settings")} onClick={() => openTab("settings")}>
          <Icon name="settings" size={23} />
        </button>
        <MenuButton id="export-button" label={t("ui.export.button")} className="btn primary export" items={exportItems} align="right">
          {t("ui.export.button")} <Icon name="chevronDown" size={14} />
        </MenuButton>
      </header>

      {/* the toolbar across the whole window; the side panels start under it (the user's choice, record 0044) */}
      {project && editor && (
        <div className="ribbon-row">
          <Ribbon editor={editor} scheme={scheme} targets={targets} onCite={openQuickCite} onXref={insertXref} onTable={() => void insertTable()} onFigure={() => figureInput.current?.click()} disabled={!isDoc(tab)}
            freeFonts={settings.fontMode === "free"} onAdapt={() => void adaptFonts()} docFont={docFonts?.writing ?? { family: "Calibri", size: 12 }}
            onSave={() => void run(save)()} saveState={{ dirty, saving, lastSaved }} />
        </div>
      )}
      <div className="workspace">
        <nav className="viewbar" aria-label={t("ui.views.label")}>
          {(["article", "library"] as View[]).map((v) => (
            <button key={v} className={`view-button${view === v && project ? " active" : ""}`} aria-pressed={view === v && !!project} disabled={!project} onClick={() => chooseView(v)}>
              <Icon name={v === "article" ? "article" : "library"} size={20} /><span>{t(`ui.views.${v}`)}</span>
            </button>
          ))}
        </nav>

        {left && (
          <aside className="left-panel">
            {view === "article"
              ? <Navigator project={project!} folder={article!.folder} report={report} outline={outline} active={navActive} onGo={onNav}
                  sectionNumbers={sectionNos} numbering={sectionNumbering} onNumbering={(v) => void changeNumbering(v)}
                  onAddSection={(x, y) => setFloatMenu({ x, y, items: addItems(), label: t("ui.sections.add") })}
                  onPartMenu={(target, x, y) => setFloatMenu({ x, y, items: partMenuItems(target, x, y), label: target.kind === "unplaced" ? target.src : t(target.part === "table" ? "ui.tables" : "ui.figures") })}
                  onMoveSection={(block, target, after) => {
                    if (!editor) return;
                    const i = headingIndex(editor.state.doc, block), j = headingIndex(editor.state.doc, target);
                    if (i >= 0 && j >= 0) { openTab(docTab); moveSectionTo(editor, i, j, after); }
                  }}
                  onSectionMenu={(block, x, y) => { if (!editor) return; const i = headingIndex(editor.state.doc, block); if (i >= 0) setFloatMenu({ x, y, items: sectionItems(i, x, y), label: t("ui.sections.section") }); }}
                  articles={project!.articles.map((a) => ({ folder: a.folder, title: (a === article ? outline?.title?.text : savedTitle(a)) || a.folder }))} onSwitchArticle={(f) => void switchArticle(f)} onNewArticle={() => void newArticle()} />
              : <LibraryFilters project={project!} uses={uses} filter={libraryFilter} onFilter={(f) => { setLibraryFilter(f); openTab("library"); }} onImport={() => refsInput.current?.click()} onSyncZotero={() => void syncZotero(false)} />}
          </aside>
        )}
        {left && <div className="resizer" role="separator" aria-orientation="vertical" aria-label={t("ui.leftPanel")} onPointerDown={drag("left")} />}

        <main className="center">
          <div className="tabbar" role="tablist" aria-label={t("ui.openTabs")} hidden={!project && !tabs.includes("settings")}>
            {(project ? tabs : tabs.filter((k) => k === "settings")).map((k) => (
              <div key={k} className={`tab${tab === k ? " active" : ""}`}>
                <button role="tab" aria-selected={tab === k} onClick={() => selectTab(k)} title={tabLabel(k)}><Icon name={isDoc(k) ? "article" : isTableTab(k) || isFileTab(k) ? "table" : TAB_ICONS[k]} size={15} /><span className="tab-label">{tabLabel(k)}</span>{k === docTab && dirty ? <span className="dot" title={t("unsaved")} /> : null}{k === "authors" && authorsDirty ? <span className="dot" title={t("unsaved")} /> : null}</button>
                {(!isDoc(k) || tabs.filter(isDoc).length > 1) && <button className="tab-close" aria-label={t("ui.closeTab", { name: tabLabel(k) })} onClick={() => closeTab(k)}><Icon name="close" size={13} /></button>}
              </div>
            ))}
            <span className="spacer" />
            {project && <>
              <button className="icon-button" aria-pressed={settings.preview} title={t("ui.preview.toggle")} aria-label={t("ui.preview.toggle")} onClick={() => updateSettings({ preview: !settings.preview })}><Icon name="preview" size={16} /></button>
              <button className="icon-button" aria-pressed={settings.left} title={t("ui.leftPanel")} aria-label={t("ui.leftPanel")} onClick={() => updateSettings({ left: !settings.left })}><Icon name="panelLeft" size={16} /></button>
              <button className="icon-button" aria-pressed={settings.right} title={t("ui.rightPanel")} aria-label={t("ui.rightPanel")} onClick={() => updateSettings({ right: !settings.right })}><Icon name="panelRight" size={16} /></button>
            </>}
          </div>
          {error && <p className="error-banner" role="alert">{error}<button className="icon-button" aria-label={t("ui.close")} onClick={() => setError("")}><Icon name="close" size={14} /></button></p>}

          {/* the manuscript stays mounted: switching tabs never rebuilds the editor */}
          <div className={`tab-body manuscript-tab${settings.preview && project ? " with-preview" : ""}`} hidden={!project || !isDoc(tab)}>
            <div className={`desk${cropSheet ? " crop" : ""}`} ref={deskRef}>
              {/* record 0075: the table bar, while the cursor is in a table */}
              {editor && project && <TableContextBar editor={editor} scroller={deskRef} onOpenTab={openTableTab}
                label={(id) => t("ui.tableN", { n: outline?.tables.find((x) => x.id === id)?.number ?? "?" })} />}
              <div className={PAGED ? "pages-wrap" : undefined} ref={pagesRef} style={PAGED ? ({ "--per-row": perRow } as React.CSSProperties) : undefined}>
              {PAGED && (
                <div className="sheets" aria-hidden="true">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <div key={i} className="sheet" style={{ "--row": Math.floor(i / perRow), "--col": i % perRow } as React.CSSProperties}><span className="sheet-number">{i + 1}</span></div>
                  ))}
                </div>
              )}
              <div className={`paper${PAGED ? " paged" : ""}`} onContextMenu={onContextMenu} onMouseDown={onPaperDown}>
                <EditorContent editor={editor} className="page" />
                {rendering && rendering.bibliography.length > 0 && (
                  <section className="bibliography" aria-label={t("ui.bibliography")}>
                    <p className="part-note">{t("ui.bibliographyAuto")}</p>
                    <ol>
                      {rendering.bibliography.map((b) => (
                        <li key={b.ref}>
                          {b.label && <span className="bib-label">{b.label}</span>}
                          <span>{b.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, fontStyle: r.italic ? "italic" : undefined, verticalAlign: r.sup ? "super" : r.sub ? "sub" : undefined, fontSize: r.sup || r.sub ? "smaller" : undefined }}>{r.text}</span>)}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <span className="text-end" ref={endRef} />
              </div>
              </div>
            </div>
            {project && settings.preview && <PreviewPane available={inTauri} tick={previewTick} bundle={previewBundle} cursorBlocks={cursorBlocks} onGoToBlock={(id) => { goToBlock(id); }} />}
            {editor && project && <SelectionBubble editor={editor} scheme={scheme} onCite={openQuickCite} />}
            {editor && project && finding && (
              <FindBar editor={editor} replace={finding.replace} focus={finding.focus} onClose={() => { setFinding(null); editor.commands.focus(); }}
                onReplaced={(count) => setMessage(t("ui.find.replaced", { count }))} />
            )}
          </div>

          {project && editor && tabs.filter(isTableTab).map((k) => (
            <div key={k} className="tab-body table-tab" hidden={tab !== k}>
              <TableTabView editor={editor} id={k.slice(6)} title={tabLabel(k)} onGone={() => tableGone(k)} onCells={setCells}
                onView={(v) => { if (v) tabViews.current.set(k.slice(6), v); else tabViews.current.delete(k.slice(6)); }} onContextMenu={onTabContextMenu}
                notice={(() => { const n = pasteNotices.get(k.slice(6)); return n ? { ...n, number: outline?.tables.find((x) => x.id === k.slice(6))?.number ?? null } : null; })()}
                onUndoPaste={() => { const n = pasteNotices.get(k.slice(6)); if (n) undoPaste(n.tables); }}
                onDismissNotice={() => setPasteNotices((m) => { const next = new Map(m); next.delete(k.slice(6)); return next; })} />
            </div>
          ))}
          {project && article && tabs.filter(isFileTab).map((k) => (
            <div key={k} className="tab-body table-tab" hidden={tab !== k}>
              <UnplacedTableTab project={project} folder={article.folder} src={k.slice(5)} title={tabLabel(k)} onCells={setCells}
                onView={(v) => { if (v) tabViews.current.set(k, v); else tabViews.current.delete(k); }} onContextMenu={onTabContextMenu}
                onSaved={() => void recompute()}
                register={(src, flush) => { if (flush) unplacedFlush.current.set(src, flush); else unplacedFlush.current.delete(src); }} />
            </div>
          ))}
          {project && tab === "library" && (
            <div className="tab-body library-tab">
              <LibraryPanel project={project} version={libraryVersion} uses={uses} onChanged={libraryChanged} onDelete={removeReference} filter={libraryFilter}
                onSelect={(id) => { setSelected({ kind: "reference", id }); showRight("details"); }} />
            </div>
          )}
          {project && article && tabs.includes("authors") && (
            <div className="tab-body authors-tab" hidden={tab !== "authors"}>
              <AuthorsDialog key={`${authorsKey}-${article.folder}`} asView project={project} folder={article.folder} initialTab={authorsTab} onDirty={setAuthorsDirty}
                onClose={() => setAuthorsKey((k) => k + 1)}
                onSaved={(n) => { setAuthorsKey((k) => k + 1); setMessage(n ? t("authorsSavedWarnings", { count: n }) : t("authorsSaved")); void recompute(); }} />
            </div>
          )}
          {tab === "settings" && <div className="tab-body settings-tab"><SettingsView settings={settings} onChange={updateSettings} /></div>}

          {!project && tab !== "settings" && settingsLoaded && !settings.setupDone && (
            <div className="tab-body start">
              <FirstRun settings={settings} onChange={updateSettings} onDone={() => updateSettings({ setupDone: true })} />
            </div>
          )}
          {!project && tab !== "settings" && settingsLoaded && settings.setupDone && (
            <div className="tab-body start">
              <Home recent={recent} missing={missing} canOpenFolder={inTauri} keys={{ newArticle: keys("newArticle"), openProject: keys("openProject") }}
                onNew={() => void newArticle()} onFromWord={() => wordInput.current?.click()} onOpen={() => void open()} onDemo={() => void openDemo()}
                onOpenRecent={(r) => void openRecent(r)} onLocate={(r) => void locateRecent(r)} onForget={(r) => void forgetRecentProject(r)} />
            </div>
          )}
        </main>

        {right && <div className="resizer" role="separator" aria-orientation="vertical" aria-label={t("ui.rightPanel")} onPointerDown={drag("right")} />}
        {right && (
          <aside className="right-panel" aria-label={t("ui.rightPanel")}>
            <div className="tabs right-tabs" role="tablist">
              <button role="tab" aria-selected={rightTab === "warnings"} onClick={() => setRightTab("warnings")}>{t("ui.warnings")}{activeWarnings ? <span className="count">{activeWarnings}</span> : null}</button>
              <button role="tab" aria-selected={rightTab === "review"} onClick={() => setRightTab("review")}>{t("ui.review")}{shownProposals ? <span className="count">{shownProposals}</span> : null}</button>
              <button role="tab" aria-selected={rightTab === "details"} onClick={() => setRightTab("details")}>{t("ui.details")}</button>
            </div>
            <div className="right-body">
              {rightTab === "warnings" && <ChecksPanel report={report} onGo={goTo} onIgnore={ignore} onRestore={restore} showSections={showSections} onBlind={blind} articleLang={article?.article.lang ?? "es"}
                onAddSection={(role) => { if (editor && article) { openTab(docTab); addSection(editor, role, article.article.lang); } }}
                onTableWords={tableWords} journalSays={(article?.article.journal ? project?.journals.get(article.article.journal)?.articleTypes.find((x) => x.articleType === article.article.articleType)?.limits.wordsIncludeTables?.value : null) ?? null} />}
              {rightTab === "review" && <ReviewPanel proposals={proposals} onImport={importReturnedCopy} />}
              {rightTab === "details" && (
                <DetailsPanel selected={selected} project={project!} folder={article!.folder} outline={outline} rendering={rendering} uses={useSites}
                  onEditCitation={() => { if (selected?.kind === "citation") goToCitation(selected.id, false); openQuickCite(); }}
                  onGoCitation={goToCitation} onGoPart={goToPart} onGoBlock={(b) => void goToBlock(b)}
                  partAttrs={(id) => { let a: Record<string, unknown> | null = null; editor?.state.doc.forEach((n) => { if (/Part$/.test(n.type.name) && n.attrs.id === id) a = n.attrs; }); return a; }}
                  onSetPartAttrs={(id, attrs) => { if (editor) setPartAttrs(editor, id, attrs); }}
                  onOpenTableTab={openTableTab} onRemovePart={removePart}
                  onAddNote={(id) => { goToPart(id); if (editor) { addNote(editor.state, editor.view.dispatch, "general"); editor.commands.focus(); } }}
                  onOpenReference={(id) => { setSelected({ kind: "reference", id }); }}
                  onExportTitlePage={() => void exportAs("title-page")()}
                  onOpenAuthors={() => { setAuthorsTab("authors"); openTab("authors"); }}
                  cells={cells} warnings={report?.warnings ?? []} onGoWarning={goTo} onWarningCorrect={(w) => void ignore(w, "correct", "")} />
              )}
            </div>
          </aside>
        )}
      </div>

      {wizard && <NewArticle uiLang={i18n.language} areas={settings.areas}
        openProject={project ? { name: project.manifest.name, folders: project.manifest.articles.map((a) => a.folder), references: project.library.references.length, zotero: linkedCollection(project)?.name ?? null } : null}
        onCancel={() => setWizard(false)} onCreate={createArticle} />}
      {message && (
        <div className="toast" role="status">
          <span>{message}{download && <> · <a href={download.url} download={download.name}><Icon name="download" size={14} /> {download.name}</a></>}</span>
          {messageAction && <button className="btn small" onClick={() => { const a = messageAction; setMessage(""); a.run(); }}>{messageAction.label}</button>}
          <button className="icon-button" aria-label={t("ui.close")} onClick={() => setMessage("")}><Icon name="close" size={14} /></button>
        </div>
      )}
      <StatusBar project={project} article={article} report={report} saving={saving} dirty={dirty} lastSaved={lastSaved}
        tracking={tracking} onTracking={() => void toggleTracking()}
        cursorLang={cursorLang} onLang={(l) => editor && setLanguage(editor, l)}
        landscape={isDoc(tab) ? cursorLandscape : null} onLandscape={(on) => landscapeHere(on)}
        onStyle={(id) => void chooseStyle(id)} onChecks={() => showRight("warnings")} onWords={() => { setShowSections(true); showRight("warnings"); }}
        zoom={{ value: zoom, fit: settings.zoom === "fit", set: setZoom, step: zoomStep }}
        fontMode={settings.fontMode} onFontMode={() => updateSettings({ fontMode: settings.fontMode === "free" ? "journal" : "free" })}
        home={{ lang: settings.lang === "es" ? "español" : "English", scheme: t(`ui.schemes.${scheme}`), onLang: () => updateSettings({ lang: settings.lang === "es" ? "en" : "es" }), onScheme: () => updateSettings({ scheme: scheme === "word-es" ? "international" : "word-es" }) }} />

      {/* hidden file inputs, opened from the menus and buttons */}
      <input ref={wordInput} type="file" accept=".docx" hidden onChange={() => void fromWord()} aria-label={t("fromWord")} />
      <input ref={refsInput} type="file" accept=".ris,.nbib,.txt,.bib,.json" hidden onChange={() => void onRefs()} aria-label={t("importRefs")} />
      <input ref={figureInput} type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,.svg" hidden onChange={() => void insertFigure()} aria-label={t("ui.insertFigure")} />

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextItems()} label={t("ui.contextMenu")} onClose={() => setContextMenu(null)} />}
      {floatMenu && <ContextMenu key={`${floatMenu.x},${floatMenu.y},${floatMenu.label},${floatMenu.items.length}`} x={floatMenu.x} y={floatMenu.y} items={floatMenu.items} label={floatMenu.label} onClose={() => setFloatMenu(null)} />}
      {recoveries[0] && (
        <div className="overlay">
          <div className="recovery-dialog" role="alertdialog" aria-modal="true" aria-labelledby="recovery-title">
            <h2 id="recovery-title">{t("recoveryTitle")}</h2>
            <p>{t("recoveryText", { doc: recoveries[0].entry.path === BODY ? t("docBody") : recoveries[0].entry.path === "manuscript/abstract.scidoc" ? t("docAbstract") : recoveries[0].entry.path, when: new Date(recoveries[0].entry.recorded).toLocaleString(i18n.language) })}</p>
            {recoveries[0].state === "disk-changed" && <p className="field-error">{t("recoveryDiskChanged")}</p>}
            <div className="dialog-actions">
              <span className="spacer" />
              <button className="btn" onClick={() => void recover(recoveries[0], false)}>{t("recoveryDiscard")}</button>
              <button className="btn primary" onClick={() => void recover(recoveries[0], true)} autoFocus>{t("recoveryApply")}</button>
            </div>
          </div>
        </div>
      )}
      {docFontOpen && project && article && docFonts && (
        <DocumentFontDialog fonts={docFonts} onClose={() => { setDocFontOpen(false); editor?.commands.focus(); }}
          onSave={(v) => void run(async () => {
            await setDocumentFont(project, article.folder, v);
            setDocFontOpen(false);
            setFontTick((n) => n + 1);
            const w = documentFontsOf(project, article.folder).writing;
            setMessage(t("ui.docFont.saved", { family: w.family, size: w.size.toLocaleString(i18n.language) }));
            void recompute();
          })()} />
      )}
      {askName && (
        <TrackNameDialog suggested={firstAuthorName()} onClose={() => { setAskName(false); editor?.commands.focus(); }}
          onSave={(name) => { setAskName(false); void toggleTracking(name); }} />
      )}
      {variantsOpen && editor && (
        <EnglishVariants editor={editor} initial={variantsOpen} onClose={() => { setVariantsOpen(null); editor.commands.focus(); }}
          onApplied={(changed, to, tagged) => {
            setVariantsOpen(null);
            // an English article takes the variety as its language, so the checker follows it
            if (tagged && project && article && article.article.lang.toLowerCase().startsWith("en")) {
              void setArticleLang(project, article.folder, to === "GB" ? "en-GB" : "en-US").then(() => { spellOptions.lang = article.article.lang; refresh(editor.view); });
            }
            setMessage(t("ui.variants.done", { count: changed, variety: t(`ui.variants.${to}`) }));
            editor.commands.focus();
          }} />
      )}
      {citing && project && <QuickCite library={project.library} initial={citing.items} uses={uses} omitAuthor={omitsAuthor(rendering?.format ?? null)} onDone={finishCitation} onClose={closeQuickCite} />}
      {xrefOpen && <XrefPicker targets={targets} onPick={insertXref} onClose={() => { setXrefOpen(false); editor?.commands.focus(); }} />}
    </div>
  );
}

