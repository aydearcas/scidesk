// "Details" in the right panel (design proposal 3.3): what is selected. A citation: its
// references, page, prefix and suffix. A table or a figure: number, caption, notes, file and
// whether the text cites it (and the image). A reference: its card, how it comes out in the
// bibliography and where it is cited. The abstract and the title page, read-only.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { summarize, type ArticleOutline, type Project, type Rendering, type ReferenceUse } from "@scidesk/core";
import type { CiteItem } from "./QuickCite.tsx";

export type Selected =
  | { kind: "citation"; id: string; items: CiteItem[] }
  | { kind: "part"; id: string; part: "table" | "figure" }
  | { kind: "xref"; target: string }
  | { kind: "reference"; id: string }
  | { kind: "abstract"; lang: string }
  | { kind: "title-page" };

export function DetailsPanel({ selected, project, folder, outline, rendering, uses, onEditCitation, onGoCitation, onGoPart, onOpenReference, onExportTitlePage, onOpenAuthors }: {
  selected: Selected | null;
  project: Project;
  folder: string;
  outline: ArticleOutline | null;
  rendering: Rendering | null;
  uses: Map<string, ReferenceUse[]>;
  onEditCitation: () => void;
  onGoCitation: (id: string) => void;
  onGoPart: (id: string) => void;
  onOpenReference: (id: string) => void;
  onExportTitlePage: () => void;
  onOpenAuthors: () => void;
}) {
  const { t } = useTranslation();
  const byId = new Map(project.library.references.map((r) => [r.id, r]));
  const parts = [...(outline?.tables ?? []).map((p) => ({ ...p, kind: "table" as const })), ...(outline?.figures ?? []).map((p) => ({ ...p, kind: "figure" as const }))];
  const partOf = (id: string) => parts.find((p) => p.id === id);
  const [image, setImage] = useState<string | null>(null);
  const imagePath = selected?.kind === "part" ? partOf(selected.id)?.image : undefined;
  useEffect(() => {
    setImage(null);
    if (!imagePath) return;
    let url: string | null = null;
    void project.fs.readBytes(`articles/${folder}/${imagePath}`).then((b) => {
      if (!b) return;
      const type = /\.svg$/i.test(imagePath) ? "image/svg+xml" : /\.png$/i.test(imagePath) ? "image/png" : /\.jpe?g$/i.test(imagePath) ? "image/jpeg" : "";
      // TIFF cannot be shown by the web view: only its name
      if (!type) return;
      url = URL.createObjectURL(new Blob([b as BlobPart], { type }));
      setImage(url);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [imagePath, project, folder]);

  const refLine = (id: string) => {
    const r = byId.get(id);
    const s = summarize(r?.csl ?? { type: "article" });
    return <><b>{s.authors || "—"}</b> {s.year ?? t("noDate")} <span className="result-title">{s.title}{s.container ? <span className="muted"> · {s.container}</span> : null}</span></>;
  };
  const bibEntry = (id: string) => {
    const b = rendering?.bibliography.find((x) => x.ref === id);
    if (!b) return null;
    return <p className="bib-preview">{b.label && <span className="bib-label">{b.label}</span>}{b.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold ? 700 : undefined, fontStyle: r.italic ? "italic" : undefined, verticalAlign: r.sup ? "super" : r.sub ? "sub" : undefined, fontSize: r.sup || r.sub ? "smaller" : undefined }}>{r.text}</span>)}</p>;
  };

  if (!selected) return <div className="details empty-state"><p>{t("ui.detailsEmpty")}</p></div>;

  if (selected.kind === "citation") return (
    <div className="details">
      <h3>{t("ui.citation")} <span className="citation-chip">{rendering?.citations.get(selected.id)?.plain ?? "?"}</span></h3>
      <ol className="detail-list">
        {selected.items.map((it) => (
          <li key={it.ref}>
            <button className="link-block" onClick={() => onOpenReference(it.ref)}>{refLine(it.ref)}</button>
            {(it.prefix || it.locator || it.suffix) && <dl className="props">
              {it.prefix && <><dt>{t("prefix")}</dt><dd>{it.prefix}</dd></>}
              {it.locator && <><dt>{t("locator")}</dt><dd>{it.locator}</dd></>}
              {it.suffix && <><dt>{t("suffix")}</dt><dd>{it.suffix}</dd></>}
            </dl>}
          </li>
        ))}
      </ol>
      <div className="dialog-actions"><button className="btn" onClick={onEditCitation}>{t("ui.editCitation")}</button></div>
    </div>
  );

  if (selected.kind === "part" || selected.kind === "xref") {
    const id = selected.kind === "part" ? selected.id : selected.target;
    const p = partOf(id);
    if (!p) return <div className="details empty-state"><p>{t("ui.xrefMissing")}</p></div>;
    return (
      <div className="details">
        <h3>{t(p.kind === "table" ? "ui.tableN" : "ui.figureN", { n: p.number })}</h3>
        {selected.kind === "xref" && <p className="muted">{t("ui.xrefTo")}</p>}
        <dl className="props">
          <dt>{t("ui.caption")}</dt><dd>{p.caption || <span className="muted">{t("ui.noCaption")}</span>}</dd>
          <dt>{t("ui.notes")}</dt><dd>{p.notes}</dd>
          <dt>{t("ui.citedInText")}</dt><dd>{p.cited ? t("ui.yes") : <span className="warn-text">{t("ui.no")}</span>}</dd>
          <dt>{t("ui.file")}</dt><dd className="mono">{p.src}</dd>
          {p.image && <><dt>{t("ui.image")}</dt><dd className="mono">{p.image}</dd></>}
        </dl>
        {image && <img className="figure-preview" src={image} alt={p.caption} />}
        <p className="muted small">{t("ui.partEditLater")}</p>
        <div className="dialog-actions"><button className="btn" onClick={() => onGoPart(id)}>{t("ui.goToText")}</button></div>
      </div>
    );
  }

  if (selected.kind === "reference") {
    const r = byId.get(selected.id);
    if (!r) return <div className="details empty-state"><p>{t("ui.detailsEmpty")}</p></div>;
    const where = (uses.get(selected.id) ?? []).filter((u) => u.article === folder);
    return (
      <div className="details">
        <h3>{t("ui.reference")}</h3>
        <p>{refLine(selected.id)}</p>
        <h4>{t("ui.inBibliography")}</h4>
        {bibEntry(selected.id) ?? <p className="muted">{t("ui.notInBibliography")}</p>}
        <h4>{t("ui.citedAt", { count: where.length })}</h4>
        {where.length === 0 ? <p className="muted">{t("notCited")}</p> : (
          <ul className="detail-list">
            {where.map((u, i) => (
              <li key={u.citation}>
                {u.path === "manuscript/article.scidoc"
                  ? <button className="link" onClick={() => onGoCitation(u.citation)}>{t("ui.citationN", { n: i + 1 })} · {rendering?.citations.get(u.citation)?.plain ?? ""}</button>
                  : <span>{t("ui.citationN", { n: i + 1 })} · {t("inPart", { path: u.path })}</span>}
              </li>
            ))}
          </ul>
        )}
        {r.csl.DOI ? <p className="muted small">DOI {String(r.csl.DOI)}</p> : null}
      </div>
    );
  }

  if (selected.kind === "abstract") {
    const a = outline?.abstract.find((x) => x.lang === selected.lang);
    return (
      <div className="details">
        <h3>{t("ui.abstract")} · {selected.lang.toUpperCase()}</h3>
        {a?.text ? <p className="abstract-text">{a.text}</p> : <p className="muted">{t("ui.abstractEmpty")}</p>}
        {a?.keywords.length ? <p><b>{t("ui.keywords")}:</b> {a.keywords.join("; ")}</p> : null}
        <p className="muted small">{t("ui.abstractEditLater")}</p>
      </div>
    );
  }

  // the title page
  const art = project.articles.find((x) => x.folder === folder)!;
  return (
    <div className="details">
      <h3>{t("ui.titlePage")}</h3>
      <p>{t("ui.titlePageText", { count: art.authors.authors.length })}</p>
      <div className="dialog-actions">
        <button className="btn" onClick={onOpenAuthors}>{t("ui.editAuthors")}</button>
        <button className="btn primary" onClick={onExportTitlePage}>{t("ui.exportTitlePage")}</button>
      </div>
    </div>
  );
}
