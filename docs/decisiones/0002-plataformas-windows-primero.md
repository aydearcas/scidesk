# 0002. Windows y macOS, desarrollando primero en Windows

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R37, R39 y R40).
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
- **El pegado de tablas y la edición básica se prueban en el MacBook ya en la fase 0** (prototipo 11), y las pruebas del editor se ejecutan a diario también sobre el WebKit de Playwright, que funciona en Windows (R37). Cambiar de plataforma antes de empezar cuesta días; después, semanas.
- Pruebas a mano en el MacBook Air al cerrar cada fase.
- Lo propio de macOS (portapapeles de Word para Mac, WKWebView, impresión, firma y notarización) se resuelve antes de la primera versión pública. La ortografía y el PDF ya no dependen del motor web (corrector propio y Typst, [0010](0010-pila-tecnologica.md)).
- **Firma del instalador de Windows (R40):** por ahora se trata como el software libre habitual, sin certificado comercial y aceptando el aviso de SmartScreen en las primeras versiones. Antes de la primera versión pública se valoran las alternativas junto con el registro de la marca, porque dependen de quién publique.
- No se prueba por ahora la instalación en equipos gestionados, como los de un hospital (R39, descartada por ahora).
