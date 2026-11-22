# 0062. Inglés británico en el corrector (en_GB de SCOWL)

- **Fecha:** 22/11/2026
- **Estado:** aceptada (el usuario autorizó la descarga el 22/11). Completa lo que las fichas 0023 y 0057 dejaron pendiente.
- **Pregunta del plan:** R29.

## Qué se decide
- **El diccionario `en_GB-ise` de SCOWL** (versión 2020.12.07, el tamaño normal, con grafía en «-ise»):
  - descargado de SourceForge (`hunspell-en_GB-ise-2020.12.07.zip`, 198.511 bytes, SHA-256 `2ced4b2e…5f01ad3`);
  - incluido en `packages/spell/assets/dicts/` como `en_GB.aff`, `en_GB.dic` y `README_en_GB.txt`;
  - con la misma licencia permisiva de SCOWL que `en_US`. No se usa el `en_GB` de LibreOffice, que es LGPL.
- **Qué diccionario usa cada etiqueta:**
  - `en-GB` usa `en_GB`;
  - `en`, `en-US` y cualquier otra variante de inglés usan `en_US`;
  - `es` y sus variantes usan `es_ES`.
  Así, un artículo o un fragmento en `en-GB` se corrige en británico. Un caso habitual es el texto pegado desde Word con `lang=EN-GB`.
- **Las listas de especialidad en inglés** (ficha 0059) valen para los dos diccionarios, porque SCOWL usa los mismos afijos en `en_US` y en `en_GB`. La compilación comprueba que cada entrada se lee con los dos `.aff`. Las listas tienen las dos grafías de algunos términos (randomise y randomize, haematology y hematology), así que en británico se acepta también la variante en «-ize» de esos términos, que la norma de Oxford admite.

## Por qué
- Muchas revistas biomédicas europeas y británicas piden inglés británico. Con `en_US`, «colour», «tumour» o «behaviour» salían subrayadas.
- La variante «-ise» es la más común en el Reino Unido y en las revistas que piden inglés británico. La variante «-ize» (Oxford) y la grande de SCOWL quedan para cuando haga falta.

## Qué se descartó
- `en_GB` de LibreOffice (LGPL), por la licencia.
- `en_GB-large` de SCOWL: según su propio README, está menos revisado y acepta palabras raras que suelen ser erratas.

## Consecuencias
- **Pruebas:**
  - el británico acepta colour, randomised, haematology, tumour, behaviour y el vocabulario de la especialidad;
  - rechaza color, behavior y erratas, y sugiere «colour»;
  - `dictionaryFor` elige bien con cada etiqueta.
- **Probado en la vista del navegador:** al pegar «colour of the tumour and patient behavior» marcado `EN-GB`, solo se subraya «behavior».
- **Pendiente:**
  - elegir inglés británico desde la ventana: el selector de idioma ofrece español e inglés, y el inglés es el estadounidense;
  - el idioma del artículo en el asistente de nuevo artículo.
  Hoy el británico llega por el texto pegado o importado de Word, o por el idioma del artículo en `article.json`.
