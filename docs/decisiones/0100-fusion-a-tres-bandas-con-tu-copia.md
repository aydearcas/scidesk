# 0100. Fusión a tres bandas con tu copia (fase 2b, primer paso)

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11); propuesta pendiente de que el usuario la revise. El usuario pidió seguir con el desarrollo después de la ficha [0099](0099-historial-de-versiones-con-nombre.md).
- **Pregunta del plan:** fase 2b, «fusión a tres bandas con conflictos entre coautores y copias que llegan tarde (R2)»; PLAN.md 5.11, punto 4: «si tú has cambiado el mismo pasaje desde el envío, se muestra como conflicto con las tres versiones». Los conflictos entre coautores ya están en la ficha [0098](0098-varias-copias-devueltas-a-la-vez.md).

## Qué fallaba
- **Una propuesta sobre texto que el autor había cambiado desde el envío** se quedaba en el panel con «Has cambiado este texto desde que enviaste la copia: hazlo a mano si quieres». No se veía qué había cambiado cada uno.
- **Si el autor había escrito lo mismo que el coautor en el mismo punto** (los dos añaden «sobre todo» tras «afecta»), la propuesta entraba igualmente y el texto quedaba duplicado.

## Qué se decide
1. **La zona del choque** (`zoneOf` en `proposal-place.ts`).
   - Es el tramo del bloque enviado que comparten la propuesta y los cambios del autor desde el envío. Un cambio que toca el tramo, o que solo tiene espacios entre él y el tramo, entra en la zona, hasta que no quede ninguno en sus bordes.
   - Se amplía a palabras enteras.
   - `placeProposal` la devuelve con el problema `changed` (`zone`), en tres versiones: la enviada (`base`), la tuya ahora (`mine`) y la del coautor (`theirs`, la enviada con la propuesta aplicada). Da también dónde está ahora en el bloque y si dentro hay cambios marcados (`free`).
   - Una inserción en el mismo punto donde el autor también insertó (con solo espacios en medio) también es zona compartida.
2. **Si tu texto ya dice lo mismo que el suyo** (comparando el resultado, sin espacios de más), la propuesta queda **«Tu texto ya dice lo mismo»**, con «Dar por hecha» (aceptada) o «Rechazar». «Aceptar todas» también las da por hechas.
3. **Si dicen cosas distintas**, la tarjeta enseña las tres versiones («Enviado», «Tuyo ahora», «De Marta») con:
   - **«Usar la suya»** (`useTheirs`): pone su versión del tramo en el texto como cambio marcado suyo, sobre la tuya, en un paso que se deshace. Solo marca las palabras que difieren, así que lo que conservan las dos (una cita, por ejemplo) se queda. Después se acepta o se rechaza como cualquier otra propuesta;
   - **«Quedarse con la tuya»**: la rechaza;
   - «Copiar su texto» y «Ya lo he hecho», para combinarlas a mano.
4. **Si en la zona hay cambios marcados**, no se ofrece «Usar la suya»: el aviso pide decidir antes esos cambios, o hacerlo a mano.

## Cómo se comprobó
- **Prueba nueva** en `packages/core/test/proposal-place.test.ts`:
  - «el primer año» enviado, «el primer semestre» tuyo y «los primeros doce meses» de Marta dan las tres versiones exactas y el tramo en el texto actual;
  - lo mismo escrito por los dos da texto igual;
  - la misma inserción en el mismo punto no se pone dos veces;
  - un cambio dentro de una palabra se amplía a la palabra entera.
- Pasan las 243 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, con una copia que llega tarde: se exporta el Word para coautores, después se cambia el texto, y la copia de Marta toca ese tramo y además hace un cambio que el autor ya había hecho.
  - La primera propuesta enseña las tres versiones; la segunda, «Tu texto ya dice lo mismo», sin duplicar el texto.
  - «Usar la suya» pone «los primeros doce meses» sobre «el primer semestre» como cambio de Marta, conservando la cita, y «Aceptar» lo deja en el texto.
  - Sin errores en la consola.
- Sin probar en Tauri ni en WebKit.

## Por qué
- Es el caso de la copia que llega cuando ya has integrado otras y seguido escribiendo. Con las tres versiones a la vista se decide en un momento, sin buscar a mano qué cambió cada uno.
- Comparar el resultado y no las piezas reconoce los acuerdos aunque el diff los parta de otra forma (prototipo 6, ficha 0029).

## Qué se descartó
- **Aplicar la suya sin preguntar**, o buscar su texto cerca: puede pisar lo que escribiste.
- **Combinar automáticamente las dos versiones**: lo decide el autor, con «Copiar su texto» si quiere mezclarlas.

## Consecuencias
- **Siguientes pasos de la fase 2b:**
  - el plan B cuando la copia no dice de qué versión salió;
  - el tablero de la ronda;
  - una vista de la ronda entera que recorra las propuestas por zonas.
- Un párrafo nuevo del coautor junto a uno nuevo tuyo en el mismo sitio no se compara: entran los dos.
