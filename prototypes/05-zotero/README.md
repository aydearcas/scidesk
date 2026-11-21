# Prototipo 5: Zotero por su API local

Prototipo desechable de la fase 0 (PLAN.md, sección 8). Comprueba también lo que dejó pendiente el prototipo 3 sobre las citas en Word. Decisión resultante: [ficha 0027](../../docs/decisiones/0027-zotero-por-su-api-local.md).

## Preguntas

1. ¿Se puede leer una colección de Zotero por su API local y convertirla a la biblioteca de SciDesk (CSL-JSON), sin perder datos y manteniendo el vínculo?
2. Lo pendiente del prototipo 3:
   - ¿Qué hace el complemento de Zotero para Word con las citas que exporta SciDesk?
   - ¿Puede un coautor con Zotero abrir, actualizar y guardar la copia?

## Respuesta

**1. Sí.**
- Zotero 10.0.3 sirve en `http://127.0.0.1:23119/api/` una copia local de su API web.
- Una colección de 30 referencias (con una subcolección) se lee en 63 ms con 4 peticiones, y la biblioteca entera de 50 en 63 ms.
- La sincronización incremental cuesta 3–14 ms y la búsqueda para el buscador de citas, 4–36 ms.
- Tras normalizar dos detalles, 29 de las 30 referencias salen formateadas por citeproc-js exactamente igual que las originales. La que difiere pierde la versión del conjunto de datos («v1») por la vía por la que se llenó la biblioteca de prueba (RIS), no por la API.

**2. Las citas sobreviven al «Refresh» de Zotero solo si cada referencia lleva un URI.**

| Copia del DOCX del prototipo 3 | Citas (`citationID`) | Números cambiados | Entradas de bibliografía | Marcadores (125) y propiedades |
|---|---|---|---|---|
| A: como la exporta ahora el prototipo 3, sin URI | 33 de 33 | **28 de 33** | **47** (duplicadas) | intactos |
| B: con el URI del elemento de Zotero (biblioteca enlazada) | 33 de 33 | 0 | 37 | intactos |
| C: con un URI propio de SciDesk (biblioteca no enlazada) | 33 de 33 | 0 | 37 | intactos |

**Por qué falla la copia A.** Cuando una referencia no está en su biblioteca, Zotero usa los datos incrustados en el campo y **agrupa las citas por su URI** (`integration.js`, `embeddedItemsByURI`). Sin URI, cada aparición se convierte en un elemento anónimo distinto: la bibliografía pasa de 37 entradas a 47 y los números se descuadran.

**Regla para el exportador del prototipo 3:** cada referencia lleva siempre un URI:
- el de su elemento de Zotero si la biblioteca está enlazada (`http://zotero.org/users/local/<clave>/items/<KEY>`, que la API local da como `id` del CSL-JSON);
- uno propio y estable si no lo está (`https://scidesk.app/ref/<proyecto>/<referencia>`).

**Lo que Zotero cambia al actualizar:**
- Con la copia C conserva nuestros `citationID`, `itemData.id`, URI, marcadores y propiedades.
- Con la B sustituye el `id` y el `itemData.id` de cada referencia por los suyos; el URI basta para relacionarla con la biblioteca de SciDesk.
- En las dos reescribe las preferencias del documento (`ZOTERO_PREF_n`) con su propia sesión, y la propiedad `SciDesk` sigue ahí.

**Guardar con el complemento cargado en Word visible** funcionó en los tres casos: abrir, actualizar y guardar. Lo que se colgaba en el prototipo 3 era `SaveAs2` en un Word oculto, no el complemento.

### La API local, en detalle

**Activarla.** Hay que activarla en Zotero: Ajustes › Avanzado › «Permitir que otras aplicaciones de este equipo se comuniquen con Zotero». Está desactivada por defecto: sin ella, Zotero responde `403 Local API is not enabled`, y SciDesk debe explicar cómo activarla.

**Leer:**
- Las lecturas no necesitan clave.
- **Colección:** `GET /api/users/0/collections` y, por cada colección y subcolección (Zotero lista cada nivel por separado), `GET …/collections/<KEY>/items/top?format=json&include=data,csljson`. Trae en una petición la clave, la versión y el CSL-JSON de cada elemento, sin notas ni adjuntos. Las páginas son de 100 y se recorren con `Total-Results`.
- **Sincronización incremental:**
  - `format=versions` da en 3 ms la versión de cada clave de la colección. Comparándola con la copia guardada se sabe qué es nuevo, qué ha cambiado y qué se ha borrado (la API local no tiene el `/deleted` de la API web).
  - `since=<versión>` trae solo lo cambiado.
- **Comprobar que es el mismo Zotero.** Cada respuesta lleva `Zotero-Server-ID`. SciDesk lo guarda con las versiones y no mezcla datos de dos instalaciones de Zotero.
- **Buscar:** `q=…&qmode=titleCreatorYear` responde en 4–36 ms. Sirve para el buscador de citas con la biblioteca enlazada.

**Escribir:** Zotero 10 ya admite escrituras por la API local.
- Hay que pedir una clave con `POST /api/local/authorize` y el nombre del programa. Zotero muestra entonces una ventana con «Permitir», «Permitir siempre» y «Denegar».
- Cada escritura lleva esa clave y el `Zotero-Server-ID`.

SciDesk podría así añadir a Zotero las referencias que se encuentran desde el programa (PubMed, DOI). **No se ha probado** aquí, porque hace falta que el usuario pulse «Permitir».

**Dos peculiaridades del CSL-JSON de Zotero, que se normalizan al leer:**
- La abreviatura de la revista llega con la clave antigua `journalAbbreviation`, no con la de CSL, `container-title-short`. citeproc-js entiende las dos, pero la biblioteca de SciDesk guarda la estándar.
- Los años de las fechas llegan como texto (`"2003"`).
- Además, la API local devuelve `csljson` como *texto* con una lista de un elemento; la API web lo da como objeto.

**La entrada de la biblioteca de SciDesk** (`out/library.json`):

```json
{ "id": "r-…", "csl": { … },
  "zotero": { "key": "TLM5WYBD", "version": 6, "uri": "http://zotero.org/users/local/…/items/TLM5WYBD",
              "serverId": "…", "library": "user", "dateModified": "…" } }
```

El `id` es de SciDesk y no depende de Zotero. El bloque `zotero` es lo necesario para seguir enlazados y para escribir en Word campos que Zotero reconozca.

### Cómo se hizo sin tocar el Zotero del usuario

- **El Zotero del usuario no se usó.** Su biblioteca tiene 6 artículos (trabaja con EndNote), la API local estaba desactivada y Zotero estaba cerrado.
- **Una instancia de prueba propia.** `tools/start-test-zotero.ps1` arranca Zotero con un perfil y una carpeta de datos propios en `private/`, que git ignora:
  - API local activada;
  - sin actualizaciones ni sincronización;
  - con el estilo de la revista instalado.
- **El contenido.** La biblioteca de prueba se llenó con las 50 referencias del prototipo 2 por el punto de importación del conector (`POST /connector/import`).
  - Ese punto no reconoce CSL-JSON; RIS sí.
  - Las dos colecciones se crearon directamente en la base de datos de prueba, con Zotero cerrado, porque ni la API local de lectura ni el conector crean colecciones.
- **Word.** Las pruebas de Word se hicieron con Word visible, comprobando antes que no había otro Word abierto: Zotero actúa sobre el documento activo del Word al que llega.
- **La macro de Zotero solo encarga el trabajo.** «ZoteroRefresh» vuelve enseguida (20–60 ms) y Zotero edita el documento después, en 3–9 s. El script espera a que el documento deje de cambiar antes de guardar.
  - En el primer intento se guardó y cerró antes, y Zotero mostró «Zotero experimentó un error al actualizar su documento».

## Lo que este prototipo no cubre

- **Escribir en Zotero** (añadir referencias o crear colecciones desde SciDesk): falta probar la autorización con el usuario.
- **Bibliotecas de grupo** (`/api/groups/<id>/…`) y bibliotecas grandes (miles de elementos).
- **Una biblioteca real de alguien que use Zotero a diario:** adjuntos, notas, elementos en la papelera, campos `extra` con datos CSL.
- **El Zotero del usuario con su propia API activada**, y qué hace SciDesk si Zotero está cerrado: usar la copia guardada en `library.json` y avisar.
- **Insertar citas nuevas con Zotero en la copia de un coautor:** esas citas llegan con el URI del Zotero del coautor, de otra biblioteca. Se tratan al importar, en la fase 2 (prototipo 10 para Word con citas).
- **Mendeley y EndNote:** son el prototipo 10.

## Cómo se ejecuta

Requisitos:
- Node 24.
- Zotero 7 o posterior instalado (aquí, 10.0.3), con el Zotero del usuario cerrado.
- Para la parte de Word: Word de escritorio con el complemento de Zotero, y el DOCX del prototipo 3 (`../03-docx-markers/out/article-coauthors.docx`).

```powershell
npm install
powershell -ExecutionPolicy Bypass -File tools\start-test-zotero.ps1
node src/seed.mjs
powershell -ExecutionPolicy Bypass -File tools\stop-test-zotero.ps1
python -I tools\make-collections.py
powershell -ExecutionPolicy Bypass -File tools\start-test-zotero.ps1
node src/read-collection.mjs
node src/link-docx.mjs
powershell -ExecutionPolicy Bypass -File tools\zotero-refresh.ps1 out\word\A-embedded.docx
powershell -ExecutionPolicy Bypass -File tools\zotero-refresh.ps1 out\word\B-linked.docx
powershell -ExecutionPolicy Bypass -File tools\zotero-refresh.ps1 out\word\C-own-uri.docx
node src/summary-refresh.mjs out/word/A-embedded.docx out/word/A-embedded-refreshed.docx out/word/B-linked.docx out/word/B-linked-refreshed.docx out/word/C-own-uri.docx out/word/C-own-uri-refreshed.docx
powershell -ExecutionPolicy Bypass -File tools\stop-test-zotero.ps1
```

**Primera parte (la biblioteca):**
- `seed.mjs` llena la biblioteca de prueba vacía.
- `make-collections.py` crea las colecciones, con Zotero cerrado.
- `read-collection.mjs` lee la colección, la convierte y la compara con las originales. Escribe `out/library.json` y `out/report.json`.

**Segunda parte (Word):**
- `link-docx.mjs` prepara las tres copias.
- `zotero-refresh.ps1` actualiza cada una con Zotero en Word.
- `summary-refresh.mjs` resume qué ha quedado en cada copia.

**Para depurar:** `start-test-zotero.ps1 -DebugLog` guarda el registro de depuración de Zotero en `private/zotero-debug.log`.

## Archivos

- `src/zotero.mjs`: el cliente de la API local (paginación, subcolecciones, `Zotero-Server-ID`, errores) y la conversión a la biblioteca de SciDesk.
- `src/read-collection.mjs`: lectura, comparación, sincronización incremental y búsqueda.
- `src/seed.mjs`, `tools/make-collections.py`, `tools/start-test-zotero.ps1` y `tools/stop-test-zotero.ps1`: la instancia de prueba.
- `src/link-docx.mjs`, `tools/zotero-refresh.ps1`, `src/check-refresh.mjs` y `src/summary-refresh.mjs`: la prueba de Word.
