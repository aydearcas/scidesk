# 0067. Citar con el clic derecho en todas partes, y «omitir autor»

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise).
- **Pregunta del plan:** PLAN 5.6, «Cita rápida: un atajo de teclado o el clic derecho (en el texto, en una celda de tabla o en un pie de figura)» y «Prefijo, sufijo y localizador ("p. 12") y "omitir autor" en los estilos autor-año». Lo dejó pendiente la ficha 0037.

## Qué se decide
- **«Omitir autor»**, para cuando el autor ya está en la frase: «García (2019) mostró…».
  - En la cita rápida, cada referencia tiene la casilla «Omitir autor» junto al prefijo, la página y el sufijo. Su nombre sale tachado en la lista de la cita.
  - En el menú contextual de una cita, «Omitir autor» marcado o sin marcar, para todas las referencias de la cita a la vez. Un paso de deshacer.
  - En «Detalles» de la cita, la marca de cada referencia.
  - **Solo aparece con los estilos que ponen el autor** (`citation-format` «author-date» o «author» del estilo CSL). Con un estilo numérico no cambia nada y no se ofrece. Si una cita ya la tiene, se ofrece para poder quitarla, con un aviso de que ese estilo no pone el autor.
  - Se guarda como `suppressAuthor` en la cita, que ya estaba en el formato (ficha 0031). Llega igual al editor, al Word (con `suppress-author` en el campo de Zotero) y al PDF, porque todo pasa por citeproc-js.
- **El clic derecho cita también en la pestaña de la tabla.**
  - En el texto, las celdas y los pies del manuscrito ya se podía (fichas 0044 y 0045).
  - La pestaña de la tabla no tenía menú contextual. Ahora tiene el de una celda del manuscrito: filas, columnas, celdas, encabezado y notas, cita (insertar, editar, omitir autor, quitar), pendiente, cortar y copiar.
  - Ctrl+Mayús+C y «Citar» en la pestaña de la tabla ponen la cita en la tabla. Antes iban a donde estuviera el cursor en el manuscrito.
- **Con texto seleccionado, la cita va detrás del texto** y nunca en su lugar. Antes, «Cita» en la burbuja de selección sustituía las palabras seleccionadas por la cita.

## Por qué
- **La casilla solo con estilos autor-año:** con Vancouver es una opción que no hace nada. El formato de la cita se lee del propio estilo (también el del perfil de la revista), no de la lista de estilos incluidos.
- **Para toda la cita en el menú contextual:** lo normal es una cita de una sola referencia. Para omitir el autor de una referencia sí y de otra no, la cita rápida.
- **Detrás de la selección:** quien selecciona una frase y pulsa «Cita» quiere respaldarla, no borrarla.

## Qué se descartó
- **«Solo el autor» y el modo compuesto de citeproc-js** («García (2019)» generado por el programa): el texto pasaría a depender del estilo y no se podría escribir con libertad. Si se pide, se valora después.
- **Referencia cruzada en el menú de la pestaña de la tabla:** apunta a otra tabla o figura desde dentro de una tabla, cosa rara. Se sigue pudiendo desde el manuscrito.

## Consecuencias
- **Núcleo:** `citationFormat(xml)`, `omitsAuthor(format)` y `format` en el resultado de `renderCitations`.
- **Pruebas nuevas** en `packages/core/test/library.test.ts`:
  - el formato de los 18 estilos incluidos;
  - con APA, «omitir autor» deja «(2025)»;
  - con Elsevier Vancouver, el mismo número con o sin la marca.
- **Probado en la vista del navegador**, con el estilo APA:
  - en el menú contextual de una cita, «(Alonso & Benítez, 2025)» pasa a «(2025)»;
  - en la cita rápida, la casilla, el nombre tachado y la cita insertada «(2025)»;
  - con «estudio» seleccionado, la cita queda después de la palabra;
  - en la pestaña de la tabla, el menú contextual, la cita insertada en la celda (también en el manuscrito), «Omitir autor» y Ctrl+Z;
  - sin errores en la consola.
- **Sin probar** en la ventana de Tauri ni en WebKit.
