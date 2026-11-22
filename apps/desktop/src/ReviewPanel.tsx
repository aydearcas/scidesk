// "Review" in the right panel (design proposal 3.3, record 0044): in phase 1, the proposals
// of a copy returned by a co-author (record 0032); comments and the merge come in phase 2,
// in this same tab.
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProposalSetFile } from "@scidesk/formats";

export function ReviewPanel({ proposals: got, onImport }: { proposals: { set: ProposalSetFile; name: string } | null; onImport: (file: File, returnedBy: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [returnedBy, setReturnedBy] = useState("");
  const [problem, setProblem] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const proposals = got?.set ?? null;
  const shown = proposals?.proposals.filter((p) => p.status !== "noise-hidden") ?? [];
  const onFile = async () => {
    const file = input.current?.files?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!returnedBy.trim()) { setProblem(t("needReturnedBy")); return; }
    setProblem("");
    try { await onImport(file, returnedBy.trim()); } catch (e) { setProblem(e instanceof Error ? e.message : String(e)); }
  };
  return (
    <div className="review">
      <p className="muted small">{t("ui.reviewIntro")}</p>
      <label className="field">{t("returnedBy")}<input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} /></label>
      <label className={`file-button btn${returnedBy.trim() ? "" : " disabled"}`}>{t("importCopy")}<input ref={input} type="file" accept=".docx" onChange={() => void onFile()} aria-label={t("importCopy")} /></label>
      {problem && <p className="field-error" role="alert">{problem}</p>}
      {proposals && (
        <>
          <h4>{t("ui.proposalsOf", { name: got!.name, count: shown.length })}</h4>
          {shown.length === 0 ? <p className="muted">{t("noProposals")}</p> : (
            <ul className="proposals">
              {shown.map((p) => (
                <li key={p.id} className="card">
                  <div><span className={p.tracked ? "tag tracked" : "tag"}>{p.tracked ? t("tracked") : t("untracked")}</span> <b>{p.author.name}</b> {t(`kinds.${p.kind}`)}</div>
                  <div>{p.before && <del>{p.before}</del>} {p.after && <ins>{p.after}</ins>}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="integrity muted small">{proposals.integrity === "ok" ? t("integrityOk") : t("integrityBad")}</p>
        </>
      )}
      {!proposals && <p className="muted empty-state">{t("ui.reviewEmpty")}</p>}
    </div>
  );
}
