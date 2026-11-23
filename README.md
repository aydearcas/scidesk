# SciDesk

[![CI](https://github.com/aydearcas/scidesk/actions/workflows/ci.yml/badge.svg)](https://github.com/aydearcas/scidesk/actions/workflows/ci.yml)

Procesador de texto de escritorio para escribir artículos científicos. Cada artículo es una carpeta con su estructura: secciones, resumen por idioma, autores y contribuciones CRediT, tablas y figuras en su propio archivo, y referencias con estilos CSL. Exporta a Word para los coautores e importa sus copias devueltas como propuestas, y exporta a Word y PDF con el formato que pide cada revista.

*A desktop word processor for scientific articles: a project folder per article, authors and CRediT, tables and figures in their own files, CSL references, Word round trips with co-authors and journal-ready Word and PDF.*

> **Estado:** en desarrollo (fase 1). Todavía no hay versión para instalar.

## Desarrollo

Monorepo de npm con Tauri 2, React, Tiptap y Typst:

- `packages/formats`: esquemas de los formatos (`.scidesk`, `.scidoc`, `.scitable`, `.scifigure`).
- `packages/core`: núcleo sin interfaz y línea de órdenes `scidesk`.
- `packages/spell`: corrector ortográfico (Hunspell en WebAssembly).
- `apps/desktop`: la aplicación de escritorio.

Hace falta Node 24 y Rust estable.

```sh
npm ci
npm run ci          # tipos, compilación y todas las pruebas
cd apps/desktop && npx tauri dev
```

El plan está en [`PLAN.md`](PLAN.md) y las decisiones, en [`docs/decisiones/`](docs/decisiones/).

## Licencia

[AGPL-3.0-or-later](LICENSE). Las contribuciones necesitan un acuerdo de contribución (CLA). Los estilos CSL y los diccionarios incluidos tienen sus propias licencias, indicadas en sus carpetas.
