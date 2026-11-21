# Prototipo 10: importar un Word con citas de EndNote o Zotero

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R1). Decisión resultante: [ficha 0028](../../docs/decisiones/0028-importar-citas-de-un-word.md).

## Pregunta

Al empezar un artículo a partir de un Word que ya existe, ¿se recuperan sus citas y su biblioteca, sin tener instalado el gestor de referencias?

## Respuesta

**Sí, completas, con EndNote y con Zotero.**

Se probó con tres Word reales del usuario con citas de EndNote: dos revisiones narrativas y un informe de revisión sistemática con 137 tablas. De cada cita se obtiene:
- dónde está;
- qué muestra;
- las referencias que cita, con su registro completo de EndNote, que va dentro del propio documento.

La biblioteca resultante, ya en CSL-JSON, coincide con la bibliografía que escribió EndNote en el documento: mismo número de referencias, mismo orden, mismos números en todas las citas y los mismos datos.

| | Revisión 1 | Revisión 2 | Informe de RS | Copia del prototipo 5 con Zotero |
|---|---|---|---|---|
| Citas (campos) | 45 | 64 | 55 | 33 |
| Apariciones de referencias | 63 | 75 | 55 | 47 |
| Referencias distintas → biblioteca | 23 | 19 | 52 | 37 |
| Entradas en la bibliografía del documento | 23 | 19 | 52 | 37 |
| Entrada *i* del documento = referencia *i* de la biblioteca | 23/23 | 19/19 | 52/52 | 37/37 |
| Números de cada cita iguales a los que da citeproc-js | 45/45 | 64/64 | 55/55 | 33/33 |
| Apellidos del registro presentes en la entrada del documento | 132/132 | 101/101 | 258/259 | 104/104 |
| Títulos / años / volúmenes / primeras páginas | todos | todos | 51/52, resto todos | todos |
| Con DOI / con PMID | 22 / 19 | 18 / 14 | 47 / 48 | — |
| Citas sin registro, borradas con cambios marcados o «sin formatear» `{Autor, año #n}` | 0 | 0 | 0 | 0 |
| Tiempo de lectura | 0,1 s | 0,1 s | 1,9 s (1 MB, 137 tablas) | — |

**Las dos excepciones del informe de RS son del documento, no de la conversión:**
- La entrada de una página web, tal como la escribió EndNote, no lleva título; el registro sí lo tiene.
- Un apellido no se encuentra, seguramente por el apóstrofo.

**Ninguna entrada sale idéntica letra a letra** con citeproc-js y el estilo NLM. Es una diferencia de estilo, no de datos: NLM añade el DOI, el PMID y «[Internet] … Available from», y el estilo de EndNote de estos documentos no. Por eso la comprobación de datos mira cada dato del registro, no la cadena entera.

### Cómo guarda EndNote las citas en el Word

- **Cada cita es un campo complejo** `ADDIN EN.CITE` con un XML:
  ```
  <EndNote><Cite ExcludeAuth? ExcludeYear?>
    <Author/><Year/><RecNum/><Prefix/><Suffix/><Pages/><DisplayText/>
    <record>…</record>
  </Cite>…</EndNote>
  ```
  `<record>` es el registro completo en EndNote XML.
- **Cuando el XML es largo** (en estos documentos, 113 de 164 citas), no va en el código del campo sino en un campo anidado `ADDIN EN.CITE.DATA`. Su `<w:fldData>`, en el carácter de inicio, lleva el XML en base64 (UTF-8).
  - En el portapapeles va de otra forma: en el RTF, como hexadecimal (prototipo 1).
- **La bibliografía** es un campo `ADDIN EN.REFLIST`, con una entrada por párrafo.
- **La identidad de cada referencia** es `db-id` + número de registro (`<foreign-keys><key app="EN" db-id="…">N</key>`). Así se agrupan las apariciones de una misma referencia aunque vengan de citas distintas.
- **Campos sueltos.** Aparecen algunos campos `ADDIN` vacíos (restos sin instrucción) y se ignoran.

### Conversión de EndNote XML a CSL-JSON (`src/endnote-to-csl.mjs`)

| EndNote | CSL-JSON |
|---|---|
| `ref-type` (Journal Article, Book, Book Section, Web Page, Report…) | `type` (article-journal, book, chapter, webpage, report…) |
| `contributors/authors` «Apellido, Nombre» | `author` `{family, given}`; sin coma, o con coma final (la marca de EndNote para organizaciones), `{literal}` |
| `contributors/secondary-authors` | `editor` (capítulos, libros, congresos) |
| `titles/title` | `title` |
| `periodical/full-title` o `titles/secondary-title` | `container-title` |
| `periodical/abbr-1` (o `titles/alt-title` en artículos) | `container-title-short` |
| `dates/year`, `dates/pub-dates` | `issued` (año, y mes y día si los hay) |
| `volume`, `number`, `pages` | `volume`, `issue`, `page` |
| `electronic-resource-num` | `DOI` (solo la parte `10.…`) |
| `accession-num` (proveedor NLM/PubMed, numérico) | `PMID` |
| `custom2`/`custom1`/`custom6` con `PMC…` | `PMCID` |
| `publisher`, `pub-location`, `edition` (no en artículos), `isbn`, `urls/related-urls`, `language` | `publisher`, `publisher-place`, `edition`, `ISSN`/`ISBN`, `URL`, `language` |

- **En los artículos, `edition`** lleva el estado de publicación que pone PubMed, no una edición, y se descarta.
- **Lo que no se convierte** se cuenta aparte (`unmapped`), para que la importación pueda mostrarlo. Aquí quedaron solo `custom1` y `custom6` sin PMCID.
- **Los datos raros del registro llegan tal cual,** como un autor mal escrito en la biblioteca de EndNote. La verificación de referencias (R10) es lo que debe detectarlos.

### Reglas para la importación de SciDesk (fase 2)

1. **Recorrer el documento, las notas al pie y las notas finales, también dentro de las tablas.** Las citas dentro de cambios marcados como borrados no cuentan.
2. **EndNote:** el XML del código o, si no está ahí, el `fldData` del `EN.CITE.DATA` anidado.
   **Zotero:** el JSON de `ZOTERO_ITEM` (prototipos 3 y 5), agrupando por URI.
3. **Una referencia por identidad** (EndNote: `db-id` + registro; Zotero: URI), en orden de primera cita. Si el proyecto ya tiene la referencia (mismo DOI o PMID), se enlaza a ella.
4. **Comprobar la importación con el propio documento:**
   - que el número de referencias y el orden coinciden con su bibliografía;
   - que cada cita muestra los números que da citeproc-js.
   
   Si algo no cuadra, se avisa antes de sustituir el texto por citas vivas.
5. **La bibliografía del documento no se importa como texto.** SciDesk la genera.

## Lo que este prototipo no cubre

- **Mendeley:** no había ningún Word con citas de Mendeley.
  - Mendeley Desktop usaba campos `ADDIN CSL_CITATION {json}` con el mismo JSON que Zotero. El lector los convierte igual, pero sin un documento real no se ha comprobado.
  - Mendeley Cite usa controles de contenido (`w:sdt`) y datos aparte, y queda por estudiar cuando haya un ejemplo.
- **Citas «sin formatear» de EndNote** (`{Autor, año #n}`): no había ninguna. Si aparecen, solo traen autor, año y número de registro, y se resolverían como citas escritas a mano (R24).
- **Citas escritas a mano o pegadas como texto** (R24): fase 3.
- **Documentos en los que EndNote numera con otro estilo** (autor-año) o con citas en notas al pie. Aquí todas eran numéricas, entre paréntesis y en el texto.
- **La «Travelling Library» de EndNote:** es lo mismo que los registros dentro de cada cita. No se leyó por separado.
- **Rendimiento:** 1,9 s para un Word de 1 MB con 137 tablas, leyendo con `@xmldom/xmldom`. En el programa conviene leerlo en segundo plano, o con un analizador más rápido.

## Cómo se ejecuta

Requisito: Node 24. Los Word del usuario son privados y no están en el repositorio.

```powershell
npm install
node src/import.mjs <documento.docx> [...]
```

- Escribe en la terminal solo recuentos y comprobaciones.
- El detalle (biblioteca convertida, citas, comparaciones), que contiene datos de los documentos, va a `private/<nombre>.json`, que git ignora.

## Archivos

- `src/read-citations.mjs`: el lector. Saca las citas (EndNote, Zotero y Mendeley Desktop) y la bibliografía de un DOCX, con los campos anidados y su `fldData`.
- `src/endnote-to-csl.mjs`: EndNote XML → CSL-JSON.
- `src/import.mjs`: la importación y sus comprobaciones contra el propio documento.
