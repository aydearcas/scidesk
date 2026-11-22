# 0052. Biblioteca vinculada a una colección de Zotero, en la ventana

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al retomar la fase 1, en el orden de lo pendiente; falta que el usuario la revise).
- **Pregunta del plan:** ficha 0007 (biblioteca propia o vinculada a Zotero) y ficha 0027 (Zotero por su API local, prototipo 5); paso 3 del asistente (ficha 0048).

## Qué se decide
- **El paso 3 del asistente** ofrece «Vinculada a una colección de Zotero». Al elegirlo, SciDesk pregunta a Zotero por su API local:
  - **Zotero abierto:** muestra sus colecciones en árbol, con su número de elementos. Se incluyen las subcolecciones; las notas y los adjuntos no entran.
  - **Zotero cerrado:** «Zotero no está abierto», con «Volver a probar».
  - **API local desactivada (403):** explica dónde activarla: Editar › Ajustes › Avanzado, «Permitir que otras aplicaciones de este equipo se comuniquen con Zotero».
  - **Otro Zotero ha contestado:** lo dice.
- **Al crear el proyecto**, el manifiesto guarda `library: { mode: "zotero", zotero: { library: "user", collection, name } }` y la biblioteca se llena enseguida desde la colección.
- **Al sincronizar** (`syncZoteroLibrary` en el núcleo) se lee la colección entera y se compara por la clave de cada elemento:
  - lo nuevo entra con un id propio de SciDesk;
  - lo cambiado conserva su id;
  - lo que ya no está en la colección sale de la biblioteca, salvo que se cite en algún artículo (también en el texto sin guardar). En ese caso se queda con sus últimos datos y se avisa.
  - El CSL-JSON se normaliza como cualquier importación (`journalAbbreviation` → `container-title-short`, años como números) y lo que no cabe va a `source.unmapped`.
  - Cada entrada lleva su enlace (`zotero.key`, `zotero.uri`), que es el URI que va en las citas del DOCX (ficha 0027).
  - Si nada cambia, no se escribe `library.json`.
- **Cuándo se sincroniza:**
  - **al abrir el proyecto**, en silencio. Si Zotero está cerrado, solo un aviso: «Zotero no está abierto: se usa la última copia de «…»»;
  - **con «Sincronizar con Zotero»**, que en la Biblioteca sustituye a «Importar referencias…» cuando la biblioteca está vinculada.
  Las referencias se añaden y se editan en Zotero; SciDesk no escribe en Zotero.
- **Cómo llega la ventana a Zotero:**
  - **En la ventana de Tauri:** un comando de Rust (`zotero_get`, en `src-tauri/src/zotero.rs`) hace la petición HTTP él mismo, porque la página no puede llamar a otro origen. Solo hace GET a 127.0.0.1:23119, solo bajo `/api/users/0/` (la biblioteca propia, de lectura), con ASCII sin espacios, «..», «#» ni «\\», y con un `Zotero-Server-ID` de letras y números. Probado en la ventana real: 6 ms, y rechaza otras rutas y cabeceras inyectadas.
  - **En la vista del navegador:** un intermediario del servidor de desarrollo (`/zotero-api/users/0/` en `vite.config.ts`). Cambia el `Host`, porque Zotero rechaza otro (protección contra *DNS rebinding*), y quita las cabeceras propias del navegador.
  - **En la línea de comandos:** `fetch` (`scidesk zotero-collections`, `scidesk new … --zotero <clave>` y `scidesk zotero <carpeta>`).
- **Un artículo nuevo dentro de un proyecto vinculado** usa la misma colección (ficha 0051); no se le puede añadir un archivo de referencias.

## Por qué
- **El usuario lo pidió en el plan** (biblioteca propia o vinculada a Zotero) y el prototipo 5 ya había probado la API local.
- **Leer la colección entera** es sencillo y rápido: una colección de 30 elementos tarda unos 60 ms. La comparación por clave no necesita el estado de cada equipo.
- **No borrar lo citado** evita que un cambio en Zotero rompa el manuscrito: una cita sin referencia saldría vacía en el Word y en el PDF.
- **Un comando de Rust con una lista de lo permitido**, y no un permiso general de red para la página, sigue el principio del plan de no dar a la página más alcance del necesario (PLAN 6.6).

## Qué se descartó
- **Sincronización incremental** (`since` y versiones guardadas en el estado de cada equipo, ficha 0031): se deja para bibliotecas grandes. Hoy cada sincronización lee la colección.
- **El complemento HTTP de Tauri** (`tauri-plugin-http`) con un permiso para 127.0.0.1: daría a la página más de lo necesario y otra dependencia.
- **Escribir en Zotero** (añadir lo encontrado en PubMed o por DOI): necesita la autorización de Zotero 10 con el usuario delante (prototipo 5).

## Consecuencias
- **Probado con la instancia de prueba del prototipo 5** (Zotero 10.0.3 con perfil propio en `prototypes/05-zotero/private/`, nunca el Zotero del usuario):
  - desde la línea de comandos: proyecto vinculado con 30 referencias; la segunda sincronización no cambia nada; el DOCX para coautores se exporta sin avisos;
  - en la vista del navegador: el asistente muestra las dos colecciones en árbol, crea el proyecto con 30 referencias y «Sincronizar con Zotero» dice que ya está al día; al volver a abrirlo con Zotero cerrado avisa y usa la copia;
  - en la ventana de Tauri, el comando de Rust.
- **Sin probar** el asistente completo en la ventana de Tauri (pide una carpeta) ni con el Zotero del usuario.
- **Pruebas nuevas:**
  - `packages/core/test/zotero.test.ts`, contra una API simulada (árbol, subcolecciones, errores, alta, cambio, baja y referencia citada que se queda);
  - dos pruebas de Rust (rutas permitidas, respuestas normales y por trozos).
- **Pendiente:**
  - sincronización incremental para bibliotecas grandes;
  - bibliotecas de grupo;
  - buscar en Zotero desde la cita rápida (`q=`, ficha 0027);
  - escribir en Zotero;
  - vincular o desvincular la biblioteca de un proyecto que ya existe;
  - que la sección «Importaciones» de la Biblioteca no se muestre en una biblioteca vinculada.
