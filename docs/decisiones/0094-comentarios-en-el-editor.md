# 0094. Comentarios en el editor (fase 2a, segundo paso)

- **Fecha:** 25/11/2026
- **Estado:** hecha (25/11). El usuario pidió seguir con los comentarios después del control de cambios.
- **Pregunta del plan:** fase 2a, «comentarios y control de cambios en el editor» (R31); propuesta de interfaz 3.3 y 4.2, decisión D5 (los comentarios, en el panel derecho y no como globos en el margen).

## Qué se hizo
1. **El formato ya los preveía** (ficha 0031), y no ha cambiado:
   - el texto comentado lleva la marca `comment` con el `id` del comentario (`cm-…`);
   - el autor, la fecha, el origen, el texto, las respuestas y si está resuelto van al registro `comments` de cada `.scidoc`, `.scitable` o `.scifigure`, junto a `changes`.
2. **En el editor** (`apps/desktop/src/comments.ts`):
   - la marca `comment` se puede solapar con otra, como en Word, y no se alarga al escribir en sus bordes;
   - comentar no es nunca un cambio marcado, aunque el control de cambios esté activado;
   - sin selección, se comenta la palabra del cursor; junto a un signo o a una llamada (una nota de tabla, una cita), lo escrito allí sin espacios, «(4,3–5,8)ª» (lo pidió el usuario el 25/11 al no poder comentar al final de una celda); entre espacios, lo más cercano antes del cursor, o después; solo en un bloque sin texto sale un mensaje;
   - al copiar texto comentado, la copia se pega sin el comentario (sigue donde estaba); al cortar y pegar, el comentario se mueve con el texto; el texto de otro artículo nunca trae el suyo;
   - eliminar un comentario es un paso de deshacer: Ctrl+Z lo devuelve;
   - si se borra todo el texto comentado, se va el comentario (como en Word); con el control de cambios, el texto borrado sigue ahí tachado y el comentario también.
3. **Dónde se ven** (D5 y propuesta 4.2):
   - en el texto, fondo ámbar suave con una raya debajo; el comentario del cursor, más oscuro; los resueltos, sin color;
   - al pasar el ratón, autor, primera línea del comentario y número de respuestas (propuesta 4.2), en un recuadro fuera del DOM del editor (`CommentHover.tsx`; lo pidió el usuario el 25/11); va encima de la línea, a 10 px, y debajo solo si arriba no cabe; nunca tapa la interfaz: se queda dentro de la zona de la hoja (lo pidió el usuario);
   - se ven en «Todas las marcas», «Marcas simples» y «Sin marcas»; solo «Original» los oculta. Word los oculta también en «Sin marcas», pero SciDesk abre con «Sin marcas» cuando el control de cambios está desactivado (ficha 0092), y entonces no se verían nunca;
   - en la pestaña «Revisión» del panel derecho, un hilo por comentario **a la altura de su texto**, como el margen de Word (lo pidió el usuario el 25/11): cada tarjeta empieza donde empieza su comentario en pantalla y baja si chocaría con la de encima; la activa queda justo a su altura y las de encima suben; siguen al desplazar la hoja, al escribir y al crecer una tarjeta; las que no caben se cuentan arriba y abajo («▲ 2 más arriba», «▼ 1 más abajo») con un botón que lleva a la más cercana; fuera del manuscrito (la pestaña de una tabla, la biblioteca), una lista en el orden del texto. Cada tarjeta tiene autor con su color, fecha, el texto comentado (clic = ir a él), el comentario, las respuestas, y «Resolver», «Editar» y «Eliminar»; la respuesta, en el comentario activo; los resueltos, ocultos con «Mostrar N resueltos»; debajo, «Copia devuelta», plegable (se abre sola si hay propuestas o desde la barra de revisión);
   - el recuento de la pestaña suma los comentarios abiertos y las propuestas.
4. **Cómo se crean y se recorren:**
   - Ctrl+Mayús+M en los dos esquemas (el atajo que ya estaba reservado), Insertar › Insertar comentario, el clic derecho del texto o de una celda, el botón de la burbuja de selección (verde azulado sólido con el icono en blanco y más grande, más claro al pasar el ratón, separado de «Cita»; lo pidió el usuario) y la barra de revisión;
   - el comentario nuevo se escribe en su tarjeta; Ctrl+Intro lo publica y Escape lo descarta (sin texto, no se queda);
   - un clic en texto comentado abre su hilo en el panel (propuesta 3.3);
   - el clic derecho en texto comentado empieza por el comentario: autor y fecha, «Ver el comentario», «Resolver» o «Volver a abrir» y «Eliminar»;
   - la orden se llama «Insertar comentario» en todas partes (lo pidió el usuario el 25/11);
   - la barra de revisión tiene un grupo «Comentarios»: insertar, anterior, siguiente (sin los resueltos) y eliminar el del cursor.
5. **El nombre:** el mismo «Tu nombre» del control de cambios (ficha 0090). Si no está, se pide la primera vez que se comenta o se responde, con el mismo diálogo y otro texto.
6. **Guardado:** el registro se lee al abrir (`registries` de `compose.ts`) y se escribe al guardar con el de los cambios (`saveComposite` con `{ changes, comments }`); cada archivo guarda solo los comentarios de su texto. Responder, resolver o editar un comentario no cambia el documento, pero el artículo queda sin guardar igualmente y entra en el registro de recuperación.
7. **Barra de revisión más ancha:** con el grupo nuevo, la barra ya no cabía a 1440 px. Ahora los títulos de grupo se ocultan por debajo de 1960 px de ancho y los textos de los botones por debajo de 1700 px (antes, los dos por debajo de 1320 px); las medidas salen de la barra real en español. Además, el texto solo para lectores de pantalla de la barra ensanchaba la página cuando la barra se desplazaba: ya no.

## También cambiado (petición del usuario del 25/11)
- **En los diálogos, la acción principal va antes de «Cancelar»:** cita rápida, referencia de la biblioteca, recuperación tras un cierre, autores, fuente del documento, homogeneizar el inglés y el nombre de los cambios y comentarios. En el asistente de nuevo artículo, en cambio, «Cancelar» va a la derecha, justo antes de «Atrás» y «Siguiente», como botón con un borde más oscuro (lo pidió el usuario).
- **La raya del margen de los cambios** (ficha 0092) es más ancha (3 px) y, como en Word, se puede pulsar: con «Marcas simples» es roja y pasa a «Todas las marcas»; con «Todas las marcas» es gris y vuelve a «Marcas simples». Al pasar el ratón, la mano y lo que hará.
- **La cita rápida y el buscador de referencias cruzadas** salen más abajo (al 40 % del alto de la ventana; la lista de resultados se desplaza dentro si no cabe) y **se pueden arrastrar** por su asa o por cualquier parte que no sea un control, para ver el texto de detrás; no salen de la ventana y vuelven a abrirse donde se dejaron mientras el programa sigue abierto (`draggable.ts`).

## Pruebas
- `comments.test.ts` (5): la marca y el registro, lo que se comenta sin selección (palabra, junto a un signo o una cita, entre espacios, bloque vacío), comentarios solapados y el del cursor, el orden del texto, y lo que conserva un pegado.
- `compose.test.ts` (núcleo, 1 más): cada comentario va al archivo de su texto (resumen, cuerpo y celda de una tabla), los que no están en el texto no se guardan, y vuelven al cargar.
- Playwright (1 más, también en WebKit en la integración continua): comentar una palabra con el nombre pedido la primera vez, publicar, responder, resolver y «Mostrar 1 resuelto».
- En la vista del navegador: tarjetas a la altura de su texto con «1 más arriba» y «1 más abajo», la primera línea al pasar el ratón, comentar al final de una celda detrás de la llamada «a», dos comentarios solapados, el del cursor, responder, resolver, eliminar con el clic derecho y Ctrl+Z, comentar con el control de cambios activado (sin cambios marcados), Escape, y el archivo guardado con la marca y el registro.

## Qué se descartó o queda
- **Globos sobre la hoja:** D5 los pone en el panel, a la altura de su texto.
- **Comentar una tabla o figura entera** como objeto: se comenta su texto (título, celdas, notas).
- **El Word para coautores todavía sale sin comentarios** (y con los cambios aceptados): es el paso siguiente de la fase 2a, con `w:comment` y `w:ins`/`w:del`. Hecho el 27/11 en la ficha [0095](0095-word-para-coautores-con-cambios-y-comentarios.md), con `scidesk comments`.
- **Línea de órdenes:** sin `scidesk comments` todavía.
- Sin probar en la ventana de Tauri ni en WebKit a mano (la prueba de Playwright sí corre en WebKit en la integración continua).
