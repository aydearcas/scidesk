// The window of phase 1 (record 0044, design proposal sections 3, 4, 7 and 9): title bar
// with classic menus and Export, view bar, concept navigator, central tabs (manuscript,
// library, authors, settings), right panel with Warnings, Review and Details, and status
// bar. All the work (open, write, cite, save, export, import a copy, paste from Word,
// autosave and recovery) is the vertical slice's and later records', unchanged.
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addEmptyTable, addFigure, addTablePart, saveSnapshot, articleOutline, changedDocuments, checkArticle, composeArticle, liveDocuments, saveComposite, splitArticle, tablePartFromPaste, createDemoProject, ignoreWarning, restoreWarning, deleteReference, exportDocx, exportTitlePage, importCopy, importReferences, loadProject, projectFromWord,
  exportPdf, manuscriptTypst, Recovery, referenceUses, renderCitations, setCitationStyle, styleResources,
  type ArticleData, type ArticleOutline, type CheckReport, type CheckWarning, type OutlinePart, type PendingRecovery, type Project, type ReferenceUse, type Rendering,
} from "@scidesk/core";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, deleteColumn, deleteRow, isInTable, mergeCells, splitCell, toggleHeaderRow } from "@tiptap/pm/tables";
import { newId, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { citationLabels, extensions, findStep, hooks, partInfo, refreshCitationLabels, refreshPartLabels, refreshXrefLabels, xrefLabels } from "./editor.ts";
import { FindBar } from "./FindBar.tsx";
import { addNote, blockInsertPos, clearImages, partAround, partContext, placed, relabel, setAlign, setPartAttrs } from "./parts.ts";
import { TableTabView, type TableCommand } from "./TableTab.tsx";
import { AuthorsDialog, type Tab as AuthorsTab } from "./AuthorsDialog.tsx";
import { ChecksPanel } from "./ChecksPanel.tsx";
import { DetailsPanel, type Selected } from "./DetailsPanel.tsx";
import { SelectionBubble, XrefPicker } from "./EditorMenus.tsx";
import { Icon, type IconName } from "./icons.tsx";
import { cleanOfficeHtml, isOfficeHtml, readPaste } from "./paste.ts";
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
import { hasPreviewProject, inTauri, localStore, memoryFs, openFolder, previewFs, resources, typstCompiler } from "./platform.ts";

const BODY = "manuscript/article.scidoc";
/**
 * Autosave (R25, record 0039): the journal of unsaved changes is written shortly after
 * each change, and the document is saved after a pause in the typing, or at the latest
 * after a while of continuous typing.
 */
const JOURNAL_MS = 300;
const AUTOSAVE_IDLE_MS = 2000;
const AUTOSAVE_MAX_MS = 20000;
/** The sheet is A4: 21 cm wide, in CSS px. Zoom goes from 50 % to 300 %; "fit" fills the width of the desk. */
const A4_PX = (210 / 25.4) * 96;
export const ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200, 250, 300];
const clampZoom = (z: number) => Math.round(Math.min(300, Math.max(50, z)));

/** A manuscript is "doc:<article folder>": one tab per article of the project (record 0015); a table's own tab is "table:<id>". */
type CenterTab = `doc:${string}` | `table:${string}` | "library" | "authors" | "settings";
type View = "article" | "library";
type RightTab = "warnings" | "review" | "details";
const TAB_ICONS: Record<string, IconName> = { library: "library", authors: "users", settings: "settings" };
const isDoc = (k: string): k is `doc:${string}` => k.startsWith("doc:");
const isTableTab = (k: string): k is `table:${string}` => k.startsWith("table:");
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml" };
/** The title of an article as saved (the tab of an article that is not on screen). */
const savedTitle = (a: ArticleData) => {
  const title = ((a.documents.get(BODY)?.doc as PMNode | undefined)?.content ?? []).find((n) => n.type === "title");
  const text = (n: PMNode): string => (n.type === "text" ? n.text ?? "" : (n.content ?? []).map(text).join(""));
  return title ? text(title).trim() : "";
};

const docxUrl = (bytes: Uint8Array) => URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));

export function App() {
  const { t, i18n } = useTranslation();
  const [settings, updateSettings] = useSettings();
  const scheme = effectiveScheme(settings);
  const keys = (a: Action) => shortcutLabel(SCHEMES[scheme][a], i18n.language);
  const [project, setProject] = useState<Project | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessageState] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rendering, setRendering] = useState<Rendering | null>(null);
  const [proposals, setProposals] = useState<{ set: ProposalSetFile; name: string } | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [outline, setOutline] = useState<ArticleOutline | null>(null);
  const [uses, setUses] = useState<Map<string, number>>(new Map());
  const [useSites, setUseSites] = useState<Map<string, ReferenceUse[]>>(new Map());
  // the quick citation dialog: the citation being edited (its position), or a new one
  const [citing, setCiting] = useState<{ pos: number | null; items: CiteItem[] } | null>(null);
  const [xrefOpen, setXrefOpen] = useState(false);
  // find and replace in the manuscript; `focus` changes each time it is asked for again
  const [finding, setFinding] = useState<{ replace: boolean; focus: number } | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  // every message replaces the previous one, with its file link or none
  const setMessage = (text: string, file: { url: string; name: string } | null = null) => { setMessageState(text); setDownload(file); };
  const refsInput = useRef<HTMLInputElement>(null);
  const figureInput = useRef<HTMLInputElement>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showSections, setShowSections] = useState(false);
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

  const editor = useEditor({
    editorProps: {
      // Word's HTML, cleaned (prototype 1); with tables, each becomes a .scitable
      transformPastedHTML: cleanOfficeHtml,
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
      citationLabels.clear();
      for (const [id, c] of r.citations) citationLabels.set(id, c.runs);
      refreshCitationLabels();
      setRendering(r);
      // how often each reference is cited, with what is on screen and not saved yet
      const sites = referenceUses(project, Object.fromEntries(Object.entries(live).map(([p, d]) => [`${article.folder}/${p}`, d])));
      setUseSites(sites);
      setUses(new Map([...sites].map(([id, u]) => [id, u.length])));
      // the checks, with what is on screen (record 0041)
      setReport(checkArticle(project, article.folder, live));
      // the navigator, and the places of tables and figures with their numbers
      const o = articleOutline(project, article.folder, live);
      setOutline(o);
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
    return c.doc;
  }, []);
  // the texts of the parts follow the interface language
  useEffect(() => {
    partContext.uncited = t("ui.notCitedFlag");
    partContext.noImage = (path) => t("ui.noImage", { path });
    if (editor) relabel(editor.view);
  }, [editor, t]);

  const show = useCallback(async (p: Project) => {
    setProject(p);
    setProposals(null);
    setError("");
    setSelected(null);
    setNavActive(null);
    // every manuscript of the project in its tab, the first on screen
    setTabs(p.articles.map((a) => `doc:${a.folder}` as CenterTab));
    setTab(`doc:${p.articles[0].folder}`);
    setActiveFolder(p.articles[0].folder);
    editorStates.current.clear();
    setView("article");
    journaled.current.clear();
    loadDoc(composed(p, p.articles[0]));
    setDirty(false);
    dirtySince.current = null;
    setLastSaved(null);
    // work that never reached the disk the last time the project was open
    const rec = new Recovery(await localStore(), p);
    recovery.current = rec;
    setRecoveries((await rec.pending()).pending);
  }, [loadDoc, composed]);
  useEffect(() => { void recompute(); }, [project, recompute]);

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
      await saveComposite(project, article, editor.getJSON() as PMNode);
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
        for (const [path, file] of changedDocuments(splitArticle(editor.getJSON() as PMNode, article), article)) {
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
    try { await show(await createDemoProject(inTauri ? memoryFs() : previewFs(true), "corte-vertical", { letter: true, parts: true })); } finally { opening.current = false; }
  });
  const reopenPreview = run(async () => show(await loadProject(previewFs(false))));
  const wordInput = useRef<HTMLInputElement>(null);
  // a new project from a Word document: in the app, into an empty folder the user chooses
  const fromWord = run(async () => {
    const file = wordInput.current?.files?.[0];
    if (wordInput.current) wordInput.current.value = "";
    if (!file) return;
    const target = inTauri ? (await openFolder())?.fs : memoryFs();
    if (!target) return;
    const { project: p, report } = await projectFromWord(target, new Uint8Array(await file.arrayBuffer()), { fileName: file.name });
    await show(p);
    setMessage(t("fromWordDone", { headings: report.headings, tables: report.tables, figures: report.figures }) + (report.warnings.length ? ` — ${report.warnings.join("; ")}` : ""));
  });
  const open = run(async () => {
    const r = await openFolder();
    if (r) await show(await loadProject(r.fs));
  });

  // ---------------------------------------------------------------- tabs and panels

  const openTab = (k: CenterTab) => {
    setTabs((ts) => (ts.includes(k) ? ts : [...ts, k]));
    setTab(k);
  };
  const openTableTab = (id: string) => openTab(`table:${id}`);
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
    setTabs((ts) => ts.filter((k) => !isTableTab(k)));
    const kept = editorStates.current.get(folder);
    const doc = composed(project, next);
    editor.view.updateState(kept ?? freshState(doc));
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
    requestAnimationFrame(() => (editor.view.nodeDOM(target) as HTMLElement | null)?.scrollIntoView?.({ block: node.isInline ? "center" : "start", behavior: "smooth" }));
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
    const sel = editor.state.selection;
    if (sel instanceof NodeSelection && sel.node.type.name === "citation") setCiting({ pos: sel.from, items: sel.node.attrs.items as CiteItem[] });
    else setCiting({ pos: null, items: [] });
  }, [editor, project]);
  const openXref = useCallback(() => { if (project) setXrefOpen(true); }, [project]);
  const openFind = (replace: boolean) => { openTab(docTab); setFinding({ replace, focus: Date.now() }); };
  useEffect(() => { hooks.quickCite = openQuickCite; hooks.xref = openXref; });
  useEffect(() => { hooks.find = (replace) => openFind(replace); });
  const finishCitation = (items: CiteItem[]) => {
    if (!editor || !citing) return;
    const pos = citing.pos;
    setCiting(null);
    if (pos === null) editor.chain().focus().insertContent({ type: "citation", attrs: { id: newId("c"), items } }).run();
    else editor.chain().focus().command(({ tr }) => { tr.setNodeMarkup(pos, undefined, { ...tr.doc.nodeAt(pos)!.attrs, items }); return true; }).run();
  };
  const closeQuickCite = () => { setCiting(null); editor?.commands.focus(); };
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
  const placeAgain = (path: string) => { insertPart(path); setMessage(t("ui.placedAgain", { path })); };
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
  const ignore = async (w: CheckWarning, status: "correct" | "not-applicable", note: string) => {
    if (!project || !article) return;
    await ignoreWarning(project, article.folder, w.id, status, note);
    await recompute();
  };
  const restore = async (w: CheckWarning) => {
    if (!project || !article) return;
    await restoreWarning(project, article.folder, w.id);
    await recompute();
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
      for (const s of segments) {
        if (s.kind === "html") { content.push(s); continue; }
        const { part, warnings: w } = tablePartFromPaste(s.table);
        const { path } = await addTablePart(project, article.folder, part);
        warnings.push(...w);
        content.push({ kind: "node", node: placed(part, path) });
        tables++;
      }
      // inside a table, a figure or the abstract, the pasted tables go after it
      const at = blockInsertPos(editor.state);
      let chain = editor.chain().focus();
      if (at !== null) chain = chain.insertContentAt(at, { type: "paragraph" }).setTextSelection(at + 1);
      for (const c of content) chain = chain.insertContent(c.kind === "html" ? c.html : (c.node as never));
      chain.run();
      setMessage(t("pastedTables", { count: tables }) + (images ? ` — ${t("pastedImagesDropped", { count: images })}` : "") + (warnings.length ? ` — ${[...new Set(warnings)].join("; ")}` : ""));
    })();
    return true;
  };
  const libraryChanged = (msg: string) => { setLibraryVersion((v) => v + 1); setMessage(msg); void recompute(); };
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
    setMessage(t(r.snapshot ? "exported" : "exportedPlain", { path: r.path, snapshot: r.snapshot }) + (r.warnings.length ? ` — ${r.warnings.join("; ")}` : ""),
      inTauri ? null : { url: docxUrl(r.bytes), name: r.path.split("/").pop()! });
  });
  // the PDF for the journal (record 0040): Typst in Rust; the browser preview offers the Typst source instead
  const exportPdfFile = run(async () => {
    if (!project || !article) return;
    await save();
    const compile = await typstCompiler();
    if (!compile) {
      const b = await manuscriptTypst(project, article.folder, resources);
      setMessage(t("pdfInBrowser") + (b.warnings.length ? ` — ${b.warnings.join("; ")}` : ""), { url: URL.createObjectURL(new Blob([b.source], { type: "text/plain" })), name: `${article.folder}.typ` });
      return;
    }
    const r = await exportPdf(project, article.folder, resources, compile);
    setMessage(t("pdfExported", { path: r.path, pages: r.pages }) + (r.warnings.length ? ` — ${r.warnings.join("; ")}` : ""));
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
      if (room > 0) setFitZoom(Math.floor(Math.min(200, Math.max(50, (room / A4_PX) * 100))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    return () => ro.disconnect();
  }, [project]);
  const zoom = settings.zoom === "fit" ? fitZoom : settings.zoom;
  useEffect(() => { document.documentElement.style.setProperty("--zoom", String(zoom / 100)); }, [zoom]);
  const setZoom = (z: "fit" | number) => updateSettings({ zoom: z === "fit" ? "fit" : clampZoom(z) });
  const zoomStep = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((s) => s > zoom) ?? 300 : [...ZOOM_STEPS].reverse().find((s) => s < zoom) ?? 50;
    setZoom(next);
  };
  // Ctrl + wheel zooms the sheet, as in Word (not the whole window, which the web view would do)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      updateSettings({ zoom: clampZoom(zoomRef.current + (e.deltaY < 0 ? 10 : -10)) });
    };
    desk.addEventListener("wheel", onWheel, { passive: false });
    return () => desk.removeEventListener("wheel", onWheel);
  }, [project, updateSettings]);
  // a click on the empty part of the sheet, below the text, puts the cursor at the end
  const onPaperDown = (e: React.MouseEvent) => {
    if (!editor || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.classList.contains("paper") && !t.classList.contains("page")) return;
    const pm = editor.view.dom.getBoundingClientRect();
    if (e.clientY < pm.bottom) return;
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
  const menus: MenuDef[] = [
    { id: "file", label: t("ui.menu.file"), items: [
      ...(inTauri ? [{ label: t("open"), onSelect: () => void open() }] : []),
      { label: t("demo"), onSelect: () => void openDemo() },
      ...(!inTauri && hasPreviewProject() ? [{ label: t("reopenPreview"), onSelect: () => void reopenPreview() }] : []),
      { label: t("fromWord"), onSelect: () => wordInput.current?.click() },
      "-",
      { label: t("ui.saveNow"), shortcut: keys("save"), onSelect: () => void run(save)(), disabled: noProject },
      "-",
      ...exportItems.map((e) => (e === "-" ? e : { ...e, hint: undefined, label: `${t("ui.exportPrefix")} ${e.label}` })),
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
    ] },
    { id: "view", label: t("ui.menu.view"), items: [
      { label: t("ui.views.article"), checked: view === "article", onSelect: () => chooseView("article"), disabled: noProject },
      { label: t("ui.views.library"), checked: view === "library", onSelect: () => chooseView("library"), disabled: noProject },
      "-",
      { label: t("ui.leftPanel"), checked: settings.left, onSelect: () => updateSettings({ left: !settings.left }) },
      { label: t("ui.rightPanel"), checked: settings.right, onSelect: () => updateSettings({ right: !settings.right }) },
      "-",
      { label: t("ui.fontModes.journal"), checked: settings.fontMode === "journal", onSelect: () => updateSettings({ fontMode: "journal" }) },
      { label: t("ui.fontModes.free"), checked: settings.fontMode === "free", onSelect: () => updateSettings({ fontMode: "free" }) },
      "-",
      { label: t("ui.zoomFit"), checked: settings.zoom === "fit", onSelect: () => setZoom("fit") },
      { label: "100 %", checked: settings.zoom === 100, onSelect: () => setZoom(100) },
      { label: t("ui.zoomIn"), onSelect: () => zoomStep(1), disabled: zoom >= 300 },
      { label: t("ui.zoomOut"), onSelect: () => zoomStep(-1), disabled: zoom <= 50 },
    ] },
    { id: "settings", label: t("ui.settings"), items: [
      { label: t("ui.openSettings"), onSelect: () => openTab("settings") },
      "-",
      { label: "Español", checked: settings.lang === "es", onSelect: () => updateSettings({ lang: "es" }) },
      { label: "English", checked: settings.lang === "en", onSelect: () => updateSettings({ lang: "en" }) },
      "-",
      { label: t("ui.schemes.word-es"), checked: scheme === "word-es", onSelect: () => updateSettings({ scheme: "word-es" }) },
      { label: t("ui.schemes.international"), checked: scheme === "international", onSelect: () => updateSettings({ scheme: "international" }) },
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
    setContextMenu({ x: e.clientX, y: e.clientY });
  };
  const contextItems = (): MenuEntry[] => {
    if (!editor) return [];
    const sel = editor.state.selection;
    const onCitation = sel instanceof NodeSelection && sel.node.type.name === "citation";
    const exec = (cmd: "cut" | "copy") => { editor.commands.focus(); document.execCommand(cmd); };
    const part = partAround(sel.$from);
    const inTable = isInTable(editor.state);
    const cmd = (key: string, c: TableCommand): MenuEntry => ({ label: t(`ui.${key}`), onSelect: () => { c(editor.state, editor.view.dispatch); editor.commands.focus(); }, disabled: !c(editor.state) });
    const tableItems: MenuEntry[] = inTable ? [
      cmd("rowAbove", addRowBefore), cmd("rowBelow", addRowAfter), cmd("colLeft", addColumnBefore), cmd("colRight", addColumnAfter),
      cmd("deleteRow", deleteRow), cmd("deleteCol", deleteColumn), cmd("mergeCells", mergeCells), cmd("splitCell", splitCell), cmd("headerRow", toggleHeaderRow),
      "-",
    ] : [];
    // once the menu has closed and given the focus back: a cursor moved before that is lost
    const afterMenu = (f: () => void) => () => setTimeout(() => { editor.view.focus(); f(); }, 0);
    const partItems: MenuEntry[] = part ? [
      { label: t("ui.generalNote"), onSelect: afterMenu(() => addNote(editor.state, editor.view.dispatch, "general")) },
      ...(inTable ? [{ label: t("ui.specificNote"), title: t("ui.specificNoteHint"), onSelect: afterMenu(() => addNote(editor.state, editor.view.dispatch, "specific")) }] : []),
      ...(part.node.type.name === "tablePart" ? [{ label: t("ui.openInTab"), onSelect: () => openTableTab(String(part.node.attrs.id)) }] : []),
      { label: t("ui.removeFromText"), onSelect: () => removePart(String(part.node.attrs.id)) },
      "-",
    ] : [];
    return [
      ...tableItems,
      ...partItems,
      ...(onCitation ? [
        { label: t("ui.editCitation"), shortcut: keys("cite"), onSelect: openQuickCite },
        { label: t("ui.removeCitation"), onSelect: () => editor.chain().focus().deleteSelection().run() },
        "-" as const,
      ] : [{ label: t("ui.cite"), shortcut: keys("cite"), onSelect: openQuickCite }]),
      { label: t("ui.xref"), shortcut: keys("xref"), onSelect: openXref },
      { label: t("ui.pending"), onSelect: () => editor.chain().focus().insertContent(t("ui.pendingMarker")).run() },
      "-",
      { label: t("ui.cut"), shortcut: shortcutLabel("Mod-x", i18n.language), onSelect: () => exec("cut"), disabled: sel.empty },
      { label: t("ui.copy"), shortcut: shortcutLabel("Mod-c", i18n.language), onSelect: () => exec("copy"), disabled: sel.empty },
      { label: t("ui.selectAll"), shortcut: shortcutLabel("Mod-a", i18n.language), onSelect: () => editor.chain().focus().selectAll().run() },
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
    if (!isDoc(k)) return k === "library" ? t("library") : k === "authors" ? t("ui.authorsGroup") : t("ui.settings");
    const a = project?.articles.find((x) => x.folder === k.slice(4));
    const title = a === article ? outline?.title?.text : a ? savedTitle(a) : "";
    return title || t("ui.manuscript");
  };

  return (
    <div className={`app${settings.fontMode === "journal" ? " fonts-journal" : ""}${left ? " with-left" : ""}${right ? " with-right" : ""}${project ? " with-ribbon" : ""}`}>
      <header className="titlebar">
        <span className="brand"><span className="brand-mark" aria-hidden="true">S</span>SciDesk</span>
        <MenuBar menus={menus} label={t("ui.menus")} />
        <span className="crumb" title={project ? `${project.manifest.name} › ${titleText}` : undefined}>
          {project && <><span>{project.manifest.name}</span><Icon name="chevronRight" size={14} /><b>{titleText}</b></>}
        </span>
        {!inTauri && <span className="preview-badge" title={t("previewNote")}>{t("ui.browserPreview")}</span>}
        <MenuButton id="export-button" label={t("ui.export.button")} className="btn primary export" items={exportItems} align="right">
          {t("ui.export.button")} <Icon name="chevronDown" size={14} />
        </MenuButton>
      </header>

      {/* the toolbar across the whole window; the side panels start under it (the user's choice, record 0044) */}
      {project && editor && (
        <div className="ribbon-row">
          <Ribbon editor={editor} scheme={scheme} targets={targets} onCite={openQuickCite} onXref={insertXref} onTable={() => void insertTable()} onFigure={() => figureInput.current?.click()} disabled={!isDoc(tab)}
            freeFonts={settings.fontMode === "free"} onAdapt={() => void adaptFonts()} />
        </div>
      )}
      <div className="workspace">
        <nav className="viewbar" aria-label={t("ui.views.label")}>
          {(["article", "library"] as View[]).map((v) => (
            <button key={v} className={`view-button${view === v && project ? " active" : ""}`} aria-pressed={view === v && !!project} disabled={!project} onClick={() => chooseView(v)}>
              <Icon name={v === "article" ? "article" : "library"} size={20} /><span>{t(`ui.views.${v}`)}</span>
            </button>
          ))}
          <span className="spacer" />
          <button className={`view-button${tab === "settings" ? " active" : ""}`} onClick={() => openTab("settings")}><Icon name="settings" size={20} /><span>{t("ui.settings")}</span></button>
        </nav>

        {left && (
          <aside className="left-panel">
            {view === "article"
              ? <Navigator project={project!} folder={article!.folder} report={report} outline={outline} active={navActive} onGo={onNav}
                  articles={project!.articles.map((a) => ({ folder: a.folder, title: (a === article ? outline?.title?.text : savedTitle(a)) || a.folder }))} onSwitchArticle={(f) => void switchArticle(f)} />
              : <LibraryFilters project={project!} uses={uses} filter={libraryFilter} onFilter={(f) => { setLibraryFilter(f); openTab("library"); }} onImport={() => refsInput.current?.click()} />}
          </aside>
        )}
        {left && <div className="resizer" role="separator" aria-orientation="vertical" aria-label={t("ui.leftPanel")} onPointerDown={drag("left")} />}

        <main className="center">
          <div className="tabbar" role="tablist" aria-label={t("ui.openTabs")}>
            {(project ? tabs : tabs.filter((k) => k === "settings")).map((k) => (
              <div key={k} className={`tab${tab === k ? " active" : ""}`}>
                <button role="tab" aria-selected={tab === k} onClick={() => selectTab(k)} title={tabLabel(k)}><Icon name={isDoc(k) ? "article" : isTableTab(k) ? "table" : TAB_ICONS[k]} size={15} /><span className="tab-label">{tabLabel(k)}</span>{k === docTab && dirty ? <span className="dot" title={t("unsaved")} /> : null}{k === "authors" && authorsDirty ? <span className="dot" title={t("unsaved")} /> : null}</button>
                {(!isDoc(k) || tabs.filter(isDoc).length > 1) && <button className="tab-close" aria-label={t("ui.closeTab", { name: tabLabel(k) })} onClick={() => closeTab(k)}><Icon name="close" size={13} /></button>}
              </div>
            ))}
            <span className="spacer" />
            {project && <>
              <button className="icon-button" aria-pressed={settings.left} title={t("ui.leftPanel")} aria-label={t("ui.leftPanel")} onClick={() => updateSettings({ left: !settings.left })}><Icon name="panelLeft" size={16} /></button>
              <button className="icon-button" aria-pressed={settings.right} title={t("ui.rightPanel")} aria-label={t("ui.rightPanel")} onClick={() => updateSettings({ right: !settings.right })}><Icon name="panelRight" size={16} /></button>
            </>}
          </div>
          {error && <p className="error-banner" role="alert">{error}<button className="icon-button" aria-label={t("ui.close")} onClick={() => setError("")}><Icon name="close" size={14} /></button></p>}

          {/* the manuscript stays mounted: switching tabs never rebuilds the editor */}
          <div className="tab-body manuscript-tab" hidden={!project || !isDoc(tab)}>
            <div className="desk" ref={deskRef}>
              <div className="paper" onContextMenu={onContextMenu} onMouseDown={onPaperDown}>
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
              </div>
            </div>
            {editor && project && <SelectionBubble editor={editor} scheme={scheme} onCite={openQuickCite} />}
            {editor && project && finding && (
              <FindBar editor={editor} replace={finding.replace} focus={finding.focus} onClose={() => { setFinding(null); editor.commands.focus(); }}
                onReplaced={(count) => setMessage(t("ui.find.replaced", { count }))} />
            )}
          </div>

          {project && editor && tabs.filter(isTableTab).map((k) => (
            <div key={k} className="tab-body table-tab" hidden={tab !== k}>
              <TableTabView editor={editor} id={k.slice(6)} title={tabLabel(k)} onGone={() => tableGone(k)} />
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

          {!project && tab !== "settings" && (
            <div className="tab-body start">
              <div className="start-card">
                <h1>SciDesk</h1>
                <p className="muted">{t("noProject")}</p>
                <div className="start-actions">
                  <button className="btn primary" onClick={() => void openDemo()}>{t("demo")}</button>
                  <button className="btn" onClick={() => wordInput.current?.click()}>{t("fromWord")}</button>
                  {inTauri && <button className="btn" onClick={() => void open()}>{t("open")}</button>}
                  {!inTauri && hasPreviewProject() && <button className="btn" onClick={() => void reopenPreview()}>{t("reopenPreview")}</button>}
                </div>
                {!inTauri && <p className="muted small">{t("previewNote")}</p>}
                <p className="muted small">{t("ui.startLater")}</p>
              </div>
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
              {rightTab === "warnings" && <ChecksPanel report={report} onGo={goTo} onIgnore={ignore} onRestore={restore} showSections={showSections} />}
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
                  onOpenAuthors={() => { setAuthorsTab("authors"); openTab("authors"); }} />
              )}
            </div>
          </aside>
        )}
      </div>

      {message && (
        <div className="toast" role="status">
          <span>{message}{download && <> · <a href={download.url} download={download.name}><Icon name="download" size={14} /> {download.name}</a></>}</span>
          <button className="icon-button" aria-label={t("ui.close")} onClick={() => setMessage("")}><Icon name="close" size={14} /></button>
        </div>
      )}
      <StatusBar project={project} article={article} report={report} saving={saving} dirty={dirty} lastSaved={lastSaved}
        onStyle={(id) => void chooseStyle(id)} onChecks={() => showRight("warnings")} onWords={() => { setShowSections(true); showRight("warnings"); }}
        zoom={{ value: zoom, fit: settings.zoom === "fit", set: setZoom, step: zoomStep }}
        fontMode={settings.fontMode} onFontMode={() => updateSettings({ fontMode: settings.fontMode === "free" ? "journal" : "free" })} />

      {/* hidden file inputs, opened from the menus and buttons */}
      <input ref={wordInput} type="file" accept=".docx" hidden onChange={() => void fromWord()} aria-label={t("fromWord")} />
      <input ref={refsInput} type="file" accept=".ris,.nbib,.txt,.bib,.json" hidden onChange={() => void onRefs()} aria-label={t("importRefs")} />
      <input ref={figureInput} type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,.svg" hidden onChange={() => void insertFigure()} aria-label={t("ui.insertFigure")} />

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextItems()} label={t("ui.contextMenu")} onClose={() => setContextMenu(null)} />}
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
      {citing && project && <QuickCite library={project.library} initial={citing.items} uses={uses} onDone={finishCitation} onClose={closeQuickCite} />}
      {xrefOpen && <XrefPicker targets={targets} onPick={insertXref} onClose={() => { setXrefOpen(false); editor?.commands.focus(); }} />}
    </div>
  );
}

