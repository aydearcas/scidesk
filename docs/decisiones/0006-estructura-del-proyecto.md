# 0006. Estructura del proyecto: archivos propios y resumen aparte

- **Fecha:** 20/11/2026
- **Estado:** aceptada. La organización en varios artículos por proyecto se decide en [0015](0015-varios-articulos-por-proyecto.md). Actualizada el 21/11/2026 con la revisión de la v0.4 (R11 y R32).
- **Preguntas del plan:** P8 y P9

## Qué se decide
- **Cada tabla es su propio archivo** en `tables/`, y cada figura está en `figures/` (nombres en inglés desde P24, [0005](0005-alcance-e-idiomas.md)). Se integran en el documento y se editan también desde la vista del documento completo, no solo en su pestaña.
- **Documentos base de todo proyecto:** artículo, resumen, portada, carta de presentación, autores, contribuciones CRediT, declaraciones, material suplementario y respuesta a revisores.
- **El resumen y las palabras clave tienen un documento propio** (`manuscript/abstract.scidoc`), en uno o dos idiomas.
- Las plantillas por tipo de artículo se hacen según avance el desarrollo, empezando por el original (IMRaD).

## Por qué
- Las tablas en archivos propios se pueden colocar en el texto o al final según la revista, reutilizar en el material suplementario y editar en su pestaña. Editarlas también dentro del documento completo es más natural para quien viene de Word.
- El resumen tiene reglas propias (límite de palabras, apartados, palabras clave) y a menudo se pide en dos idiomas, como en Reumatología Clínica.

## Qué se descartó
- Tablas guardadas dentro del documento, con la carpeta solo para copias exportadas.
- Resumen como una sección más del artículo.

## Consecuencias
- La vista del documento completo compone resumen, cuerpo, tablas y figuras; cualquier edición se guarda en el archivo correspondiente.
- **Documento compuesto (R32).** Como un editor de ProseMirror trabaja sobre un único árbol, se compone al cargar y se reparte al guardar: en memoria hay un solo documento, y la capa de guardado escribe cada parte en su archivo. La pestaña propia de una tabla es otra vista de esa misma parte. Así, deshacer, buscar, el control de cambios, la fusión y la numeración de las citas dentro de las tablas funcionan como en un solo documento. Se descartó un editor anidado por tabla, que convierte cada tabla en una isla y obliga a duplicar el control de cambios. Se prueba en la fase 0 (prototipo 8).
- **Las notas de tabla son objetos (R11):** las llamadas (ᵃ, ᵇ, ᶜ) no guardan su letra, que se calcula, y una nota se puede usar en varias celdas. Se fija al especificar `.scitable`.
- El recuento de palabras y las comprobaciones del resumen van por separado.
- El archivo del material suplementario se llama `supplementary-material.scidoc`.
