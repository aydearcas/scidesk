# Prototipo 7: control de cambios

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R31). Decisión resultante: [ficha 0020](../../docs/decisiones/0020-control-de-cambios.md).

## Pregunta

¿Qué pieza libre sirve de base para el control de cambios, `@handlewithcare/prosemirror-suggest-changes` (MIT) o `@manuscripts/track-changes-plugin`, y cómo se guardan los cambios en `.scidoc`? La pieza tiene que permitir escribir y borrar en modo de sugerencias, aceptar y rechazar, exportar a `w:ins` y `w:del` y volver a importar.

## Respuesta

**Se elige `@handlewithcare/prosemirror-suggest-changes`, en una copia propia con un cambio.** Los cambios se guardan como marcas `insertion`, `deletion` y `modification` con un `id` dentro del JSON de ProseMirror, y el autor y la fecha de cada `id` van en un registro `changes` al lado de `doc`, en el mismo `.scidoc`.

| | suggest-changes 0.1.8 | Manuscripts 2.4.0 |
|---|---|---|
| Licencia | MIT | Apache-2.0 |
| Tamaño | ~1.200 líneas, sin dependencias propias | ~3.100 líneas; exige además `@manuscripts/transform` (su esquema completo, con citeproc, lodash, JSZip…) |
| Acoplamiento al esquema | Ninguno: solo pide tres marcas | Atributo `dataTracked` en todos los nodos y marcas, y funciones que usan el esquema de Manuscripts directamente |
| Dependencias de ProseMirror | Como `peerDependencies` | Versiones exactas fijadas y doble carga del paquete (CommonJS y ES): hay que forzar una sola copia |
| 18 casos de edición (abajo) | **18/18** (17/18 sin la corrección del autor) | 15/18: no marca la unión de párrafos, al aceptar un borrado entre párrafos no los une y no marca el cambio de formato |
| Autor y fecha | No los guarda: solo un `id`. Los pone nuestra capa | Sí, dentro de cada marca y nodo (`authorID`, `createdAt`, `status`) |
| Tiempo por pulsación (8000 palabras, 100 cambios) | mediana 0,16 ms, p95 0,36 ms | mediana 0,37 ms, p95 0,63 ms |
| Mantenimiento | Activo (versión de octubre de 2026), 63 estrellas, 6 incidencias abiertas | Se publica en npm, pero el repositorio público no se actualiza desde 2023 |

Con suggest-changes y el modelo de abajo:
- **Ida y vuelta propia** (exportar a DOCX e importar lo exportado): **11/11** casos dan el mismo texto al aceptar todo y al rechazar todo, con los mismos autores.
- **Word real** abre los 11 DOCX exportados y reconoce cada cambio con su tipo, su autor y su texto; aceptar todo y rechazar todo en Word dan el mismo texto que en SciDesk: **11/11**.
- **Cambios hechos por Word** (Word de escritorio, por automatización: insertar, borrar, sustituir, partir y unir párrafos, negrita y escribir en una celda): se importan los 8 cambios con su autor, y aceptar todo y rechazar todo dan exactamente el mismo texto que en Word. Tras aceptar uno solo y volver a exportar, Word abre el archivo con los 7 restantes.

### Lo que hubo que añadir a suggest-changes

1. **Unir con el cambio vecino solo si es del mismo autor.** La pieza reutiliza el `id` del cambio contiguo (incidencia #26), así que lo que Luis escribe junto a una inserción de Ana quedaba atribuido a Ana. `tools/patch-suggest-changes.mjs` añade `setCanJoinSuggestion(fn)`; son tres líneas.
2. **Registro de autores** (`changes`): al aplicar cada transacción se asigna el autor actual a los `id` nuevos; al guardar se eliminan los que ya no están en el documento.
3. **Cambio de párrafo entero:** cuando se borra o se inserta un párrafo completo, la marca va en el nodo y no en el texto. La exportación lo convierte en todas las ejecuciones más la marca de párrafo, como hace Word.

### Cómo representa la pieza cada cambio (y cómo pasa a Word)

| En el editor | En `.scidoc` | En el DOCX |
|---|---|---|
| Texto insertado | marca `insertion {id}` | `<w:ins w:author w:date>` |
| Texto borrado | marca `deletion {id}` (el texto sigue en el documento) | `<w:del>` con `<w:delText>` |
| Párrafo partido (Intro) o unido (retroceso) | un espacio de anchura cero (U+200B) con la marca a cada lado del corte | marca de párrafo insertada o borrada: `<w:pPr><w:rPr><w:ins/>` o `<w:del/>` |
| Borrado de un párrafo al siguiente | el mismo `id` a los dos lados del corte | texto borrado y marca de párrafo borrada |
| Párrafo entero insertado o borrado | marca en el nodo del párrafo | todas las ejecuciones y la marca de párrafo |
| Cambio de formato (negrita) | `deletion` + `insertion` del mismo texto con el mismo `id` | `<w:rPrChange>` con el formato anterior |
| Cita insertada o borrada | marca en el nodo `citation` | por ahora, el texto de la cita dentro de `w:ins` o `w:del` (los campos de cita son del prototipo 3) |

Word da un `w:id` distinto a cada ejecución; al importar, las revisiones contiguas del mismo tipo, autor y fecha se agrupan en un solo cambio.

## Casos probados

Se ejecutan con un `EditorView` real sobre jsdom, despachando transacciones como lo haría el teclado: 01 insertar letra a letra (un solo cambio), 02 borrar una palabra, 03 retroceso letra a letra, 04 sustituir, 05 borrar dentro de la propia inserción (se borra de verdad), 06 otro autor borra mi inserción, 07 partir un párrafo, 08 unir dos párrafos, 09 borrar de un párrafo al siguiente, 10 insertar una cita, 11 borrar una cita, 12 negrita, 13 escribir en una celda de tabla, 14 dos autores (aceptar uno y rechazar otro), 14b dos autores contiguos, 14c borrar un párrafo entero, 15 guardar en JSON y volver a abrir, 16 deshacer un cambio marcado. En cada uno se comprueba el texto marcado, el resultado de aceptar todo y el de rechazar todo.

## Lo que este prototipo no cubre

- **Teclado real e integración con Tiptap.** Las transacciones se despachan desde código, no con Intro, Retroceso o un IME en un navegador. La incidencia #11 de suggest-changes (Intro seguido de Retroceso deja anclas sueltas; corrección propuesta en #35) se reproduce aquí. Se comprueba con el editor real en el prototipo 8 y en el corte vertical de la fase 1, que también tiene que encajar `withSuggestChanges` en el `dispatchTransaction` de Tiptap.
- **Comentarios** (`w:comment`), **cambios en la estructura de las tablas** (filas y columnas insertadas o borradas, `w:trPr/w:ins`), **movimientos** (`w:moveFrom`/`w:moveTo`, que por ahora se importarían como borrado más inserción) y cambios de estilo de párrafo (`w:pPrChange`). Quedan para la fase 2a.
- **Qué pasa cuando otro autor borra una inserción ajena:** la pieza la elimina sin dejar rastro (caso 06). Falta comprobar qué hace Word en ese caso y decidir en la fase 2 si hay que igualarlo.
- La exportación a DOCX de este prototipo está escrita a mano para probar la correspondencia; la de verdad usará la biblioteca `docx` (prototipo 3).

## Cómo se ejecuta

Requisitos: Node 24 y, para las pruebas con Word, Word de escritorio en Windows.

```powershell
npm install
npm run scenarios
```

`npm install` aplica la corrección de suggest-changes (`postinstall`). Otros comandos:

- `npm run edge`: los dos casos de las incidencias #26 y #11 en las dos piezas.
- `npm run json`: cómo guarda cada pieza el mismo par de cambios.
- `npm run roundtrip`: exporta los 11 casos a `out/export-*.docx` y comprueba la ida y vuelta propia.
- `node tools/build.mjs; node out/bench.mjs`: tiempo por pulsación.
- `powershell -ExecutionPolicy Bypass -File tools\run-word-checks.ps1`: todas las pruebas con Word (abre Word oculto; tarda unos minutos).

Los scripts se empaquetan con esbuild antes de ejecutarse para que las dos piezas compartan una sola copia de ProseMirror. La carpeta `out/` no se guarda en git. Atención: los DOCX que modifica Word llevan como autor el nombre de la cuenta de Office del equipo, no el de `Application.UserName`.

## Archivos

- `src/schema.js`: esquema reducido de `.scidoc` (párrafos con `id`, cita, negrita, cursiva y tabla) en las dos variantes, y el documento de partida.
- `src/adapters.js`: una interfaz común sobre las dos piezas, con el registro de autores de suggest-changes.
- `src/scenarios.js`, `src/edge-cases.js`, `src/bench.js`, `src/dump-json.js`: pruebas.
- `src/docx.js`: exportación e importación de `w:ins`, `w:del`, `w:rPrChange` y marcas de párrafo.
- `src/roundtrip.js`: ida y vuelta propia, comparación con Word e importación de lo que hace Word.
- `tools/word.ps1`: automatización de Word (inspeccionar y editar); restaura el nombre de usuario de Office al terminar.
- `tools/patch-suggest-changes.mjs`: la corrección de la unión entre autores.
