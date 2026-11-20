# 0003. Coautores con Word y fusión de copias devueltas en paralelo

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Preguntas del plan:** P4 y P4b

## Qué se decide
- Los coautores siguen trabajando con Word por correo. La edición simultánea sobre el mismo documento vendrá más adelante (fase 5).
- Lo habitual es que varios coautores revisen en paralelo la misma versión y cada uno devuelva su copia. Por eso **fusionar varias copias devueltas es el núcleo de la fase 2**.

## Por qué
Es la forma real de trabajar: el autor principal manda el manuscrito, recibe varias copias revisadas y traslada a mano los comentarios y cambios a su "copia maestra". Ese traslado manual es el paso que más tiempo cuesta y el que el programa puede ahorrar.

## Qué se descartó
- Importar una sola copia por ronda: no se ajusta a la forma real de trabajar.
- Exigir a los coautores que usen SciDesk: no es realista mientras no exista la edición simultánea.

## Consecuencias
- "Enviar a coautores" guarda la versión de partida; "Importar revisiones" admite varios DOCX a la vez y los compara con ella.
- Hay que detectar también los cambios hechos sin control de cambios, comparando con la versión de partida.
- Vista de fusión con las propuestas de todos los coautores, por párrafo, con conflictos cuando dos tocan la misma frase.
- El DOCX exportado lleva marcas invisibles en citas y referencias cruzadas desde la fase 1, para reconocerlas al reimportar.
- Hace falta un corpus de rondas reales (versión enviada más copias devueltas, anonimizadas si hace falta).
- Detalle en PLAN.md, 5.11 y riesgo 7.4.
