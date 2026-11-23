# @scidesk/suggest-changes

Copia propia de [`@handlewithcare/prosemirror-suggest-changes`](https://github.com/handlewithcarecollective/prosemirror-suggest-changes) **0.1.8** (licencia MIT, `LICENSE`), la pieza del control de cambios del editor (ficha 0020, prototipo 7). Es la versión publicada en npm, la misma que probaron los prototipos 7, 8 y 11, tomada de `prototypes/07-track-changes/node_modules`; no se ha descargado de nuevo.

`src/` son los archivos de `dist/` del paquete publicado (JavaScript y tipos), con estos cambios:

1. **Un cambio nuevo solo se une al contiguo si lo permite el programa** (incidencia #26 del original). `setCanJoinSuggestion(fn)` en `replaceStep.js`; SciDesk solo une cambios del mismo autor. Es el mismo cambio que hacía `prototypes/07-track-changes/tools/patch-suggest-changes.mjs`.
2. **Las importaciones de `prosemirror-*` pasan a `@tiptap/pm/*`**, para que el editor y la pieza usen una sola copia de ProseMirror.
3. **El «¶» de un párrafo partido o unido lleva la clase `change-pilcrow`** (`decorations.js`), para que las vistas sin marcas lo oculten (ficha 0092).

Los cambios que SciDesk necesite después se anotan aquí, y se ofrecen al proyecto original.
