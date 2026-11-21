# Prototipo 11: el editor en el MacBook (WebKit)

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R37). Decisión resultante: [ficha 0030](../../docs/decisiones/0030-tauri-confirmado.md).

## Pregunta

¿Se comporta igual el editor en el motor web del Mac (WebKit, el de WKWebView en Tauri)? Se repitieron en el MacBook Air:
- el pegado de tablas desde Word (prototipo 1);
- la edición básica con control de cambios (prototipo 8);
- el corrector (prototipo 9);
- las mediciones de citeproc-js (prototipo 2).

Con la respuesta se decide entre Tauri y Electron (tres condiciones de PLAN.md, 6.1).

## Respuesta

**Sí, con un fallo importante que ya está arreglado y dos detalles de espacios.**

Se probó en Safari 26.5 en macOS, con Word para Mac, el 21/11/2026. Safari usa el mismo WebKit que WKWebView; la ventana real de Tauri se comprobará en el corte vertical de la fase 1.

| Prueba | Resultado en el Mac |
|---|---|
| **Pegar 12 tablas** del informe de RS (celdas combinadas, superíndices, encabezados, tabla anidada, tablas de 33 y 44 filas) | Con el limpiador: **10 perfectas**; 2 con un espacio perdido (detalles abajo). Sin limpiador: 3 de 12. Se ajustó el limpiador para Word para Mac y Windows sigue en 135 de 135 |
| **Edición básica:** acentos, ñ, ¿¡, Intro y Retroceso entre párrafos, ⌘Z/⌘⇧Z, ⌘B/⌘I, Tab en tablas | Sin problemas |
| **Modo sugerencias** (control de cambios) con acentos | **Fallaba** («sí» quedaba como «s´í»). Arreglado en el puente del prototipo 8; comprobado en el Mac: «sí qué año pingüino» se guarda como una sola sugerencia, con su autor y bien marcada |
| **Corrector:** subrayado, sugerencias con el botón derecho, fragmento en inglés | Sin problemas |
| **Citas de EndNote pegadas** desde Word (3 párrafos, 16 citas) | **Llegan solo como texto** («(1)»): Safari no entrega ni los campos ni el RTF |
| **Mediciones** | Iguales o mejores que en Chromium (tabla abajo). El corrector da exactamente los mismos resultados |

### El fallo de los acentos en el modo sugerencias

**Qué pasa.** En el Mac, la tecla de acento (´ y luego i) abre una *composición*: WebKit muestra un «´» provisional y lo sustituye por «í» al terminar. El modo sugerencias convertía cada paso en una sugerencia. Eso rompía el seguimiento que hace ProseMirror de la composición y dejaba «s´í».

**A quién afecta.** No depende de Tauri: Chrome en el Mac también usa composición para los acentos, así que Electron tendría lo mismo. Tampoco se vio en Windows, porque allí las teclas de acento del teclado español no abren composición.

**El arreglo** (`../08-composite-document/src/editor.js`, `compositionPlugin`):
1. Mientras dura la composición, las transacciones pasan sin convertir y fuera del historial de deshacer.
2. Al terminar, espera a que WebKit dé la composición por cerrada.
3. Deshace lo provisional y aplica el cambio neto como una sola transacción, que se convierte en sugerencia.

**Para la fase 1:**
- la copia propia de `prosemirror-suggest-changes` (ficha 0020) tiene que llevar este tratamiento de la composición;
- las pruebas del editor necesitan casos de composición, porque Playwright no simula las teclas de acento del Mac.

### Pegar tablas: lo que cambia en el Mac

**Lo que entrega el portapapeles.** Safari entrega `text/html` y `text/plain`, **no `text/rtf`**.

**Las citas de EndNote llegan solo como texto.** Se pegaron tres párrafos con 16 citas de EndNote (de una revisión narrativa, `citas-para-pegar.docx`). El HTML que recibe la página no trae nada de ellas:
- ni los comentarios `<!--[if supportFields]>` con el código del campo;
- ni `ADDIN EN.CITE`;
- ni los datos de EndNote;
- ni RTF.

Solo llega el número mostrado: «(1)», «(4)»… En Windows, los comentarios del HTML y el RTF traían las citas completas (prototipo 1). Para tenerlas en el Mac, Tauri tendría que leer el portapapeles nativo del sistema desde Rust (el HTML original de Word y el RTF), lo que se comprueba en la fase 1. Si no, se tratan como citas escritas a mano (R24).

**Safari reescribe el HTML de Word** antes de dárselo a la página (`Apple-converted-space`, `WebKit-mso-list-quirks-style`).

**Tres diferencias con Word para Windows:**
1. **Símbolos.** Las marcas de Wingdings llegan desplazadas al bloque privado de Unicode: «✓» llega como `U+F050`, que es «P», 0x50, más 0xF000. **Arreglado** en el limpiador.
2. **Marcas de fin de párrafo.** Las marcas vacías `<o:p>` pueden traer caracteres basura (`U+FFFD`). **Arreglado:** el limpiador las quita, porque nunca llevan texto.
3. **Espacios.** Se pierden dos:
   - uno entre una negrita y el texto siguiente («metotrexato(MD»), que se ve;
   - uno al principio de una línea tras un salto manual, que no se ve.
   
   Propuesta para la fase 1: contrastar con el `text/plain`, que llega con los espacios, y reponerlos.

**Ninguno de los arreglos del limpiador cambia Windows:** las 135 tablas capturadas allí siguen bien.

### Mediciones (`bench.html`)

| | Safari (Mac) | Chromium (PC) |
|---|---|---|
| citeproc-js, estilo de la revista: insertar una cita al principio / bibliografía de 50 | 1 / 29 ms | 3,7 / 65 ms |
| citeproc-js, Vancouver: lo mismo | 1 / 20 ms | 2 / 57 ms |
| citeproc-js, APA: crear el procesador | 232 ms | 648 ms |
| Corrector: cargar WebAssembly / diccionario español / inglés | 71 / 39 / 8 ms | 63 / 39 / 11 ms |
| Corrector: 11.880 palabras / sugerencias (mediana) | 18 / 22 ms | 32 / 32 ms |
| Palabras rechazadas (mismo texto) | 2.580 | 2.580 |

Safari mide en milisegundos enteros, así que sus cifras pequeñas están redondeadas.

### Cómo se sirvió al Mac, en una red compartida

El Mac abrió las páginas que corrían en el PC.

**El intermediario** (`src/proxy.mjs`):
- escucha solo en la wifi del PC y solo por HTTPS, con un certificado propio y temporal;
- pide una clave aleatoria en el primer enlace, que guarda en una cookie `HttpOnly`/`Secure`;
- desde el primer acceso con la clave, solo acepta la IP de ese dispositivo;
- rechaza cualquier ruta con `private/`.

**Lo que hay detrás:**
- Los servidores de los prototipos escuchan solo dentro del PC.
- Las referencias de las tablas del informe (privadas) nunca se mandaron al navegador: la página envía la estructura de lo pegado y la comparación se hace en el PC.
- Lo pegado se guardó en `private/`, que git ignora.
- El registro del intermediario solo muestra conexiones del Mac.

**Incidencias:**
- Safari no devolvía una cookie `SameSite=Strict` puesta en una redirección: se cambió a una página con `SameSite=Lax`.
- A media prueba el Mac se conectó solo a otra wifi y perdió la conexión.

## Lo que este prototipo no cubre

- **La ventana real de Tauri (WKWebView) en el Mac,** con su portapapeles nativo: en el corte vertical de la fase 1.
- **Citas de Zotero pegadas desde Word para Mac**, y si el portapapeles nativo (desde Tauri) conserva las de EndNote y Zotero.
- **Atajos de macOS no probados:** sustituciones automáticas de texto del sistema, dictado, Option+flechas.
- **Teclados con composición de verdad** (asiáticos) y Android. El arreglo vale para ellos, pero no se han probado.
- **Copias de Word para Mac en la fusión** (prototipo 6).

## Cómo se ejecuta

Requisitos:
- Node 24.
- OpenSSL, que viene con Git para Windows.
- Los prototipos 1, 2, 8 y 9 instalados (`npm install` en cada uno).
- Para pegar tablas, `../01-paste-word-tables/private/` con la referencia del informe.

```powershell
npm install
node tools/make-bench-data.mjs
& "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -keyout private/cert/key.pem -out private/cert/cert.pem -days 3 -subj "/CN=SciDesk prototype 11 (temporary)" -addext "subjectAltName=IP:<ip-del-pc>"
npx vite
```

En otras terminales:
- `npx vite --port 5178` en `../08-composite-document`;
- `npx vite --port 5180` en `../09-spellcheck`;
- `node src/proxy.mjs <ip-del-pc>`.

El intermediario imprime los enlaces con la clave. Se abren en Safari en el Mac. Para comparar, `http://localhost:5191/bench.html` en el PC.

## Archivos

- `src/proxy.mjs`: el intermediario HTTPS con clave, IP fija y rutas privadas bloqueadas.
- `vite.config.js`: las páginas del prototipo y su API:
  - recibir lo pegado y compararlo;
  - recibir las mediciones;
  - descargar las tablas al Mac;
  - reproducir aquí lo pegado en el Mac, con una clave que solo tiene el PC.
- `src/compare-grids.mjs`: la comparación del prototipo 1, hecha en el PC.
- `paste.html` y `src/paste.js`: pegar tablas.
- `bench.html` y `src/bench.js`: mediciones.
- `replay.html`: repetir en el PC lo pegado en el Mac.
- `tools/extract-tables.ps1`: copia tablas (o párrafos, con `-Paragraphs`) de un documento del usuario a un Word aparte, en `private/`.
- `tools/make-bench-data.mjs`: los datos de las mediciones, todos sintéticos o públicos.
