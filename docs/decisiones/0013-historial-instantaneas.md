# 0013. Historial de versiones con instantáneas propias

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R26 y R42): un archivo por instantánea y la caché fuera de la carpeta del proyecto.
- **Pregunta del plan:** P15

## Qué se decide
El historial de versiones (versiones con nombre, instantáneas automáticas, comparar y restaurar) se guarda con **instantáneas propias**, no con git:
- **Cada versión es un archivo** en `.scidesk/history/` con su nombre, fecha, autor, la lista de archivos del proyecto con sus huellas y, comprimido, solo el contenido nuevo de esa versión (lo que no estaba en una instantánea anterior).
- Los archivos se escriben una vez y nunca se modifican.
- **En la carpeta del proyecto solo viaja el historial.** La caché, el estado de la ventana y los ajustes locales van a la carpeta de datos de la aplicación del sistema, asociados al identificador del proyecto (R26).

La v0.4 guardaba cada archivo por separado, una vez por contenido distinto (`.scidesk/historial/objetos/`). Eso producía miles de archivos pequeños, que es lo que peor llevan OneDrive y Dropbox; con un archivo por instantánea quedan decenas.

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
- Olvidar instantáneas automáticas antiguas exige compactar, porque una instantánea puede guardar contenido que usan las posteriores: se escribe un archivo nuevo con lo que sigue haciendo falta y después se borran los antiguos.
- Desde la fase 1, cada exportación a DOCX guarda una instantánea, aunque la interfaz del historial llegue en la fase 2: es la base de la fusión a tres bandas (R42, [0003](0003-coautores-con-word-y-fusion.md)).
- Recuperar un párrafo o una sección de una versión antigua llega como propuesta ([0019](0019-modelo-unico-de-propuestas.md)).
- [Después] "Exportar el historial a un repositorio git".
- El usuario puede usar git por su cuenta sobre la carpeta del proyecto; solo tiene que ignorar `.scidesk/`.
- Detalle en PLAN.md, 6.4. Formato definitivo, vista «Historial», restaurar y traer un párrafo: ficha [0099](0099-historial-de-versiones-con-nombre.md).
