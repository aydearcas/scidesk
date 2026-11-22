// The paginated preview beside the editor (interface proposal 4.7, records 0024 and 0058):
// the journal's PDF as Typst lays it out, from what is on screen, saved or not. It is
// recompiled after each pause in typing (the window's checks already wait for one); only the
// pages in sight are drawn, at the pane's width. A click on a page takes the editor to the
// paragraph there; the page of the paragraph with the cursor is brought into sight. Word's
// pagination may differ, and the pane says so.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TypstBundle } from "@scidesk/core";
import { previewCompile, previewPage, type PreviewOut } from "./platform.ts";

/** What the figures' files are, to send them only when they change. */
const filesKey = (files: Record<string, Uint8Array>) => Object.entries(files).map(([k, v]) => `${k}:${v.byteLength}`).sort().join("|");

export function PreviewPane({ available, tick, bundle, cursorBlocks, onGoToBlock }: {
  /** Typst runs in the desktop app; the browser preview has no Rust side. */
  available: boolean;
  /** Bumped after each pause in typing: time to compile again. */
  tick: number;
  /** The Typst source of the article on screen. */
  bundle: () => Promise<TypstBundle | null>;
  /** Ids around the cursor, innermost first: the first one the preview knows is followed. */
  cursorBlocks: string[];
  onGoToBlock: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [out, setOut] = useState<PreviewOut | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [images, setImages] = useState<Map<number, { url: string; version: number }>>(new Map());
  const [width, setWidth] = useState(0);
  const sentFiles = useRef<string | null>(null);
  const busy = useRef(false);
  const again = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const visible = useRef(new Set<number>());
  const pageEls = useRef(new Map<number, HTMLDivElement>());
  const inflight = useRef(new Set<string>());

  // compile: one at a time; a tick during a compilation runs one more afterwards
  const compile = useCallback(async () => {
    if (!available) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    try {
      const b = await bundle();
      if (!b) return;
      const key = filesKey(b.files);
      const r = await previewCompile(b.source, key === sentFiles.current ? null : b.files);
      sentFiles.current = key;
      setOut(r);
      setVersion((v) => v + 1);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; void compile(); }
    }
  }, [available, bundle]);
  useEffect(() => { void compile(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pane's width decides the pages' scale
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pageWidth = Math.max(120, width - 32);

  // draw the pages in sight that are older than the last compilation
  const draw = useCallback(async () => {
    if (!out || !pageWidth) return;
    for (const i of [...visible.current].sort((a, b) => a - b)) {
      const have = images.get(i);
      const job = `${version}:${i}:${pageWidth}`;
      if ((have && have.version === version) || inflight.current.has(job)) continue;
      inflight.current.add(job);
      const [w] = out.sizes[i] ?? [595];
      const ppp = (pageWidth * (window.devicePixelRatio || 1)) / w;
      try {
        const url = URL.createObjectURL(await previewPage(i, ppp));
        setImages((m) => {
          const next = new Map(m);
          const old = next.get(i);
          if (old) URL.revokeObjectURL(old.url);
          next.set(i, { url, version });
          return next;
        });
      } catch { /* a page that no longer exists */ } finally { inflight.current.delete(job); }
    }
  }, [out, version, pageWidth, images]);
  useEffect(() => { void draw(); }, [version, pageWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  // which pages are in sight (with a margin, so scrolling finds them drawn)
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = Number((e.target as HTMLElement).dataset.page);
        if (e.isIntersecting) visible.current.add(i); else visible.current.delete(i);
      }
      void draw();
    }, { root, rootMargin: "600px 0px" });
    for (const el of pageEls.current.values()) io.observe(el);
    return () => io.disconnect();
  }, [out?.pages, draw]);

  // free the images when the pane goes
  useEffect(() => () => { for (const im of images.values()) URL.revokeObjectURL(im.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the page of the paragraph with the cursor comes into sight
  const cursorPage = (() => {
    if (!out) return null;
    for (const id of cursorBlocks) {
      const b = out.blocks.find((x) => x[0] === id);
      if (b) return b[1] - 1;
    }
    return null;
  })();
  useEffect(() => {
    if (cursorPage === null) return;
    const el = pageEls.current.get(cursorPage);
    const root = scroller.current;
    if (!el || !root) return;
    const r = el.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    if (r.bottom < box.top + 40 || r.top > box.bottom - 40) el.scrollIntoView({ block: "nearest" });
  }, [cursorPage]);

  // a click on a page: the last block that starts above the point, on that page or before
  const onPageClick = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!out) return;
    const r = e.currentTarget.getBoundingClientRect();
    const [, h] = out.sizes[i] ?? [595, 842];
    const y = ((e.clientY - r.top) / r.height) * h;
    let best: [string, number, number] | null = null;
    for (const b of out.blocks) {
      if (b[1] - 1 < i || (b[1] - 1 === i && b[2] <= y + 2)) {
        if (!best || b[1] > best[1] || (b[1] === best[1] && b[2] >= best[2])) best = b;
      }
    }
    if (best) onGoToBlock(best[0]);
  };

  if (!available) return <aside className="preview-pane"><p className="muted preview-note">{t("ui.preview.desktopOnly")}</p></aside>;
  return (
    <aside className="preview-pane" aria-label={t("ui.preview.title")}>
      <div className="preview-head">
        <b>{t("ui.preview.title")}</b>
        <span className="muted small">{out ? t("ui.preview.pages", { count: out.pages }) : t("ui.preview.composing")}{out ? ` · ${out.ms < 1 ? "<1" : Math.round(out.ms).toLocaleString(i18n.language)} ms` : ""}</span>
      </div>
      <p className="muted small preview-note">{t("ui.preview.note")}</p>
      {error && <p className="field-error small preview-note" role="alert">{t("ui.preview.error")}: {error}</p>}
      <div className="preview-pages" ref={scroller}>
        {out?.sizes.map(([w, h], i) => {
          const im = images.get(i);
          return (
            <div key={i} data-page={i} className={`preview-page${cursorPage === i ? " current" : ""}`} style={{ width: pageWidth, height: (pageWidth * h) / w }}
              ref={(el) => { if (el) pageEls.current.set(i, el); else pageEls.current.delete(i); }} onClick={(e) => onPageClick(i, e)}
              title={t("ui.preview.clickHint")}>
              {im && <img src={im.url} alt={t("ui.preview.page", { n: i + 1 })} draggable={false} />}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
