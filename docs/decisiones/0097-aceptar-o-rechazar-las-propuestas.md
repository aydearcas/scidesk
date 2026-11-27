# 0097. Aceptar o rechazar las propuestas de la copia devuelta (fase 2a, quinto paso)

- **Fecha:** 27/11/2026
- **Estado:** hecha (27/11). El usuario pidió seguir después de la ficha [0096](0096-comentarios-de-la-copia-devuelta.md).
- **Pregunta del plan:** fase 2a, «importar una copia devuelta con control de cambios y comentarios, verla en la vista de propuestas (6.5), y aceptar y rechazar»; propuesta de interfaz, lámina 2 («el manuscrito con las propuestas dentro del texto, cada una con el color de su autor; una tarjeta por propuesta con aceptar y rechazar»).

## Qué se decide
1. **Las propuestas entran en el texto como cambios marcados de su autor**, como hace Word al comparar o combinar:
   - al importar la copia, cada propuesta que se puede colocar se escribe en el manuscrito en un solo paso, que se deshace con Ctrl+Z;
   - las que el coautor marcó llevan su `w:author` y su fecha; las que hizo sin marcar, el nombre de quien devolvió la copia;
   - en el registro `changes`, cada cambio lleva `origin: "docx"` y `source` con el id de su propuesta (`pr-…`);
   - si la vista de revisión era «Sin marcas» u «Original», pasa a «Todas las marcas» para que se vean.
2. **Dónde va cada propuesta ahora** (`proposal-place.ts` en el núcleo). Las propuestas están ancladas en la versión enviada (ficha 0031) y puedes haber seguido escribiendo. Por cada bloque se compara la versión enviada (la instantánea) con la actual, carácter a carácter:
   - si no has tocado el texto de la propuesta, va donde está ahora ese texto;
   - si cae sobre texto que has cambiado desde el envío, no entra en el texto: «Has cambiado este texto desde que enviaste la copia»;
   - si cae sobre un cambio marcado que no es suyo, tampoco: «Este texto tiene ya un cambio marcado»;
   - si el párrafo ya no está, o es algo que el editor no sabe colocar (separadores de las palabras clave, un párrafo nuevo donde no cabe), se queda en el panel con su motivo.
3. **Deshacer un cambio que iba en la copia.** Si el coautor rechazó en Word un cambio marcado tuyo, la copia trae justo lo contrario (borra tu inserción o vuelve a poner tu borrado). La propuesta se reconoce como tal: con ese cambio rechazado, el texto queda como la propuesta lo deja. No se escribe como cambio nuevo, porque el modelo no deja superponer dos cambios. Su tarjeta dice «Deshace un cambio marcado que iba en la copia: aceptarla lo rechaza».
4. **Aceptar y rechazar.**
   - Un cambio que viene de una propuesta se acepta o rechaza como cualquier otro: en la tarjeta, con el clic derecho, en la barra de revisión, o con «Aceptar todos» y «Rechazar todos». Se acepte donde se acepte, su propuesta queda decidida (`track.onDecided`).
   - «Aceptar todas» y «Rechazar todas» de la copia lo hacen en un solo paso que se deshace (`decideMany`).
   - Si se deshace la decisión, el cambio vuelve al texto y la propuesta vuelve a estar por decidir.
   - Lo decidido (`decision` y `decided`) se escribe en el archivo de propuestas en cuanto se decide.
5. **Los comentarios no entran solos en el texto.** Se aceptan desde su tarjeta:
   - un comentario nuevo se ancla en su sitio, con su autor, su fecha, sus respuestas, su estado (resuelto o no) y `origin: "docx"`; si su texto ya no está, va sobre el párrafo entero;
   - en uno que tú enviaste, se añaden las respuestas nuevas, se resuelve o se reabre, o se quita.
6. **Lo que no se puede colocar** se queda en el panel con su motivo y tres botones: «Copiar su texto», «Ya lo he hecho» (`edited`) y «Rechazar».
7. **En la pestaña «Revisión»**, «Copia devuelta»:
   - muestra cuántas quedan por decidir y los botones «Llevar N al texto» (si se deshizo la importación), «Aceptar todas» y «Rechazar todas»;
   - en cada tarjeta, el color del autor; un clic lleva a su cambio en el texto o a su párrafo;
   - las decididas quedan plegadas en «Mostrar N decididas».
8. **Al abrir un proyecto**, se carga la última copia del artículo que tenga algo por decidir (`loadProposalSets`).

## Cómo se comprobó
- **Pruebas nuevas** en `packages/core/test/proposal-place.test.ts`:
  - el paso de posiciones de la versión enviada a la actual;
  - las palabras clave;
  - una copia con una frase nueva marcada, una inserción tuya rechazada y un borrado tuyo devuelto: la frase va a su sitio, también si has escrito antes de ella; los rechazos se reconocen como «deshace el cambio»; una propuesta sobre texto cambiado no se coloca;
  - lo decidido y su lectura con el nombre de quien devolvió la copia.
- Pasan las 237 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, con el Word para coautores de la demostración devuelto con cambios de una coautora (uno marcado, uno sin marcar, un borrado marcado y un comentario):
  - los tres cambios entran en el texto con su color;
  - aceptar, rechazar y aceptar el comentario funcionan;
  - Ctrl+Z devuelve una propuesta a «por decidir»;
  - al recargar y reabrir el proyecto, los cambios, el comentario y lo decidido siguen ahí;
  - «Aceptar todas» las decide todas;
  - una propuesta sobre texto cambiado después del envío se queda en el panel con su motivo;
  - sin errores en la consola.
- Sin probar en la ventana de Tauri ni en WebKit.

## Por qué
- Es lo que el usuario conoce de Word: los cambios de un coautor dentro del texto, con su color, y se deciden igual que los propios.
- Un solo mecanismo de aceptar y rechazar (el del control de cambios, ficha 0090) sirve para lo propio y para lo que llega de fuera (ficha 0019).
- Lo que no se puede colocar sin riesgo se queda a la vista y no se aplica a ciegas sobre texto que ha cambiado: eso es la fusión a tres bandas de la fase 2b.

## Qué se descartó
- **Dejar las propuestas solo en el panel** y aplicarlas al aceptar: no se verían en su contexto ni se podrían leer seguidas en el texto.
- **Aplicar una propuesta sobre texto cambiado** buscando su texto cerca: puede caer en otro sitio. Se queda para la fusión por zonas de la fase 2b, con las tres versiones a la vista.
- **Escribir la propuesta como un cambio que se solapa con otro** (una inserción tuya borrada por el coautor): el modelo de suggest-changes no lo admite. Se resuelve rechazando tu cambio.
- **Llevar los comentarios al texto al importar**: un comentario no es un cambio del texto, y aceptarlo es decidir que entra en el hilo del artículo.

## Consecuencias
- **Siguiente paso de la fase 2a:** el historial con nombre. Atajos para la propuesta siguiente y anterior y para aceptar y rechazar (F8, Ctrl+Intro y Ctrl+Retroceso en la propuesta de interfaz), cuando llegue la vista de fusión.
- Un cambio de formato, un párrafo partido o unido y un movimiento todavía no llegan como propuestas (ficha 0096). Cuando lleguen, habrá que colocarlos igual.
- Si se deshace un comentario aceptado, su propuesta vuelve a «por decidir» solo en la misma sesión.
- Varias copias a la vez, con sus coincidencias y conflictos, en la ficha [0098](0098-varias-copias-devueltas-a-la-vez.md). Los conflictos con lo que el autor ha escrito desde el envío siguen para la fase 2b.
