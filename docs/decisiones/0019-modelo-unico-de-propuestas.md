# 0019. Un único mecanismo de propuestas para todo lo que entra de fuera

- **Fecha:** 21/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con el prototipo 6 ([0029](0029-fusion-de-copias-devueltas.md)).
- **Pregunta del plan:** R7 de la revisión de la v0.4

## Qué se decide
Todo lo que propone cambios sobre tu texto desde fuera se trata con **un solo modelo** (un cambio, su autor y su origen) y **una sola vista de revisión**, en la que aceptas o rechazas cada propuesta:
- Las copias de Word de los coautores.
- La respuesta de un paquete para LLM que proponga otra redacción.
- Una copia en conflicto creada por OneDrive o Dropbox.
- Recuperar un párrafo o una sección de una versión antigua.
- En el futuro, un coautor que también use SciDesk y devuelva sus propuestas sin pasar por Word, y el asistente con IA.

## Por qué
- Varias funciones del plan son, por debajo, lo mismo: alguien propone cambios y tú decides.
- Se programa y se aprende una sola vez.
- La futura versión con IA se reduce a decidir por dónde llegan las propuestas: **un LLM es un coautor más**, cuyas propuestas aceptas o rechazas.

## Qué se descartó
- Una vista distinta para cada origen (fusión de coautores, respuestas de LLM, conflictos de sincronización, restaurar versiones): más código y más cosas que aprender.

## Consecuencias
- El modelo se fija en la fase 0, junto con el formato, porque los cambios marcados se guardan en `.scidoc` ([0010](0010-pila-tecnologica.md)).
- La fase 2a lo prueba con una sola copia devuelta antes de complicarlo con la ronda completa ([0003](0003-coautores-con-word-y-fusion.md)).
- El prototipo 6 fijó lo que cada propuesta lleva para la ronda de coautores: autor, si venía marcada, tipo, zona y estado (aplicable, acuerdo, conflicto entre coautores, conflicto con tu copia, ruido oculto), y el grupo «misma frase» ([0029](0029-fusion-de-copias-devueltas.md)).
- Las respuestas de los paquetes para LLM que propongan cambios en el texto llegan a esta vista ([0018](0018-paquetes-llm.md)).
- Detalle en PLAN.md, 6.5.
