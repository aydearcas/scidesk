# 0073. Alineación y cita en bloque

- **Fecha:** 23/11/2026
- **Estado:** hecha; falta que el usuario la vea en la ventana (segundo paso de la cinta, que quería revisar por pasos).
- **Pregunta del plan:** lo menor del editor de la fase 1 (CLAUDE.md, punto 4): alineación y cita en bloque en la cinta.

## Qué se decide
- **Alineación de un bloque de texto** (párrafo, título de sección y título del artículo):
  - atributo nuevo y opcional `align` (`center`, `right` o `justify`); sin él, a la izquierda o como diga la revista;
  - en la cinta, **Alinear a la izquierda**, **Centrar**, **Alinear a la derecha** y **Justificar**, sobre todos los bloques de la selección, con el botón activo marcado;
  - **atajos como Word**:
    - «Word en español»: Ctrl+Q, Ctrl+T, Ctrl+D y Ctrl+J;
    - «Internacional»: Ctrl+L, Ctrl+E, Ctrl+R y Ctrl+J;
    - figuran también en la tabla de atajos de Ajustes;
  - **en una tabla**, los mismos botones y atajos alinean las celdas (izquierda, centro, derecha), como la barra de la tabla; justificar no se aplica a las celdas;
  - en el Word, `w:jc`; en el PDF, `#align(…)` o `#par(justify: true)`;
  - **«Nuevo desde Word»** lee los párrafos y títulos centrados o a la derecha. El justificado no lo lee: en un manuscrito suele ir en todo el texto y lo decide la revista (`manuscriptFormat.justified`).
- **Cita en bloque** (nodo nuevo `blockquote`, como `disp-quote` de JATS):
  - uno o más párrafos sangrados 1,25 cm por los dos lados, en letra normal;
  - en el editor llevan además una línea fina a la izquierda, solo para reconocerlos;
  - el botón **Cita en bloque** de la cinta mete o saca de la cita los párrafos de la selección;
  - en el Word, cada párrafo con el estilo «Cita» (Quote) de la plantilla, ajustado al exportar: sangría izquierda y derecha de 709 twips, sin centrar y sin la cursiva gris de Word;
  - en el PDF, `#pad(x: 1.25cm)`;
  - «Nuevo desde Word» convierte los párrafos con estilo «Cita» o «Cita destacada» seguidos en una cita en bloque.

## Por qué
- **Atajos de Word:** quien escribe en Word los tiene en los dedos. No chocan con ninguno de SciDesk.
- **El justificado de Word no se importa:** si todos los párrafos llegaran justificados, el formato de la revista no podría cambiarlo.
- **La cita sin cursiva:** las normas habituales (APA, Vancouver) no la piden; el estilo de Word la centraba y la ponía en cursiva gris.

## Qué se descartó
- **Sangrías y alineaciones libres en centímetros:** el formato lo marca la revista (R23).
- **Una cita en bloque dentro de listas o tablas:** no se usa en manuscritos y complica el formato.

## Consecuencias
- **Formato:** `align` en `paragraph`, `heading` y `title`, y el nodo `blockquote` en el cuerpo (con id `b-`). Esquemas y especificación actualizados.
- **Ventana:** `align.ts` (alineación de bloques y celdas, cita en bloque), botones e iconos en la cinta, cuatro acciones nuevas en `shortcuts.ts` y en Ajustes.
- **Pruebas:**
  - la alineación, la cita y el estilo «Cita» en el Word, la fuente de Typst, y la vuelta con «Nuevo desde Word» (`word-import.test.ts`);
  - los atajos de alineación de cada esquema (`shortcuts.test.ts`).
- **Comprobado:**
  - con Word real: el párrafo centrado y la cita sangrada a los dos lados;
  - el PDF compila con el justificado, el título centrado y la cita;
  - en la vista del navegador: Ctrl+T centra, Ctrl+Q vuelve a la izquierda, el botón crea la cita, y se guarda sin errores.
- **Sin probar** en la ventana de Tauri ni en WebKit.
