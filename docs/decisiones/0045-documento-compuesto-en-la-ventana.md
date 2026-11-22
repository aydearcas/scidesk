# 0045. El documento compuesto en la ventana: resumen, tablas y figuras editables en su sitio y la tabla en su pestaña

- **Fecha:** 22/11/2026
- **Estado:** aceptada (fase 1). Lleva a la aplicación lo que decidió la ficha [0021](0021-documento-compuesto.md) con el prototipo 8.
- **Pregunta del plan:** P8, R32 y R11 (PLAN.md 3.3); fase 1, «Tablas: editor en el documento y en pestaña propia, con notas como objetos» y «Figuras: insertar y pie».

## Qué se decide
- **La ventana edita el artículo como un solo árbol** (`packages/core/src/compose.ts`):
  - `composeArticle` pone los títulos, después el resumen (`abstractPart`) y después el cuerpo, con cada `tableRef` o `figureRef` sustituido por su parte (`tablePart`, `figurePart`), que guarda en `src` el archivo del que viene.
  - `splitArticle` lo reparte en sus archivos, y `saveComposite` escribe solo los que han cambiado: primero las partes y al final el cuerpo, para que el cuerpo nunca apunte a una parte sin escribir.
  - Las comprobaciones, el navegador, la numeración de las citas, los usos de cada referencia y el registro de recuperación trabajan sobre los archivos de ese reparto (`liveDocuments`), igual que antes con el cuerpo solo.
  - El registro de recuperación guarda cada archivo que difiere del disco por separado, y se limpia al guardar.
- **Lo que se ve en el texto** (`apps/desktop/src/parts.ts`):
  - **El resumen**, con su encabezado por idioma («Resumen», «Abstract») y «Palabras clave:» en el idioma de cada sección. Cada palabra clave es un bloque: Intro crea otra, y se muestran separadas por punto y coma.
  - **Cada tabla**, con «Tabla N.» delante del pie, las celdas y las notas. Las notas específicas llevan su letra según el orden de la primera llamada (R11); las generales no llevan letra. Si el texto no cita la tabla, aparece «sin citar en el texto».
  - **Cada figura**, con su imagen (sin editar; TIFF solo por su nombre), su pie y sus notas. El texto alternativo, la fuente y la licencia se escriben en «Detalles».
  - Los números, letras y etiquetas son decoraciones calculadas: nunca se guardan.
  - Una referencia cuyo archivo falta se queda en el texto como referencia y lo dice.
- **Reglas de la ficha 0021, ya en la ventana:**
  1. **Ids:** después de cada cambio, cada bloque, nota y cita conserva un id único. Las llamadas a una nota que ya no está en su tabla se quitan, y los anchos de columna que ya no coinciden con las columnas se descartan.
  2. **Bordes:** una selección que cruza el borde del resumen, de un idioma del resumen, de una tabla o de una figura se recorta al lado donde empezó. Esto vale al borrar, cortar, escribir encima y pegar. Cualquier otro paso que corte un borde se rechaza, y el resumen no se puede quitar.
  3. **Una copia pegada de una tabla o figura es una parte nueva:** recibe id, archivo (`tabla-<n>`, `figura-<n>`, con el primer número libre también entre los archivos que no están en el texto) e ids nuevos dentro, y sus llamadas apuntan a sus propias notas. La que ya estaba conserva los suyos. Un resumen pegado entero llega como párrafos.
  4. **Quitar una tabla o figura del texto no borra su archivo.** Aparece en el navegador en «Sin colocar en el texto» y un clic la vuelve a poner donde está el cursor.
- **Edición de tablas** con `prosemirror-tables` (el de `@tiptap/pm`, sin dependencia nueva), con los nodos propios del formato (`colspan`, `rowspan`, `align` y `columnWidths`):
  - Tab y Mayús+Tab cambian de celda, y Tab en la última celda añade una fila, como en Word. Intro en el pie lleva a la primera celda.
  - En el menú contextual: insertar y eliminar filas y columnas, combinar y dividir celdas, fila de encabezado, nota general y «llamada a una nota nueva» (inserta la llamada en el cursor y la nota al final), abrir en su pestaña y quitar del texto.
- **La tabla en su pestaña** (`PartTab`, `TableTab.tsx`) es una segunda vista de la misma parte, sin estado propio que se guarde:
  - Sus pasos se trasladan al editor principal y los del principal vuelven a la pestaña, así que deshacer y guardar ocurren en un solo sitio.
  - Muestra el número de la tabla en el artículo y las letras de sus notas.
  - Tiene los atajos de formato del esquema y una barra con las órdenes de la tabla, incluida la alineación por celda.
  - Al cambiar de artículo se cierra. El diseño de la pestaña es el de la lámina pendiente de D8.
- **La demostración de la ventana** trae resumen con palabras clave, una tabla con una nota específica y otra general, y una figura SVG, todo sintético (`createDemoProject(..., { parts: true })`).

## Por qué
- Es lo que decidió la ficha 0021 y lo que pide P8: la tabla se edita dentro del artículo, como en Word, o en su pestaña, y en los dos casos cambia el mismo archivo.
- **Pruebas automáticas** (`packages/core/test/compose.test.ts`, 6 pruebas):
  - componer y repartir sin cambios no escribe nada;
  - editar una celda, un pie o el resumen escribe solo ese archivo;
  - quitar una tabla del texto conserva su archivo;
  - una copia tiene id, archivo e ids nuevos, con sus llamadas;
  - la demostración con partes es válida y se reparte en los mismos archivos.
- **Con el teclado y el ratón reales, en la vista del navegador** (Chromium, el mismo motor que WebView2):
  - escribir en una celda guardó solo `tables/tabla-1.scitable`;
  - una selección del cuerpo al pie seguida de Retroceso borró solo el texto del cuerpo;
  - Intro en el pie llevó a la primera celda, y Tab en la última celda añadió una fila;
  - la llamada a una nota nueva recibió la letra «b» por el orden de las llamadas;
  - lo escrito en la pestaña de la tabla apareció en el manuscrito, y Ctrl+Z desde la pestaña lo deshizo en los dos;
  - una copia de tabla y figura pegada recibió `tabla-2` y `figura-2` con sus notas;
  - deshacer el pegado dejó los dos archivos en «Sin colocar», y un clic volvió a poner la tabla, numerada como «Tabla 2» y con el aviso de que no se cita;
  - la fuente de la figura se guardó en su `.scifigure`;
  - una palabra clave nueva se creó con Intro;
  - el proyecto se reabrió sin errores y la exportación a Word funcionó.
- Dos fallos aparecieron solo con estas pruebas reales y están corregidos:
  - **Una copia pegada perdía sus notas y sus llamadas.** Las reglas de lectura «p» del párrafo y «sup» del superíndice de Tiptap iban antes que las de las notas. Las reglas de las partes tienen ahora prioridad.
  - **Al pulsar Intro en una palabra clave, el texto nuevo iba a la anterior.** El navegador colocaba el cursor mal en un bloque vacío mostrado en línea. Las palabras clave son ahora elementos de una fila flexible.
  - Además, las órdenes de notas del menú contextual se ejecutan cuando el menú ya se ha cerrado; antes, el cursor volvía a la celda.

## Qué se descartó
- **La extensión de tablas de Tiptap.** Sus nodos tienen atributos que el formato no admite (`colwidth`), y su vista de tabla es para redimensionar columnas. Bastan los nodos propios con `tableRole` y los comandos de `prosemirror-tables`.
- **Palabras clave como texto con punto y coma.** El formato las tiene como nodos (`keyword`), y así se exportan y se cuentan.
- **Una pestaña de tabla con editor e historial propios** (ya descartado en 0006 y 0021).
- **Borrar el archivo al quitar la parte del texto** (regla 4).

## Consecuencias
- **Dos Retrocesos justo después de una tabla la sacan del texto:**
  - el primero la selecciona (se ve con un contorno);
  - el segundo la quita, y su archivo queda en «Sin colocar».
  - Es el comportamiento de ProseMirror con los bloques. Si molesta al escribir, se puede cambiar para que el primer Retroceso solo lleve el cursor al final de la tabla.
- **Pendiente:**
  - las láminas de D8 (inicio y tabla en su pestaña) para el diseño de la pestaña;
  - mover una tabla arrastrándola;
  - borrar desde el navegador el archivo de una parte sin colocar;
  - tablas compartidas entre artículos (P12);
  - el control de cambios en la ventana, que llegará con la fase 2.
- **Sin probar en la ventana real de Tauri ni en WebKit.** El código es solo de la vista web, igual en WebView2 que en Chromium, pero el cursor en las palabras clave y en las celdas conviene repetirlo en el MacBook.
