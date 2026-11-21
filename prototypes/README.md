# Prototipos de la fase 0

Prototipos desechables de PLAN.md, sección 8. Cada uno responde a una pregunta concreta, vive en su carpeta `NN-nombre/` con un README (pregunta, cómo se ejecuta y respuesta) y deja su respuesta en una ficha de [`docs/decisiones/`](../docs/decisiones/). Su código no se reutiliza en el programa.

Orden aprobado el 21/11/2026: primero los que fijan el formato, después los que deciden entre Tauri y Electron (las tres condiciones de PLAN.md, 6.1) y al final el resto.

| Orden | N.º | Prototipo | Necesita | Estado | Ficha |
|---|---|---|---|---|---|
| 1 | 7 | [Control de cambios](07-track-changes/) | — | Hecho | [0020](../docs/decisiones/0020-control-de-cambios.md) |
| 2 | 8 | [Documento compuesto](08-composite-document/) | — | Hecho | [0021](../docs/decisiones/0021-documento-compuesto.md) |
| 3 | 1 | [Pegar tablas de Word](01-paste-word-tables/) | Tablas reales del usuario (recibidas) | Hecho (con Ctrl+V real) | [0022](../docs/decisiones/0022-pegar-tablas-de-word.md) |
| 4 | 11 | Repetir el 1 y la edición básica en el MacBook | El MacBook Air | Pendiente (aplazado al 22/11, cuando el usuario tenga el Mac; incluye el corrector en WKWebView) | |
| 5 | 9 | [Corrector ortográfico](09-spellcheck/) | — | Hecho | [0023](../docs/decisiones/0023-corrector-ortografico.md) |
| 6 | 4 | [Vista previa y PDF con Typst](04-typst-preview/) | — | Hecho | [0024](../docs/decisiones/0024-vista-previa-y-pdf-con-typst.md) |
| — | | **Decisión Tauri o Electron** | | | |
| 7 | 3 | DOCX con marcas y campos | — | Pendiente | |
| 8 | 2 | citeproc-js y estilos | — | Pendiente | |
| 9 | 5 | Zotero por su API local | Zotero instalado | Pendiente | |
| 10 | 10 | Importar un Word con citas | Word del usuario con citas (recibidos: EndNote) | Pendiente | |
| 11 | 6 | Fusión de tres copias devueltas | Ronda sintética en [`corpus/synthetic-round-knee-oa/`](corpus/synthetic-round-knee-oa/) (hecha; sin copia de LibreOffice, que no está instalado) | Pendiente | |
