# 0042. Pegar desde Word: limpiador en la ventana y tablas pegadas como tablas de SciDesk

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1). Lleva a la aplicación lo que decidió la ficha [0022](0022-pegar-tablas-de-word.md) con el prototipo 1.
- **Pregunta del plan:** fase 1, «pegado de texto como en Word (R23)» y «tablas … pegado desde Word» (PLAN.md 5.2, 5.4 y 8; riesgo 7.1).

## Qué se decide
- **Todo lo que llega de Word pasa por el limpiador del prototipo 1** (`apps/desktop/src/paste.ts`, `transformPastedHTML` del editor), ahora en TypeScript:
  - los símbolos de Wingdings y Symbol pasan a Unicode, también los de Word para Mac;
  - los párrafos de lista de Word pasan a listas;
  - las filas que se repiten en cada página se marcan como encabezado;
  - una tabla anidada pasa a un párrafo por fila;
  - se quitan las marcas `<o:p>`;
  - solo se conserva el `<body>`.
- **Además, se descartan las imágenes con ruta local** (`file:///…msohtmlclip…`): llevan una ruta del equipo, igual que el `<head>`, y no deben quedarse en el proyecto. El mensaje del pegado dice cuántas se han quitado y que se añaden como figura.
- **Una tabla pegada es una tabla de SciDesk, no una tabla dentro del texto:**
  1. **En la ventana**, `readPaste` lee el HTML limpio en orden: trozos de contenido normal y tablas. Cada tabla va con el párrafo de antes, si dice «Tabla N.», y con los párrafos de después que parecen notas (las mismas reglas que «Nuevo desde Word», ficha 0036).
     - De cada celda se lee lo siguiente: los párrafos con negrita, cursiva, superíndice y subíndice, las celdas combinadas, si es de encabezado, la alineación y los anchos de las columnas.
     - Se deshacen los saltos de línea con que Word parte los párrafos en su HTML.
  2. **En el núcleo**, `tablePartFromPaste` (`packages/core/src/paste-table.ts`) construye el `tablePart` con ids nuevos:
     - el pie sin «Tabla 3.» (o tomado de una primera fila de una sola celda que empieza por «Tabla»);
     - las filas de encabezado del principio;
     - los anchos relativos.
     - **Una nota que empieza por una letra en superíndice es una nota específica**, y esa misma letra en superíndice en una celda pasa a ser su llamada (`noteRef`), así que las letras se vuelven a calcular al exportar (R11). Se avisa de una nota que no se llama desde ninguna celda y de una tabla sin pie.
  3. `addTablePart` la guarda, validada, en `tables/tabla-<n>.scitable` con el primer número libre.
  4. En el texto, en el sitio del pegado, queda la referencia a la tabla (`tableRef`), junto con el texto pegado de antes y de después, en un solo paso que se deshace de una vez. Deshacer no borra el archivo de la tabla (regla de la ficha 0021).
- **Con Ctrl+Mayús+V se pega solo el texto**, como hace ProseMirror, también si hay tablas.
- **Lo que no es tabla** se pega con el esquema del editor: conserva negrita, cursiva, superíndice, subíndice, encabezados y listas, y toma la fuente del documento. Es el «combinar formato» de R23.
- **Al copiar y pegar dentro del editor**, las referencias a tablas y figuras conservan su id y su archivo.

## Por qué
- **El riesgo técnico número 1** (7.1) quedó resuelto en el prototipo 1 (135/135 tablas reales bien). Faltaba que la tabla pegada fuera un objeto del artículo, con su pie y sus notas, que se numera, se exporta y se comprueba como cualquier otra.
- **La conversión a `.scitable` en el núcleo, sobre datos simples:** se prueba sin DOM y comparte las reglas de pie y notas con «Nuevo desde Word». Solo la lectura del HTML, que necesita el DOM del navegador, queda en la ventana.
- **Pruebas:**
  - 3 nuevas en el núcleo, 50 en total:
    - pie sin «Tabla 3.», encabezado de dos filas con celdas combinadas, alineación, anchos, nota general y nota específica con su llamada;
    - pie tomado de la primera fila y avisos;
    - guardar en `tabla-1` y `tabla-2`, cargar sin normalizar nada, exportar el DOCX con la tabla y que las comprobaciones digan que no se cita.
  - **En la ventana (navegador),** con un pegado simulado de HTML sintético al estilo de Word:
    - el texto de antes y el de después quedan en su sitio, y la tabla en `tables/tabla-1.scitable`;
    - el pie sale sin «Tabla 1.», con los anchos 50/25/25 y el encabezado de dos filas (rowspan, colspan, centrado);
    - el «P» de Wingdings 2 se convierte en ✓ y «Edad, años» sale sin el salto de Word;
    - salen las dos notas, la específica llamada desde la celda;
    - ninguna ruta local llega al editor ni al archivo;
    - el DOCX para la revista lleva la tabla.

    Sin errores en la consola.

## Qué se descartó
- **Tablas editables dentro del texto con la extensión de tablas de Tiptap:** las tablas viven en su archivo (ficha 0021). Editarlas en el documento compuesto es otra pieza de la fase 1.
- **Hacer la conversión en el núcleo con un DOM de Node** (jsdom): habría que añadir una dependencia solo para las pruebas.
- **Guardar las imágenes pegadas:** el HTML de Word solo trae su ruta local; la imagen está en el portapapeles en otro formato. Se insertan como figura.

## Consecuencias
- **Prueba pendiente con Ctrl+V real** desde Word en la aplicación (aquí el pegado se simuló con el mismo HTML que entrega Word), y en el Mac con Safari.
- **Queda para el resto de la fase 1:**
  - «mantener formato de origen» y unir líneas al pegar desde un PDF (R23);
  - figuras pegadas;
  - editar la tabla pegada en el documento compuesto.
- **Queda para la fase 2:** las citas de EndNote y Zotero del portapapeles, que se leen del HTML y del RTF (ficha 0022) con el lector del prototipo 10.
