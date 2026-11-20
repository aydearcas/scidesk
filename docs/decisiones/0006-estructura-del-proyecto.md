# 0006. Estructura del proyecto: archivos propios y resumen aparte

- **Fecha:** 20/11/2026
- **Estado:** aceptada. La organización en varios artículos por proyecto se decide en [0015](0015-varios-articulos-por-proyecto.md).
- **Preguntas del plan:** P8 y P9

## Qué se decide
- **Cada tabla es su propio archivo** en `tablas/`, y cada figura está en `figuras/`. Se integran en el documento y se editan también desde la vista del documento completo, no solo en su pestaña.
- **Documentos base de todo proyecto:** artículo, resumen, portada, carta de presentación, autores, contribuciones CRediT, declaraciones, material suplementario y respuesta a revisores.
- **El resumen y las palabras clave tienen un documento propio** (`manuscrito/resumen.scidoc`), en uno o dos idiomas.
- Las plantillas por tipo de artículo se hacen según avance el desarrollo, empezando por el original (IMRaD).

## Por qué
- Las tablas en archivos propios se pueden colocar en el texto o al final según la revista, reutilizar en el material suplementario y editar en su pestaña. Editarlas también dentro del documento completo es más natural para quien viene de Word.
- El resumen tiene reglas propias (límite de palabras, apartados, palabras clave) y a menudo se pide en dos idiomas, como en Reumatología Clínica.

## Qué se descartó
- Tablas guardadas dentro del documento, con la carpeta solo para copias exportadas.
- Resumen como una sección más del artículo.

## Consecuencias
- La vista del documento completo compone resumen, cuerpo, tablas y figuras; cualquier edición se guarda en el archivo correspondiente.
- El recuento de palabras y las comprobaciones del resumen van por separado.
- El archivo del material suplementario se llama `material-suplementario.scidoc`.
