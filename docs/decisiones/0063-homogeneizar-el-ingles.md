# 0063. Homogeneizar el inglés: británico o estadounidense

- **Fecha:** 22/11/2026
- **Estado:** propuesta (la idea es del usuario, 22/11; falta que revise cómo ha quedado).
- **Pregunta del plan:** R29; relacionada con R20 (idioma por fragmento) y con las fichas 0060 y 0062.

## Qué se decide
- **Revisar › «Homogeneizar el inglés…»** abre un diálogo:
  1. se elige la variedad: británico (-ise) o estadounidense;
  2. se ve la lista de lo que cambiaría (palabra, grafía nueva y cuántas veces), agrupada y con casillas;
  3. «Aplicar» lo hace en **un solo paso del historial**, que Ctrl+Z deshace.
- **Qué se revisa:** todo el inglés del documento compuesto: el texto de un artículo en inglés, el resumen en inglés de un artículo en español, los fragmentos con marca `lang` en inglés, las tablas y las figuras. Nunca el texto borrado con control de cambios ni la bibliografía, que se genera.
- **Qué sale desmarcado al abrir** (se ve en la lista y se puede marcar):
  - el texto **entre comillas** (citas literales, títulos), que además no se cambia salvo con «Cambiar también el texto entre comillas»;
  - las palabras con **mayúscula a mitad de frase**, que suelen ser nombres propios (World Health Organization se llama así también en un texto británico).
- **«Marcar el inglés como británico/estadounidense»** (activado por defecto): los fragmentos, los párrafos y el resumen en inglés pasan a `en-GB` o `en-US`, y un artículo en inglés cambia su idioma en `article.json`. Así el corrector usa el diccionario de esa variedad (ficha 0062) y el Word de los coautores también.
- **Cómo se decide cada palabra** (`variants.ts` en `@scidesk/spell`), sin descargar nada:
  - unas reglas proponen candidatos: our/or, ise/ize, yse/yze, ae/e y oe/e, re/er, ogue/og, ence/ense, practise/practice, ll/l, programme/program, judgement/judgment, ageing/aging, y una lista corta de irregulares (grey/gray, mould/mold, aluminium/aluminum, artefact/artifact…);
  - una palabra cambia solo si cumple tres condiciones: el diccionario general de la variedad de destino la rechaza, la otra variedad (con la lista de especialidad) la conoce, y el destino acepta el candidato;
  - se prefiere el candidato que la otra variedad rechaza, es decir, un par verdadero;
  - lo que las dos variedades aceptan no se toca: sulfur, fetal, program, practice, license, dialogue.
- **El idioma de la ventana distingue las variedades:**
  - Revisar ofrece «Idioma: inglés (EE. UU.)» e «Idioma: inglés (Reino Unido)»;
  - el selector de la barra de estado ofrece español, inglés estadounidense e inglés británico;
  - `sameLang` considera iguales `en` y `en-US`, y `es` y `es-ES`, pero distingue `en` de `en-GB`. Antes ignoraba la región si faltaba en una de las dos etiquetas.
- **La lista de especialidad en inglés** recoge los pares médicos que no están en ninguno de los dos diccionarios generales (dyspnoea/dyspnea, coeliac/celiac, hypokalaemia/hypokalemia, oesophageal/esophageal, haemodynamic/hemodynamic…). El corrector la usa para no subrayarlos, y la homogeneización para saber que son pares.

## Por qué
- Las revistas piden una variedad, y un manuscrito escrito por varios autores las mezcla. Word solo lo resuelve palabra a palabra, con el corrector.
- **Reglas comprobadas con los diccionarios en lugar de una tabla de pares:** con los diccionarios que ya incluye el programa, las reglas aciertan con los pares habituales y no cambian palabras que no deben (four, hour, doctor, promise, exercise, more, water, presence). Lo comprueban las pruebas.
- **Revisar antes de aplicar:** hay casos que dependen del contexto (nombres propios, citas literales, títulos de artículos), y el usuario decide.

## Qué se descartó
- **VarCon de SCOWL** (la tabla de variantes completa, de licencia permisiva): habría que descargarla y añadir otro archivo grande. Las reglas cubren lo habitual en biomedicina. Si faltan pares, se puede incorporar más adelante, con permiso para descargarla.
- **Británico con -ize (Oxford):** no hay diccionario `en_GB-ize` incluido. Se añadiría junto con su diccionario.
- **Cambiar sin enseñar la lista:** se tocarían nombres propios y citas literales.
- **Convertir sulphur/sulfur:** la nomenclatura científica usa sulfur también en el Reino Unido. El británico de SCOWL rechaza «sulfur», así que se subraya; se puede añadir al diccionario del proyecto.

## Consecuencias
- **Probado en la vista del navegador**, con la carta en inglés de la demostración:
  - en un texto británico, la variedad estadounidense propone colour ×2, analysed, centres, paediatric, programme, randomised y tumour;
  - deja desmarcados «behaviour» y «oedema», que van entre comillas, y «Organisation», que es un nombre propio;
  - aplica los 8 cambios y Ctrl+Z los deshace en un paso;
  - con británico y el texto ya británico, no cambia nada, pero marca la carta como `en-GB`: la barra de estado dice «inglés británico» y no queda nada subrayado;
  - sin errores en la consola.
- **Pruebas nuevas:**
  - 4 en `packages/spell/test/variants.test.ts`: hacia estadounidense y hacia británico, con palabras médicas y mayúsculas; lo que no debe cambiar; candidatos;
  - `sameLang` con variedades en `packages/core/test/lang.test.ts`.
- **Pendiente:**
  - **probarlo con el usuario** (lo pidió el 22/11), con textos reales y con el control de cambios activo;
  - ir a cada aparición desde la lista;
  - comprobar el control de cambios: con el modo de sugerencias activo, los cambios deberían quedar como sugerencias, pero no se ha probado;
  - la homogeneización en la línea de comandos;
  - el idioma del artículo (inglés estadounidense o británico) en el asistente de nuevo artículo.
