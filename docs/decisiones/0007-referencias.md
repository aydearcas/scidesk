# 0007. Referencias: biblioteca propia o vinculada a Zotero

- **Fecha:** 20/11/2026
- **Estado:** aceptada. La biblioteca es común a todo el proyecto y no hay biblioteca global ([0015](0015-varios-articulos-por-proyecto.md)). Actualizada el 21/11/2026 con la revisión de la v0.4 (R1, R10, R24 y R45) con el prototipo 5 ([0027](0027-zotero-por-su-api-local.md)) y con el prototipo 10 ([0028](0028-importar-citas-de-un-word.md)).
- **Preguntas del plan:** P11, P13 y P14

## Qué se decide
- **Dos modos de biblioteca**, que se eligen al crear el proyecto:
  - **Biblioteca propia**: el gestor está dentro del programa. Se importa una biblioteca inicial (RIS, NBIB, BibTeX, CSL-JSON…) y después se pueden añadir más referencias en cualquier momento con nuevos archivos.
  - **Vinculada a Zotero**, de forma automática. Primero solo Zotero; EndNote y Mendeley, más adelante.
- **Estilo de cita de Reumatología Clínica** incluido de serie.
- **Consultas a Crossref y PubMed** por internet para completar metadatos: sí, como opción que se activa en el programa y que explica para qué sirve.

## Por qué
- Muchos investigadores ya tienen su biblioteca en Zotero y no quieren duplicarla; otros no usan gestor y necesitan uno sencillo dentro del programa.
- Zotero tiene una API local (desde Zotero 7) que permite leer la biblioteca sin internet; EndNote y Mendeley no tienen una vía comparable.
- La consulta en línea ahorra mucho trabajo, pero debe ser transparente y opcional para respetar la confidencialidad y el uso sin conexión.

## Qué se descartó
- Solo importar archivos, sin conexión con Zotero.
- Conectar con EndNote y Mendeley desde el principio.
- Consultas en línea siempre activas o, al contrario, ninguna.

## Consecuencias
- El proyecto guarda una copia de cada referencia citada (con su clave de Zotero si está vinculada), para abrirse y exportarse sin Zotero.
- La conexión con Zotero va detrás de una interfaz propia para añadir otros gestores después. El prototipo 5 fijó cómo se lee (colección con sus subcolecciones, sincronización incremental por versiones, `Zotero-Server-ID`) y qué guarda `library.json` de cada referencia ([0027](0027-zotero-por-su-api-local.md)).
- Escribir en Zotero desde SciDesk queda para más adelante (Zotero 10 lo permite con permiso del usuario).
- El estilo CSL de Reumatología Clínica es de 2012 y deriva del de la NLM; hay que compararlo en la fase 0 con los ejemplos de la guía actual, que siguen el formato de Elsevier con DOI.
- La biblioteca vinculada a EndNote y a Mendeley sigue para más adelante (fase 4): el modo Zotero y la importación de archivos cubren casi todo (R45).
- Al importar un Word existente, las citas de Zotero, Mendeley y EndNote que lleva dentro pueblan la biblioteca y quedan como citas vivas, sin tener el gestor instalado (R1, fase 2). Comprobado con EndNote y Zotero en el prototipo 10 ([0028](0028-importar-citas-de-un-word.md)).
- Con la conexión activada: buscar en PubMed o Crossref desde el buscador de citas, proponer el vínculo de las citas escritas a mano (R24) y verificar cada referencia contra los registros, con aviso de retractaciones, fes de erratas y prepublicaciones ya publicadas (R10).
- Detalle en PLAN.md, 5.6.
