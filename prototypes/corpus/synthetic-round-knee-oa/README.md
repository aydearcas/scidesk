# Ronda sintética de revisión: artrosis de rodilla acelerada

Corpus de prueba para el prototipo 6 (fusión a tres bandas de las copias devueltas por los coautores; ver PLAN.md, sección 8, y [decisión 0003](../../../docs/decisiones/0003-coautores-con-word-y-fusion.md)). Contiene una versión enviada y dos copias devueltas por coautores distintos que revisaron la misma versión en paralelo, cada uno sin ver la del otro.

**Todo es sintético.** El artículo, los autores, las afiliaciones y las revisiones los ha generado un modelo de lenguaje para probar software. No es un artículo real, y las referencias y las cifras no se han verificado. La portada del documento lo advierte. Se fabricó porque el usuario no tiene una ronda real que pueda compartir. No sustituye a una ronda real: hace falta una antes de cerrar la fase 2b.

## Qué hay

| Archivo | Qué es |
|---|---|
| `sent.docx` | Versión enviada (la base). Tiene estilos reales de Word (Título, Título 1, Título 2 y Descripción), dos tablas de Word con notas al pie y marcas en superíndice, y la tabla 1 con el encabezado en dos niveles y celdas combinadas en horizontal y en vertical. Su autor es la primera autora ficticia. |
| `returned-rios.docx` | Copia de la Dra. Marta Ríos Navarro: 37 ediciones, todas con control de cambios, y 10 comentarios. |
| `returned-soler.docx` | Copia del Dr. Javier Soler Benítez: 38 ediciones. Las 8 primeras del documento (S01 a S08) van **sin control de cambios**, porque "se le olvidó activarlo"; el resto va con control de cambios, y hay 4 comentarios. |
| `edits-rios.json`, `edits-soler.json` | La verdad de referencia: cada edición, con su tipo, su ancla en el texto enviado, el texto nuevo, si se aplicó con control de cambios (`tracked` y `applied_with_track_changes`), si se aplicó bien (`applied_ok`), la zona compartida (`shared_passage`), si es ruido (`noise`) y su motivo (`rationale`). `sent_paragraph` es el índice, empezando en 0, del párrafo enviado dentro de `build/sent-paragraphs.json`, sin contar los párrafos vacíos. |
| `report.md` | Informe: ediciones por tipo y coautor, pasajes en conflicto, lo que reporta Word (revisiones y comentarios por autor) y los problemas y limitaciones. |
| `source/` | Fuentes: `article.md` y `table-1.json` y `table-2.json` (la redacción), y `review-rios.json` y `review-soler.json` (las listas de ediciones tal como las devolvieron los coautores). |
| `build/` | Intermedios: los bloques para Word, el texto enviado tal como lo ve Word (`sent-paragraphs.json` y `sent-for-review.txt`, que es lo que leyeron los coautores), y las salidas de validación, aplicación e inspección de Word. |
| `tools/` | Scripts y encargos (`prompts/`). |

### Lo que cubre
- Inserciones, borrados, sustituciones, comentarios anclados a un fragmento, un párrafo partido por cada coautor, una frase movida por cada coautor, cambios en celdas de las dos tablas, formato (cursiva de latinismos y negrita), y correcciones de cifras y de citas (por ejemplo, `[4,20]` → `[4]` y `[3,4]` → `[3]`).
- **Conflictos:** cuatro zonas compartidas (S1 a S4) que los dos coautores cambian de forma distinta. En la tabla 1, fila 7, uno escribe `<5 %` y el otro `< 5 %`: una diferencia de un solo espacio. Además hay solapamientos espontáneos, por ejemplo los dos corrigen «Bruyere» → «Bruyère». En total hay 15 solapamientos de caracteres y 23 párrafos o celdas que tocan los dos; el detalle está en `report.md`.
- **Ruido:** Ríos cambia comillas rectas por tipográficas («de la normalidad a la enfermedad») y Soler cambia un guion por una raya corta («45-79» → «45–79»), sin tocar nada más en esos pasajes. El filtro de ruido debería ocultarlos.
- **Cambios sin marcar:** las ediciones S01 a S08 de Soler solo se detectan comparando con `sent.docx`. Una de ellas (S01) se solapa con una edición marcada de Ríos (R01).

## Cómo se generó (21/11/2026)
1. **Redacción.** Un subagente con el modelo **Sonnet** y esfuerzo **medio** escribió `source/` con sus conocimientos, sin buscar en internet (unas 3200 palabras y 37 referencias de memoria). El encargo está en `tools/prompts/drafter.txt`.
2. **Versión enviada.** `tools/prepare.py` convierte las fuentes en bloques, y `tools/word.ps1 build` construye `sent.docx` con Word de escritorio por COM. Después, `word.ps1 extract` saca el texto tal como lo ve Word, con la fila y la columna de cada celda.
3. **Revisión.** Dos subagentes con el modelo **Opus** y esfuerzo **alto**, uno por coautor, se lanzaron en paralelo sobre el mismo texto enviado. Cada uno vio solo su encargo (`tools/prompts/reviewer-common.txt` más `reviewer-rios.txt` o `reviewer-soler.txt`) y devolvió su lista de ediciones en JSON, comprobada con `tools/check_edits.py`. Las zonas compartidas S1 a S4 se impusieron en el encargo para que hubiera conflictos; lo que cambia cada uno en ellas lo decidió cada coautor.
4. **Copias devueltas.** `word.ps1 validate` comprueba en Word que cada ancla es única, y `word.ps1 apply` aplica las ediciones a una copia de `sent.docx`: activa o desactiva `TrackRevisions` en cada edición y añade los comentarios con `Comments.Add`. Ninguna edición tuvo que corregirse ni descartarse.
5. **Comprobación.** `word.ps1 inspect` lee las revisiones y los comentarios de cada copia y su texto tras «Aceptar todo» y tras «Rechazar todo». `tools/report.py` lo compara con una simulación de las ediciones: tras aceptar todo, el texto coincide con el esperado, y tras rechazar todo coincide con la versión enviada más solo las ediciones sin marcar. Con eso escribe `edits-*.json` y `report.md`.

**Autoría en Word.** Word firma las revisiones con el nombre de la cuenta de Office, no con `Application.UserName`. Por eso `word.ps1` activa `Options.UseLocalUserInfo`, pone el `UserName` y las `UserInitials` del coautor y restaura siempre los valores originales en un `finally`. Mientras dura cada ejecución, guarda una copia de esos valores en `%TEMP%\scidesk-corpus-word-identity.json` y la borra al terminar. La inspección comprueba que ninguna revisión ni ningún comentario lleva el nombre real de la cuenta y que ese nombre no aparece en ninguna parte del paquete DOCX: `core.xml`, `people.xml` (con `providerId="None"`) y los comentarios. El script nunca escribe ese nombre. Usa una instancia propia de Word, oculta, que cierra con `Quit()`.

## Cómo regenerarlo
Desde esta carpeta, con Word de escritorio instalado y sin otra automatización de Word en marcha (las ventanas de Word del usuario no se tocan):

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-all.ps1 -SkipSent
```

Regenera las dos copias devueltas, `build/`, `edits-*.json` y `report.md` a partir de `sent.docx` y de `source/review-*.json`. Sin `-SkipSent`, reconstruye también `sent.docx` desde `source/` (esa variante completa no se ha ejecutado de principio a fin; los pasos sueltos sí). Si cambias las fuentes, las anclas de las revisiones pueden dejar de valer (`check_edits.py` y `word.ps1 validate` lo detectan). Para una ronda nueva hay que volver a lanzar los subagentes con los encargos de `tools/prompts/`. Requiere Python 3 y Windows PowerShell 5.1.

## Limitaciones
- Las frases movidas quedan grabadas como borrado más inserción, no como `w:moveFrom` y `w:moveTo`. Para no tocar el portapapeles del usuario no se usa cortar y pegar, que es lo que hace que Word marque un movimiento.
- Las ediciones las hace el modelo de objetos de Word sobre rangos, no una persona tecleando, así que no hay autocorrección, ni historial de `rsid` de varias sesiones, ni el ruido de formato típico (por ejemplo, cambios de fuente al pegar).
- No hay copia pasada por LibreOffice, Google Docs ni Word en línea: LibreOffice no está instalado en este equipo y no se ha instalado.
- Ningún coautor une dos párrafos (`merge_paragraphs`). El tipo existe y el script lo admite, pero los dos prefirieron partir uno.
