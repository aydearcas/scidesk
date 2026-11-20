# 0009. IA más adelante; sin conexión con revsis-app por ahora

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Los paquetes para LLM se deciden en [0018](0018-paquetes-llm.md), y el alcance de la futura versión con IA, en [0017](0017-adaptacion-sin-ia.md).
- **Preguntas del plan:** P16 y P17

## Qué se decide
- El asistente con IA integrado llega más adelante. Cuando exista el programa se decidirá en qué pasos tiene sentido.
- Por ahora no se conecta SciDesk con revsis-app ni con PICO Creator.

## Por qué
Primero hay que tener el procesador de texto funcionando; con el programa delante será más fácil ver en qué pasos aporta la IA. La conexión con las herramientas de revisión sistemática no es prioritaria.

## Qué se descartó
- Integrar la IA desde el MVP.

## Consecuencias
- El asistente con IA queda en [Después].
- Se propone un mecanismo de **paquetes para LLM**, como en revsis-app, con niveles de confidencialidad para no enviar información específica de la investigación (PLAN.md, 5.12). Primeros usos candidatos: perfiles de revista y diccionarios de especialidad.
- La importación de resultados de revisiones sistemáticas sale de la hoja de ruta.
- Función futura añadida: revisar rasgos típicos de texto generado con IA (rayas, punto y coma y dos puntos en exceso). Primero se señalan sin IA, contando por párrafo con umbrales ajustables, y después un paquete para LLM o la API proponen otra redacción (PLAN.md, 5.12).
