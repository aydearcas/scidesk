# 0103. Prueba de la fase 2 con Word real

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11). El usuario pidió seguir con el desarrollo después de la ficha [0102](0102-tablero-de-la-ronda.md); es la prueba de «Terminado cuando» de la fase 2 (PLAN.md 8).
- **Qué pedía el plan:** «mandas el artículo a tres coautores, dos te lo devuelven con control de cambios y uno sin él, una de las copias llega cuando ya has integrado las otras y seguido escribiendo, y lo integras todo en tu copia maestra desde una sola vista, sin perder citas ni formato» (2b), y para la 2a, que una copia con control de cambios y comentarios se integre sin perder citas ni formato.

## Cómo se hizo
- **El artículo:** la demostración de la ventana, en la vista del navegador. Tiene resumen con palabras clave, dos citas, una tabla con notas, una figura y referencias cruzadas a las dos.
- **El Word enviado:** el Word para coautores, exportado desde la ventana. Un puente local de un solo uso (un servidor en la carpeta temporal, solo para `localhost:1420`) lo pasó a la carpeta temporal y devolvió después las copias.
- **Las tres copias, con Word real** (Word para Windows, por automatización COM), con buscar y reemplazar y un comentario:
  - **Marta**, con control de cambios: «población adulta» → «población adulta mundial», «primer año» → «primeros doce meses», «54» → «55» en una celda de la tabla y un comentario sobre «índices compuestos».
  - **Jorge**, con control de cambios: el mismo cambio que Marta en «población adulta» (coincidencia), «primer año» → «primer semestre» (choque con Marta) y «cohorte ficticia» → «cohorte sintética» en el resumen.
  - **Ana**, sin control de cambios: «se recogen en» → «se resumen en» junto a las referencias cruzadas, y «índices compuestos» → «índices compuestos validados».
  - El nombre de autor que pone Word se cambió en el XML por el de cada coautor ficticio; las copias con el nombre de Word se borraron. Nada de esto entra en el repositorio.
- **La integración**, en «Copias devueltas»:
  - se importaron Marta y Jorge y se aceptó la coincidencia;
  - en el choque se usó la de Jorge;
  - se aceptaron la celda, el comentario y el cambio del resumen;
  - después se siguió escribiendo («se mide con el DAS28 y otros índices compuestos») y llegó la copia de Ana, cuyos dos cambios se aceptaron.

## Qué salió
- **Las propuestas, como se esperaba.** Marta, 4 (3 en el texto y el comentario). Jorge, 3: la coincidencia («Propone lo mismo que Marta Ríos»), el choque («Choca con el cambio de Marta Ríos») y el resumen. Ana, 2, las dos en el texto: no tocaban las mismas palabras que lo escrito después, así que entraron limpias.
- **El texto final:** «…de la población adulta mundial y su actividad inflamatoria se mide con el DAS28 y otros índices compuestos validados¹», «…durante el primer semestre de tratamiento¹,²⁽ᵖ⁴¹⁵⁾», «55 (45–63)» en la tabla y «cohorte sintética» en el resumen.
- **Sin perder nada.** Las mismas 2 citas, la tabla, la figura, el comentario de Marta (con su autor) y ningún cambio pendiente.
- **El Word para coautores exportado al final, abierto con Word real**, tiene los mismos campos que el enviado: las 2 citas, la bibliografía, las referencias cruzadas a la tabla y la figura, su numeración y las llamadas a notas. Además, 1 comentario, 1 tabla, 1 imagen y 0 revisiones.

## Qué se arregló
- **Un tramo reemplazado entero salía entero.** Word, con buscar y reemplazar (o al volver a escribir una frase), borra y escribe todo el tramo, así que «población adulta» → «población adulta mundial» se veía con todo tachado y todo subrayado. Ahora un cambio marcado se queda solo con lo que cambia, por palabras enteras (`sharedEdges` en `proposals.ts`): «inserta mundial», «cambia el primer año → los primeros doce meses», «cambia 54 → 55». Se hace solo cuando el texto borrado es tal cual el enviado. El resultado es el mismo y la integridad sigue saliendo bien. Comprobado otra vez con Word real, y con una prueba nueva en `round-plan-b.test.ts`.

## Lo que no cubre
- **Un choque de la copia tardía con lo escrito después.** La copia de Ana no lo tuvo; las tres versiones de la zona se probaron en la ficha 0100.
- **Word para Mac, LibreOffice y Google Docs**, y la ventana de Tauri.
- **Copias con frases movidas, párrafos partidos o unidos, o cambios de formato**, que todavía no dan propuestas (ficha 0096).

## Consecuencias
- La fase 2 (2a y 2b) cumple lo que pedía el plan, salvo las citas vivas al crear un artículo desde un Word, que el usuario dejó para el final de la fase 2 (23/11).
- Para repetir la prueba: hace falta el puente, el script de Word que aplica una lista de ediciones y el cambio de autor en el XML. No están en el repositorio, porque dependen de este equipo y de su Word.
