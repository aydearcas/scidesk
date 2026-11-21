// Minimal browser globals so a real EditorView can run under Node.
import { JSDOM } from "jsdom";

if (!globalThis.document) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
  globalThis.Node = w.Node;
  globalThis.Element = w.Element;
  globalThis.HTMLElement = w.HTMLElement;
  globalThis.MutationObserver = w.MutationObserver;
  globalThis.getSelection = w.getSelection.bind(w);
  globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
  // jsdom lacks layout; ProseMirror only needs these to exist.
  w.document.createRange = () => {
    const r = new w.Range();
    r.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
    r.getClientRects = () => [];
    return r;
  };
  w.HTMLElement.prototype.scrollIntoView = () => {};
}
