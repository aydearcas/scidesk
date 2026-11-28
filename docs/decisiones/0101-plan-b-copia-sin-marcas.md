# 0101. Plan B: una copia que no dice de qué versión salió (fase 2b, segundo paso)

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11); propuesta pendiente de que el usuario la revise. El usuario pidió seguir con el desarrollo después de la ficha [0100](0100-fusion-a-tres-bandas-con-tu-copia.md).
- **Pregunta del plan:** fase 2b, «plan B cuando se pierden las marcas (R3)»; ficha [0029](0029-fusion-de-copias-devueltas.md), paso 1 (alinear por contenido); ficha [0025](0025-docx-con-marcas-y-campos.md) (las marcas son pistas).

## Qué fallaba
- **Una copia sin la propiedad SciDesk ni el marcador `_SDs_` no se podía importar**: daba el error «the copy does not say which version it was sent from». Pasa cuando el coautor copia el texto en un documento nuevo o lo pasa por otro programa.
- **Sin los marcadores de bloque, la alineación por contenido se descolocaba.** Elegía la mejor coincidencia de todo lo que quedaba por delante, así que un párrafo vacío podía emparejarse con otro lejano y dejar fuera los siguientes. Además, el texto que escribe la exportación delante de un bloque («Palabras clave: », «Tabla 1. », la letra de una nota) parecía texto del coautor.
- **El parecido entre párrafos contaba «mitad.» y «mitad,» como palabras distintas**, de modo que añadir «, corregida» tras «Segunda mitad» daba «borra el párrafo» y «párrafo nuevo» en lugar de una inserción.

## Qué se decide
1. **La versión enviada, por el texto** (`findSentVersion` en `round.ts`).
   - Si la copia no la dice, o dice una instantánea que no está en el historial, se puntúa cada versión del artículo: qué parte del texto de la copia es exactamente un bloque de esa versión.
   - Cada párrafo de la copia se mira con sus cambios marcados rechazados y aceptados, y sin el texto que escribe la exportación.
   - Gana la de más puntuación; a igualdad, las enviadas a coautores y después la más reciente.
   - Si ninguna llega a la mitad, la copia no se importa.
2. **El resultado de la importación dice cómo se encontró** (`foundBy`: `property`, `bookmark` o `content`) **y qué versión** (`sent`, con su puntuación).
   - La ventana lo explica en el mensaje: «La copia no decía de qué versión salió: se ha comparado su texto con el historial y se ha tomado «Word para coautores» del 28/11/2026 (coincide el 89 %)».
   - La línea de órdenes lo escribe en su JSON.
3. **Los errores de la copia tienen código** (`CopyError`: `other-project`, `other-article`, `no-version`) y la ventana los da en el idioma de la interfaz.
4. **Alineación por contenido conservando el orden** (`alignByContent` en `proposals.ts`).
   - Entre los párrafos ya emparejados por sus marcadores, los párrafos de la copia y los bloques enviados se emparejan como en un alineamiento de secuencias: sin cruzarse y con la mayor suma de parecido, al menos 0,5 por pareja.
   - Un tramo demasiado grande para alinearlo entero (más de 250 000 parejas posibles) vuelve a la búsqueda de la mejor coincidencia cercana.
   - Se reconoce el texto que escribe la exportación delante de un bloque (`GENERATED_LEAD`), y se toma como generado cuando así el párrafo se parece más a su bloque.
   - La figura que la exportación no pudo dibujar («[figures/…]») no cuenta como párrafo nuevo, y un párrafo vacío sin pareja no se propone como «borra el párrafo».
5. **El parecido entre párrafos compara las palabras por sus letras y cifras**, sin la puntuación pegada. Vale también con los marcadores.

## Cómo se comprobó
- **Pruebas nuevas** en `packages/core/test/round-plan-b.test.ts`:
  - se envía dos veces a coautores, con el texto cambiado entre medias, y vuelve la copia del primer envío sin ninguna marca y con una edición del coautor: se reconoce el primer envío por el texto (más del 80 %) y da exactamente las mismas propuestas que la misma copia con sus marcas, en la misma ronda; la edición es una sola inserción en su párrafo;
  - una copia sin tocar de la demostración completa (resumen con palabras clave, tabla con notas y figura) y sin marcas no da ninguna propuesta y coincide en más del 99 %;
  - una copia de otro texto da el error `no-version`.
- Pasan las 246 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, con el Word para coautores de la demostración sin marcas y con un cambio: se reconoce la versión, el mensaje lo explica y la propuesta entra en el texto. Una copia de otro texto da el aviso en español. Sin errores en la consola.
- Sin probar con copias reales de LibreOffice, Google Docs ni Word para Mac (no hay), ni en Tauri.

## Por qué
- Las marcas son pistas: la identidad de cada bloque ya se confirmaba por el contenido (ficha 0025). Sin ellas, el historial tiene todo lo necesario para encontrar la versión enviada.
- Respetar el orden evita que un emparejamiento lejano descoloque todo lo que viene detrás, que es lo que hacía la búsqueda codiciosa.

## Qué se descartó
- **Pedir al usuario que elija la versión enviada**: casi siempre la puntuación no deja dudas, y el mensaje dice cuál se tomó.
- **Alinear por contenido aunque haya marcadores**: los marcadores confirmados siguen anclando la alineación, que es más fiable.

## Consecuencias
- **Siguiente paso de la fase 2b: el tablero de la ronda.**
- Si una copia mezcla dos versiones (el coautor pegó partes de dos envíos), se toma la que más coincide, y lo demás sale como cambios suyos.
- Los comentarios de una copia sin marcas se reconocen por autor, fecha y texto (ficha 0096), porque el `durableId` se conserva o se pierde con el resto del documento.
