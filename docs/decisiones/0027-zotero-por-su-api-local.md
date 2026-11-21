# 0027. Zotero por su API local, y un URI por referencia en las citas del DOCX

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 5 de la fase 0). Concreta el modo vinculado a Zotero de [0007](0007-referencias.md) y corrige el exportador de [0025](0025-docx-con-marcas-y-campos.md).
- **Pregunta del plan:** prototipo 5 de la sección 8, y lo que el prototipo 3 dejó pendiente

## Qué se decide

### Leer de Zotero
La biblioteca vinculada se lee por la **API local de Zotero** (`http://127.0.0.1:23119/api/`, Zotero 7 o posterior):
- **Una colección**, con sus subcolecciones (Zotero lista cada nivel por separado): `…/collections/<KEY>/items/top?format=json&include=data,csljson`. Trae en una petición la clave, la versión y el CSL-JSON de cada elemento, sin notas ni adjuntos, en páginas de 100.
- **Sincronización incremental:**
  - `format=versions` (clave → versión) se compara con la copia guardada y dice qué es nuevo, qué ha cambiado y qué se ha borrado;
  - `since=<versión>` trae solo lo cambiado.
- **Una sola instalación de Zotero.** Las versiones se guardan junto al `Zotero-Server-ID` de esa instalación, que se comprueba en cada respuesta.
- **El buscador de citas** usa `q=…&qmode=titleCreatorYear` mientras Zotero esté abierto.
- **Normalizar al leer:**
  - `journalAbbreviation` pasa a `container-title-short`;
  - los años en texto pasan a número;
  - el `csljson` que llega como texto se interpreta.
- **Cada entrada de `library.json`** lleva un `id` propio de SciDesk, el CSL-JSON y un bloque `zotero` con `key`, `version`, `uri`, `serverId`, la biblioteca y la fecha de modificación.
- **Si Zotero está cerrado o la API local desactivada** (`403 Local API is not enabled`), SciDesk sigue con la copia guardada, lo dice y explica cómo activar la API: Ajustes › Avanzado › «Permitir que otras aplicaciones de este equipo se comuniquen con Zotero».

### Citas en el DOCX: siempre con URI
**Cada referencia de una cita lleva siempre un URI en su campo de Zotero** (corrige [0025](0025-docx-con-marcas-y-campos.md)):
- el de su elemento de Zotero si la biblioteca está enlazada (`http://zotero.org/users/local/<clave>/items/<KEY>`, que la API local da como `id` del CSL-JSON);
- uno propio y estable si no lo está (`https://scidesk.app/ref/<proyecto>/<referencia>`).

## Por qué
- **Rapidez y fidelidad.** La lectura es rápida y no pierde datos:
  - una colección de 30 referencias, 63 ms;
  - la biblioteca de 50, 63 ms;
  - la comprobación incremental, 3–14 ms;
  - la búsqueda, 4–36 ms.
  
  29 de 30 referencias salen formateadas igual que las originales. La otra pierde un campo por la vía por la que se llenó la biblioteca de prueba (RIS), no por la API.
- **Sin URI, Zotero rompe la numeración.** Cuando una referencia no está en su biblioteca, Zotero usa los datos incrustados en el campo y agrupa las citas por su URI. Sin URI, cada aparición es un elemento distinto. Con el DOCX del prototipo 3 actualizado por Zotero en Word:
  - **sin URI**, la bibliografía pasó de 37 entradas a 47 y cambió el número de 28 de 33 citas;
  - **con URI** (de Zotero o propio), no cambió nada: 37 entradas, ningún número distinto.
  
  En todos los casos Zotero conservó los 33 `citationID`, los 125 marcadores y las propiedades del documento.
- **Zotero mueve los identificadores, pero no se pierde nada.** Con el URI de Zotero, sustituye el `id` de la referencia por el suyo; el URI basta para relacionarla. Con el URI propio, conserva también nuestro `itemData.id`.
- **El complemento no impide guardar.** Abrir, actualizar con Zotero y guardar funcionó en Word visible con el complemento cargado. El bloqueo del prototipo 3 era de `SaveAs2` en un Word oculto.

## Qué se descartó
- **Better BibTeX** como vía de lectura: la API local ya da lo necesario sin otra extensión.
- **Leer `zotero.sqlite` directamente:** su esquema es interno, y Zotero lo bloquea mientras está abierto.
- **Citas sin URI cuando la biblioteca no está enlazada,** por lo anterior.

## Consecuencias
- **El exportador del corte vertical (fase 1)** escribe el URI en cada referencia de cada cita.
- **La importación de copias de coautores (fase 2):**
  - una cita actualizada por Zotero conserva su `citationID`;
  - las referencias se reconocen por su URI, sea propio o el del Zotero del usuario;
  - una cita insertada por un coautor con su propio Zotero llega con un URI de otra biblioteca y se trata como cita nueva con sus datos incrustados.
- **Escribir en Zotero** (añadir referencias o crear colecciones desde SciDesk) es posible desde Zotero 10. SciDesk pide permiso con `POST /api/local/authorize` y Zotero muestra «Permitir / Permitir siempre / Denegar». Sigue en [Después] ([0007](0007-referencias.md)) y no se ha probado.
- **Quedan sin probar:** bibliotecas de grupo, bibliotecas grandes y la biblioteca real de alguien que use Zotero a diario (adjuntos, notas, papelera, campo `extra`).
- **Para probar con Zotero,** los scripts del prototipo arrancan una instancia aparte (perfil y datos propios) y nunca tocan el Zotero del usuario.
- Detalle y cifras en [`prototypes/05-zotero/README.md`](../../prototypes/05-zotero/README.md).
