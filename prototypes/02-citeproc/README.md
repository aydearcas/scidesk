# Prototipo 2: citeproc-js y estilos

Prototipo desechable de la fase 0 (PLAN.md, sección 8; P13 y la licencia de 6.3). Decisión resultante: [ficha 0026](../../docs/decisiones/0026-citas-con-citeproc-js.md).

## Pregunta

¿Formatea citeproc-js 50 referencias en 3 estilos, con el de *Reumatología Clínica* tal como pide su guía actual, y renumera en vivo cuando se insertan, quitan o mueven citas? Y, de paso: ¿cuál es su licencia real y qué exige?

## Respuesta

**Sí para el motor; no para el estilo de la revista que hay en el repositorio de CSL.**

**El motor** formatea las 50 referencias y las 40 citas de un artículo en los tres estilos sin errores, y renumera en vivo con margen de sobra:
- Insertar una cita al principio, que desplaza todos los números, tarda unos 2 ms.
- citeproc-js devuelve qué citas hay que redibujar (30 de 40).
- La bibliografía entera tarda 45–60 ms.

**El estilo de la revista** del repositorio de CSL es de 2012 y en realidad es el estilo NLM con superíndice. Cumple 9 de las 17 reglas que se comprobaron en la guía actual, que sigue la plantilla «Vancouver» de Elsevier:
- volumen en negrita;
- raya corta en las páginas;
- DOI como enlace `https://doi.org/…`;
- página web y conjunto de datos con su formato propio;
- «en prensa».

Se escribió un estilo nuevo, derivado de «Elsevier - Vancouver», que cumple las 17.

### El estilo de *Reumatología Clínica* frente a su guía

Guía consultada: <https://www.reumatologiaclinica.org/es-guia-autores> (21/11/2026, sin fecha de actualización).

Pide:
- números en superíndice en el texto y lista en orden de aparición;
- 6 autores y «et al.» a partir del séptimo;
- revistas abreviadas;
- DOI muy recomendado.

Sus seis ejemplos (artículo, artículo con número de artículo, libro, capítulo, página web y conjunto de datos) se convirtieron a CSL-JSON (`src/library.mjs`). Las reglas se comprobaron automáticamente (`src/guide-check.mjs`):

| Regla de la guía | reumatologia-clinica (2012) | elsevier-vancouver (2019) | medicina-clinica (2017) | vancouver-nlm | **reumatologia-clinica-2026** |
|---|---|---|---|---|---|
| Citas con números en superíndice, sin corchetes | sí | no | no | no | sí |
| Lista numerada «1.» | sí | no | sí | sí | sí |
| Autores «Apellido Iniciales», sin puntos | sí | sí | sí | sí | sí |
| Más de 6 autores: los 6 primeros y «et al.» | sí | sí | sí | sí | sí |
| 6 autores: todos | sí | sí | sí | sí | sí |
| Revista abreviada, «Año;Volumen:páginas» | sí | sí | sí | sí | sí |
| Volumen en negrita | no | no | no | no | sí |
| Última página abreviada con raya corta (51–9) | no | no | no | no | sí |
| DOI como enlace `https://doi.org/…` al final | no | sí | no | no | sí |
| Artículo con número de artículo (e00205) | sí | sí | sí | sí | sí |
| Libro | sí | sí | no | sí | sí |
| Capítulo («En: … editores. Libro, Lugar: Editorial; año, p. x–y.») | no | sí | sí | no | sí |
| Capítulo: título del libro en cursiva | no | no | no | no | sí |
| Página web («Título, URL; año [consultada el …]») | no | no | no | no | sí |
| Conjunto de datos («[dataset] … Repositorio, v1; año. DOI.») | no | no | no | no | sí |
| En prensa: lo indica | no | no | no | no | sí |
| Preprint: lo indica y da su DOI | sí | sí | no | sí | sí |
| **Total** | **9/17** | 9/17 | 7/17 | 8/17 | **17/17** |

**Qué hay que tener en cuenta al leer la tabla:**
- **El 17 de 17 es en parte circular:** el estilo nuevo y las reglas salen de la misma lectura de la guía. Lo que demuestra es que CSL basta para expresar la guía y cuánto se aleja el estilo de 2012.
- **«reumatologia-clinica (2012)»** es un estilo dependiente: solo fija el idioma y remite a `nlm-citation-sequence-superscript`, que es lo que se ha medido.
- **El guion en las páginas («51-9»).** Sale en todos los estilos menos el nuevo porque la localización española de CSL define el separador de intervalos como guion, como pide la RAE. La guía usa raya corta; el estilo nuevo la impone en su propia localización.
- **«medicina-clinica»,** otra revista española de Elsevier, está roto: anida dos superíndices, no pone el DOI y pierde la edición.
- **«vancouver»** ya no está en el repositorio de CSL: ahora es el dependiente `vancouver-nlm`, que remite a `nlm-citation-sequence`.

**Diferencias que quedan con los ejemplos de la guía, por decidir o sin importancia:**
- **Palabras fijas en español.** Con la localización española salen «En:», «editores», «4.ª ed.», «[consultada el …]» y «En prensa». Los ejemplos de la guía, que son la plantilla genérica de Elsevier, dicen «In:», «editors» y «4th ed.», aunque la misma guía pone «[consultada el …]» en español.
  - **Decisión del usuario (21/11/2026):** en un manuscrito en español, en español. Habrá un ajuste para elegir otro idioma.
  - El estilo se adapta solo: con `--lang en-US`, `try-styles.mjs` da «In:», «editors», «4th ed.», «[accessed 13 March 2003]» e «In press», y en los dos idiomas cumple las 17 reglas.
- **El sufijo del nombre:** sale «Strunk W Jr», como en NLM. La guía escribe «Strunk Jr W».
- **La guía se contradice:**
  - pone «J Sci Commun 2010» sin punto, pero «Heliyon. 2018» con punto;
  - pone en cursiva el nombre de una revista y el de la otra no.
  
  El estilo nuevo aplica siempre lo primero.
- **La web de la revista** muestra las referencias con el formato de su plataforma («J.L. Ren, J. Yang…», entre corchetes), no con el del manuscrito, así que no sirve de referencia.

El estilo nuevo está en `csl/reumatologia-clinica-2026.csl` (CC BY-SA 3.0, como el original). Si el usuario lo valida, puede proponerse al repositorio oficial de CSL para sustituir al de 2012. Eso es una contribución pública y se hace solo si él lo pide.

### Renumerar en vivo

`src/bench.mjs` registra las 40 citas del artículo una a una con `processCitationCluster`, como lo haría el *worker* de citas de SciDesk, y mide cuatro operaciones, deshaciendo cada una después (20 repeticiones, mediana y máximo):

| | reumatologia-clinica-2026 | nlm-citation-sequence (Vancouver) | APA 7 |
|---|---|---|---|
| Crear el procesador con el estilo | 23 ms | 10 ms | 429 ms |
| Registrar las 40 citas una a una | 21 ms | 7 ms | 118 ms |
| Cambiar de estilo (procesador nuevo y todas las citas de golpe, `rebuildProcessorState`) | 17 ms | 13 ms | 541 ms |
| Bibliografía de 50 entradas | 48 ms | 45 ms | 60 ms |
| Insertar una cita al principio (todo se renumera) | 1,8 / 3,5 ms; 30 citas que redibujar | 1,2 / 1,7 ms; 30 | 0,4 / 0,9 ms; 1 |
| Quitarla | 1,7 / 2,6 ms; 29 | 1,3 / 1,8 ms; 29 | 1,6 / 2,7 ms; 1 |
| Mover la primera cita al final | 2,6 / 3,7 ms; 40 | 2,0 / 2,6 ms; 40 | 1,7 / 2,5 ms; 1 |
| Añadir una referencia a una cita del medio | 1,0 / 1,4 ms; 11 | 0,7 / 1,3 ms; 11 | 2,5 / 2,8 ms; 1 |

**Lo que muestra la tabla:**
- **Las citas se renumeran solas**, y citeproc-js dice cuáles cambian: el editor solo redibuja esas. Las de los estilos numéricos agrupan intervalos («44–46»).
- **Con APA**, ninguna cita cambia de número: solo se redibuja la editada. Distingue a los autores con el mismo apellido y año («Driban, Stout, et al., 2016»).
- **La bibliografía es lo más caro** (45–60 ms): se recalcula en el *worker*, tras una pausa al escribir.
- **APA es lento al crearse** (medio segundo) por su tamaño. Cambiar a ese estilo debe mostrar que está trabajando.

**Formatos de salida:** citeproc-js da HTML, texto y RTF. Los exportadores a DOCX y Typst (prototipos 3 y 4) convierten el HTML a sus marcas, que solo usan cursiva, negrita, superíndice y subíndice.

### Licencia

- **La licencia real** (archivo `LICENSE` y cabecera del código) es **CPAL-1.0 o posterior, o AGPL-3.0 o posterior**, a elegir. El «AGPL-1.0» de npm (y del `package.json` del repositorio) es un error de metadatos. Lo detectará el comprobador de licencias de la integración continua, así que hace falta una excepción documentada.
- **La opción CPAL exige una atribución.** El archivo `CPAL` del repositorio rellena el anexo B:
  - «(c) Frank Bennett»;
  - «citeproc-js implements the Citation Style Language»;
  - <https://citationstyles.org/>;
  - «Display of Attribution Information is required in Larger Works».
  
  Según la sección 14 de la CPAL, un programa que lo incluya debe mostrar esa atribución de forma visible en su interfaz cada vez que arranca (puede ser la pantalla de inicio). Si se modifica citeproc-js, hay que publicar los cambios.
- **Para SciDesk** (ficha [0012](../../docs/decisiones/0012-licencia-agpl.md)):
  - la versión AGPL lo usa bajo AGPL-3.0;
  - una versión con otra licencia lo usaría bajo CPAL, con la atribución al arrancar.
  
  Mostrar la atribución también en la versión AGPL no cuesta nada y deja las dos puertas abiertas.
  
  *No es asesoramiento legal.*
- **Mantenimiento:**
  - La última versión en npm es la 2.4.63, de abril de 2023, y la última etiqueta del repositorio es de 2021.
  - El repositorio sigue vivo (último cambio del 10/11/2026) y recibe arreglos del equipo de Zotero, que incluye citeproc-js desde el repositorio.
  
  SciDesk haría lo mismo: una copia del repositorio en un commit fijo, sin modificar.

## Lo que este prototipo no cubre

- **WebKit (JavaScriptCore):** se ha medido en Node (V8, el motor de WebView2). Conviene repetir `bench.mjs` en WKWebView con el prototipo 11.
- **El *worker*:** las cifras son del hilo principal de Node. En SciDesk, citeproc-js vive en un *web worker*.
- **Validar el estilo nuevo con artículos publicados,** y saber si la revista acepta en el envío otro formato de referencias.
- **hayagriva:** la alternativa con licencia MIT/Apache, por si la licencia de citeproc-js diera problemas, no se ha probado con estos estilos.
- **Citas con prefijo y sufijo, autor suprimido y notas al pie:** citeproc-js las admite y la revista no las usa.
- **Estilos con más de 1000 referencias** y documentos muy largos: el riesgo 7.6 del plan habla de 80 referencias. Con 50, todo está muy por debajo de lo que se nota.

## Cómo se ejecuta

Requisito: Node 24.

```powershell
npm install
node src/guide-check.mjs
node src/bench.mjs 20
node src/try-styles.mjs reumatologia-clinica-2026 elsevier-vancouver
```

- `guide-check.mjs` compara los estilos con la guía. Escribe la tabla y `out/guide-check.json`, con cada referencia formateada.
- `bench.mjs` mide la renumeración en vivo, el cambio de estilo y la bibliografía, y escribe `out/bench.json`.
- `try-styles.mjs` imprime los ejemplos de la guía y los casos difíciles en los estilos que se le pasen; con `--lang en-US`, con las palabras fijas en inglés.

## Archivos

- `src/library.mjs`: la biblioteca de prueba en CSL-JSON (50 referencias) y las citas del artículo en orden. Contiene:
  - los 6 ejemplos de la guía;
  - 7 casos difíciles inventados: 8 y 6 autores, autor colectivo, artículo en español de la revista, en prensa, *preprint* e informe web;
  - las 37 referencias del artículo sintético de `prototypes/corpus/`.
- `src/guide-check.mjs`, `src/bench.mjs` y `src/try-styles.mjs`: las comprobaciones.
- `csl/`: los estilos y localizaciones del repositorio oficial de CSL (CC BY-SA 3.0), descargados el 21/11/2026, y el estilo nuevo `reumatologia-clinica-2026.csl`.
