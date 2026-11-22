# 0069. Listas y sangría en la cinta, y clic en el margen

- **Fecha:** 22–23/11/2026
- **Estado:** hecha y probada por el usuario en la ventana («Funciona», 23/11).
- **Pregunta del plan:** lo menor del editor de la fase 1 (CLAUDE.md, punto 4): listas y sangría en la cinta, que el usuario quería ver por pasos. El clic en el margen y los índices en la burbuja los pidió el usuario al probarlo.

## Qué se decide
- **Listas en la cinta**, en un grupo como «Párrafo» de Word, detrás del color y el resaltado:
  - **Viñetas** y **Numeración**. Se marca el botón de la lista más cercana al cursor (unas viñetas dentro de una lista numerada marcan «Viñetas»).
  - Dentro de una lista, **Aumentar sangría** y **Disminuir sangría** cambian el nivel del elemento, como Tab y Mayús+Tab.
  - Las listas ya estaban en el formato, el editor y las exportaciones.
- **Sangría de un párrafo** (fuera de las listas):
  - en pasos de 1,25 cm, como «Aumentar sangría» de Word, hasta 8 pasos, en el atributo nuevo `indent` del párrafo (opcional; esquemas regenerados);
  - con los botones de la cinta, sobre todos los párrafos seleccionados;
  - **Tab** al principio de un párrafo, o con varios párrafos seleccionados, aumenta la sangría;
  - **Mayús+Tab**, y **Retroceso** al principio de un párrafo con sangría, la reducen;
  - solo en el cuerpo y el resumen; las tablas y las figuras no la llevan;
  - **Tab nunca saca el foco del texto.** Antes, en un párrafo normal, iba de un botón a otro de la ventana. En medio de una línea no hace nada;
  - en el Word, `w:ind w:left` (709 twips por paso); en el PDF, `#pad(left: …)`;
  - «Nuevo desde Word» lee la sangría izquierda de cada párrafo, salvo las francesas (las de una bibliografía).
- **Clic en el margen de la hoja**, a la altura de una línea:
  - en el margen izquierdo, el cursor va al principio de esa línea; en el derecho, al final;
  - con Mayús, se amplía la selección;
  - arrastrando, se selecciona: hasta el principio o el final de cada línea mientras el ratón está en un margen, y hasta el ratón dentro del texto. La hoja se desplaza cerca de los bordes y la burbuja se oculta mientras se arrastra.
- **Superíndice y subíndice en la burbuja de selección**, detrás de negrita, cursiva y subrayado.

## Por qué
- **Pasos de 1,25 cm y un número de pasos, no una medida libre:** es lo que hace el botón de Word, y el formato del manuscrito lo marca la revista (R23). Un número de pasos es fácil de comparar y de llevar al Word y al PDF.
- **Tab no inserta un tabulador en medio del texto:** en un manuscrito científico no se alinea con tabuladores, y el formato no tiene tabulaciones propias. Lo importante era que el foco no saliera del texto.
- **El margen como en Word:** al empezar a seleccionar desde el borde de la hoja, lo esperable es el principio de la línea, no nada.

## Qué se descartó
- **Listas reales de Word en el DOCX** (`w:numPr`): las listas siguen saliendo con «• » o «1. » como texto generado delante del marcador del bloque (ficha 0033). Se ven bien, pero un elemento que añada un coautor en Word no se numera solo. Queda para cuando se pida.
- **Seleccionar la línea entera al pulsar en el margen izquierdo**, como Word: el usuario pidió el cursor al principio de la línea.
- **Leer la sangría al pegar desde Word:** el limpiador del HTML de Office quita los estilos del párrafo. Se puede añadir si hace falta.

## Consecuencias
- **Pruebas nuevas:** la sangría de 2 pasos en el Word (`w:left="1418"`) y en la fuente de Typst, y de vuelta con «Nuevo desde Word» (`packages/core/test/word-import.test.ts`).
- **Probado en la vista del navegador** con el teclado y el ratón reales (listas anidadas, cambio de tipo de una sublista, Tab, Mayús+Tab y Retroceso, botones, clic y arrastre en los márgenes), y por el usuario en la ventana de Tauri.
- **Ojo al desarrollar:** una importación nueva de un paquete hace que Vite reconstruya sus dependencias y la página queda con errores de React («Invalid hook call») hasta recargarla (F5 en la ventana).
- **Sin probar** en WebKit (ahí no hay páginas, así que el clic en el margen usa los bordes del editor).
