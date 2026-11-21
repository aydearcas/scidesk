// The library panel (PLAN 5.6, record 0037): see, search, edit and delete references, with
// how many times each one is cited. Minimal: its place in the interface (side panel,
// concept navigator, own tab) waits for the interface decisions (D1–D8).
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

export function LibraryPanel({ project, version, uses, onChanged, onDelete }: {
  project: Project;
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
  const hits = useMemo(() => searchLibrary(project.library, query, Infinity), [project, version, query]);

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
              <button className="ref-item" onClick={() => own && start(entry.id)} disabled={!own}>
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
