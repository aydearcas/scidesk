# 0099. Historial de versiones con nombre (fase 2a, último paso)

- **Fecha:** 27/11/2026
- **Estado:** hecha (27/11); propuesta pendiente de que el usuario la revise. El usuario pidió seguir con lo siguiente después de la ficha [0098](0098-varias-copias-devueltas-a-la-vez.md).
- **Pregunta del plan:** fase 2a, «historial de versiones con nombre» (P15, PLAN.md 5.1 y 6.4, ficha [0013](0013-historial-instantaneas.md)); propuesta de interfaz, apartado 5.6 (sin lámina). Cierra también lo que quedaba de la fase 1 de la especificación de formatos: el formato interno de las instantáneas.

## Qué se decide
1. **Formato definitivo de las instantáneas** (`snapshot.ts`):
   - un archivo por instantánea en `.scidesk/history/<id>.snapshot`, escrito una vez y nunca cambiado;
   - es un gzip de un JSON con `format: "scidesk-snapshot"`, `version: 1`, nombre (`label`), fecha (`created`, y `at` en milisegundos), artículo, tipo (`kind`), motivo (`reason`), autor y la instantánea anterior del artículo (`prev`);
   - `files` tiene cada archivo del artículo y los comunes (biblioteca, personas y manifiesto) con el SHA-256 de su contenido;
   - en `contents` solo va el contenido que la instantánea anterior del artículo no tenía. Un archivo que no cambió dice en qué instantánea está (`in`). Así, la segunda versión de un artículo ocupa poco;
   - se siguen leyendo las del formato provisional;
   - si se repite una exportación sin cambios, se reutiliza la misma instantánea.
2. **Tres tipos de versión**:
   - **con nombre** (`named`): las que guarda el usuario;
   - **enviadas** (`sent`): el Word para coautores, el Word para la revista y el PDF para la revista;
   - **automáticas** (`auto`): la copia del día (antes de guardar por primera vez cada día), y las que se guardan antes de importar una copia devuelta, de restaurar, de traer de una versión, de recuperar cambios sin guardar, de adaptar a la revista o de eliminar una tabla o figura.
   - El `reason` deja que la ventana las nombre en el idioma de la interfaz.
3. **La vista «Historial»**, junto a Artículo y Biblioteca:
   - **a la izquierda**, la línea de tiempo: las versiones con nombre y las enviadas destacadas (las enviadas con «↗»), y las automáticas de cada día agrupadas y plegadas; arriba, «Guardar versión con nombre» (también en Archivo), con un nombre propuesto («Versión del 27 de noviembre de 2026»);
   - **en el centro**, la versión elegida comparada con el texto actual o, en «Comparar con», con otra versión (siempre de la más antigua a la más nueva). Se compara párrafo a párrafo, por identificador de bloque, y palabra a palabra dentro de cada uno (`compareVersions`). Salen solo los distintos, agrupados por sección, con «Cambia», «Nuevo desde entonces» o «Quitado desde entonces» y lo que cambió marcado; un clic lleva al párrafo en el texto.
4. **Restaurar la versión entera** (`restoreSnapshot`):
   - primero guarda el artículo como está, como versión automática;
   - escribe los archivos del artículo como estaban. Los que se crearon después se quedan, fuera del texto;
   - de la biblioteca y las personas solo añade lo que esa versión usaba y ya no está; nunca quita nada, porque otros artículos pueden usarlo;
   - el mensaje ofrece «Deshacer», que restaura la versión guardada justo antes.
5. **Traer un párrafo o una sección** (`proposalsFromVersion`):
   - llegan como propuestas (ficha [0019](0019-modelo-unico-de-propuestas.md)), en un conjunto `origin: "history"` de `articles/<artículo>/proposals/`;
   - la base es una instantánea del texto actual;
   - entran en el texto como cambios marcados a nombre de «Versión «…» (fecha)», con `origin: "history"` en el registro, y se deciden en «Copias devueltas» como las de un coautor (fichas 0097 y 0098);
   - un párrafo quitado desde entonces vuelve detrás del bloque que tenía delante;
   - lo que vuelve conserva sus citas, referencias cruzadas y formatos, porque la propuesta lleva su contenido (`content`) y no solo su texto.
6. **En la línea de órdenes**: `scidesk history`, `scidesk snapshot <dir> <nombre> [--author]`, `scidesk compare <dir> <versión> [<otra>]` y `scidesk restore <dir> <versión>`, que dice cómo deshacerlo.

## Cómo se comprobó
- **Pruebas nuevas** en `packages/core/test/history.test.ts`:
  - la segunda instantánea guarda solo lo que cambió y se lee entera;
  - la lista sale de la más nueva a la más antigua, con su tipo y su autor;
  - una exportación repetida reutiliza la instantánea, y hay una copia automática por día;
  - las instantáneas del formato provisional se siguen leyendo;
  - la comparación de dos versiones por párrafos y palabras, con su sección;
  - un párrafo traído entra como propuesta en su sitio, y uno quitado vuelve con su cita;
  - restaurar escribe la versión y devuelve a la biblioteca una referencia que se había quitado, y restaurar la versión de antes lo deshace.
- Pasan las 242 pruebas de npm y las 12 pruebas del editor en Chromium.
- **Línea de órdenes**: guardar una versión, cambiar el texto, compararlo, restaurarlo y deshacerlo.
- **En la vista del navegador**, con la demostración:
  - guardar una versión con nombre desde Archivo;
  - la copia del día agrupada;
  - comparar después de cambiar una palabra y quitar un párrafo con cita;
  - traer el párrafo, que vuelve como cambio marcado y con su cita;
  - restaurar la versión entera y deshacerlo;
  - sin errores en la consola.
- Sin probar en Tauri ni en WebKit.

## Por qué
- Lo que pide el plan (6.4): versiones con nombre, copias automáticas en los momentos clave, comparar y restaurar, también un párrafo o una sección sueltos, que llegan como propuestas.
- Guardar solo lo nuevo mantiene un archivo por instantánea (lo que mejor llevan OneDrive y Dropbox) sin repetir el artículo entero en cada una.
- Restaurar nunca destruye nada: antes se guarda lo que había, y se deshace con un clic.

## Qué se descartó
- **Restaurar un párrafo directamente**, sin propuesta: se perdería la ocasión de verlo en el texto y decidirlo, y no se podría deshacer por partes.
- **Quitar de la biblioteca** las referencias que la versión restaurada no usa: otros artículos las usan.
- **Comparar por líneas del JSON**: no sirve para leer qué cambió.

## Consecuencias
- Falta **olvidar copias automáticas antiguas** conservando las que tienen nombre. Como una instantánea puede guardar contenido que usan las posteriores, eso exige compactar (ficha 0013).
- Las instantáneas no guardan las imágenes de las figuras (como antes): restaurar una versión deja la imagen que haya ahora.
- Un párrafo traído es un bloque nuevo, con otro identificador: en una comparación posterior sale como quitado y nuevo, no como el mismo.
- En una tabla, un párrafo nuevo solo vuelve si cabe donde estaba.
- Con este paso queda hecho lo que la fase 2a pedía en el plan. Falta probarla con una copia devuelta real y en el Mac.
