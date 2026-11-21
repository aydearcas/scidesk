# 0003. Coautores con Word y fusión de copias devueltas en paralelo

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R2 a R5 y R44). El mecanismo de propuestas se decide en [0019](0019-modelo-unico-de-propuestas.md).
- **Preguntas del plan:** P4 y P4b

## Qué se decide
- Los coautores siguen trabajando con Word por correo. La edición simultánea sobre el mismo documento vendrá más adelante (fase 5).
- Lo habitual es que varios coautores revisen en paralelo la misma versión y cada uno devuelva su copia. Por eso **fusionar varias copias devueltas es el núcleo de la fase 2**.
- **La fusión es a tres bandas** (R2): la **base** es lo que se envió, **la tuya** es tu copia actual y **la suya** es cada copia devuelta. Las propuestas se calculan de la base a la suya y se aplican sobre la tuya; si tú has cambiado el mismo pasaje desde el envío, se muestra como conflicto con las tres versiones.

## Por qué
Es la forma real de trabajar: el autor principal manda el manuscrito, recibe varias copias revisadas y traslada a mano los comentarios y cambios a su "copia maestra". Ese traslado manual es el paso que más tiempo cuesta y el que el programa puede ahorrar.

Comparar cada copia solo con la versión de partida funciona si no tocas tu copia hasta que vuelven todas. En la práctica las copias llegan en días distintos, sigues escribiendo mientras esperas, y a veces un coautor trabaja sobre la copia de otro. La fusión a tres bandas aguanta los tres casos.

## Qué se descartó
- Importar una sola copia por ronda: no se ajusta a la forma real de trabajar.
- Exigir a los coautores que usen SciDesk: no es realista mientras no exista la edición simultánea.
- Comparar cada copia solo con la versión de partida (dos bandas): obliga a no tocar tu copia durante la ronda.
- Devolver a los coautores un DOCX con lo que se hizo con sus propuestas, o un resumen de lo aceptado y lo rechazado (R6): no suele hacer falta.
- Llevar en el programa la aprobación de la versión final por cada autor (R5): se sigue haciendo por correo.

## Consecuencias
- "Enviar a coautores" guarda la versión de partida, y desde la fase 1 cada exportación a DOCX guarda una instantánea, para que exista esa base cuando llegue la fusión (R42).
- "Importar revisiones" admite varios DOCX a la vez y se puede usar tantas veces como haga falta dentro de la misma ronda.
- Hay que detectar también los cambios hechos sin control de cambios, comparando con la versión de partida. Se atribuyen a quien devolvió el archivo; los cambios marcados, al autor de la marca de Word (`w:author`).
- **Marcas del DOCX especificadas** (R3): un marcador oculto con el identificador de cada bloque, cada cita como campo con sus datos (en el formato de Zotero, si el prototipo lo confirma) y cada referencia cruzada como campo `REF`, con los pies numerados con campos `SEQ`. Dos perfiles de exportación: para coautores, con marcas y metadatos, y para la revista, sin ellos.
- **Plan B** (R3): si las marcas se pierden (Google Docs, Pages, LibreOffice, Word en línea o texto copiado a otro documento), se alinea por contenido y las citas se reconocen por su texto.
- **Filtro de ruido** (R4): por defecto se ocultan los cambios que solo afectan al formato, a los espacios y a la tipografía de comillas y guiones, con un contador y la opción de verlos. La referencia a batir es "Combinar" de Word.
- Vista de propuestas de todos los coautores, por párrafo, con conflictos cuando dos tocan la misma frase ([0019](0019-modelo-unico-de-propuestas.md)), y un tablero de la ronda con quién ha devuelto su copia y cuántas propuestas quedan (R5).
- La fase 2 se divide en dos (R44): **2a**, una sola copia con control de cambios y comentarios; **2b**, varias copias, cambios sin marcar, conflictos y copias que llegan tarde.
- Hace falta un corpus de rondas reales (versión enviada más copias devueltas, alguna pasada por Google Docs y LibreOffice, anonimizadas si hace falta).
- Detalle en PLAN.md, 5.10, 5.11 y riesgos 7.4 y 7.11.
