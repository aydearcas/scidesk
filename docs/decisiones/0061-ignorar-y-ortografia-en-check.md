# 0061. «Ignorar» una palabra en el artículo y la ortografía en `scidesk check`

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise). Cierra dos pendientes del corrector de la ficha 0057.
- **Pregunta del plan:** R29, R33 (núcleo sin interfaz con línea de comandos).

## Qué se decide
- **«Ignorar «palabra» en este artículo»**, en el menú de una palabra subrayada, entre las sugerencias y «Añadir al diccionario del proyecto»:
  - la palabra deja de subrayarse solo en ese artículo, no en los demás del proyecto (para eso está el diccionario del proyecto);
  - se guarda en `article.json`, en una lista nueva y opcional, `ignoredWords` (esquema regenerado), junto a los avisos ignorados. Así viaja con el proyecto y vale en todos los equipos;
  - la palabra se compara como Hunspell lee una lista: tal cual, o en minúscula si solo empieza por mayúscula;
  - el mensaje que aparece al ignorarla tiene «Deshacer», y `scidesk spell-ignore <dir> <palabra> --undo` la quita de la lista.
- **`scidesk check` revisa también la ortografía** de cada artículo:
  - imprime cuántas palabras no reconoce, de cuántas, y las 30 más repetidas con su idioma (todas con `--all-words`);
  - avisa de los idiomas sin diccionario.
  `scidesk spell-ignore <dir> <palabra> [--undo] [--article main]` ignora o vuelve a subrayar una palabra.
- **En el núcleo**, `spelling.ts`: `spellingReport(proyecto, artículo, comprobar, enPantalla?)` sigue las mismas reglas que el subrayado del editor:
  - las mismas palabras (`wordsIn`) y el idioma de cada fragmento (marca, bloque, contenedor o artículo);
  - nunca el texto borrado ni la bibliografía, que se genera;
  - el diccionario del proyecto también para las partes de una palabra con guion («Zubizarreta-Ugalde»);
  - las palabras ignoradas.
  Da cada palabra con su recuento y dónde está (archivo y bloque). Igual que en la ficha 0060, el diccionario se pasa como función: el *worker* en la ventana y `@scidesk/spell/node` en la línea de comandos.

## Por qué
- **«Ignorar» es lo que pide un apellido, una sigla rara o una palabra de otra lengua que aparece una sola vez:** añadirla al diccionario del proyecto la aceptaría en todos los artículos.
- **Guardarlo en el artículo y no en el equipo:** el coautor que abre el proyecto en otro ordenador no ve subrayadas las palabras que ya se revisaron. Word lo guarda dentro del documento por la misma razón.
- **La ortografía en `scidesk check`** completa lo que la ficha 0057 dejó pendiente. Sirve también para revisar un artículo entero sin abrirlo, o uno recién creado desde Word.

## Qué se descartó
- **Ignorar solo durante la sesión:** se perdería al cerrar y en el otro equipo.
- **Una lista de ignoradas en cada documento (`.scidoc`):** mezclaría el contenido con preferencias del corrector. Además, un artículo tiene varios documentos (resumen, tablas, figuras) y la palabra se ignora en todos.
- **La ortografía como aviso del panel «Avisos»:** el editor ya subraya, y un aviso por palabra llenaría el panel. Si hace falta, se puede añadir un aviso informativo con el recuento.

## Consecuencias
- **Probado en la vista del navegador:** «Ignorar «Zubizarreta» en este artículo» quita el subrayado y escribe `ignoredWords` en `article.json`; «Deshacer» lo devuelve y quita la lista. Sin errores en la consola.
- **Con los Word del usuario** (solo en local), creados con «Nuevo desde Word»:
  - en una revisión, 441 de 5.240 palabras sin reconocer;
  - en el informe, 3.810 de 59.228, en 3 s.
  Casi todo es la bibliografía, que entra como texto porque las citas vivas desde Word son de la fase 2, junto con apellidos e inglés sin marcar.
- **Pruebas nuevas:** 2 en `packages/core/test/spelling.test.ts` (informe con erratas, siglas, texto borrado, marcas de idioma, diccionario del proyecto con guiones, ignorar y volver a subrayar, idiomas sin diccionario; regla de mayúsculas de las listas).
- **Pendiente:**
  - ver y quitar las palabras ignoradas desde la ventana (hoy, «Deshacer» en el momento o `scidesk spell-ignore --undo`);
  - `en_GB` de SCOWL (pendiente de descarga con permiso del usuario).
