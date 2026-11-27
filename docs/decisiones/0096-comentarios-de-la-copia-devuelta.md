# 0096. Los comentarios de la copia devuelta, como propuestas (fase 2a, cuarto paso)

- **Fecha:** 27/11/2026
- **Estado:** hecha (27/11). El usuario pidió seguir después de la ficha [0095](0095-word-para-coautores-con-cambios-y-comentarios.md).
- **Pregunta del plan:** fase 2a, importar la copia devuelta (comentarios); fusión de la ficha [0029](0029-fusion-de-copias-devueltas.md), que dejaba los comentarios para esta fase.

## Qué se hizo
1. **Los comentarios enviados llevan un identificador que Word conserva.** Cada comentario y cada respuesta del Word para coautores llevan un `w16cid:durableId` (en `commentsIds.xml`). Se calcula a partir de su id de SciDesk (`commentDurableId`: 8 cifras hexadecimales, FNV-1a). Con Word real, se conserva al guardar, igual que la fecha de cada comentario.
2. **El lector de Word lee los comentarios** (`docx-read.ts`):
   - de `comments.xml`: autor, fecha y texto, con una línea por párrafo;
   - de `commentsExtended.xml`: a qué comentario responde cada uno y si está resuelto;
   - de `commentsIds.xml`: su `durableId`;
   - en el texto, dónde empieza y acaba cada uno (`commentRangeStart`/`End`) o, si no tiene tramo, dónde está su referencia. Estas marcas van como segmentos vacíos (`edge`), así que siguen en su sitio después de pasar los cambios enviados a la vista aceptada (ficha 0095).
3. **Se convierten en propuestas de tipo `comment`** (`commentProposals` en `proposals.ts`):
   - un comentario enviado se reconoce por su `durableId` o, si no lo trae, por autor, fecha y texto;
   - si la copia no hace nada con él, no da propuesta;
   - si le añade respuestas, lo resuelve o lo reabre, da una propuesta con `thread` (el comentario enviado), las respuestas nuevas y `resolved` cuando cambia;
   - si la copia ya no lo tiene, da una propuesta con `removed`, a nombre de quien la devolvió;
   - un comentario nuevo da una propuesta con su texto, sus respuestas y, si está resuelto, `resolved`;
   - el sitio es el de la versión enviada, con las mismas posiciones que las demás propuestas (ficha 0095). Para un comentario enviado, se toma el tramo que tenía al enviarse; para uno nuevo, el de la copia, pasado al texto enviado;
   - un comentario que sigue en otro párrafo lleva `end` (el bloque y la posición donde acaba). Uno sobre un párrafo que añadió el coautor va detrás del bloque enviado anterior, como el párrafo nuevo;
   - las propuestas de comentario no cambian el texto: no cuentan para la comprobación de integridad ni se ocultan como ruido.
4. **El formato** (`packages/formats/src/proposals.ts`, esquema regenerado) añade al `comment` de una propuesta `thread`, `resolved`, `removed` y `end`, todos opcionales. Está documentado en la especificación de formatos.
5. **En la ventana**, la «Copia devuelta» de la pestaña «Revisión» enseña cada propuesta de comentario con quién y qué hace (comenta, responde, lo da por resuelto, lo reabre, quita el comentario), el texto comentado, el comentario y sus respuestas sangradas. **`scidesk show`** lo escribe en una línea.

## Cómo se comprobó
- Prueba nueva en `packages/core/test/tracked-docx.test.ts`: una copia con un comentario nuevo, una respuesta a uno enviado y otro enviado quitado da exactamente esas tres propuestas, con sus sitios y la integridad correcta. La copia sin tocar sigue sin dar ninguna.
- **Con Word real** (local, salida fuera del repositorio):
  - se añadió un comentario, se respondió a uno enviado y se reabrió el resuelto;
  - Word conservó los `durableId` y las fechas de los enviados;
  - la copia sin tocar no dio propuestas y la editada dio las tres esperadas, con sus posiciones en los bloques.
- En la vista del navegador, una copia de la demostración con un comentario y una respuesta se ve bien en «Copia devuelta», sin errores en la consola.
- Las 234 pruebas de npm pasan.

## Por qué
- Word no guarda ningún id propio estable para los comentarios salvo `durableId`, y la fecha y el texto pueden repetirse o cambiar. Con el `durableId` sacado del id de SciDesk, el comentario enviado se reconoce sin guardar nada más.
- Responder, resolver o quitar un comentario es lo que hace un coautor con los comentarios del autor. Tratarlo como propuesta deja que el autor lo decida, como con el texto (ficha [0019](0019-modelo-unico-de-propuestas.md)).

## Qué se descartó
- **Guardar en la copia una tabla de ids de Word a ids de SciDesk**: Word renumera `w:id` al guardar.
- **Dar una propuesta por cada comentario de la copia**: el coautor vería volver como suyos los comentarios del autor.
- **Proponer cambios del texto de un comentario enviado**: es raro, y se ignora por ahora.

## Consecuencias
- **Siguiente paso de la fase 2a** (hecho en la ficha [0097](0097-aceptar-o-rechazar-las-propuestas.md)): aceptar o rechazar las propuestas en el editor, también las de comentario. Al aceptar una:
  - un comentario nuevo se ancla con su marca y entra en el registro con origen `docx`;
  - las respuestas se añaden al hilo;
  - `resolved` lo resuelve o lo reabre;
  - `removed` lo quita.
- Las respuestas que el coautor borra de un comentario enviado no dan propuesta.
- Sin probar con Word para Mac, LibreOffice ni Google Docs. Las versiones de Word anteriores a 2013 no escriben `commentsExtended.xml`: sus respuestas llegarían como comentarios sueltos.
