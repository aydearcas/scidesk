# 0098. Varias copias devueltas a la vez, por orden

- **Fecha:** 27/11/2026
- **Estado:** hecha (27/11), a petición del usuario. Arregla dos fallos de la ficha [0097](0097-aceptar-o-rechazar-las-propuestas.md) y adelanta una parte de la fase 2b.
- **Petición del usuario:** poder marcar qué copias se muestran, una o varias a la vez y por orden, porque cada coautor puede haber revisado partes distintas del documento; y que, si se pisan, se gestione bien.

## Qué fallaba
- **Solo se veía la última copia importada.** Las tarjetas de la anterior desaparecían del panel. Sus cambios seguían en el texto, pero lo que se decidía con ellos ya no se guardaba en su archivo de propuestas, y al reabrir el proyecto solo se cargaba una copia.
- **El aviso culpaba al autor.** Una propuesta que caía sobre un cambio de otro coautor decía «Has cambiado este texto desde que enviaste la copia».

## Qué se decide
1. **Todas las copias del artículo** aparecen en «Copias devueltas» de la pestaña «Revisión»:
   - cada una con una casilla para mostrarla, su fecha y cuántas propuestas le quedan por decidir;
   - un orden que se cambia con ▲ y ▼;
   - mostrar una copia pone en el texto sus propuestas pendientes y enseña sus tarjetas; ocultarla las quita del texto sin decidir nada;
   - el orden y las copias ocultas se recuerdan en cada equipo, en el almacenamiento de la ventana (es una comodidad, no un dato del proyecto).
2. **Las copias marcadas entran en el texto por orden.** Al mostrar, ocultar o mover una copia, se vuelven a colocar todas en un solo paso, que se deshace con Ctrl+Z (`layOut`):
   - salen del texto los cambios que vienen de propuestas y siguen como se pusieron;
   - si el autor escribió dentro de uno, ese cambio se queda donde está, para no perder lo escrito;
   - las copias marcadas vuelven a entrar en el orden de la lista.
3. **Cuando dos copias se encuentran** (`placeProposal` con `foreign` en el núcleo):
   - los cambios que vienen de una copia no se toman como cambios del autor desde el envío; el texto del autor se compara sin las inserciones de las copias;
   - si la propuesta de la copia de abajo deja el texto igual que el cambio de la de arriba, **coinciden** (`agrees`). Su tarjeta dice «Propone lo mismo que Marta: se decide con su cambio», y decidir cualquiera de las dos, en la tarjeta o en el texto, decide las dos;
   - si toca el mismo texto de otra forma, **chocan** (`conflict`): «Choca con el cambio de Marta en el texto», con «Usar esta» (rechaza el cambio de Marta y pone esta en su lugar, en un paso) y «Dejar la de Marta» (rechaza esta);
   - la tarjeta del cambio que está en el texto dice quién propone lo mismo y quién propone otra cosa;
   - dos inserciones en el mismo punto no chocan: van una al lado de la otra, como en Word, con la de abajo delante;
   - cambios en palabras distintas de la misma frase no chocan: entran los dos.
4. **Lo que se decide se guarda en el archivo de su copia**, se decida donde se decida.
5. **«Aceptar todas» y «Rechazar todas» son de cada copia.** Aceptar todas también acepta los cambios con los que coincide; las que chocan se quedan para decidirlas una a una.

## Cómo se comprobó
- **Prueba nueva** en `packages/core/test/proposal-place.test.ts` con un párrafo que ya tiene los cambios de Marta: borrar lo mismo y escribir lo mismo coinciden; cambiar un tramo que contiene su inserción o su borrado choca; otra inserción en el mismo punto va delante; cambiar otras palabras entra sin problema; y sin saber que los cambios vienen de una copia, se toman como del autor.
- Pasan las 238 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, con tres copias de la demostración (Marta, Juan y Ana):
  - la de Juan coincide con Marta en un borrado y sus otros cambios entran en el texto;
  - la de Ana choca con Marta;
  - al subir la copia de Ana, su cambio queda en el texto y los de Marta y Juan pasan a chocar con él;
  - «Usar esta» devuelve el de Marta y rechaza el de Ana;
  - aceptar la coincidencia decide las dos;
  - ocultar a Juan quita sus cambios del texto;
  - al recargar y reabrir el proyecto, se conservan el orden, la copia oculta y lo decidido, y al volver a marcar a Juan sus cambios vuelven al texto;
  - sin errores en la consola.
- Sin probar en Tauri ni en WebKit.

## Por qué
- Cada coautor suele revisar su parte. Ver todas las copias a la vez en el texto es lo que hace Word con «Combinar», pero aquí cada cambio conserva su autor y su copia.
- El orden da una regla simple y visible para lo que se pisa: queda en el texto lo de la copia de arriba, y lo demás se decide en su tarjeta con las dos versiones a la vista. No se elige nada a ciegas.

## Qué se descartó
- **Ocultar una copia solo a la vista**, dejando sus cambios en el texto con CSS: el texto que se lee y el que se guarda serían distintos.
- **Fusionar las copias en una sola lista** de tarjetas mezcladas: cada copia en su grupo deja claro de quién es cada propuesta y qué queda por decidir de cada coautor.
- **Elegir automáticamente entre dos propuestas que chocan.**

## Consecuencias
- De la fase 2b quedan: los conflictos con lo que el autor ha escrito desde el envío, con las tres versiones a la vista (hoy, «Has cambiado este texto»); la vista de la ronda entera; el plan B cuando se pierden las marcas; y el tablero de la ronda.
- Dos párrafos nuevos iguales de dos copias no se reconocen como coincidencia: entran los dos.
- El orden y las copias ocultas no viajan con el proyecto: en otro equipo, todas las copias se ven en el orden en que se importaron.
