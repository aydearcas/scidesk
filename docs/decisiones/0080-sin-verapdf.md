# 0080. Sin validación con veraPDF

- **Fecha:** 23/11/2026
- **Estado:** decidida por el usuario (23/11).
- **Pregunta del plan:** PLAN 5.6 (exportar) y la ficha 0024, que pedía validar con veraPDF los PDF/UA y PDF/A antes de ofrecerlos; repetido en la ficha 0040.

## Qué se decide
- **La validación con veraPDF sale del plan.** No es una tarea de la fase 1 ni de la primera versión pública.
- **El PDF que se ofrece sigue siendo un PDF etiquetado sin promesa de cumplir ninguna norma** (`pdf::standards`, por defecto `tagged`), en la ventana y en `scidesk export --profile pdf`.
- **PDF/UA-1, PDF/A-2a y PDF/A-4 se quedan como opción de la línea de órdenes** (`scidesk-pdf --standard`), sin validación externa. Las comprueba solo el propio Typst al compilar, que da error en vez de generar el archivo cuando ve que falta algo.

## Por qué
- veraPDF solo sirve para un PDF que dice cumplir PDF/UA o PDF/A en sus metadatos, y el que se ofrece no lo dice.
- Las revistas biomédicas piden el manuscrito en Word. El PDF es para leerlo o para la revisión, y no tiene que cumplir esas normas.
- Necesita descargar la herramienta y Java, que no está instalado en el equipo de desarrollo.

## Qué se descartó
- **Aplazarla hasta antes de la primera versión pública,** como prueba de la integración continua. Si un día se ofrecen PDF/UA o PDF/A en la ventana, se decidirá entonces.

## Consecuencias
- Si alguien pide PDF/UA o PDF/A desde la línea de órdenes, el archivo no se ha validado con un validador externo: Typst comprueba muchas de las reglas, pero no todas.
