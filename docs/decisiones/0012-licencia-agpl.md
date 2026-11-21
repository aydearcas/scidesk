# 0012. Licencia AGPL-3.0 con acuerdo de contribución

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R36): regla para las dependencias; y con el prototipo 2 ([0026](0026-citas-con-citeproc-js.md)).
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
- citeproc-js se usa bajo su opción AGPL-3.0; una versión con otra licencia lo usaría bajo CPAL. El prototipo 2 confirmó las dos opciones y leyó lo que pide la CPAL: mostrar su atribución en la interfaz al arrancar. SciDesk la muestra en todas sus versiones ([0026](0026-citas-con-citeproc-js.md)).
- **No se copia código GPL ni AGPL de terceros ni se usa como dependencia** (R36). La AGPL lo permitiría, pero la licencia dual solo es posible si todo el código es propio o tiene una licencia que no obligue a publicar el programa entero con ella (permisiva, MPL o con una opción así, como citeproc-js).
- Hay que preparar el texto del CLA y automatizar su firma en GitHub (por ejemplo, con CLA Assistant) antes de aceptar contribuciones externas.
- La integración continua comprueba las licencias de las dependencias (cargo-deny y license-checker) y avisa de cualquiera que solo se pueda usar bajo GPL o AGPL.
- Publicar en la App Store de Apple solo es posible si publica el titular de los derechos.
- Antes de publicar, conviene que lo revise alguien especializado en propiedad intelectual.
