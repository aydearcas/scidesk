# 0102. El tablero de la ronda (fase 2b, tercer paso)

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11); propuesta pendiente de que el usuario la revise. El usuario pidió seguir con el desarrollo después de la ficha [0101](0101-plan-b-copia-sin-marcas.md).
- **Pregunta del plan:** fase 2b, «tablero de la ronda (R5)»; PLAN.md 5.11, punto 10: a quién se envió, quién ha devuelto su copia y quién falta, con la fecha límite que hayas puesto, cuántas propuestas de cada coautor quedan por resolver y un texto de recordatorio listo para copiar en el correo. El programa no envía correos.

## Qué se decide
1. **La ronda guarda a quién se envió y la fecha límite** (formato de `round.json`, esquema regenerado):
   - `recipients`: cada destinatario con su nombre y, si está en el directorio, su persona (`p-…`) y su correo;
   - `deadline`: la fecha límite, opcional.
   - Los dos campos son opcionales, así que las rondas que ya había siguen valiendo.
2. **Anotar el envío.**
   - Al exportar el Word para coautores, el mensaje ofrece «Anotar el envío».
   - Mientras ninguna ronda anote ese Word, «Copias devueltas» lo recuerda: «Exportaste el Word para coautores el 28 nov. Anota a quién se lo envías para saber quién falta».
   - Anotarlo crea la ronda de esa versión (`noteRound`) con quienes firman el artículo, menos tú, que eres quien tiene «Tu nombre» en los ajustes (`defaultRecipients`). Después se añade o se quita a quien haga falta, también a quien no firma (un revisor lingüístico).
   - Si una copia vuelve antes de anotar nada, la ronda se crea como hasta ahora, sin destinatarios.
3. **El tablero** (`RoundBoard.tsx`, arriba de «Copias devueltas»; `roundBoard` en el núcleo):
   - el nombre de la ronda (con selector si hay varias) y cuándo se envió;
   - la fecha límite, que se cambia allí mismo;
   - «1 de 2 ha devuelto su copia», y si ha pasado la fecha límite;
   - por persona: cuándo devolvió su copia y cuántas propuestas suyas quedan por decidir, o que falta su copia, con «Copiar recordatorio»;
   - después, quien devolvió una copia sin estar en la lista;
   - abajo, «Añadir a alguien…» con los nombres del directorio.
4. **Una copia es de un destinatario** si coincide la persona o el nombre, sin contar tildes, mayúsculas ni espacios («marta rios» es Marta Ríos), y al importarla queda unida a su persona. Al escribir quién la devuelve, se proponen los que faltan.
5. **El recordatorio** se copia al portapapeles en el idioma de la interfaz, con el nombre de pila, el título del artículo, la fecha de envío y la fecha límite; si esa fecha ya ha pasado, lo dice de otra forma. Si no se puede copiar, el mensaje lo enseña entero.
6. **En los recientes**, la línea del artículo dice «han vuelto 1 de 2» cuando la ronda tiene destinatarios.

## Cómo se comprobó
- **Prueba nueva** en `packages/core/test/round-board.test.ts`:
  - los destinatarios por defecto son quienes firman menos el autor, con su correo;
  - anotar la ronda con fecha límite;
  - una copia de «marta rios» es de Marta Ríos Navarro y queda unida a su persona;
  - una copia de alguien que no estaba en la lista sale aparte;
  - el tablero da las copias y lo pendiente de cada uno;
  - quitar la fecha límite deja los destinatarios y las copias.
- Pasan las 247 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, con la demostración:
  - exportar, «Anotar el envío» desde el mensaje, añadir a dos personas y poner una fecha límite ya pasada;
  - devolver la copia de una de ellas con el nombre sin tildes;
  - copiar el recordatorio de la otra, con el texto para la fecha pasada;
  - al recargar, todo sigue ahí;
  - sin el portapapeles, el recordatorio sale en el mensaje.
- Sin probar en Tauri ni en WebKit.

## Por qué
- Con varios coautores revisando a la vez, lo que más se pregunta es quién falta. Saberlo sin buscar en el correo, y tener el recordatorio escrito, ahorra tiempo en cada ronda.
- Lo que no hace el programa, a propósito (R5): no envía correos ni guarda la aprobación final de cada autor, que se sigue haciendo por correo.

## Qué se descartó
- **Crear la ronda sola al exportar**: cada exportación para corregir algo antes de enviarla dejaría una ronda vacía.
- **Enviar los correos desde el programa**.
- **Una vista propia para la ronda**: de momento basta con el tablero junto a las copias en la pestaña «Revisión».

## Consecuencias
- Con este paso queda hecho lo que la fase 2b pedía en el plan. Falta la prueba de «Terminado cuando»: tres coautores, dos con control de cambios y uno sin él, una copia que llega tarde, todo integrado desde una sola vista sin perder citas ni formato. Hay que hacerla con Word real.
- El nombre de la ronda no se puede cambiar desde la ventana (en el formato, sí).
- Las citas vivas al crear un artículo desde un Word, al final de la fase 2 (decisión del usuario del 23/11), son lo siguiente del plan.
