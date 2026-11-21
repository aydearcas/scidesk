// The vertical slice's window (R42): open a project, write, cite, export a DOCX for
// co-authors and import the copy that comes back, with its proposals. No styled interface
// yet: that is the rest of phase 1.
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createDemoProject, exportDocx, exportTitlePage, importCopy, importReferences, loadProject, projectFromWord, renderCitations, saveDocument,
  type Project, type Rendering,
} from "@scidesk/core";
import { newId, type DocumentFile, type PMNode, type ProposalSetFile } from "@scidesk/formats";
import { citationLabels, extensions, refreshCitationLabels, refreshXrefLabels } from "./editor.ts";
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
  const [refChoice, setRefChoice] = useState("");
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
      const r = await renderCitations(project.library, [editor.getJSON() as PMNode], article.article.citationStyle.id, article.article.referenceTermsLang ?? article.article.lang, resources);
      refreshXrefLabels(editor.getJSON() as never);
      citationLabels.clear();
      for (const [id, c] of r.citations) citationLabels.set(id, c.plain);
      refreshCitationLabels();
      setRendering(r);
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
    setRefChoice(p.library.references[0]?.id ?? "");
  }, [editor]);
  useEffect(() => { void recompute(); }, [project, recompute]);

  const run = (f: () => Promise<void>) => async () => {
    setError("");
    try { await f(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
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
  const insertCitation = () => {
    if (!editor || !refChoice) return;
    editor.chain().focus().insertContent({ type: "citation", attrs: { id: newId("c"), items: [{ ref: refChoice }] } }).run();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- the library is changed in place by the import
  const refs = useMemo(() => [...(project?.library.references ?? [])], [project, libraryVersion]);
  const onRefs = run(async () => {
    const file = refsInput.current?.files?.[0];
    if (!file || !project) return;
    const r = await importReferences(project, { name: file.name, text: await file.text() });
    setLibraryVersion((v) => v + 1);
    if (!refChoice && r.added[0]) setRefChoice(r.added[0].id);
    setMessage(t("refsImported", { added: r.added.length, duplicates: r.duplicates.length, format: r.format.toUpperCase() }) + (r.unmapped.length ? ` — ${t("keptAside", { n: r.unmapped.length })}` : ""));
    if (refsInput.current) refsInput.current.value = "";
  });
  const refLabel = (id: string) => {
    const r = refs.find((x) => x.id === id);
    const a = r?.csl.author as { family?: string; literal?: string }[] | undefined;
    const year = (r?.csl.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0];
    return `${a?.[0]?.family ?? a?.[0]?.literal ?? "?"} ${year ?? ""} · ${String(r?.csl.title ?? "").slice(0, 60)}`;
  };

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
              <select value={refChoice} onChange={(e) => setRefChoice(e.target.value)} aria-label={t("chooseReference")}>
                {refs.map((r) => <option key={r.id} value={r.id}>{refLabel(r.id)}</option>)}
              </select>
              <button onClick={insertCitation} disabled={!refChoice}>{t("insertCitation")}</button>
              <label className="file-button">{t("importRefs")}<input ref={refsInput} type="file" accept=".ris,.nbib,.txt,.bib,.json" onChange={onRefs} /></label>
              <button onClick={exportAs("coauthors")}>{t("exportDocx")}</button>
              <button onClick={exportAs("journal")}>{t("exportJournal")}</button>
              <button onClick={exportAs("title-page")}>{t("exportTitlePage")}</button>
            </div>
            <EditorContent editor={editor} className="page" />
            {rendering && rendering.bibliography.length > 0 && (
              <ol className="bibliography">
                {rendering.bibliography.map((b) => <li key={b.ref} value={Number(b.label.replace(/\D/g, "")) || undefined}>{b.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, fontStyle: r.italic ? "italic" : undefined }}>{r.text}</span>)}</li>)}
              </ol>
            )}
          </section>
          <aside>
            <h2>{t("proposals")}</h2>
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
          </aside>
        </main>
      )}
      {message && <p className="message">{message}{download && <> · <a href={download.url} download={download.name}>{download.name}</a></>}</p>}
      <footer>{t("attribution")}</footer>
    </div>
  );
}
