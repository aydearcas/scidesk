# 0082. Pruebas del editor con Playwright en Chromium y WebKit

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11), siguiente paso de la integración continua ([0081](0081-integracion-continua-y-repositorio-publico.md)).
- **Pregunta del plan:** R37 (las pruebas del editor se ejecutan a diario también en WebKit) y la pila de pruebas (PLAN 6.1).

## Qué se decide
- **Pruebas de la interfaz con Playwright** (`@playwright/test` 1.65) en `apps/desktop/e2e/*.e2e.ts`, sobre la vista del navegador (Vite en el puerto 1430, con el lado de Tauri simulado). La extensión `.e2e.ts` evita que Vitest las coja.
- **Cada prueba empieza en un navegador limpio:** primer arranque, «Empezar» y el proyecto de demostración.
- **Las cinco primeras** cubren lo que una diferencia de WebKit rompería antes:
  - abrir la demostración sin errores;
  - escribir, el recuento de palabras y el guardado tras la pausa;
  - negrita con el atajo de Word y deshacer;
  - citar con Ctrl+Mayús+C;
  - Tab en la última celda de una tabla.
- **Los atajos se pulsan con `ControlOrMeta`:** Ctrl en Windows y ⌘ en macOS, como hace el programa.
- **En la integración continua:** Chromium y WebKit en Windows y en macOS, en cada envío y también cada día a las 5:00 (UTC). Así se ve cuando una versión nueva de un navegador rompe el editor. Si algo falla, se guarda el informe con las trazas 14 días.
- **En local:** solo Chromium, con el Edge ya instalado (`channel: "msedge"`), sin descargar navegadores. Comandos: `npm run e2e -w @scidesk/desktop -- --project=chromium`, o `npm run ci`, que lo incluye.

## Por qué
- El editor corre sobre WebView2 (Chromium) en Windows y sobre WKWebView (WebKit) en macOS, y el desarrollo diario se hace solo en Windows.
- El WebKit de Playwright no es idéntico a WKWebView, pero detecta la mayoría de las diferencias. El resto se prueba a mano en el MacBook.

## Qué se descartó
- **Descargar WebKit en el equipo de desarrollo:** son unos 300 MB, y la integración continua ya lo ejecuta en cada envío.
- **WebdriverIO con el servicio de Tauri en macOS:** prueba la ventana real, pero es más lento y frágil. Queda para cuando haga falta probar lo que solo existe en la ventana (diálogos, comandos de Rust).

## Consecuencias
- Cada función nueva del editor debería traer su prueba en `e2e/` si depende del motor del navegador (selección, teclado, pegado, arrastrar).
- Pendiente: pegar desde Word con el portapapeles, la composición de acentos (las teclas muertas del Mac) y las páginas, que en WebKit siguen siendo una hoja continua.
