# 0059. Diccionario de especialidad para el corrector

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise). Diseña lo que la ficha 0023 dejó pendiente y la 0057 llamó imprescindible.
- **Pregunta del plan:** R29, PLAN 5.x (diccionarios de especialidad [V1], adelantado a la fase 1).

## Qué se decide
- **Listas propias, escritas para SciDesk**, en `packages/spell/specialty/`:
  - `es/`: `farmacos.txt`, `enfermedades.txt`, `clinica-y-pruebas.txt` y `metodologia.txt`;
  - `en/`: `drugs.txt` y `clinical.txt`;
  - `common/nombres.txt`: lo que se escribe igual en los dos idiomas (epónimos como Sjögren o Behçet, géneros de microorganismos, métodos estadísticos y bases de datos).
  Cubren reumatología y lo que comparte cualquier artículo clínico: fármacos (DCI en español y en inglés), enfermedades, signos y síntomas, pruebas, anatomía articular, inmunología y laboratorio, profesiones, métodos y estadística.
- **Mismo formato que Hunspell, con los afijos del diccionario general:**
  - una entrada por línea: la palabra, la palabra con marcas (`psoriásico/GS` acepta psoriásica, psoriásicos y psoriásicas) o la palabra con un modelo (`aleatorizar ~realizar` toma las marcas de «realizar» y acepta todas las formas del verbo);
  - `npm run build:specialty` las convierte en `assets/dicts/biomed_es.dic` (928 entradas) y `biomed_en.dic` (672);
  - la compilación se para ante una entrada que no se lee o un modelo que no existe, comprueba que cada entrada se acepta con el `.aff` de su idioma y deja fuera, avisando, lo que el diccionario general ya acepta (92 y 122 entradas).
- **Un solo diccionario por idioma:** el *worker* une el `.dic` general y el de especialidad antes de cargarlo (`withSpecialty`). Así las sugerencias salen de los dos: para «metotrexto» la primera es «metotrexato».
- **Siempre activo.** No hay interruptor: el programa empieza por biomedicina y clínica. Cuando lleguen otras disciplinas, cada área de la ficha 0050 podrá traer su lista.
- **Una herramienta para medir**, `packages/spell/tools/measure-text.ts`: cuenta los subrayados de un texto con y sin el diccionario de especialidad, y con `--other en` separa las palabras que son del otro idioma (texto sin su marca `lang`). Se usa con documentos privados solo en el equipo; lo que imprime no entra en el repositorio.
- **Licencia:** la del resto de SciDesk (AGPL-3.0-or-later). No se copia ninguna lista ajena.

## Por qué
- **Las cifras, con los documentos reales del usuario** (los del prototipo 9):
  - en el cuerpo de las dos revisiones narrativas (5.761 palabras), los subrayados bajan de **16,0 a 4,7 por cada 1.000 palabras**;
  - de esos 4,7, casi todos son palabras inglesas sin marca de idioma; sin ellas quedan **0,5 por cada 1.000** (tres apellidos);
  - en el informe de 64.000 palabras, lo que no es de ningún idioma baja de 95 a 44 por cada 1.000; casi todo lo que queda son marcas comerciales y fragmentos de nombres químicos de las estrategias de búsqueda, apellidos y letras de notas pegadas a una palabra en el texto plano extraído;
  - las erratas reales del informe siguen subrayadas («dsfiunción», «estándard», «imuldosa», «hidroxicloriquina»).
- **Listas propias en lugar de fuentes externas:** una palabra suelta no tiene derechos de autor, pero las listas sí pueden tenerlos, y varias fuentes obvias no encajan con la licencia del programa (las de OpenMedSpel son GPL; las de DrugBank, no comerciales). Escribirlas permite controlar qué entra y comprobarlo.
- **Los afijos del diccionario general:** una entrada da el plural, el femenino o todas las formas de un verbo sin escribirlas una a una, y la compilación detecta un modelo que no existe.
- **Unir los dos `.dic` y no añadir palabra a palabra:** las sugerencias tienen en cuenta el vocabulario de la especialidad, y cargar cuesta lo mismo (12 KB más en español).

## Qué se descartó
- **Fuentes con licencia incompatible:** OpenMedSpel y otros diccionarios médicos de Hunspell bajo GPL; DrugBank (CC BY-NC).
- **Descargar ahora fuentes abiertas grandes** (el nomenclátor de la AEMPS para los principios activos en español, MeSH para el inglés): darían miles de nombres, pero hace falta descargarlas (con permiso del usuario), filtrar lo que no es prosa y revisar su licencia. Queda como ampliación.
- **Escribir cada forma de la palabra sin marcas:** listas mucho más largas y más fáciles de dejar incompletas.
- **Un diccionario de especialidad que se pueda apagar:** sin uso hasta que haya otras disciplinas.
- **Aceptar en un texto en español las palabras que valen en inglés:** taparía erratas; lo correcto es la marca `lang` en el editor (pendiente de la ficha 0057).

## Consecuencias
- **Probado en la vista del navegador:** la demostración ya no subraya «intercuartílico»; en una frase con reumatólogos, espondiloartritis psoriásica, metotrexato, adalimumab, ensayos aleatorizados multicéntricos y Sjögren solo se subraya la errata «metotrexto», y el menú propone «metotrexato» antes que «mamotreto»; en la carta en inglés, solo «hydroxychloroqine». Sin errores en la consola, y la compilación de la ventana incluye los dos diccionarios.
- **Pruebas nuevas:** 4 en `packages/spell/test/spell.test.ts` (vocabulario con plurales, femeninos y formas verbales; erratas que siguen subrayadas y sugerencias; unión de los archivos; lectura de las listas con sus errores).
- **Sin probar** en la ventana real de Tauri ni en WKWebView (el mecanismo es el mismo que el de los diccionarios generales, ya probados).
- **Pendiente:**
  - que el usuario revise las listas (una palabra mal escrita en ellas taparía esa errata en todos los artículos);
  - ampliarlas con fuentes abiertas (nomenclátor de la AEMPS, MeSH, la lista de DCI de la OMS) y con el paquete para LLM de nivel 0 (ficha 0018), siempre pasando por estas listas y su compilación;
  - otras especialidades y la relación con las áreas (ficha 0050);
  - la marca `lang` en el editor, que resolvería casi todo lo que queda en los textos del usuario;
  - `en_GB` de SCOWL: mientras tanto, las listas en inglés llevan también las grafías británicas más comunes (randomise, hyperuricaemia, tumour).
