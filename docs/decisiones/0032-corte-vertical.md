# 0032. Corte vertical: el circuito completo con el núcleo, la línea de comandos y la ventana

- **Fecha:** 21/11/2026
- **Estado:** aceptada (primer paso de la fase 1, R42). Las instantáneas usan un formato provisional.
- **Pregunta del plan:** R42 y la primera tarea de la fase 1 (PLAN.md, sección 8)

## Qué se decide
- **El repositorio es un monorepo de npm** con tres paquetes: `packages/formats` (los esquemas, ficha [0031](0031-formatos-v1-con-un-solo-esquema.md)), `packages/core` (el núcleo sin interfaz y la línea de comandos `scidesk`) y `apps/desktop` (Tauri 2 + React + Tiptap).
- **El núcleo no depende del entorno.** Toca los archivos solo a través de una interfaz (`ProjectFs`: leer, escribir de forma atómica y listar, siempre dentro de la carpeta del proyecto), y los estilos y locales de CSL a través de otra. Hay tres implementaciones: disco (Node), memoria y comandos de Tauri. El mismo código exporta e importa en la línea de comandos, en las pruebas y en la ventana.
- **El circuito del corte vertical funciona de punta a punta:**
  1. Crear o abrir un proyecto. Al cargar se normalizan los ids y se valida cada archivo y el conjunto con `@scidesk/formats`.
  2. Escribir en el editor (título, encabezados, párrafos, negrita, cursiva, superíndice, subíndice) e insertar citas, numeradas por citeproc-js tras una pausa de 200 ms.
  3. Guardar: el JSON del editor se valida y se escribe tal cual (R34).
  4. Exportar el DOCX para coautores, con las marcas de la ficha 0025 (marcador por bloque, campos de Zotero con URI por referencia, bibliografía de Zotero, propiedades `ZOTERO_PREF_n` y `SciDesk`, marcador de la instantánea). Antes se guarda una instantánea (R42).
  5. Importar la copia devuelta: se lee su instantánea de partida, se alinean los párrafos (marcador confirmado por contenido y, si no, por parecido) y salen las propuestas. Llevan su autor (`w:author` si venían marcadas; si no, quien devolvió la copia), su tipo, su ancla en desplazamientos de ProseMirror sobre la versión enviada, el ruido oculto y la comprobación de integridad. La copia y sus propuestas se guardan en `articles/<artículo>/rounds/<ronda>/`.
- **citeproc-js se instala desde su repositorio en un commit fijo** (`juris-m/citeproc-js#56e7ef3`, sin modificar), como decía la ficha 0026, y la ventana muestra su atribución.
- **Ids de bloque en el editor:** un complemento da un id nuevo, en la misma transacción, a cada bloque o cita que llega sin id o con uno repetido (Intro copia los atributos del párrafo, y pegar también). Cumple R34 y la regla 1 de la ficha 0021 mientras se escribe, no solo al cargar.
- **El párrafo va primero en la expresión de contenido del documento** (`paragraph | heading | title`): ProseMirror crea con Intro el primer tipo de la expresión, y con el título delante cada párrafo nuevo salía como título del artículo. Se vio al probar la ventana.
- **Rust solo expone cuatro comandos:** `open_project` (diálogo de carpeta), `read_file`, `write_file` (cuerpo binario y ruta en una cabecera; escritura atómica con `sync_all` y renombrado) y `list_files` (sin seguir enlaces simbólicos). Rechazan rutas absolutas, con `..`, con `\` o con `:`. La configuración de seguridad solo concede `core:default` y abrir el diálogo, con una política de contenido estricta.
- **En un navegador, la exportación se ofrece como enlace** y nunca se descarga sola.

## Por qué
- **El corte vertical es para fijar las interfaces entre módulos antes de que haya mucho código encima** (R42). Con él quedan probadas la interfaz de archivos, la de recursos, el formato en disco, la exportación con marcas, la lectura de la copia y el modelo de propuestas, en los tres entornos.
- **Con Word de verdad:** se exportó el proyecto de demostración y un script de COM (`packages/core/tools/word-edit.ps1`) hizo en Word una inserción y un borrado con control de cambios, y un cambio y un párrafo nuevo sin él. Al importar salen las 4 ediciones con su tipo, si venían marcadas y su autor, la integridad cuadra y las citas no generan cambios falsos. La copia sin tocar da 0 propuestas.
- **En la ventana** (navegador, con el núcleo de Tauri simulado, como prevé PLAN.md 6.1): crear el proyecto de demostración, escribir, partir un párrafo, insertar una cita (que pasa a ser la 2 en el texto y en la bibliografía), guardar, exportar (un DOCX de 11 KB con su instantánea) e importar una copia con una inserción marcada y un cambio sin marcar, que da sus dos propuestas.
- **Pruebas automáticas:** 6 del circuito sin Word (exportación con sus marcas, perfil para la revista sin marcas ni metadatos, copia sin cambios, ediciones marcadas y sin marcar con su autor y su ancla, ruido y párrafo nuevo, copia de otro proyecto y rutas fuera del proyecto) y 2 de Rust (rutas fuera del proyecto y escritura atómica).

## Qué se descartó
- **Un núcleo que usa `node:fs` directamente:** no correría en la ventana de Tauri.
- **Dar a la ventana el complemento general de sistema de archivos de Tauri:** abre más de lo necesario; con cuatro comandos propios, la ventana solo alcanza la carpeta abierta.
- **Mandar los archivos por el puente de Tauri como listas de números en JSON:** se envían como bytes (respuesta binaria y cuerpo sin codificar).
- **Descargar el DOCX automáticamente en la vista del navegador.**

## Consecuencias
- **Formato provisional de las instantáneas:** un gzip con el JSON de los archivos del artículo, la biblioteca, las personas y el manifiesto. El formato definitivo (solo lo nuevo desde la instantánea anterior, ficha 0013) va detrás de la misma interfaz y queda para la fase 1.
- **Queda para el resto de la fase 1:** tablas, figuras y listas en la exportación, la plantilla de referencia y el formato de Reumatología Clínica, exportar cambios marcados y comentarios a Word, el esqueleto de la interfaz (navegador por conceptos, atajos, asistente) y el resto de la sección 8.
- **Queda para la fase 2a:** formatos, comentarios, movimientos y párrafos partidos con control de cambios en la importación, el plan B sin instantánea de partida y aceptar o rechazar propuestas.
- **Prueba pendiente en la ventana real de Tauri** con el teclado y el diálogo de carpetas; la parte de Rust compila y pasa sus pruebas, pero la ventana solo se ha probado en el navegador.
- **El script de Word usa el nombre de usuario configurado en Word** para los cambios marcados, así que su salida no entra en el repositorio.
- Detalle en [`packages/core/README.md`](../../packages/core/README.md) y [`apps/desktop/README.md`](../../apps/desktop/README.md).
