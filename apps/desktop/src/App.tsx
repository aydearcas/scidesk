// The vertical slice's window (R42): open a project, write, cite, export a DOCX for
// co-authors and import the copy that comes back, with its proposals. No styled interface
// yet: that is the rest of phase 1.
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BUNDLED_STYLES, createDemoProject, deleteReference, exportDocx, exportTitlePage, importCopy, importReferences, loadProject, projectFromWord,
  referenceUses, renderCitations, saveDocument, setCitationStyle, styleResources,
  type Project, type Rendering,
} from "@scidesk/core";
import { NodeSelection } from "@tiptap/pm/state";
import { newId, type DocumentFile, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { citationLabels, extensions, hooks, refreshCitationLabels, refreshXrefLabels } from "./editor.ts";
import { AuthorsDialog } from "./AuthorsDialog.tsx";
import { LibraryPanel } from "./LibraryPanel.tsx";
import { QuickCite, type CiteItem } from "./QuickCite.tsx";
import { inTauri, memoryFs, openFolder, resources } from "./platform.ts";

const BODY = "manuscript/article.scidoc";

const docxUrl = (bytes: Uint8Array) => URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));

export function App() {
  const { t, i18n } = useTranslation();
  const [project, setProject] = useState<Project | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rendering, setRendering] = useState<Rendering | null>(null);
  const [proposals, setProposals] = useState<ProposalSetFile | null>(null);
  const [returnedBy, setReturnedBy] = useState("");
  const [panel, setPanel] = useState<"library" | "proposals">("library");
  const [uses, setUses] = useState<Map<string, number>>(new Map());
  // the quick citation dialog: the citation being edited (its position), or a new one
  const [editingAuthors, setEditingAuthors] = useState(false);
  const [citing, setCiting] = useState<{ pos: number | null; items: CiteItem[] } | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refsInput = useRef<HTMLInputElement>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const article = project?.articles[0] ?? null;

  const editor = useEditor({
    extensions,
    content: { type: "doc", content: [] },
    onUpdate: () => setDirty(true),
    // a document with something the editor cannot show is an error, never a blank page
    enableContentCheck: true,
    onContentError: ({ error }) => setError(`${t("cannotShow")}: ${error.message}`),
  }, []);

  const recompute = useCallback(async () => {
    if (!project || !article || !editor) return;
    try {
      const doc = editor.getJSON() as PMNode;
      const r = await renderCitations(project.library, [doc], article.article.citationStyle.id, article.article.referenceTermsLang ?? article.article.lang, await styleResources(project, article, resources));
      refreshXrefLabels(doc as never);
      citationLabels.clear();
      for (const [id, c] of r.citations) citationLabels.set(id, c.runs);
      refreshCitationLabels();
      setRendering(r);
      // how often each reference is cited, with what is on screen and not saved yet
      setUses(new Map([...referenceUses(project, { [`${article.folder}/${BODY}`]: doc })].map(([id, u]) => [id, u.length])));
    } catch (e) {
      setError(String(e));
    }
  }, [project, article, editor]);

  // citations are renumbered after a pause (~200 ms, PLAN 7.6)
  useEffect(() => {
    if (!editor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onUpdate = () => { clearTimeout(timer); timer = setTimeout(recompute, 200); };
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); clearTimeout(timer); };
  }, [editor, recompute]);

  const show = useCallback(async (p: Project) => {
    setProject(p);
    setProposals(null);
    setError("");
    const doc = p.articles[0].documents.get(BODY)!.doc;
    editor?.commands.setContent(doc as never, { emitUpdate: false });
    setDirty(false);
  }, [editor]);
  useEffect(() => { void recompute(); }, [project, recompute]);

  const run = <A extends unknown[]>(f: (...a: A) => Promise<void>) => async (...a: A) => {
    setError("");
    try { await f(...a); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const save = async () => {
    if (!project || !article || !editor) return;
    const file = { ...article.documents.get(BODY)!, doc: editor.getJSON() } as unknown as DocumentFile;
    await saveDocument(project, article, BODY, file);
    setDirty(false);
    setMessage(t("saved"));
  };

  const openDemo = run(async () => show(await createDemoProject(memoryFs())));
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
    if (r) show(await loadProject(r.fs));
  });
  // quick citation: on a selected citation it edits that one, otherwise it inserts a new one
  const openQuickCite = useCallback(() => {
    if (!editor || !project) return;
    const sel = editor.state.selection;
    if (sel instanceof NodeSelection && sel.node.type.name === "citation") setCiting({ pos: sel.from, items: sel.node.attrs.items as CiteItem[] });
    else setCiting({ pos: null, items: [] });
  }, [editor, project]);
  useEffect(() => { hooks.quickCite = openQuickCite; }, [openQuickCite]);
  const finishCitation = (items: CiteItem[]) => {
    if (!editor || !citing) return;
    const pos = citing.pos;
    setCiting(null);
    if (pos === null) editor.chain().focus().insertContent({ type: "citation", attrs: { id: newId("c"), items } }).run();
    else editor.chain().focus().command(({ tr }) => { tr.setNodeMarkup(pos, undefined, { ...tr.doc.nodeAt(pos)!.attrs, items }); return true; }).run();
  };
  const closeQuickCite = () => { setCiting(null); editor?.commands.focus(); };
  const chooseStyle = run(async (id: string) => {
    if (!project || !article) return;
    await setCitationStyle(project, article.folder, id);
    await recompute();
  });
  const libraryChanged = (msg: string) => { setLibraryVersion((v) => v + 1); setMessage(msg); void recompute(); };
  const removeReference = async (id: string) => {
    if (!project || !article || !editor) return;
    await deleteReference(project, id, { [`${article.folder}/${BODY}`]: editor.getJSON() as PMNode });
    libraryChanged(t("refDeleted"));
  };
  const exportAs = (kind: "coauthors" | "journal" | "title-page") => run(async () => {
    if (!project || !article) return;
    await save();
    const r = kind === "title-page"
      ? { ...(await exportTitlePage(project, article.folder, resources)), snapshot: null }
      : await exportDocx(project, article.folder, kind, resources);
    // in the browser preview the file is offered as a link, never downloaded on its own
    if (!inTauri) setDownload({ url: docxUrl(r.bytes), name: r.path.split("/").pop()! });
    setMessage(t(r.snapshot ? "exported" : "exportedPlain", { path: r.path, snapshot: r.snapshot }) + (r.warnings.length ? ` — ${r.warnings.join("; ")}` : ""));
  });
  const onCopy = run(async () => {
    const file = fileInput.current?.files?.[0];
    if (!file || !project || !article) return;
    if (!returnedBy.trim()) { if (fileInput.current) fileInput.current.value = ""; throw new Error(t("needReturnedBy")); }
    const r = await importCopy(project, article.folder, new Uint8Array(await file.arrayBuffer()), { fileName: file.name, returnedBy: { name: returnedBy.trim() } });
    setProposals(r.set);
    if (fileInput.current) fileInput.current.value = "";
  });

  const onRefs = run(async () => {
    const file = refsInput.current?.files?.[0];
    if (!file || !project) return;
    const r = await importReferences(project, { name: file.name, text: await file.text() });
    setLibraryVersion((v) => v + 1);
    void recompute();
    setMessage(t("refsImported", { added: r.added.length, duplicates: r.duplicates.length, format: r.format.toUpperCase() }) + (r.unmapped.length ? ` — ${t("keptAside", { n: r.unmapped.length })}` : ""));
    if (refsInput.current) refsInput.current.value = "";
  });

  return (
    <div className="app">
      <header>
        <strong>SciDesk</strong>
        {inTauri && <button onClick={open}>{t("open")}</button>}
        <button onClick={openDemo}>{t("demo")}</button>
        <label className="file-button">{t("fromWord")}<input ref={wordInput} type="file" accept=".docx" onChange={fromWord} /></label>
        <span className="spacer" />
        <button onClick={() => void i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}>{t("language")}</button>
      </header>
      {!inTauri && <p className="note">{t("previewNote")}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!project ? <p className="empty">{t("noProject")}</p> : (
        <main>
          <section className="editor-column">
            <div className="toolbar">
              <button onClick={run(save)} disabled={!dirty}>{t("save")}</button>
              <span className="status">{dirty ? t("unsaved") : t("saved")}</span>
              <button onClick={openQuickCite} title={t("quickCiteShortcut")}>{t("cite")}</button>
              <select value={article!.article.citationStyle.id} onChange={(e) => void chooseStyle(e.target.value)} aria-label={t("citationStyle")} title={t("citationStyle")}>
                {!BUNDLED_STYLES.some((s) => s.id === article!.article.citationStyle.id) && <option value={article!.article.citationStyle.id}>{article!.article.citationStyle.id}</option>}
                {BUNDLED_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <label className="file-button">{t("importRefs")}<input ref={refsInput} type="file" accept=".ris,.nbib,.txt,.bib,.json" onChange={onRefs} /></label>
              <button onClick={exportAs("coauthors")}>{t("exportDocx")}</button>
              <button onClick={exportAs("journal")}>{t("exportJournal")}</button>
              <button onClick={() => setEditingAuthors(true)}>{t("authors")}</button>
              <button onClick={exportAs("title-page")}>{t("exportTitlePage")}</button>
            </div>
            <EditorContent editor={editor} className="page" />
            {rendering && rendering.bibliography.length > 0 && (
              <ol className="bibliography">
                {rendering.bibliography.map((b) => (
                  <li key={b.ref}>
                    {b.label && <span className="bib-label">{b.label}</span>}
                    <span>{b.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, fontStyle: r.italic ? "italic" : undefined, verticalAlign: r.sup ? "super" : r.sub ? "sub" : undefined, fontSize: r.sup || r.sub ? "smaller" : undefined }}>{r.text}</span>)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <aside>
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={panel === "library"} onClick={() => setPanel("library")}>{t("library")}</button>
              <button role="tab" aria-selected={panel === "proposals"} onClick={() => setPanel("proposals")}>{t("proposals")}</button>
            </div>
            {panel === "library" ? <LibraryPanel project={project} version={libraryVersion} uses={uses} onChanged={libraryChanged} onDelete={removeReference} /> : <>
            <label>{t("returnedBy")} <input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} /></label>
            <label className="file">{t("importCopy")} <input ref={fileInput} type="file" accept=".docx" onChange={onCopy} /></label>
            {proposals && (proposals.proposals.filter((p) => p.status !== "noise-hidden").length === 0
              ? <p>{t("noProposals")}</p>
              : (
                <ul className="proposals">
                  {proposals.proposals.filter((p) => p.status !== "noise-hidden").map((p) => (
                    <li key={p.id}>
                      <span className={p.tracked ? "tag tracked" : "tag"}>{p.tracked ? t("tracked") : t("untracked")}</span> <b>{p.author.name}</b> {t(`kinds.${p.kind}`)}
                      <div>{p.before && <del>{p.before}</del>} {p.after && <ins>{p.after}</ins>}</div>
                    </li>
                  ))}
                </ul>
              ))}
            {proposals && <p className="integrity">{proposals.integrity === "ok" ? t("integrityOk") : t("integrityBad")}</p>}
            </>}
          </aside>
        </main>
      )}
      {editingAuthors && project && article && (
        <AuthorsDialog project={project} folder={article.folder} onClose={() => setEditingAuthors(false)}
          onSaved={(n) => { setEditingAuthors(false); setMessage(n ? t("authorsSavedWarnings", { count: n }) : t("authorsSaved")); }} />
      )}
      {citing && project && <QuickCite library={project.library} initial={citing.items} uses={uses} onDone={finishCitation} onClose={closeQuickCite} />}
      {message && <p className="message">{message}{download && <> · <a href={download.url} download={download.name}>{download.name}</a></>}</p>}
      <footer>{t("attribution")}</footer>
    </div>
  );
}
