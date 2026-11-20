# 0001. Código abierto público con posible versión de pago

- **Fecha:** 20/11/2026
- **Estado:** aceptada. La licencia concreta se decide en [0012](0012-licencia-agpl.md).
- **Pregunta del plan:** P1

## Qué se decide
SciDesk será un proyecto de código abierto público, dejando abierta la posibilidad de una versión o un servicio de pago.

## Por qué
Es la forma de que otros investigadores lo usen y contribuyan, sin renunciar a financiar el desarrollo (instaladores firmados con actualizaciones, servicio de sincronización o soporte institucional).

## Qué se descartó
- Programa cerrado y de pago desde el principio.
- Programa de uso personal sin publicar.

## Consecuencias
- La licencia tiene que permitir una versión de pago: AGPL-3.0 con acuerdo de contribución (CLA), según la decisión 0012.
- El motor de citas va detrás de una interfaz propia, para poder sustituir citeproc-js (CPAL/AGPL) por hayagriva (MIT/Apache) si hiciera falta.
- Comprobación automática de licencias de las dependencias en la integración continua.
