# 0039. Guardado automático y recuperación tras un cierre inesperado

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1).
- **Pregunta del plan:** R25 y fase 1, «guardado automático con escritura atómica y recuperación» (PLAN.md 5.1 y 8).

## Qué se decide
- **La escritura atómica ya existía** (ficha 0032): en Node y en Rust se escribe un temporal que después sustituye al original, con `sync_all` en Rust. Lo nuevo es lo demás que pide R25: el guardado automático y el registro de los cambios sin guardar.
- **Registro de recuperación** (`packages/core/src/recovery.ts`):
  - Mientras un documento tiene cambios que no están en el disco, la ventana guarda una copia en un registro.
  - **El registro no va en la carpeta del proyecto**, sino en la carpeta local de datos de la aplicación de cada equipo (R26), en `projects/<id del proyecto>/recovery/<artículo>/<documento>.json`. En Windows es `%LOCALAPPDATA%\app.scidesk.desktop\`, la misma carpeta que usa Tauri (`app_local_data_dir`). No se sincroniza.
  - Cada entrada guarda el documento, la fecha y el SHA-256 del archivo que había en el disco cuando se registró.
  - **Al guardar se borra la entrada**, salvo que haya cambios posteriores a lo guardado.
- **Al abrir un proyecto**, una entrada que sigue ahí es trabajo que no llegó al disco:
  - **Se descarta sin preguntar** si ya está en el disco (la ventana se cerró entre guardar y borrar la entrada), si no valida con su esquema, si es de otro proyecto o si su artículo ya no existe.
  - **En los demás casos se pregunta** si recuperarla o descartarla, con la fecha y el documento.
  - **Si el archivo cambió en el disco desde entonces** (otro equipo, una carpeta sincronizada), se avisa. Al recuperar, la versión del disco se guarda antes en una instantánea del historial, así que no se pierde nada en ninguno de los dos casos.
- **Guardado automático en la ventana:**
  - el registro se escribe 300 ms después de cada cambio;
  - el documento se guarda tras 2 s sin escribir o, si se escribe sin parar, a los 20 s como mucho;
  - si se escribe mientras se guarda, lo nuevo sigue marcado como sin guardar y en el registro;
  - la barra dice «Guardando…», «Sin guardar» o «Guardado a las hh:mm:ss»;
  - si un guardado falla (por ejemplo, un documento que no valida), se avisa y los cambios siguen en el registro.
- **Tauri:** cuatro comandos nuevos, `local_read`, `local_write` (atómico), `local_remove` y `local_list`. Solo alcanzan la carpeta local de datos de la aplicación, con claves de segmentos `[A-Za-z0-9._-]`, sin `..`, rutas absolutas ni barras invertidas.
- **Vista en el navegador:**
  - El proyecto de demostración se guarda ahora en el almacenamiento del navegador, y el registro también.
  - Recargar la página equivale a cerrar la ventana de golpe y volver a abrir el proyecto con «Reabrir el proyecto de la vista».
  - El proyecto creado desde un Word sigue en memoria, porque puede no caber.
- **Línea de comandos:** `scidesk recover <proyecto> [--apply | --discard] [--store <carpeta>]` lista, recupera o descarta lo que dejó una ventana cerrada. Por omisión lee la carpeta local de datos de la aplicación, así que se puede recuperar el trabajo aunque la ventana no arranque.

## Por qué
- R25: «perder una tarde de escritura una sola vez basta para dejar de confiar en él».
- **El registro en la carpeta de cada equipo, no en el proyecto:** es estado de una ventana concreta. En una carpeta de OneDrive o Dropbox, un registro que se sincroniza a otro equipo crearía conflictos y recuperaría cambios de otro sitio (R26).
- **Comparar con el disco antes de recuperar:** un registro antiguo no debe pisar en silencio lo que llegó de otro equipo. La instantánea guarda la versión del disco y deja la decisión fuera del aviso.
- **Pruebas:**
  - 5 nuevas en el núcleo, 38 en total:
    - recuperar lo que no llegó al disco;
    - nada que recuperar tras guardar, también si la ventana se cerró entre guardar y borrar la entrada;
    - el disco cambió desde entonces: instantánea con la versión del disco y después la recuperación;
    - entradas no válidas, de un artículo que ya no existe o de otro proyecto;
    - claves fuera del almacén y almacén en disco.
  - 2 nuevas de Rust, 4 en total: claves de la carpeta local y listado relativo a su raíz.
  - En la ventana (navegador):
    - escribir y recargar antes del guardado automático: al reabrir aparece el aviso, «Recuperar» devuelve el texto, lo escribe en el disco y vacía el registro;
    - escribir y esperar: «Guardado a las…», el texto ya está en el disco y al reabrir no se pregunta nada;
    - «Descartar» deja lo que había en el disco.

    Sin errores en la consola.

## Qué se descartó
- **El registro dentro de `.scidesk/` en el proyecto:** se sincronizaría (R26).
- **Guardar en cada tecla:** con un artículo largo y una carpeta sincronizada, cada guardado es una subida. El registro, de escritura barata y local, cubre el hueco hasta el guardado.
- **Guardar al cerrar la ventana con `onCloseRequested` de Tauri:** necesita permisos de ventana que hoy no se conceden y no se ha probado en la ventana real. Con el registro a los 300 ms, como mucho se pierden esos 300 ms.
- **Dejar la decisión para más tarde:** mientras el aviso está abierto no se puede escribir. Si no, el registro nuevo sustituiría al que se quiere recuperar.

## Consecuencias
- **Hoy solo se registra y se guarda el texto del artículo**, que es lo que edita la ventana. El registro está preparado por documento (resumen, tablas, cartas) para cuando el editor los abra.
- **Prueba pendiente en la ventana real de Tauri:** los comandos de la carpeta local compilan y pasan sus pruebas, pero el circuito completo (cerrar de golpe la aplicación y reabrir) solo se ha probado en el navegador.
- **Ajustes:** los tiempos (300 ms, 2 s y 20 s) son constantes. Desactivar el guardado automático o cambiar sus tiempos irá a Ajustes si hace falta.
- **Cambios desde otro equipo con el archivo abierto** (recargar o fusionar, R27) siguen siendo V1.
