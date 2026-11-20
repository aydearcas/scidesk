# 0013. Historial de versiones con instantáneas propias

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** P15

## Qué se decide
El historial de versiones (versiones con nombre, instantáneas automáticas, comparar y restaurar) se guarda con **instantáneas propias**, no con git:
- Cada archivo se guarda una sola vez por contenido distinto, comprimido y con su huella como nombre, en `.scidesk/historial/objetos/`.
- Cada versión es un pequeño JSON con su nombre, fecha, autor y la lista de archivos con sus huellas.
- Los archivos se escriben una vez y nunca se modifican.

## Por qué
- Lo que git hace mejor (ramas y fusiones) no se usaría: la fusión de las revisiones de los coautores se hace sobre el documento, no sobre líneas de JSON.
- Sincronizar la carpeta con OneDrive o Dropbox entre el PC y el MacBook es justo donde git es frágil, porque modifica archivos en cada operación. Con archivos que solo se añaden no hay conflictos.
- Es mucho más sencillo: sin dependencias externas ni código en C que compilar en Windows y macOS.

## Qué se descartó
- **git invisible** con gitoxide o libgit2.
- **Sin historial propio**, dejándolo al historial de OneDrive o a un git manejado a mano: no permite versiones con nombre ni comparar.

## Consecuencias
- El historial va detrás de una interfaz propia, para poder cambiar de mecanismo más adelante.
- Cada versión pertenece a un artículo e incluye los datos comunes que usa (referencias citadas y fichas de sus autores), de modo que restaurar un artículo no toca los demás ([0015](0015-varios-articulos-por-proyecto.md)).
- Hay que programar una comparación propia por párrafos y palabras, que también sirve para la fusión de revisiones.
- [Después] "Exportar el historial a un repositorio git".
- El usuario puede usar git por su cuenta sobre la carpeta del proyecto; solo tiene que ignorar `.scidesk/`.
- Detalle en PLAN.md, 6.4.
