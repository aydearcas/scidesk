# 0093. Mensajes que se van solos, y la explicación del control de cambios solo una vez

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11), a petición del usuario al probar el control de cambios.

## Qué se hizo
- **Los mensajes de abajo a la derecha** (los avisos breves de la ventana) se cierran solos a los **15 segundos** como mucho (`MESSAGE_MS` en `App.tsx`).
  - Un mensaje nuevo cuenta sus propios 15 segundos.
  - Se pueden cerrar antes con su «×».
  - Los errores (la banda roja de arriba) no cambian: se quedan hasta que se cierran.
- **La explicación del control de cambios solo sale la primera vez en cada equipo:** al activarlo («lo que escribas o borres quedará marcado con tu nombre») y al desactivarlo («se ve el texto como quedará…»). Antes salía cada vez que se pulsaba el botón.
  - Se guarda en los ajustes del equipo (`seenHints`), así que sirve para otras explicaciones de una sola vez.

## Pruebas
En la vista del navegador:
- activar, desactivar, activar y desactivar: el mensaje sale las dos primeras veces y no las dos siguientes;
- un mensaje sigue a los 14 segundos y ya no está a los 16.
