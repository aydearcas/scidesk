# @scidesk/core

El núcleo sin interfaz de SciDesk (PLAN.md 6.1, R33): todo lo que no es pantalla. Funciona igual en Node (línea de comandos y pruebas) y dentro de la ventana de la aplicación, porque solo toca archivos a través de `ProjectFs` y lee estilos y locales a través de `CitationResources`.

Estado: **corte vertical de la fase 1** (R42, ficha [0032](../../docs/decisiones/0032-corte-vertical.md)). Abre y crea proyectos, numera citas con citeproc-js, exporta a DOCX con las marcas para coautores y una instantánea, e importa la copia devuelta como propuestas.

| Archivo | Qué hace |
|---|---|
| `src/fs.ts`, `src/node-fs.ts` | Acceso a archivos limitado a la carpeta del proyecto, con escritura atómica; en memoria y en disco |
| `src/project.ts`, `src/demo.ts` | Crear, abrir (normaliza y valida con `@scidesk/formats`) y guardar; proyecto de demostración |
| `src/citations.ts`, `src/resources.ts` | citeproc-js (commit fijo de su repositorio, sin modificar) y los estilos y locales incluidos (`assets/`) |
| `src/snapshot.ts` | Instantáneas en `.scidesk/history/` (formato **provisional**) |
| `src/docx-export.ts` | DOCX del manuscrito con la biblioteca `docx` y la plantilla `assets/reference.dotx`: resumen, tablas con notas, figuras, referencias cruzadas y el formato del perfil de revista; perfiles «coautores» (marcas, campos de Zotero con URI, propiedades) y «revista» (ficha 0033) |
| `src/docx-read.ts` | Lector del DOCX devuelto: párrafos, marcadores, citas como átomos y cambios marcados |
| `src/proposals.ts`, `src/round.ts` | Propuestas de la copia frente a la versión enviada, y la ronda en `rounds/<ronda>/` |
| `src/cli.ts` | Línea de comandos `scidesk` |

```powershell
npm test --workspace @scidesk/core
```

```powershell
node packages/core/src/cli.ts demo C:\ruta\a\una\carpeta\vacia
```

Después: `export`, `import <copia.docx> --by "<nombre>"`, `show <propuestas.json>` y `check`. Las pruebas con Word de verdad son locales: `tools/word-edit.ps1 <exportado.docx> <copia.docx> [ediciones.json]` hace ediciones de coautor, con y sin control de cambios, y `tools/word-inspect.ps1 <docx> <carpeta> [páginas]` abre el DOCX, comprueba que actualizar los campos no cambia nada y saca imágenes de páginas.
