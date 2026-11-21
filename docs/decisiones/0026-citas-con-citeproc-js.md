# 0026. Citas con citeproc-js: renumeración en vivo, estilo propio de Reumatología Clínica y licencia

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 2 de la fase 0). Confirma citeproc-js en [0010](0010-pila-tecnologica.md), concreta la licencia de [0012](0012-licencia-agpl.md) y contesta la duda de P13 sobre el estilo de la revista de prueba ([0008](0008-revista-de-prueba.md)).
- **Pregunta del plan:** P13 y la licencia de citeproc-js (6.3), prototipo 2 de la sección 8

## Qué se decide
- **citeproc-js es el motor de citas.**
  - Vive en el *worker* de citas y se usa con `processCitationCluster`: cada cita insertada, quitada, movida o editada se le pasa con las de antes y las de después.
  - El editor redibuja solo las citas que citeproc-js dice que cambian.
  - Cambiar de estilo o abrir el documento usa `rebuildProcessorState`.
  - La bibliografía se recalcula tras una pausa al escribir.
- **Se incluye desde su repositorio de GitHub (`juris-m/citeproc-js`) en un commit fijo, sin modificar,** como hace Zotero. No se instala desde npm, porque npm no recibe versiones desde 2023 y el repositorio sí recibe arreglos.
- **Licencia, según el archivo `LICENSE` y la cabecera del código:** CPAL-1.0 o posterior, o AGPL-3.0 o posterior.
  - La versión AGPL de SciDesk lo usa bajo AGPL-3.0, como decía 0012.
  - Una versión con otra licencia lo usaría bajo CPAL.
  - **SciDesk muestra en todas sus versiones la atribución del anexo B de la CPAL** en la pantalla de inicio y en «Acerca de»: «citeproc-js implements the Citation Style Language», «(c) Frank Bennett» y <https://citationstyles.org/>. Así la opción CPAL está cumplida desde el principio.
  - El «AGPL-1.0» de los metadatos de npm es un error: el comprobador de licencias de la integración continua lleva una excepción documentada para citeproc-js.
- **Idioma de las palabras fijas de las referencias** («En:»/«In:», «editores»/«editors», «4.ª ed.»/«4th ed.», «[consultada el …]»/«[accessed …]», «En prensa»/«In press»): por defecto, el del manuscrito. Hay un ajuste en el programa para elegir otro idioma por artículo. Lo decidió el usuario el 21/11/2026. El título y los demás datos de cada referencia no cambian. Para citeproc-js es solo el idioma con el que se crea el procesador.
- **Estilo de Reumatología Clínica:** SciDesk incluye un estilo propio, derivado de «Elsevier - Vancouver» (CC BY-SA 3.0), que sigue la guía actual de la revista (`prototypes/02-citeproc/csl/reumatologia-clinica-2026.csl`). No usa el del repositorio de CSL. El perfil de la revista guarda de qué guía y de qué fecha sale ([0014](0014-perfiles-de-revista.md)).

## Por qué
- **Renumerar en vivo es inmediato.** Con 50 referencias y las 40 citas de un artículo:
  - Insertar una cita al principio, que desplaza todos los números, tarda unos 2 ms, y citeproc-js devuelve las 30 citas que hay que redibujar.
  - Quitar, mover o editar una cita tarda 1–2,6 ms.
  - La bibliografía de 50 entradas tarda 45–60 ms.
  - Cambiar de estilo tarda 13–17 ms con estilos numéricos y medio segundo con APA, que es un estilo muy grande.
- **Los tres estilos probados funcionan sin errores:** el nuevo de la revista, Vancouver/NLM y APA 7. APA distingue a los autores con el mismo apellido y año.
- **El estilo de la revista del repositorio de CSL no sirve.** Es de 2012 y en realidad es «NLM con superíndice». Cumple 9 de las 17 reglas de la guía actual, que sigue la plantilla «Vancouver» de Elsevier. No pone el volumen en negrita, escribe el DOI como `doi:` y no como enlace, pone el número entre paréntesis, formatea mal la página web y el conjunto de datos y no indica «en prensa». Otros estilos parecidos tampoco: «Elsevier - Vancouver» cumple 9 y cita entre corchetes; el de *Medicina Clínica* cumple 7 y está roto.
- **El idioma del manuscrito para las palabras fijas** es lo natural en un artículo en español, aunque los ejemplos de la guía, que son la plantilla genérica de Elsevier, las tengan en inglés. El ajuste cubre a quien prefiera lo contrario o a una revista que lo pida.
- **El estilo nuevo cumple las 17.** Es en parte circular, porque estilo y reglas salen de la misma lectura de la guía, pero demuestra que CSL basta para expresarla.

## Qué se descartó
- **El estilo `reumatologia-clinica` del repositorio de CSL**, por lo anterior.
- **Instalar citeproc-js desde npm:** la versión 2.4.63 (abril de 2023) no tiene los arreglos posteriores del repositorio.
- **hayagriva** como motor principal: sigue siendo la salida si la licencia de citeproc-js diera problemas ([0001](0001-codigo-abierto.md)), pero no es la implementación de referencia de CSL y no se ha probado con estos estilos.

## Consecuencias
- **Si el usuario valida el estilo nuevo,** se puede proponer al repositorio oficial de CSL para sustituir al de 2012. Es una contribución pública y se hace solo si él lo pide.
- **El catálogo de perfiles de revista** debe poder llevar su propio estilo CSL cuando el del repositorio no coincide con la guía. Es lo normal en revistas de editoriales grandes con estilos antiguos.
- **Prototipo 11:** repetir `bench.mjs` en WKWebView (JavaScriptCore).
- **Fase 1:** medir citeproc-js dentro del *web worker* con el editor.
- **Pendiente sin probar:** documentos con cientos de referencias, prefijos y sufijos de cita, y notas al pie.
- *No es asesoramiento legal:* antes de publicar, la lectura de la CPAL y su atribución la revisa alguien especializado, como pide 0012.
- Detalle y cifras en [`prototypes/02-citeproc/README.md`](../../prototypes/02-citeproc/README.md).
