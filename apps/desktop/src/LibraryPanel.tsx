// The library (PLAN 5.6, record 0037): see, search, edit and delete references, with how
// many times each one is cited. Since record 0044 it is a large view in its own tab, with
// its filters in the left panel (LibraryFilters) and the chosen reference in "Details".
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addReference, applyReferenceFields, emptyFields, FieldError, FORM_TYPES, LibraryError, referenceFields, searchLibrary, summarize, updateReference,
  type Project, type ReferenceFields,
} from "@scidesk/core";

type Editing = { id: string | null; fields: ReferenceFields; confirmDelete?: boolean };

const FIELDS: { key: keyof ReferenceFields; multiline?: boolean; for?: string[] }[] = [
  { key: "authors", multiline: true },
  { key: "title", multiline: true },
  { key: "container", for: ["article-journal", "chapter", "paper-conference", "article", "dataset", "webpage"] },
  { key: "containerShort", for: ["article-journal"] },
  { key: "issued" },
  { key: "volume", for: ["article-journal", "book", "chapter", "report"] },
  { key: "issue", for: ["article-journal"] },
  { key: "page", for: ["article-journal", "chapter", "paper-conference", "report"] },
  { key: "editors", multiline: true, for: ["chapter", "book", "paper-conference"] },
  { key: "edition", for: ["book", "chapter"] },
  { key: "publisher", for: ["book", "chapter", "report", "thesis", "paper-conference", "dataset"] },
  { key: "publisherPlace", for: ["book", "chapter", "report", "thesis", "paper-conference"] },
  { key: "ISBN", for: ["book", "chapter", "report"] },
  { key: "DOI" },
  { key: "PMID", for: ["article-journal", "article", "book", "chapter", "report"] },
  { key: "URL" },
  { key: "accessed", for: ["webpage", "dataset", "article"] },
];

export type LibraryFilter = "all" | "cited" | "uncited";

/** The library view's left panel: filters with their counts, and the imports. */
export function LibraryFilters({ project, uses, filter, onFilter, onImport }: {
  project: Project; uses: Map<string, number>; filter: LibraryFilter; onFilter: (f: LibraryFilter) => void; onImport: () => void;
}) {
  const { t, i18n } = useTranslation();
  const refs = project.library.references;
  const cited = refs.filter((r) => (uses.get(r.id) ?? 0) > 0).length;
  const counts: Record<LibraryFilter, number> = { all: refs.length, cited, uncited: refs.length - cited };
  // imports: references grouped by the file they came from
  const imports = new Map<string, { kind: string; date: string; n: number }>();
  for (const r of refs) {
    if (!r.source?.file) continue;
    const i = imports.get(r.source.file) ?? { kind: r.source.kind, date: r.source.date ?? r.added, n: 0 };
    i.n++;
    imports.set(r.source.file, i);
  }
  return (
    <nav className="navigator" aria-label={t("library")}>
      <div className="panel-head"><span className="panel-title">{t("library")}</span></div>
      <ul className="nav-tree">
        {(["all", "cited", "uncited"] as LibraryFilter[]).map((f) => (
          <li key={f}><button className={`nav-item level-1 filter-${f}${filter === f ? " active" : ""}`} aria-pressed={filter === f} onClick={() => onFilter(f)}>
            <span className="nav-label">{t(`ui.libraryFilters.${f}`)}</span><span className="nav-count">{counts[f]}</span>
          </button></li>
        ))}
      </ul>
      <div className="panel-head"><span className="panel-title">{t("ui.imports")}</span></div>
      {imports.size === 0 ? <p className="muted pad small">{t("ui.noImports")}</p> : (
        <ul className="nav-tree">
          {[...imports].map(([file, i]) => (
            <li key={file}><div className="nav-item level-1 static band-grey" title={file}><span className="nav-label">{file.split("/").pop()}<span className="muted small"> · {new Date(i.date).toLocaleDateString(i18n.language)}</span></span><span className="nav-count">{i.n}</span></div></li>
          ))}
        </ul>
      )}
      <div className="pad"><button className="btn" onClick={onImport}>{t("importRefs")}</button></div>
      <p className="muted pad small">{project.manifest.library.mode === "own" ? t("ui.ownLibrary") : t("zoteroLibrary")}</p>
    </nav>
  );
}

export function LibraryPanel({ project, version, uses, onChanged, onDelete, filter = "all", onSelect }: {
  project: Project;
  filter?: LibraryFilter;
  /** A reference was chosen: shown in "Details". */
  onSelect?: (id: string) => void;
  /** Bumped when the library changes in place. */
  version: number;
  uses: Map<string, number>;
  onChanged: (message: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; text: string } | null>(null);
  const [problem, setProblem] = useState("");
  const own = project.manifest.library.mode === "own";
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the library object changes in place
  const all = useMemo(() => searchLibrary(project.library, query, Infinity), [project, version, query]);
  const hits = all.filter(({ entry }) => filter === "all" || (filter === "cited") === (uses.get(entry.id) ?? 0) > 0);

  const start = (id: string | null) => {
    setFieldError(null); setProblem("");
    const r = id ? project.library.references.find((x) => x.id === id) : null;
    setEditing({ id, fields: r ? referenceFields(r.csl) : emptyFields() });
  };
  const set = (key: keyof ReferenceFields, value: string) => setEditing((e) => e && { ...e, fields: { ...e.fields, [key]: value }, confirmDelete: false });

  const save = async () => {
    if (!editing) return;
    setFieldError(null); setProblem("");
    try {
      const before = editing.id ? project.library.references.find((x) => x.id === editing.id)!.csl : { type: editing.fields.type };
      const csl = applyReferenceFields(before, editing.fields);
      if (editing.id) await updateReference(project, editing.id, csl);
      else await addReference(project, csl);
      setEditing(null);
      onChanged(t(editing.id ? "refSaved" : "refAdded"));
    } catch (e) {
      if (e instanceof FieldError) setFieldError({ field: e.field, text: t(`fieldErrors.${e.field}`) });
      else if (e instanceof LibraryError) setProblem(t(e.code === "duplicate" ? "refDuplicate" : "refCited", { detail: e.detail, count: Number(e.detail) }));
      else setProblem(e instanceof Error ? e.message : String(e));
    }
  };
  const remove = async () => {
    if (!editing?.id) return;
    if (!editing.confirmDelete) { setEditing({ ...editing, confirmDelete: true }); return; }
    try {
      await onDelete(editing.id);
      setEditing(null);
    } catch (e) {
      setEditing({ ...editing, confirmDelete: false });
      setProblem(e instanceof LibraryError ? t("refCited", { count: Number(e.detail) }) : String(e));
    }
  };

  if (editing) {
    const type = editing.fields.type;
    const r = editing.id ? project.library.references.find((x) => x.id === editing.id) : null;
    const n = editing.id ? uses.get(editing.id) ?? 0 : 0;
    return (
      <form className="ref-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <h2>{editing.id ? t("editReference") : t("newReference")}</h2>
        <label>{t("fields.type")}
          <select value={type} onChange={(e) => set("type", e.target.value)}>
            {!(FORM_TYPES as readonly string[]).includes(type) && <option value={type}>{type}</option>}
            {FORM_TYPES.map((k) => <option key={k} value={k}>{t(`types.${k}`)}</option>)}
          </select>
        </label>
        {FIELDS.filter((f) => !f.for || f.for.includes(type) || editing.fields[f.key]).map((f) => (
          <label key={f.key} className={fieldError?.field === f.key ? "invalid" : ""}>
            {t(`fields.${f.key}`)}
            {f.multiline
              ? <textarea rows={f.key === "authors" ? 3 : 2} value={editing.fields[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              : <input value={editing.fields[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
            {fieldError?.field === f.key && <span className="field-error" role="alert">{fieldError.text}</span>}
          </label>
        ))}
        {r?.source && <p className="muted">{t("refSource", { kind: t(`sources.${r.source.kind}`, { defaultValue: r.source.kind }), file: r.source.file ?? "" })}{r.source.unmapped ? ` · ${t("keptAsideFields", { fields: Object.keys(r.source.unmapped).join(", ") })}` : ""}</p>}
        {editing.id && <p className="muted">{n ? t("citedTimes", { count: n }) : t("notCited")}</p>}
        {problem && <p className="field-error" role="alert">{problem}</p>}
        <div className="dialog-actions">
          {editing.id && <button type="button" onClick={remove} disabled={n > 0} title={n ? t("cantDeleteCited") : undefined}>{editing.confirmDelete ? t("confirmDelete") : t("deleteRef")}</button>}
          <span className="spacer" />
          <button type="button" onClick={() => setEditing(null)}>{t("cancel")}</button>
          <button type="submit">{t("saveRef")}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="library">
      <div className="library-head">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchLibrary")} aria-label={t("searchLibrary")} />
        {own && <button onClick={() => start(null)}>{t("newReference")}</button>}
      </div>
      {!own && <p className="muted">{t("zoteroLibrary")}</p>}
      <p className="muted">{t("refCount", { shown: hits.length, total: project.library.references.length })}</p>
      <ul className="ref-list">
        {hits.map(({ entry }) => {
          const s = summarize(entry.csl);
          const n = uses.get(entry.id) ?? 0;
          return (
            <li key={entry.id}>
              <button className="ref-item" onClick={() => { onSelect?.(entry.id); if (own) start(entry.id); }}>
                <span><b>{s.authors || "—"}</b> {s.year ?? t("noDate")} <span className={n ? "cited" : "muted"}>· {n ? t("citedTimes", { count: n }) : t("notCited")}</span></span>
                <span className="result-title">{s.title}{s.container ? <span className="muted"> · {s.container}</span> : null}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
