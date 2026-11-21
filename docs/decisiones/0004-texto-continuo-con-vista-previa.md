# 0004. Texto continuo con vista previa paginada

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R30): la vista previa y el PDF se hacen con Typst.
- **Pregunta del plan:** P5

## Qué se decide
Se escribe en flujo continuo, como el "modo borrador" de Word, y la paginación se ve en una vista previa al lado o a demanda.

## Por qué
Para enviar a una revista importa el DOCX, no cómo se ve la página mientras se escribe. Paginar en vivo en un editor web es caro y da errores.

**Vista previa y PDF con Typst** (R30), integrado en el núcleo de Rust:
- Da el mismo resultado en Windows y en macOS.
- Numera las líneas, que es lo que piden las revistas para la revisión, y genera PDF etiquetado (admite PDF/UA-1 y PDF/A).
- Compila de forma incremental en milisegundos, así que la vista previa puede seguir al texto.
- Sabe en qué página y en qué línea cae cada elemento, lo que servirá para la lista de verificación EQUATOR.

## Qué se descartó
- Paginación en vivo, como la vista "Diseño de impresión" de Word.
- paged.js con la impresión a PDF del motor web: depende del motor, que es distinto en cada sistema.

## Consecuencias
- No hay paginación en vivo en el editor.
- Las citas y la bibliografía llegan a Typst ya formateadas por citeproc-js, como texto, para que el PDF y el DOCX coincidan. Hace falta un exportador propio del documento a Typst.
- **La vista previa no es Word.** La paginación del PDF de SciDesk no coincidirá con la del DOCX abierto en Word; la interfaz lo dice. Para una revista que limite páginas, la referencia es Word.
- El prototipo 4 de la fase 0 confirma la velocidad de la compilación incremental, los números de línea y el paso de las citas ya formateadas.
