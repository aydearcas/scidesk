# Prototipo 6: fusión de las copias devueltas

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R2 a R4). Decisión resultante: [ficha 0029](../../docs/decisiones/0029-fusion-de-copias-devueltas.md).

## Pregunta

Varios coautores devuelven sus copias, con y sin control de cambios. ¿Se recuperan bien sus cambios y su autor? Más en concreto:
- ¿Se fusionan a tres bandas (lo enviado, tu copia actual y cada copia devuelta), filtrando el ruido y señalando los conflictos?
- ¿Mejora a «Combinar» de Word?

## Respuesta

**Sí, y mucho mejor que «Combinar».**

Con la ronda sintética de `prototypes/corpus/synthetic-round-knee-oa/`, SciDesk recupera:
- las **75 ediciones** de los dos coautores, **todas, con su autor**;
- la clasificación entre «con control de cambios» y «sin él», incluidas las 8 que Soler hizo sin marcar;
- el tipo de cada una (frases movidas, párrafos partidos, comentarios y formatos);
- el ruido tipográfico, marcado como tal.

Y no inventa ninguna: 0 falsos positivos.

**La fusión a tres bandas** con una copia del autor que también había cambiado cosas:
- encuentra los conflictos diseñados;
- reconoce cuándo los dos coautores hicieron lo mismo;
- aplica el resto sin tocar los cambios del autor.

**«Combinar» de Word**, con las mismas copias, recupera con el autor correcto 32 de 37 ediciones de Ríos y 26 de 38 de Soler. En las zonas que tocan los dos, entremezcla los cambios dentro de las palabras.

### Cada copia por separado (`src/run-score.mjs`)

| | Ríos (37 ediciones, todas con control de cambios) | Soler (38 ediciones, 8 sin control de cambios) |
|---|---|---|
| Encontradas | 37/37 | 38/38 |
| En una sola propuesta | 36 (la otra es una frase movida: origen y destino) | 36 (frase movida y una edición sin marcar en dos trozos) |
| Autor correcto | 37/37 | 38/38 |
| Con o sin control de cambios, bien clasificadas | 37/37 | 38/38 |
| Tipo reconocido (movida, partida, comentario, formato) | 37/37 | 38/38 |
| Ruido marcado como ruido | 1/1 | 1/1 |
| Falsos positivos | 0 | 0 |
| Tiempo | 7 ms | 6 ms |

**Aplicar todas las propuestas de una copia a la enviada da exactamente esa copia con todo aceptado,** en las dos. Las propuestas no pierden nada.

**Cómo se calculan** (`src/proposals.mjs`):
1. **Alinear por contenido (plan B).** Los párrafos de la copia (con sus cambios marcados rechazados) se alinean con los de la enviada por contenido: primero los idénticos, en orden, y en los huecos, por parecido. `sent.docx` no lleva marcas de SciDesk, así que toda la prueba es el plan B (5.11, punto 9). 158 de 158 párrafos, también las 59 celdas de tabla.
2. **Lo hecho sin control de cambios** es la diferencia entre la enviada y la copia con todo lo marcado rechazado. Se atribuye a quien devolvió la copia.
3. **Lo hecho con control de cambios** sale de las propias marcas, con su `w:author`. Las posiciones se trasladan a la enviada.
4. **Formato** (`w:rPrChange`), **comentarios** con su ancla, **párrafos partidos** (marca de párrafo insertada) y **frases movidas**: un borrado y una inserción del mismo texto (en este corpus van como `w:del`/`w:ins`; el prototipo 3 vio que Word también escribe `w:moveFrom`/`w:moveTo`, que el lector trata igual).
5. **Ruido** (R4): cambios que, normalizados los espacios, las comillas y los guiones, no cambian nada. Se ocultan con un contador.
6. **Unión de trozos.** Los trozos de una misma edición que el diff por palabras separa por un espacio o una palabra corta se unen.

### La fusión a tres bandas (`src/merge.mjs`)

«Tu copia» es la enviada más tres cambios inventados:
- uno sobre los mismos caracteres que cambia Ríos;
- uno en un párrafo que tocan los dos coautores, en otro sitio;
- uno en un párrafo que no toca nadie.

| Resultado | |
|---|---|
| Propuestas | 78 (Ríos 38, Soler 40) |
| Cambios de texto visibles | 56 |
| Aplicados sobre tu copia sin conflicto | 41 |
| **Acuerdos** (los dos hicieron lo mismo; se aplica una vez) | 5 zonas, 6 propuestas |
| **Conflictos entre coautores** (mismos caracteres, resultado distinto: hay que elegir) | 4 zonas, 8 propuestas |
| **Conflicto con tu copia** | 1 |
| Cambios de los dos en la misma frase (se muestran juntos y se aplican) | 6 |
| Ruido oculto | 2 |
| Formatos y comentarios (aparte, sin conflicto) | 6 y 14 |
| Tus tres cambios, conservados | 3/3 |

**Las cuatro zonas que se pidieron a los dos coautores a propósito** salen como se esperaba:
- **S1 (la frase del 4 % en la OAI) y S2 (la frase de Driban):** cambios de los dos en la misma frase, sin tocar los mismos caracteres.
- **S3 (la celda «4 %»):** Ríos escribió «<5 %» y Soler «< 5 %». Es un **acuerdo**, porque solo difieren en un espacio.
- **S4 (la primera frase de las conclusiones):** cambios de los dos en la misma frase, y además **conflicto con tu copia**, porque tú también cambiaste ese «10 %».

**Los acuerdos se reconocen comparando el resultado de cada coautor en toda la zona,** no las piezas. En ¶8, Ríos escribió «en cuatro años o menos» con control de cambios y Soler lo mismo sin él, en dos trozos: es un solo cambio.

### «Combinar» de Word (`tools/word-combine.ps1`, `src/score-word.mjs`)

Se combinó, como haría un usuario, la enviada con la copia de Ríos y el resultado con la de Soler. Los cambios sin marcar se etiquetaron con el nombre de cada coautor, como permite el cuadro de diálogo. Tardó menos de 1 s y dejó 106 revisiones y 14 comentarios.

| | SciDesk | «Combinar» de Word |
|---|---|---|
| Ediciones de Ríos encontradas con su autor | 37/37 | 32/37 |
| Ediciones de Soler encontradas con su autor | 38/38 | 26/38 |
| Cambios atribuidos a quien no los hizo | 0 | 4 revisiones a la autora de la copia enviada; un formato de Soler atribuido a Ríos |
| Diferencias que quedan sin marcar | 0 | 7 |
| Párrafo partido de Ríos | reconocido | perdido |
| Ruido tipográfico | oculto (2) | a la vista (6 revisiones) |
| Conflictos y acuerdos | señalados por zona | cambios entremezclados dentro de las palabras («elen», «eses», «[[»), con espacios perdidos («aleatorizadomostró») |
| Copias a la vez | todas | dos cada vez |

La comparación con Word usa la misma puntuación: el resultado se lee como una copia más y cada edición se busca entre las revisiones con el nombre de su coautor. En las zonas en conflicto, parte de lo que Word «no encuentra» está ahí, pero mezclado con el cambio del otro coautor, que es justo lo que el usuario tendría que desenredar a mano.

## Lo que este prototipo no cubre

- **Una ronda real.** La sintética la escribieron modelos de lenguaje y la aplicó Word por COM (sin autocorrección, sin varias sesiones). No sustituye a una ronda real en la fase 2b.
- **Copias pasadas por Google Docs, LibreOffice, Pages o Word para Mac:** no estaban disponibles. Como toda la prueba ya va por contenido (plan B), lo que falta es comprobar qué más cambian esas herramientas (estilos, comentarios, cambios marcados).
- **Las marcas de SciDesk.** La copia enviada no salió del exportador del prototipo 3, así que no se usaron los marcadores de bloque. Con ellos, la alineación es más segura, pero la regla de 0025 sigue: confirmar por contenido.
- **Reescrituras grandes.** Un párrafo reescrito tanto que no se parece a ninguno de la enviada (menos de un 50 % de palabras en común) saldría como borrado más párrafo nuevo. En este corpus no hubo ninguno.
- **Párrafos unidos sin control de cambios, tablas con filas nuevas, y copias que llegan tarde** sobre una copia tuya que ya ha incorporado otras (R2): el modelo lo permite (las propuestas van siempre de la enviada a cada copia), pero no se ha probado.
- **La interfaz:** cómo se ven las propuestas, los acuerdos y los conflictos (fase 2, ficha 0019).

## Cómo se ejecuta

Requisitos: Node 24; Word de escritorio en Windows para la comparación con «Combinar».

```powershell
npm install
node src/run-score.mjs
node src/merge.mjs
powershell -ExecutionPolicy Bypass -File tools\word-combine.ps1
node src/score-word.mjs
```

- `run-score.mjs`: propuestas de cada copia, puntuadas contra la verdad de referencia (`out/score.json`).
- `merge.mjs`: la fusión a tres bandas con «tu copia» (`out/merge.json` con los conflictos, acuerdos y zonas compartidas, y `out/merged.txt` con el texto fusionado).
- `word-combine.ps1`: «Combinar» de Word sobre las mismas copias (`out/word-combined.docx`).
- `score-word.mjs`: la misma puntuación para el resultado de Word.

## Archivos

- `src/read-revisions.mjs`: el lector. Da los párrafos (también de tablas) como tramos sin cambios, insertados o borrados con su autor y fecha, más los formatos, las marcas de párrafo y los comentarios.
- `src/proposals.mjs`: alineación y propuestas de una copia.
- `src/merge.mjs`: la fusión a tres bandas.
- `src/score.mjs`, `src/run-score.mjs` y `src/score-word.mjs`: la puntuación.
- `tools/word-combine.ps1`: «Combinar» de Word por COM.
