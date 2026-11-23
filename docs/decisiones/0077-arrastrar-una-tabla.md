# 0077. Mover una tabla o una figura arrastrándola

- **Fecha:** 23/11/2026
- **Estado:** hecha. Era lo último que quedaba del editor de la fase 1 (pendiente desde las fichas 0021 y 0045); el usuario pidió hacerla el 23/11.
- **Pregunta del plan:** PLAN 5.4 (tablas) y ficha 0045 («mover una tabla arrastrándola»).

## Qué se decide
- **Un asa de mover, como la de Word,** en la esquina superior izquierda de cada tabla y figura, en el margen de la hoja (un cuadrado con flechas en cruz). Se ve al pasar el ratón por la tabla o la figura y mientras el cursor está dentro de ella. La tienen también los sitios de las tablas y figuras cuyo archivo falta.
- **Un clic en el asa selecciona la tabla o la figura entera** (con su contorno), como en Word. Así se puede cortar, copiar o borrar entera. Con ella seleccionada no sale la burbuja de formato.
- **Arrastrar el asa la mueve:**
  - la tabla de origen se atenúa;
  - una etiqueta con su número y su pie («Tabla 1. Características…») sigue al puntero;
  - una línea marca dónde va a quedar.
- **Solo cae entre dos bloques del texto:**
  - antes o después del párrafo, título, lista, cita, tabla o figura que hay bajo el puntero, según la mitad en la que esté;
  - nunca dentro de un párrafo ni de otra tabla;
  - nunca por encima del título ni del resumen.
  - Soltarla justo antes o después de sí misma no la mueve (la línea no sale ahí). Escape cancela.
  - Funciona con varias páginas por fila: el puntero en el margen o entre páginas cuenta como si estuviera en el texto de esa página (la misma cuenta que el clic en el margen, ficha 0069).
  - Cerca del borde de arriba o de abajo, la hoja se desplaza sola, más deprisa cuanto más cerca, también sin mover el ratón.
- **Al soltar,** la tabla se mueve en un solo paso, que Ctrl+Z deshace, y queda seleccionada en su sitio nuevo.
  - **Es la misma tabla:** conserva su id y su archivo, sin hacer una copia (regla 1 de la ficha 0021). Al guardar solo cambia el cuerpo del artículo.
  - Su número cambia si va por posición y no está citada; si está citada, manda el orden de las citas, como siempre.

## Por qué
- **El asa de Word** es lo que conocen los usuarios. Además, no se confunde con seleccionar texto ni con arrastrar el borde de una columna (ficha 0053).
- **Entre bloques y no en mitad de un párrafo:** en un manuscrito, una tabla o una figura es un bloque. Partir un párrafo al soltarla sería casi siempre un error.
- **Eventos del puntero y no el arrastre del navegador:** Tauri se queda en Windows con el arrastrar y soltar nativo, como ya pasó al arrastrar secciones en el navegador (ficha 0071).

## Qué se descartó
- **Arrastrar desde cualquier punto de la tabla:** chocaría con seleccionar celdas y texto.
- **Arrastrar en el navegador (la lista de tablas y figuras) para reordenarlas:** el sitio de una tabla en el texto es lo que importa, y el navegador ya va al sitio con un clic. Queda para más adelante, si se pide, igual que arrastrar una tabla «sin colocar» al texto.
- **Una orden de teclado para subir o bajar una tabla:** cortar y pegar la tabla seleccionada ya la mueve, conservando su id y su archivo.

## Consecuencias
- **Ventana:**
  - `apps/desktop/src/part-drag.ts`: extensión `PartDrag` con el asa como decoración, la tabla actual y la arrastrada marcadas, y el arrastre. Las funciones puras se prueban aparte: `firstGap`, `dropTarget` y `movePart`.
  - El asa de los sitios sin archivo, en su vista (`editor.ts`).
  - `partDrag.pointerPos` lo pone `App.tsx` con las páginas de cada momento.
  - La línea y la etiqueta se dibujan fuera del DOM del editor.
  - Burbuja de formato oculta con una tabla o figura seleccionada entera (`EditorMenus.tsx`).
- **Sin cambios de formato:** solo cambia el orden de los bloques en el cuerpo.
- **Pruebas:** `part-drag.test.ts` (5):
  - nunca por encima del título y el resumen;
  - sin cambios si cae junto a sí misma;
  - bajar entera y seleccionada;
  - entre dos párrafos;
  - solo partes.
- **Comprobado en la vista del navegador,** con eventos simulados y con el ratón:
  - la tabla encima de «Métodos», con la línea y la etiqueta;
  - Ctrl+Z en un paso;
  - la figura encima de la tabla;
  - Escape;
  - con el zoom al 20 % y dos páginas por fila, de la página 1 a la 2;
  - una sola tabla y nada «sin colocar» tras moverla;
  - guardado;
  - cortar y pegar la tabla seleccionada con el asa conserva su id y su archivo (probado con el portapapeles de ProseMirror; el Ctrl+X de la herramienta de la vista no lanza el evento de cortar del navegador).
- **Sin probar** en la ventana de Tauri ni en WebKit.
