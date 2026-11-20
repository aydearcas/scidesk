# 0002. Windows y macOS, desarrollando primero en Windows

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** P2

## Qué se decide
El programa funcionará en Windows y en macOS. Se desarrolla y se prueba primero en Windows; después se prueba en macOS en un MacBook Air.

## Por qué
Windows es el equipo principal de trabajo. Desarrollar en un solo sistema acelera las primeras fases, y Tauri permite compilar para los dos desde el mismo código.

## Qué se descartó
- Solo Windows: dejaría fuera a coautores y usuarios de Mac.
- Desarrollar en los dos sistemas a la vez desde el principio: más lento sin ganar mucho.
- Linux: no se ha pedido; Tauri lo permitiría más adelante.

## Consecuencias
- La integración continua compila y prueba en los dos sistemas desde la fase 1, para detectar pronto lo que se rompe en macOS.
- Pruebas a mano en el MacBook Air al cerrar cada fase.
- Lo propio de macOS (portapapeles de Word para Mac, WKWebView, ortografía, impresión, firma y notarización) se resuelve antes de la primera versión pública.
