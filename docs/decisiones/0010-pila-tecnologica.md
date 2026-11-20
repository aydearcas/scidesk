# 0010. Pila tecnológica

- **Fecha:** 20/11/2026
- **Estado:** aceptada, a confirmar con los prototipos de la fase 0
- **Pregunta del plan:** P18

## Qué se decide
Tauri 2 (Rust) para la aplicación de escritorio, React + TypeScript + Vite para la interfaz, ProseMirror (vía Tiptap, solo piezas libres) como editor, citeproc-js como motor de citas y la biblioteca `docx` más un traductor propio para exportar a Word. El detalle está en PLAN.md, 6.1.

## Por qué
- Tauri da un instalador pequeño, seguro por diseño y con acceso nativo a archivos, en Windows y macOS.
- React tiene el ecosistema más grande y el que mejor se integra con el editor.
- ProseMirror es el estándar para documentos estructurados (nodos propios, tablas complejas, comentarios, control de cambios) y tiene integración madura con Yjs para la edición simultánea futura.
- citeproc-js es la implementación de referencia de CSL.

## Qué se descartó
- Electron: más homogéneo entre sistemas, pero mucho más pesado.
- Lexical, Slate, CKEditor 5 u ONLYOFFICE como editor.
- Pandoc en el núcleo (licencia GPL y menos control).

## Consecuencias
- Ninguna pieza de la pila es incompatible con las licencias candidatas (PLAN.md, 6.3).
- Los prototipos de la fase 0 (pegar tablas de Word, citeproc-js, exportar DOCX, vista paginada, Zotero, comparación de DOCX) confirman o corrigen esta decisión.
