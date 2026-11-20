# 0011. Fuentes tipográficas

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** ninguna (petición en los comentarios a la v0.2)

## Qué se decide
El programa permite usar todas las fuentes típicas de Word (Calibri, Aptos, Cambria, Times New Roman, Arial…) y Roboto:
- Usa las fuentes instaladas en el equipo.
- Incluye equivalentes libres con las mismas medidas para las de Microsoft: Carlito (Calibri), Caladea (Cambria), Liberation Serif (Times New Roman), Liberation Sans (Arial) y Liberation Mono (Courier New).
- Incluye Roboto, que es libre.
- La fuente se elige para el documento y para cada estilo, no párrafo a párrafo.

## Por qué
- Las revistas y los coautores esperan esas fuentes (Reumatología Clínica, por ejemplo, recomienda Arial o Times New Roman en las figuras).
- Las fuentes de Microsoft no se pueden distribuir con el programa, sea cual sea su licencia. En Windows ya están instaladas, pero en macOS Calibri y Cambria solo están con Office. Los equivalentes métricos hacen que el texto ocupe lo mismo y no cambien los saltos de línea.

## Qué se descartó
- Incluir las fuentes de Microsoft en el instalador (no está permitido).
- Formato de fuente libre en cada párrafo (va contra el principio de estructura antes que formato).

## Consecuencias
- El DOCX conserva el nombre original de la fuente; el PDF incrusta la fuente usada.
- El programa avisa cuando sustituye una fuente que falta por su equivalente.
