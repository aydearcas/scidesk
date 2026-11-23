# 0075. Barra de tabla en el manuscrito

- **Fecha:** 23/11/2026
- **Estado:** hecha; falta que el usuario la vea en la ventana. Pedida por el usuario: «todo el editor de tablas está en clic derecho».
- **Pregunta del plan:** PLAN 5.4 (tablas) y la lámina 8 de la propuesta de interfaz (barra de tabla).

## Qué se decide
- **Al poner el cursor en una tabla del manuscrito** (sus celdas, su pie o sus notas) aparece, arriba de la hoja, una barra de tabla, como las pestañas contextuales de Word:
  - su nombre («Tabla 1») a la izquierda;
  - las mismas herramientas que la pestaña de la tabla: filas, columnas, combinar y dividir, fila de encabezado, alineación de la celda (también la decimal), llamada a una nota nueva y nota general;
  - «Abrir en su pestaña» a la derecha;
  - con poco ancho, los botones se quedan en iconos (igual que en la pestaña).
- **Desaparece al salir de la tabla.** El texto no salta al aparecer o desaparecer la barra:
  - en Chromium (WebView2) lo compensa el propio navegador (anclaje del desplazamiento);
  - en WebKit, donde no existe, la hoja se desplaza la altura de la barra.
- El menú contextual de la tabla se queda como estaba.

## Por qué
- **Descubrible:** nadie busca en el clic derecho cómo añadir una fila; en Word está en una cinta que aparece al entrar en la tabla.
- **Las mismas herramientas que la pestaña:** un solo componente (`TableTools`), así que una mejora llega a los dos sitios.
- **Arriba de la hoja y no flotando sobre la tabla:** no tapa el texto que se está editando y está siempre en el mismo sitio.

## Qué se descartó
- **Una barra flotante sobre la tabla**, como la burbuja de selección: tapa las filas de arriba y se mueve con el desplazamiento.
- **Sustituir la cinta por la de la tabla:** se perderían la cita, el formato y lo demás mientras se escribe en una celda.

## Consecuencias
- `TableContextBar` en `TableTab.tsx`, dentro de la hoja (`.desk`), pegada arriba (`position: sticky`).
- **Probado en la vista del navegador:**
  - la barra aparece al pulsar en una celda y se va al pulsar fuera, sin mover el texto;
  - «Insertar fila debajo» añade la fila en la tabla del manuscrito y el foco vuelve al texto;
  - sin errores en la consola.
- **Sin probar** en la ventana de Tauri ni en WebKit.
- **Pendiente de decidir con el usuario:** los bordes de celda. Según la revisión de la v0.4 (R43), los bordes y el sombreado a medida pasaron a la V1, porque las revistas imponen su propio estilo de tabla (solo líneas horizontales).
