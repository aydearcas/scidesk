# @scidesk/core

El núcleo sin interfaz de SciDesk (PLAN.md 6.1, R33): todo lo que no es pantalla. Funciona igual en Node (línea de comandos y pruebas) y dentro de la ventana de la aplicación, porque solo toca archivos a través de `ProjectFs` y lee estilos y locales a través de `CitationResources`.

Estado: **corte vertical de la fase 1** (R42, ficha [0032](../../docs/decisiones/0032-corte-vertical.md)). Abre y crea proyectos, numera citas con citeproc-js, exporta a DOCX con las marcas para coautores y una instantánea, e importa la copia devuelta como propuestas.

| Archivo | Qué hace |
|---|---|
| `src/fs.ts`, `src/node-fs.ts` | Acceso a archivos limitado a la carpeta del proyecto, con escritura atómica; en memoria y en disco |
| `src/project.ts`, `src/demo.ts` | Crear, abrir (normaliza y valida con `@scidesk/formats`) y guardar; proyecto de demostración |
| `src/citations.ts`, `src/resources.ts` | citeproc-js (commit fijo de su repositorio, sin modificar) y los 18 estilos (`assets/styles/`, con su procedencia en el README de esa carpeta, catálogo en `BUNDLED_STYLES`) y locales incluidos |
| `src/snapshot.ts` | Instantáneas en `.scidesk/history/` (formato **provisional**) |
| `src/docx-export.ts` | DOCX del manuscrito con la biblioteca `docx` y la plantilla `assets/reference.dotx`: resumen, tablas con notas, figuras, referencias cruzadas y el formato del perfil de revista; perfiles «coautores» (marcas, campos de Zotero con URI, propiedades) y «revista» (ficha 0033) |
| `src/paste-table.ts` | Una tabla pegada desde Word (datos que lee la ventana) como `.scitable` con pie, notas y llamadas (ficha 0042) |
| `src/checks.ts` | Comprobaciones antes del envío: límites, palabras por sección, pendientes y elementos sin citar, con avisos ignorables (ficha 0041) |
| `src/project.ts` (`addArticle`) | Otro artículo en el mismo proyecto, con la biblioteca y las personas en común (ficha 0044) |
| `src/outline.ts` | Lo que enseña el navegador por conceptos (título, tablas y figuras numeradas con pie y si se citan, resumen por idioma), y añadir una tabla vacía o una figura desde una imagen (ficha 0044) |
| `src/typst-export.ts` | Fuente de Typst del manuscrito para la revista y `exportPdf` con un compilador que se le da: Rust en la ventana, `scidesk-pdf` en Node (ficha 0040) |
| `src/title-page.ts` | Portada aparte desde `authors.json` y `people.json` (ficha 0034) |
| `src/recovery.ts` | Registro de cambios sin guardar en la carpeta local de datos de cada equipo (`LocalStore`) y su recuperación al abrir (ficha 0039) |
| `src/authorship.ts` | Directorio de personas y lista de autores de cada artículo: edición, CRediT, comprobación conjunta y guardado de los dos archivos a la vez (ficha 0038) |
| `src/library-import.ts` | Importar RIS, NBIB, BibTeX y CSL-JSON a la biblioteca propia, con duplicados (ficha 0035) |
| `src/library.ts` | Usos de cada referencia, búsqueda rápida, campos del formulario, añadir, editar y borrar, y estilo del artículo (ficha 0037) |
| `src/word-import.ts` | Nuevo artículo a partir de un Word (ficha 0036) |
| `src/docx-read.ts` | Lector del DOCX devuelto: párrafos, marcadores, citas como átomos y cambios marcados |
| `src/proposals.ts`, `src/round.ts` | Propuestas de la copia frente a la versión enviada, y la ronda en `rounds/<ronda>/` |
| `src/cli.ts` | Línea de comandos `scidesk` |

```powershell
npm test --workspace @scidesk/core
```

```powershell
node packages/core/src/cli.ts demo C:\ruta\a\una\carpeta\vacia
```

Para un Word existente: `node packages/core/src/cli.ts from-word <carpeta vacía> <archivo.docx>`. Después: `refs <archivo>`, `export` (`--profile coauthors`, `journal`, `title-page` o `pdf`; el PDF necesita `cargo build --bin scidesk-pdf --manifest-path apps/desktop/src-tauri/Cargo.toml`), `import <copia.docx> --by "<nombre>"`, `show <propuestas.json>`, `check`, `library [--search <palabras>]`, `ref-delete <id>`, `style <estilo>`, `authors`, `recover [--apply|--discard]` e `ignore <id> [--as …] [--restore]`; `scidesk styles` lista los estilos incluidos. Las pruebas con Word de verdad son locales: `tools/word-edit.ps1 <exportado.docx> <copia.docx> [ediciones.json]` hace ediciones de coautor, con y sin control de cambios, y `tools/word-inspect.ps1 <docx> <carpeta> [páginas]` abre el DOCX, comprueba que actualizar los campos no cambia nada y saca imágenes de páginas.
