# 0057. El corrector ortográfico en el editor

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise). Lleva a la ventana lo decidido en la ficha 0023 (prototipo 9).
- **Pregunta del plan:** R29, PLAN 5.x (corrector [MVP] e idioma por fragmento [V1]).

## Qué se decide
- **Un paquete propio, `packages/spell` (`@scidesk/spell`)**:
  - el módulo de Rust del prototipo 9 (spellbook 0.4 detrás de una interfaz de C) y su WebAssembly ya compilado (392 KB, `npm run build:wasm`);
  - los diccionarios `es_ES` (RLA-ES, de LibreOffice, usado con la opción MPL) y `en_US` (SCOWL), como archivos de datos aparte, con sus licencias;
  - en TypeScript, el envoltorio del módulo y las reglas de qué es una palabra (`wordsIn`), compartidos por la ventana y Node;
  - procedencia y licencias en su `README.md`.
  `en_GB` todavía no va: el de LibreOffice es LGPL y falta traer el de SCOWL. Mientras tanto, el inglés se corrige con `en_US`.
- **Qué se comprueba:**
  - las palabras de letras; las que llevan apóstrofo o guion son una sola palabra, y Hunspell comprueba cada parte («anti-inflamatorio»);
  - nunca las siglas ni los nombres con más de una mayúscula (DAS28, TNF, IgG, mRNA);
  - nunca las palabras pegadas a cifras (5mg), las letras sueltas, las direcciones web, los correos ni los DOI;
  - nunca el texto borrado con control de cambios;
  - las citas y referencias cruzadas son nodos sin texto, y la bibliografía se genera, así que tampoco entran.
- **El idioma de cada palabra:**
  - el de su marca `lang`, si la tiene;
  - si no, el del bloque;
  - si no, el del contenedor (el resumen de cada idioma, el título);
  - si no, el del artículo.
  Un idioma sin diccionario (francés, por ejemplo) no se corrige.
- **En el editor** (`spellcheck.ts`, una extensión de Tiptap):
  - subrayado ondulado rojo dibujado como decoración;
  - al cambiar algo, solo se vuelven a mirar los párrafos tocados;
  - las palabras nuevas van al *worker* (`spell-worker.ts`) tras 150 ms de pausa y una caché guarda cada respuesta;
  - el *worker* carga el diccionario de un idioma la primera vez que lo necesita y nunca recibe el texto, solo palabras sueltas.
- **El menú contextual** sobre una palabra subrayada empieza con:
  - hasta 6 sugerencias, que la sustituyen;
  - «Añadir «palabra» al diccionario del proyecto».
- **El diccionario del proyecto** es `resources/dictionary.txt`, la ruta que ya fijaba el formato:
  - una palabra por línea, ordenadas, y las líneas con `#` son comentarios;
  - lo aceptan todos los idiomas;
  - se lee al abrir el proyecto y viaja con él.
- **Revisar › Corrector ortográfico** lo enciende o lo apaga, y se guarda en los ajustes del equipo (`spellcheck`).
- **La política de seguridad de la ventana** añade `'wasm-unsafe-eval'` a `script-src` (para instanciar WebAssembly) y `'self'` a `connect-src` (para leer los diccionarios incluidos). No da acceso a nada fuera de la aplicación.

## Por qué
- **Es lo siguiente de la fase 1**, y el prototipo 9 ya había elegido motor, diccionarios y forma.
- **Un paquete aparte** permite usar el mismo corrector en la línea de comandos más adelante (`scidesk check`), y deja los diccionarios y sus licencias en un sitio claro.
- **Mirar solo los párrafos tocados** era lo pendiente de la ficha 0023 para documentos largos (ficha 0055: el informe de 369 páginas).
- **Saltar los nombres con varias mayúsculas** evita la mayor parte de los falsos avisos en biomedicina (siglas, genes, inmunoglobulinas), que no están en ningún diccionario general.

## Qué se descartó
- **Diccionarios descargados al instalar o al usarlos:** el corrector debe funcionar sin conexión y sin preguntar nada.
- **Un diccionario del proyecto por idioma:** más trabajo para el usuario. Es raro que una palabra añadida en un idioma tape una errata del otro, y siglas y nombres propios valen en los dos (ficha 0023).

## Consecuencias
- **Probado en la vista del navegador** con la demostración:
  - subraya «intercuartílico» al abrir;
  - una errata escrita («artrtis») se subraya y el menú ofrece «artritis», «artista» y «artrosis»; la sugerencia la sustituye;
  - «Añadir al diccionario» escribe `resources/dictionary.txt` y quita el subrayado, que no vuelve al reabrir el proyecto;
  - en la carta en inglés subraya «diseese» y «tratamiento»;
  - el interruptor del menú Revisar.
- **Probado en la ventana real de Tauri**, con la versión que lleva la interfaz dentro y la política de seguridad nueva: el *worker* compilado carga el WebAssembly y los dos diccionarios en 66 ms, responde bien y sugiere, sin violaciones de la política.
- **Sin probar** en el MacBook (WKWebView) ni con el documento de 369 páginas (la pasada inicial recorre todo el texto una vez).
- **Pruebas nuevas:** 6 en `packages/spell/test/spell.test.ts` (diccionarios, sugerencias, palabras añadidas, compuestos con guion, qué es una palabra, idioma y diccionario del proyecto).
- **Pendiente:**
  - el diccionario de especialidad (biomedicina y reumatología, ficha 0023), imprescindible: sin él quedan unos 16 subrayados por cada 1.000 palabras de un artículo clínico;
  - `en_GB` de SCOWL;
  - «Ignorar» una palabra solo en este documento;
  - la marca `lang` en el editor (el formato ya la tiene; el editor todavía no la muestra ni la pone);
  - el corrector en `scidesk check`.
