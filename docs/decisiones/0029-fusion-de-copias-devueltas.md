# 0029. Fusión de las copias devueltas: propuestas por copia y fusión a tres bandas por zonas

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 6 de la fase 0). Concreta la fusión de [0003](0003-coautores-con-word-y-fusion.md) y el modelo de propuestas de [0019](0019-modelo-unico-de-propuestas.md).
- **Pregunta del plan:** R2 a R4, prototipo 6 de la sección 8

## Qué se decide

### Propuestas de cada copia
Se calculan siempre de la copia enviada a la copia devuelta:
1. **Alinear los párrafos por contenido** (también las celdas de tabla): los idénticos en orden y, en los huecos, por parecido. Los marcadores de SciDesk ([0025](0025-docx-con-marcas-y-campos.md)), cuando existan, guían la alineación, pero la identidad se confirma por contenido.
2. **Lo hecho sin control de cambios** es la diferencia entre la enviada y la copia con todo lo marcado rechazado. Se atribuye a quien devolvió la copia.
3. **Lo hecho con control de cambios** sale de sus marcas, con el autor de cada una (`w:author`).
4. **Además:**
   - formato (`w:rPrChange`);
   - comentarios con su ancla;
   - párrafos partidos (marca de párrafo insertada);
   - frases movidas (borrado e inserción del mismo texto, o `w:moveFrom`/`w:moveTo`).
5. **Ruido** (R4): lo que no cambia nada una vez normalizados los espacios, las comillas y los guiones se oculta, con un contador.
6. **Unión de trozos:** los trozos de una edición que el diff separa por un espacio o una palabra corta se unen.

**Comprobación de integridad:** aplicar todas las propuestas de una copia a la enviada debe dar esa copia con todo aceptado. Si no, se avisa.

### Fusión a tres bandas
Las propuestas de todas las copias se aplican sobre la copia actual del autor:
- **Agrupadas por zonas:** propuestas que se solapan, con un carácter de holgura.
- **Si dos coautores llegan al mismo resultado** en una zona, comparando el resultado y no las piezas y normalizando el ruido, es un **acuerdo**, y se aplica una vez.
- **Si llegan a resultados distintos**, es un **conflicto entre coautores**.
- **Si el autor también cambió esos caracteres** desde el envío, es un **conflicto con su copia**.
- **Cambios de varios coautores en la misma frase** sin solaparse se muestran juntos y se aplican los dos.
- **Formatos y comentarios** van aparte y no entran en conflicto.

## Por qué
- **En la ronda sintética** (dos coautores, 75 ediciones, 8 sin control de cambios, 4 zonas de conflicto preparadas a propósito), cada copia por separado da:
  - las 75 ediciones encontradas, con su autor;
  - todas bien clasificadas entre marcadas y sin marcar, y con su tipo;
  - el ruido marcado;
  - 0 falsos positivos;
  - cada copia reconstruida exactamente;
  - 6–7 ms por copia.
- **La fusión con una copia del autor que también había cambiado cosas:**
  - conserva sus tres cambios;
  - detecta el conflicto con su copia;
  - encuentra 5 acuerdos (uno marcado frente a otro sin marcar, y «<5 %» frente a «< 5 %») y 4 conflictos reales entre coautores;
  - aplica el resto sin intervención.
- **«Combinar» de Word**, con las mismas copias, recupera con el autor correcto 32 de 37 ediciones de una coautora y 26 de 38 del otro, y además:
  - atribuye cambios a quien no los hizo;
  - deja 7 diferencias sin marcar;
  - pierde un párrafo partido;
  - muestra el ruido;
  - en las zonas compartidas, entremezcla los cambios dentro de las palabras.

## Qué se descartó
- **Fusionar las copias en cadena** (la primera sobre la enviada, la segunda sobre el resultado), como hace Word: mezcla autores y hace depender el resultado del orden en que llegan las copias.
- **Comparar las propuestas pieza a pieza** para decidir acuerdos: el mismo cambio puede llegar en una pieza o en dos.
- **Fiarse solo de las marcas de control de cambios:** un coautor de cada tres o cuatro cambia cosas sin marcar.

## Consecuencias
- **Fase 2a (una copia)** usa los pasos 1 a 6 y la comprobación de integridad.
- **Fase 2b (la ronda completa)** añade la fusión por zonas y el tablero de la ronda (R5).
- **El modelo de propuestas** ([0019](0019-modelo-unico-de-propuestas.md)) necesita:
  - el estado de cada propuesta (aplicable, acuerdo, conflicto con coautores, conflicto con tu copia, ruido oculto);
  - su autor y si venía marcada;
  - su zona;
  - el grupo «misma frase».
- **Queda por probar:**
  - una ronda real;
  - copias pasadas por Google Docs, LibreOffice, Pages o Word para Mac;
  - reescrituras de párrafo tan grandes que la alineación por parecido falle;
  - párrafos unidos sin marcar;
  - filas de tabla nuevas;
  - copias que llegan cuando la tuya ya ha incorporado otras.
- Detalle y cifras en [`prototypes/06-merge-copies/README.md`](../../prototypes/06-merge-copies/README.md).
