# 0030. Tauri confirmado frente a Electron

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 11 y cierre de las tres condiciones de R37). Confirma la plataforma de [0010](0010-pila-tecnologica.md).
- **Pregunta del plan:** R37 y P18 (prototipo 11 de la sección 8)

## Qué se decide
- **SciDesk se construye con Tauri 2,** con WebView2 en Windows y WKWebView en macOS. No se pasa a Electron.
- **El control de cambios trata la composición del teclado.** Mientras se compone un carácter (las teclas de acento del Mac, los teclados asiáticos, Android), las transacciones no se convierten en sugerencias. Al terminar, el cambio neto se aplica como una sola sugerencia. Va en la copia propia de `prosemirror-suggest-changes` ([0020](0020-control-de-cambios.md)), con el código del prototipo 8 como punto de partida.
- **El limpiador del HTML de Word** reconoce también lo que entrega Word para Mac en WebKit ([0022](0022-pegar-tablas-de-word.md)):
  - los símbolos de Wingdings en el bloque privado de Unicode;
  - las marcas `<o:p>`, que se descartan.
- **Las pruebas diarias del editor en WebKit** (condición 3) incluyen casos de composición simulada, porque Playwright no reproduce las teclas de acento del Mac.

## Por qué
Las tres condiciones de R37 se cumplen:
1. **Lo que más cambia entre motores no depende del motor.**
   - El corrector va en WebAssembly ([0023](0023-corrector-ortografico.md)) y la vista previa y el PDF, en Typst ([0024](0024-vista-previa-y-pdf-con-typst.md)).
   - En Safari, el corrector da exactamente los mismos resultados que en Chromium (2.580 palabras rechazadas en el mismo texto), y tan rápido o más.
   - citeproc-js también va igual o más rápido.
2. **El pegado de tablas y la edición básica se probaron en el MacBook en la fase 0** (Safari 26.5, el mismo WebKit que WKWebView, con Word para Mac):
   - 10 de 12 tablas reales quedan perfectas con el limpiador; las otras dos pierden un espacio cada una.
   - La edición básica funciona.
   - Las citas de EndNote pegadas desde Word llegan solo como texto, porque WebKit no entrega ni los campos ni el RTF. Electron en el Mac tendría lo mismo; Tauri puede leer el portapapeles nativo desde Rust.
   - El único fallo serio, los acentos en el modo sugerencias, es del editor y no del motor web: Chrome en el Mac, y por tanto Electron, lo tendría igual. Ya está arreglado y comprobado en el Mac.
3. **Las pruebas diarias en WebKit** son un compromiso de la fase 1. El prototipo muestra que hacen falta, y que deben incluir la composición.

Ningún resultado del Mac habría sido mejor con Electron. Tauri mantiene sus ventajas:
- seguridad por diseño;
- Typst y el núcleo en Rust integrados directamente;
- acceso al portapapeles nativo desde Rust, que sirve para leer el RTF que WebKit no entrega.

## Qué se descartó
- **Electron.** Se habría elegido si fallaba alguna condición. Lo único que habría ganado es el mismo motor en los dos sistemas, y el fallo encontrado no dependía del motor.

## Consecuencias
- **Corte vertical de la fase 1:**
  - repetir en la ventana real de Tauri en el Mac el pegado, la edición y el modo sugerencias;
  - comprobar si el portapapeles nativo, leído desde Rust, da el HTML original y el RTF de Word para Mac. En Safari, las citas de EndNote pegadas llegan solo como texto («(1)»): ni campos ni RTF ([0022](0022-pegar-tablas-de-word.md)). Si no, en el Mac se tratan como citas escritas a mano (R24).
- **Pegado en WebKit:** reponer los espacios que Safari pierde al reescribir el HTML de Word, contrastando con el `text/plain`.
- **Sin probar:** citas de Zotero pegadas desde Word para Mac, teclados asiáticos y Android, y copias de Word para Mac en la fusión ([0029](0029-fusion-de-copias-devueltas.md)).
- **Firma y notarización en macOS:** siguen como estaban en [0002](0002-plataformas-windows-primero.md).
- Detalle y cifras en [`prototypes/11-mac-webkit/README.md`](../../prototypes/11-mac-webkit/README.md).
