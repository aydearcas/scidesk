# 0053. Arrastrar el ancho de una columna

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al retomar la fase 1, en el orden de lo pendiente; falta que el usuario la revise).
- **Pregunta del plan:** lo pendiente de las fichas 0045 y 0048 (tablas en el documento y en su pestaña); formato de `.scitable` (fichas 0022 y 0031).

## Qué se decide
- **Se arrastra el borde entre dos columnas**, en el texto o en la pestaña de la tabla:
  - cerca de un borde interior (5 píxeles), el cursor cambia;
  - al arrastrar, una línea discontinua marca el borde nuevo y una etiqueta enseña el porcentaje de las dos columnas («40,2 % | 59,8 %»);
  - al soltar, los anchos cambian en un solo paso, que se deshace con un Ctrl+Z.
- **Solo cambian las dos columnas del borde**: se reparten el ancho que tenían entre las dos y las demás no se mueven. Ninguna baja del 4 % de la tabla.
- **No hay borde exterior que arrastrar:** la tabla ocupa siempre el ancho del texto, que es como se exporta.
- **Los anchos se guardan como hasta ahora**, en `columnWidths` del `.scitable`, en porcentaje con un decimal. El Word y el PDF los usan tal cual.
- **Una tabla sin anchos propios** parte de lo que se ve, columnas iguales, y los recibe al primer arrastre. Las celdas combinadas se tienen en cuenta: un borde que ninguna celda toca se reparte entre sus vecinos.
- **Es una extensión propia** (`apps/desktop/src/columnResize.ts`):
  - la línea y la etiqueta se dibujan fuera del DOM del editor, porque ProseMirror volvería a leer cualquier cambio dentro de él;
  - el cursor se pone en el `body`, por el mismo motivo.
- **En «Detalles» de la tabla**, la ayuda de los anchos dice que se cambian arrastrando.

## Por qué
- **Estaba en lo pendiente de la fase 1.** Hasta ahora, los anchos solo venían del Word o de una tabla pegada.
- **El `columnResizing` de prosemirror-tables no sirve aquí:** guarda píxeles en cada celda (`colwidth`) y el formato guarda proporciones de la tabla. Convertir entre los dos en cada cambio sería frágil con celdas combinadas y con el zoom.
- **Repartir solo entre las dos columnas** es lo que hace Word al arrastrar un borde interior, y lo más predecible.

## Qué se descartó
- **Mover el DOM del editor mientras se arrastra** (las `<col>` en vivo): ProseMirror lo vería como una edición del usuario.
- **Redibujar la tabla en cada movimiento** con una transacción: llenaría el historial de deshacer y el registro de recuperación.
- **Autoajustar con doble clic**, como Word: queda para más adelante, si se echa en falta.

## Consecuencias
- **Probado en la vista del navegador** con la tabla de la demostración:
  - arrastre real con el ratón (60/40 → 77,5/22,5);
  - línea y etiqueta mientras se arrastra;
  - deshacer y rehacer;
  - guardado en `tabla-1.scitable` (`[40.2, 59.8]`);
  - el mismo arrastre en la pestaña de la tabla, que también cambia la tabla del texto.
- **Pruebas nuevas:** 2 de `moveBorder` en `apps/desktop/src/columnResize.test.ts`.
- **Sin probar** en la ventana de Tauri ni en WebKit.
- **En el modo de sugerencias**, el cambio de anchos no se marca como sugerencia: es un atributo de la tabla.
