# 0081. Integración continua con GitHub Actions y repositorio público `scidesk`

- **Fecha:** 23/11/2026
- **Estado:** decidida por el usuario (23/11): repositorio público en GitHub con el nombre `scidesk` y la integración continua que pedía el plan.
- **Pregunta del plan:** P2 y R37 (Windows y macOS; pruebas del editor también en WebKit), riesgo 7.7 y pila de pruebas (PLAN 6.1).

## Qué se decide
- **El código se publica en GitHub, en un repositorio público `scidesk`** de la cuenta del usuario, con todo el historial. Antes de subirlo se revisó que el historial no tiene los Word privados del usuario, rutas de su equipo, claves ni nombres reales en los documentos de ejemplo (los coautores de la ronda sintética son ficticios).
- **Integración continua con GitHub Actions** (`.github/workflows/ci.yml`): en cada envío y en cada *pull request*, en una máquina limpia con Windows y otra con macOS:
  1. `npm ci`;
  2. comprobación de tipos de todos los paquetes;
  3. compilación de la ventana con Vite (el *crate* de Tauri la necesita para compilar);
  4. compilación de `scidesk-pdf`, para que las pruebas del PDF y del SVG no se salten;
  5. pruebas de npm (Vitest) y de Rust (`cargo test`).
- **Los mismos pasos en local con `npm run ci`.**
- **Primer paso, sin las pruebas del editor en WebKit.** Las pruebas de la interfaz con Playwright en Chromium y WebKit (R37) son el paso siguiente: todavía no existen.

## Por qué
- Es lo que pedía el plan desde la fase 1: compilar y probar en macOS sin depender del MacBook, y detectar lo que solo funciona en el equipo de desarrollo (archivos sin commit, rutas propias, programas instalados a mano).
- GitHub Actions da máquinas con Windows y macOS sin coste para un repositorio público, y el código iba a ser público (AGPL-3.0).

## Qué se descartó
- **Un repositorio privado:** los minutos de macOS cuentan diez veces y se agotarían pronto.
- **GitLab:** sus máquinas con macOS son de pago.
- **El MacBook como máquina de pruebas propia:** tendría que estar encendido y conectado.
- **Solo el script local:** no prueba macOS.

## Consecuencias
- Cada commit enviado a GitHub es público desde ese momento, también su autor y su correo.
- La carpeta del repositorio pasa a llamarse `scidesk`, como el repositorio.
- Pendiente: las pruebas del editor con Playwright en Chromium y WebKit, y compilar el instalador en la integración continua.
