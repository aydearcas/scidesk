# 0012. Licencia AGPL-3.0 con acuerdo de contribución

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** P1b

## Qué se decide
El código de SciDesk se publica bajo **AGPL-3.0**, con los derechos de autor a nombre de quien impulsa el proyecto. Quien contribuya desde fuera firma un **acuerdo de contribución (CLA)** que permite relicenciar, para poder ofrecer una licencia comercial o una versión de pago.

## Por qué
- Ninguna de las licencias candidatas choca con la pila tecnológica (análisis completo en PLAN.md, 6.3).
- El modelo de pago más probable, un servicio de sincronización para la edición simultánea, es justo el que protege la AGPL: quien ofrezca una versión modificada como servicio tiene que publicar su código.
- Empezar con una licencia restrictiva deja todas las puertas abiertas: con el CLA se puede pasar después a una licencia más permisiva. Al revés no, porque lo publicado como MIT sigue siéndolo para siempre.
- No pone ninguna obligación a quien solo usa el programa.

## Qué se descartó
- **MIT y Apache-2.0**: favorecen la difusión, pero permiten que cualquiera haga un producto cerrado con el código.
- **MPL-2.0**: protección baja.
- **GPL-3.0**: en el escritorio protege igual, pero no cubre un futuro servidor.
- **DCO en lugar de CLA**: no da derecho a relicenciar.

## Consecuencias
- citeproc-js se usa bajo su opción AGPL-3.0.
- Hay que preparar el texto del CLA y automatizar su firma en GitHub (por ejemplo, con CLA Assistant) antes de aceptar contribuciones externas.
- La integración continua comprueba las licencias de las dependencias (cargo-deny y license-checker).
- Publicar en la App Store de Apple solo es posible si publica el titular de los derechos.
- Antes de publicar, conviene que lo revise alguien especializado en propiedad intelectual.
