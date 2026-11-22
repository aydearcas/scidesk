# 0049. Páginas en el editor, varias por fila al alejar, y zoom anclado

- **Fecha:** 22/11/2026
- **Estado:** aceptada (petición del usuario del 22/11/2026). Cambia en parte la ficha 0046.
- **Pregunta del plan:** PLAN.md 5.2 y propuesta de interfaz 4.1 y 4.7 («texto continuo + vista previa paginada»).

## Qué se decide
- **El manuscrito se ve en páginas A4**, con márgenes de 2,5 cm y su número abajo, en lugar de una hoja continua que crece. Las páginas indican más o menos las que saldrán en el Word.
- **El texto conserva el aspecto del editor:** el interlineado, los tamaños y los espacios no cambian. El usuario lo aclaró: no quería copiar el estilo del Word exportado (doble espacio), solo las páginas. Por eso los saltos son aproximados. El Word para la revista, a doble espacio, ocupa más páginas.
- **Lo pagina el propio navegador.** El texto editable fluye por columnas CSS del tamaño del área de texto de una página. Esas columnas pasan a la fila siguiente (`column-height` y `column-wrap`), y detrás de cada una se dibuja una hoja. Así:
  - los párrafos se parten entre páginas línea a línea, con al menos dos líneas a cada lado (`orphans`, `widows`);
  - los títulos no se quedan solos al final de una página;
  - no se parten las filas de una tabla, las figuras ni las referencias de la bibliografía;
  - la bibliografía generada entra en las páginas;
  - el cursor, la selección y las flechas pasan de una página a otra sin hacer nada especial.
- **Varias páginas por fila al alejar el zoom, como en Word:** caben tantas como permita el ancho, hasta 6. En una ventana de 1500 px con los dos paneles: 1 al 50 %, 2 al 33 %, 3 al 25 % y 4 al 20 %. Con «Ajustar al ancho» se ve una sola.
- **El zoom baja hasta el 20 %** (antes, al 50 %), con los pasos 20, 25, 33, 50, 75, 100… 300 %.
- **El zoom se ancla:**
  - con Ctrl + rueda, lo que está bajo el ratón se queda bajo el ratón;
  - con −, + y el menú, lo que está en el centro de la mesa se queda en el centro;
  - se anota la posición del texto antes de cambiar el zoom y después se desplaza la vista hasta ella;
  - cuando todo el documento cabe en pantalla no hay nada que desplazar, como en Word.
- **Todo lo que hay dentro de la hoja escala con el zoom**, también los márgenes internos de tablas, figuras, resumen y bibliografía, que antes eran píxeles fijos. Así el número de páginas casi no cambia al cambiar el zoom: a veces una página arriba o abajo por redondeos.
- **Un clic después del final del texto** (debajo del texto en su última página, o en una página vacía posterior) pone el cursor al final.
- **WebKit (el Mac) no tiene todavía columnas que pasen de fila.** Allí la hoja sigue continua, como en la ficha 0046, hasta que las tenga o se haga otra forma de paginar.

## Por qué
- **El usuario quiere ver las páginas mientras escribe**, como en Word, y no solo en la vista previa.
- **Paginar con el navegador** es mucho más sencillo y fiable que calcular los saltos a mano con decoraciones de ProseMirror:
  - no hay que medir líneas ni insertar huecos;
  - el texto sigue siendo un único documento editable;
  - solo así se pueden poner varias páginas en una fila sin partir el editor.

## Qué se descartó
- **Copiar el estilo del Word exportado** (Calibri a doble espacio y títulos de 14 pt) para que los saltos coincidieran mejor: el usuario no lo quería.
- **Calcular los saltos con decoraciones** (huecos insertados entre líneas): funcionaría también en WebKit, pero no permite poner varias páginas por fila.
- **Un editor por página:** rompería deshacer, seleccionar y buscar a través de páginas.

## Consecuencias
- **La vista previa con Typst** sigue siendo la paginación exacta del PDF. Las páginas del editor son una aproximación de las del Word.
- **Probado en la vista del navegador y en la ventana de Tauri** (Chromium 156 y WebView2 157) con 40 párrafos añadidos a la demostración (7–8 páginas):
  - párrafos partidos entre páginas;
  - números de página;
  - 1, 2, 3 y 4 páginas por fila;
  - la misma palabra bajo el ratón al pasar del 100 al 150 % con Ctrl + rueda;
  - la flecha abajo pasa de la última línea de una página a la primera de la siguiente.
- **Sin probar en WebKit**, donde no hay páginas.
- **Pendiente:**
  - rendimiento con documentos muy largos, como el Word de 135 tablas;
  - paginación para WebKit;
  - que el modo «Fuente adaptada a la revista» use el interlineado y el tamaño del perfil, si el usuario lo quiere algún día.
