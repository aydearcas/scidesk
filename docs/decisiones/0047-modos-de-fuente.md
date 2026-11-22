# 0047. Modos de fuente: adaptada a la revista o libre, con fuente y tamaño por fragmento

- **Fecha:** 22/11/2026
- **Estado:** aceptada (propuesta del usuario del 22/11/2026, con los matices del asistente que el usuario aceptó).
- **Pregunta del plan:** PLAN.md 5.2, «Fuentes»: en el MVP se elige la fuente del documento, y elegir una para cada estilo llega en V1 (R43). Esto la amplía.

## Qué se decide
- **Dos modos de fuente**, guardados en los ajustes de cada equipo (`fontMode` en `settings/interface.json`). Se cambian en Ajustes, en el menú Ver y con un botón de la barra de estado.
  - **Fuente adaptada a la revista** (el modo por defecto). El texto se ve con la fuente del documento y la cinta no ofrece fuente ni tamaño. Las fuentes y tamaños propios que tenga el texto **se ocultan, pero no se borran**: al volver al modo libre reaparecen.
  - **Fuente libre.** La cinta añade:
    - un selector de fuente: la del documento, las habituales de Word y Roboto (ficha 0011);
    - un selector de tamaño: el del documento, o de 8 a 36 pt;
    - el botón **«Adaptar a la revista»**, con un icono (una página con una marca de verificación) y su nombre al pasar el ratón por encima.
  - La fuente y el tamaño del documento (Calibri, 12) van en su sitio en cada lista, sin paréntesis (decisión del usuario). Elegirlos quita la fuente o el tamaño propios, y al pasar el ratón por encima el selector dice «Fuente del documento» o «Tamaño del documento». Por eso no se puede poner 12 pt propio: sería igual que el del documento. Para que la cinta quepa en una fila, en este modo los textos de los botones se ocultan por debajo de 1100 px de ancho de la cinta, en lugar de 860. Con 1024 y 1280 px de ventana cabe en una fila.
- **«Adaptar a la revista»** quita la fuente y el tamaño propios de todo el artículo, también dentro de tablas, figuras y resumen:
  - antes guarda el artículo y una instantánea del historial;
  - lo hace en un solo paso, que Ctrl+Z deshace;
  - el mensaje dice cuántos fragmentos ha cambiado y cuál es la instantánea.
- **En el formato `.scidoc`, dos marcas nuevas** de texto (ficha 0031):
  - `fontFamily` con `{ family }`: hasta 64 caracteres, sin `;{}<>"\`, como lo escribe Word en `w:rFonts`;
  - `fontSize` con `{ size }`: en puntos, de 1 a 409, en medios puntos como `w:sz`.
- **Al exportar:**
  - el Word para coautores las lleva (`w:rFonts`, `w:sz`);
  - el Word y el PDF para la revista no las llevan nunca, en ningún modo.
- **Un aviso informativo** en el panel de Avisos dice cuántos fragmentos tienen fuente o tamaño propios, con «Ir» al primero. Así no queda formato escondido sin que se sepa.
- **El pegado desde Word y «Nuevo desde Word» no traen las fuentes ni los tamaños de Word** («combinar formato», R23), porque Word los pone en cada fragmento. El editor solo recupera los suyos al copiar y pegar dentro del programa. Traerlos sería «mantener formato de origen», que sigue pendiente.
- **En pantalla**, el tamaño propio se multiplica por el zoom de la hoja (ficha 0046).

## Por qué
- **El usuario lo pidió:** mientras escribe, a veces quiere un tamaño o una fuente distintos para señalar algo, y adaptarlo a la revista después.
- **El usuario propuso que pasar al modo adaptado aplicara «Adaptar a la revista»**, sin guardar el estado anterior. Se cambió por ocultar sin borrar: cambiar de modo no pierde nada, y borrar es una acción aparte que se puede deshacer y deja instantánea.
- **Para ver más texto en la hoja está el zoom** (ficha 0046), que no toca el texto.
- **Las exportaciones para la revista nunca llevan estas marcas:** así no llegan a la revista por descuido, aunque se olvide adaptar.

## Qué se descartó
- Borrar las marcas al pasar al modo adaptado.
- Solo una fuente y un tamaño del documento, sin fragmentos.
- Traer las fuentes y los tamaños de Word al pegar o al importar.

## Consecuencias
- **Pendiente:**
  - la fuente del documento (PLAN 5.2): hoy se ve con Carlito o Calibri a 12 pt;
  - que el modo adaptado use la fuente y el tamaño del perfil de la revista;
  - «mantener formato de origen» al pegar;
  - leer `w:sz` y `w:rFonts` de las copias devueltas por los coautores, si hace falta en la fase 2.
- Pruebas: `packages/core/test/font-marks.test.ts`, que comprueba la validación, el Word para coautores frente al de la revista, el PDF y el aviso.
- Probado en la vista del navegador:
  - el tamaño y la fuente por selección;
  - el modo adaptado oculta sin borrar;
  - «Adaptar a la revista» guarda la instantánea y Ctrl+Z lo deshace.
- Sin probar en la ventana de Tauri.
