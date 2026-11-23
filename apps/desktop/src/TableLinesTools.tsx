// The table bar's lines (record 0076): the table's style, and Word's borders menu on the
// selected cells, with the pen (line style, width and colour) Word keeps while you work.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { EditorState } from "@tiptap/pm/state";
import { TABLE_STYLES } from "@scidesk/formats";
import { ContextMenu, FloatingPanel } from "./Menus.tsx";
import { Icon } from "./icons.tsx";
import { TEXT_COLORS } from "./Ribbon.tsx";
import { applyBorders, bordersState, pen, setTableStyle, tableLines, tableStyleAt, type BorderPreset, type Pen } from "./table-lines.ts";
import type { TableCommand } from "./TableTab.tsx";

/** Word's widths, in points. */
const WIDTHS = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];
const PRESETS: BorderPreset[] = ["bottom", "top", "left", "right", "none", "all", "outside", "inside", "insideH", "insideV"];

/** A border preset drawn as Word draws it: the cell's grid dotted, the sides it sets solid. */
function BorderIcon({ preset }: { preset: BorderPreset }) {
  const on = (s: "top" | "bottom" | "left" | "right" | "h" | "v") => ({
    top: ["top", "all", "outside"], bottom: ["bottom", "all", "outside"], left: ["left", "all", "outside"], right: ["right", "all", "outside"],
    h: ["all", "inside", "insideH"], v: ["all", "inside", "insideV"],
  })[s].includes(preset);
  const seg = (d: string, active: boolean) => <path d={d} stroke={active ? "currentColor" : "var(--gridline)"} strokeWidth={active ? 1.8 : 1} strokeDasharray={active ? undefined : "1.5 1.5"} />;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {seg("M2 2H16", on("top"))}{seg("M2 16H16", on("bottom"))}{seg("M2 2V16", on("left"))}{seg("M16 2V16", on("right"))}
      {seg("M2 9H16", on("h"))}{seg("M9 2V16", on("v"))}
    </svg>
  );
}

export function TableLinesTools({ state, run }: { state: EditorState | null; run: (cmd: TableCommand) => void }) {
  const { t } = useTranslation();
  const [styleAt, setStyleAt] = useState<{ x: number; y: number } | null>(null);
  const [bordersAt, setBordersAt] = useState<{ x: number; y: number } | null>(null);
  const [p, setP] = useState<Pen>({ ...pen });
  const current = state ? tableStyleAt(state) : undefined;
  // which presets the selected cells already have: marked, and taken away when pressed again
  const has = state ? bordersState(state) : null;
  const usable = (preset: BorderPreset) => !!has && (preset === "inside" ? has.innerH || has.innerV : preset === "insideH" ? has.innerH : preset === "insideV" ? has.innerV : true);
  const inTable = current !== undefined;
  const journal = tableLines.journalStyle;
  const styleName = (s: string) => t(`ui.tableStyle.${s}`);
  const at = (e: React.MouseEvent) => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left, y: r.bottom + 4 }; };
  const setPen = (patch: Partial<Pen>) => { Object.assign(pen, patch); setP({ ...pen }); };
  return (
    <div className="tool-group" role="group" aria-label={t("ui.tableBar.lines")}>
      <span className="tool-label" aria-hidden="true">{t("ui.tableBar.lines")}</span>
      {/* the borders menu first, with the "All borders" icon (as the user asked), then the styles */}
      <button className="tool borders-button" title={t("ui.borders.title")} aria-label={t("ui.borders.title")} aria-haspopup="dialog" disabled={!inTable}
        onMouseDown={(e) => e.preventDefault()} onClick={(e) => setBordersAt(bordersAt ? null : at(e))}>
        <BorderIcon preset="all" /><Icon name="chevronDown" size={12} />
      </button>
      <button className="tool both" title={t("ui.tableStyle.title")} aria-label={t("ui.tableStyle.title")} aria-haspopup="menu" disabled={!inTable}
        onMouseDown={(e) => e.preventDefault()} onClick={(e) => setStyleAt(styleAt ? null : at(e))}>
        <span className="tool-icon"><Icon name="table" size={17} /></span><span className="tool-text">{t("ui.tableStyle.button")}</span><Icon name="chevronDown" size={12} />
      </button>
      {/* in the document's body: the bar is a size container, which would hold and cut a fixed menu */}
      {styleAt && createPortal(
        <ContextMenu x={styleAt.x} y={styleAt.y} label={t("ui.tableStyle.title")} onClose={() => setStyleAt(null)} items={[
          { label: t("ui.tableStyle.asJournal", { name: styleName(journal ?? "three-line") }), checked: current === null, onSelect: () => run(setTableStyle(null)) },
          "-",
          ...TABLE_STYLES.map((s) => ({ label: styleName(s), checked: current === s, onSelect: () => run(setTableStyle(s)) })),
        ]} />, document.body,
      )}
      {bordersAt && createPortal(
        <FloatingPanel x={bordersAt.x} y={bordersAt.y} label={t("ui.borders.title")} onClose={() => setBordersAt(null)}>
          <div className="borders-panel">
            <div className="borders-presets">
              {PRESETS.map((preset) => (
                <button key={preset} className={`borders-preset${has?.active.has(preset) ? " on" : ""}`} aria-pressed={preset === "none" ? undefined : !!has?.active.has(preset)} disabled={!usable(preset)}
                  title={has?.active.has(preset) && preset !== "none" ? t("ui.borders.takeAway") : undefined}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => run(applyBorders(preset, p))}>
                  <BorderIcon preset={preset} /><span>{t(`ui.borders.${preset}`)}</span>
                </button>
              ))}
              <button className="borders-preset wide" onMouseDown={(e) => e.preventDefault()} onClick={() => run(applyBorders("reset", p))}>
                <Icon name="table" size={16} /><span>{t("ui.borders.reset")}</span>
              </button>
            </div>
            <div className="borders-pen" role="group" aria-label={t("ui.borders.pen")}>
              <label>{t("ui.borders.lineStyle")}
                <select value={p.style} onChange={(e) => setPen({ style: e.target.value as Pen["style"] })}>
                  {(["single", "double", "dashed", "dotted"] as const).map((s) => <option key={s} value={s}>{t(`ui.borders.styles.${s}`)}</option>)}
                </select>
              </label>
              <label>{t("ui.borders.width")}
                <select value={String(p.width)} onChange={(e) => setPen({ width: Number(e.target.value) })}>
                  {WIDTHS.map((w) => <option key={w} value={String(w)}>{t("ui.borders.points", { n: w.toLocaleString(undefined, { maximumFractionDigits: 2 }) })}</option>)}
                </select>
              </label>
              <div className="borders-colors" role="radiogroup" aria-label={t("ui.borders.color")}>
                <span className="borders-color-label">{t("ui.borders.color")}</span>
                {[["#000000", "auto"] as [string, string], ...TEXT_COLORS].map(([hex, key]) => (
                  <button key={hex} role="radio" aria-checked={p.color.toUpperCase() === hex.toUpperCase()} className={`swatch${p.color.toUpperCase() === hex.toUpperCase() ? " on" : ""}`} style={{ background: hex }}
                    title={key === "auto" ? t("colorAuto") : t(`colors.${key}`)} aria-label={key === "auto" ? t("colorAuto") : t(`colors.${key}`)} onMouseDown={(e) => e.preventDefault()} onClick={() => setPen({ color: hex })} />
                ))}
              </div>
              <div className="borders-sample" aria-hidden="true" style={{ borderBottom: `${p.style === "double" ? Math.max(3, p.width * 4) : Math.max(1, p.width * 1.6)}px ${p.style === "single" ? "solid" : p.style} ${p.color}` }} />
            </div>
          </div>
        </FloatingPanel>, document.body,
      )}
    </div>
  );
}
