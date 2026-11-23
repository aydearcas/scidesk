# 0079. Tablas nuevas: insertar con el clic derecho y escribir su título; selección del navegador

- **Fecha:** 23/11/2026
- **Estado:** hecha por petición del usuario (23/11). Su pregunta era cómo se escribe el pie de una tabla nueva (las notas de debajo); la respuesta está en el mensaje al insertarla. La ayuda en el título vacío salió de entender mal la pregunta, y se deja porque tampoco se veía dónde va el título.
- **Pregunta del plan:** PLAN 5.4 (tablas) y la interfaz (fichas 0044 y 0048).

## Qué se decide
- **«Insertar tabla» también en el menú del clic derecho del texto,** detrás de «Referencia cruzada». Hace lo mismo que Insertar › Insertar tabla: la tabla va en el cursor o, si el cursor está en una tabla o una figura, detrás de ella.
- **Lo que va encima de una tabla (el `tableCaption`) se llama «título» en español;** el pie de una tabla son sus notas, debajo. En las figuras, el `figureCaption` sigue siendo el «pie».
  - En el navegador, una tabla sin título dice «sin título». Antes decía «sin pie».
  - En «Detalles», «Título».
  - En el aviso del pegado desde Word, «el título».
  - En el buscador de referencias cruzadas, «Número o palabras del título o del pie».
  - En inglés, «no title» y «Title» para las tablas.
- **Cómo se escribe el título de una tabla nueva:** al insertarla, el cursor queda en su primera línea, detrás de «Tabla N.».
  - Mientras la línea está vacía, se ve en gris «Escribe aquí el título de la tabla». Ocupa el sitio del aviso «sin citar», que el navegador sigue mostrando.
  - Al escribir, la ayuda desaparece.
  - En una figura sin pie, «Escribe aquí el pie de la figura».
  - El mensaje que sale al insertar la tabla lo explica:
    - el título detrás de «Tabla N.»;
    - después las celdas: Tab pasa a la siguiente celda y en la última añade una fila;
    - y el pie (las notas de debajo), con «Nota general» o «Llamada a nota» de la barra de la tabla, también en el clic derecho. Antes decía, ya sin razón, que el contenido se editaría «cuando llegue la tabla en su pestaña».
- **El clic derecho en una tabla** (en el texto o en su pestaña) agrupa las opciones bajo títulos con fondo gris y letra verde azulado claro (`--menu-heading-ink`), en este orden:
  - **Modificar tabla:** filas, columnas, combinar, dividir y fila de encabezado; al final, «Insertar tabla».
  - **Pie de tabla:** «Añadir nota general» e «Insertar llamada a una nota nueva».
  - **Referencias:** la cita (insertar, o editar, omitir autor y quitar la seleccionada), la referencia cruzada y «Marcar un pendiente».
  - **«Abrir en su pestaña», en negrita,** y debajo «Eliminar tabla del texto» (antes «Quitar del texto»; también en «Detalles» de la tabla). Hace lo de siempre: la saca del texto en un paso que Ctrl+Z deshace, y su archivo queda en «Sin colocar» (regla 4 de la ficha 0021). Que no borre el archivo lo decidió el usuario al pedir la opción de eliminar.
  - Al final del todo, cortar, copiar y seleccionar todo.
  - Las palabras mal escritas siguen saliendo arriba, con sus sugerencias.
- **En la barra de la tabla, «Nota general» se llama «Nota al pie»** (su descripción: «Añadir una nota al pie de la tabla»).
- **En el navegador, el elemento seleccionado lleva un contorno verde azulado sólido** (`--accent`, 1,5 px), sin el sombreado pastel de antes (decisión del usuario).
  - Las bandas de grupo seleccionadas conservan su color de banda, con el mismo contorno.

## Por qué
- **El clic derecho** es donde el usuario busca qué se puede poner en el texto.
- **«Título» y no «pie»** para lo de encima de la tabla: en español, el pie de una tabla son las notas de debajo. Que el navegador diga «sin pie» de una tabla sin título confunde.
- **La ayuda en gris:** la línea del título vacía solo enseñaba «Tabla N.», y no se veía que ahí se escribe.

## Qué se descartó
- **Abrir un diálogo para el título al insertar la tabla:** el título se escribe en su sitio, como el resto del texto.
- **«Insertar figura» en el clic derecho:** no se pidió.

## Consecuencias
- **Ventana:**
  - `App.tsx`: «Insertar tabla» en el menú contextual, y el texto de ayuda dado a `partContext.captionHint`;
  - `parts.ts`: `data-placeholder` en el título vacío, en las decoraciones de las etiquetas, así que también sale en la pestaña de la tabla;
  - `Navigator.tsx` y `DetailsPanel.tsx`: «sin título» y «Título» en las tablas;
  - `Menus.tsx`: títulos de grupo (`{ heading }`) y opciones en negrita (`strong`); `App.tsx` arma con ellos el menú de la tabla;
  - `i18n.ts`: los textos;
  - `styles.css`: la ayuda en la línea de la etiqueta y el contorno de la selección del navegador.
- **Comprobado en la vista del navegador:**
  - «Insertar tabla» desde el clic derecho;
  - «2 · sin título» en el navegador;
  - el cursor delante de la ayuda;
  - al escribir, el título en su sitio y en el navegador;
  - el contorno sin relleno del elemento seleccionado;
  - el menú del clic derecho en una celda, con sus tres grupos.
- **Sin probar** en la ventana de Tauri ni en WebKit.
