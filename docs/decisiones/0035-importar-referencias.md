# 0035. Importar referencias a la biblioteca propia: RIS, NBIB, BibTeX y CSL-JSON

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1).
- **Pregunta del plan:** fase 1, «referencias en modo biblioteca propia: importar RIS, NBIB, BibTeX y CSL-JSON (también después de la importación inicial), eliminar duplicados» (PLAN.md 5.6, 6.1 y 8)

## Qué se decide
- **Formatos y lectores:**
  - **RIS, BibTeX y CSL-JSON** con citation-js 0.9 (MIT: `@citation-js/core` y los complementos de RIS y BibTeX), como decía PLAN.md 6.1. **Siempre se le dice el formato** (`forceType`): si no, citation-js intenta adivinarlo y un texto que parezca una URL lo descarga. Así, importar nunca sale a la red (PLAN.md 6.6).
  - **NBIB** (el formato MEDLINE que exporta PubMed) con un lector propio: líneas `ETIQUETA - valor` y su continuación sangrada. Toma el nombre completo de cada autor (`FAU`), los autores de grupo (`CN`), la fecha (año, mes y día), el DOI de `AID`, el PMID, el PMCID, la revista completa (`JT`) y abreviada (`TA`), el resumen, el idioma y el ISSN.
  - El formato se reconoce por la extensión y, si no, por el contenido.
- **Todo se normaliza al CSL-JSON de SciDesk** (fichas 0027 y 0031): solo variables de CSL, fechas con números, la abreviatura de la revista en `container-title-short`, el DOI sin `https://doi.org/` y sin `id`. Lo que no cabe (el tipo de publicación de PubMed, campos propios) se guarda en `source.unmapped`, y el informe lo dice. Una publicación retractada en PubMed queda marcada ahí.
- **Duplicados:** dos referencias son la misma obra si coinciden en el DOI (sin distinguir mayúsculas), en el PMID, o en el primer autor, el año y el título normalizados. **Un duplicado no se añade**; el informe dice cuál y con qué referencia coincide. Vale dentro del mismo archivo y frente a la biblioteca.
- **Trazabilidad:** cada archivo importado se copia a `references/imports/` (si el nombre ya existe, con la fecha), y cada referencia guarda en `source` su formato, el archivo, su clave (PMID, DOI o clave de BibTeX) y la fecha.
- **Solo en la biblioteca propia.** En un proyecto vinculado a Zotero se rechaza: las referencias se añaden en Zotero.
- **Dónde:** el botón «Importar referencias…» de la ventana (la lista para citar se actualiza) y `scidesk refs <proyecto> <archivo>` en la línea de comandos.

## Por qué
- Es la entrada habitual de una biblioteca propia: lo que se exporta de PubMed (NBIB), de Zotero, EndNote o Mendeley (RIS), de LaTeX (BibTeX) o de otro programa (CSL-JSON).
- **Normalizar al importar** hace que la biblioteca valide siempre con su esquema, y que citeproc-js y la exportación a Word vean datos coherentes.
- **NBIB con lector propio:** citation-js no lo lee, y es sencillo de analizar y de controlar.
- **Pruebas:** 5 nuevas con archivos sintéticos (detección del formato, lector de NBIB, normalización de los tres formatos de citation-js, duplicados entre archivos y frente a la biblioteca, copia de cada archivo, rechazo en modo Zotero). En total, 19 en el núcleo. En la ventana se importaron un NBIB y un RIS, y el navegador no hizo ninguna petición fuera de la propia aplicación. Las pruebas detectaron dos «duplicados» en mis archivos de prueba que lo eran de verdad: coincidían con las referencias del proyecto de demostración.

## Qué se descartó
- **Dejar que citation-js adivine el formato:** puede descargar URLs.
- **Fusionar los datos de un duplicado con los de la referencia existente:** se decide a mano. Completar metadatos es trabajo de la verificación con Crossref y PubMed (R10), que es opcional.
- **Guardar los campos sin equivalente en CSL dentro del CSL-JSON:** el esquema los rechazaría. Van en `source.unmapped`.

## Consecuencias
- **Queda para el resto de la fase 1:**
  - ver y editar la biblioteca en la ventana (hoy solo se importa y se cita);
  - el buscador de citas rápido;
  - los ~15 estilos incluidos (hoy, el de Reumatología Clínica).
- **Queda para V1:** fusionar duplicados a mano, y la verificación y búsqueda en PubMed y Crossref (R10), que es lo único que sale a la red y con permiso.
- Las referencias importadas de un Word con citas de EndNote (ficha 0028) usan el mismo `source`, con `kind: "endnote-field"`.
