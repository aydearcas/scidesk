# 0054. «Listo para enviar» en los proyectos recientes

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al retomar la fase 1, en el orden de lo pendiente; falta que el usuario la revise). Adelanta lo que la ficha 0048 dejaba para la vista Revista.
- **Pregunta del plan:** propuesta de interfaz 5.7 (estados de cada artículo en el inicio: «Con coautores · ronda N», «Borrador», «Listo para enviar»).

## Qué se decide
- **«Listo para enviar» se calcula a partir de las comprobaciones** (ficha 0041); no es una marca que ponga el usuario. Un artículo está listo cuando:
  - el texto tiene palabras;
  - cada resumen tiene texto y palabras clave (una carta, sin resumen, no los necesita);
  - firma alguien;
  - tiene revista y su perfil tiene límites para su tipo de artículo;
  - nada impide el envío (los avisos de límite superado);
  - no quedan pendientes (XX, ??, [REF], TODO…).
- **No cuentan:**
  - los avisos que el usuario marcó como «Es correcto» o «No aplica»;
  - lo que solo conviene revisar: tablas, figuras o referencias sin citar, palabras clave por debajo del mínimo…
- **En el inicio, el orden de los estados es**:
  1. «Con coautores · ronda N», si hay una ronda;
  2. si no, «Listo para enviar», con la insignia verde de «correcto»;
  3. si no, «Borrador».
  Al pasar el ratón por «Borrador» se ve lo que falta («Para estar listo para enviar falta: resumen en cada idioma, palabras clave en cada idioma, autores»). En la línea de debajo se añaden, cuando los hay, los avisos que impiden el envío y los pendientes («1 aviso impide el envío · 2 pendientes»), junto a las palabras frente al límite que ya se mostraban.
- **En el núcleo:** `readiness(report)` en `checks.ts` devuelve `{ ready, missing, blocking, pending }`. `missing` usa estos códigos, en este orden: `empty`, `abstract`, `keywords`, `authors`, `no-journal`, `blocking`, `pending`.
- **Se guarda con el resumen de cada artículo** en los recientes del equipo (`ready`, `blocking`, `pending` y `missing`). Se recalcula, como el resto del resumen, al abrir el proyecto y tras cada comprobación.

## Por qué
- **El inicio ya mostraba palabras frente al límite.** Con las comprobaciones hechas, decir si queda algo que impida el envío no cuesta nada, y es lo más útil del estado de un borrador.
- **Calcularlo, y no marcarlo a mano,** evita que diga «listo» un artículo que ha cambiado después.
- **Sin una revista con límites no se puede afirmar que esté listo:** no hay contra qué comprobar.

## Qué se descartó
- **Esperar a la vista Revista (fase 3)**, como decía la ficha 0048. Esa vista añadirá lo que pide el formulario de envío (declaraciones, carta de presentación, archivos), y entonces este estado se ampliará.
- **Contar los avisos «conviene revisar»:** casi ningún artículo real llegaría a estar listo por una referencia de la biblioteca sin citar.

## Consecuencias
- **Prueba nueva** en `checks.test.ts`:
  - bloqueado por un límite, que deja de bloquear al marcarlo como correcto;
  - un pendiente que vuelve a impedirlo;
  - sin límites para el tipo de artículo;
  - un artículo nuevo vacío, al que le faltan texto, resumen, palabras clave y autores.
- **Probado en la vista del navegador:**
  - artículo nuevo de Reumatología Clínica con una frase: «Borrador», con lo que falta;
  - insignia y líneas de un artículo listo y de uno bloqueado, con los recientes modificados a mano solo para verlos.
