# 0072. Las secciones que pide la revista

- **Fecha:** 23/11/2026
- **Estado:** hecha. Es el tercer y último paso de la propuesta sobre las secciones que aceptó el usuario el 23/11 (fichas 0070 y 0071).
- **Pregunta del plan:** PLAN 5.8 (comprobaciones) y el perfil de revista (ficha 0031: `declarations` y `sections` por tipo de artículo, que hasta ahora no se comprobaban).

## Qué se decide
- **Declaración obligatoria que falta** (aviso nuevo `missing-declaration`, de los que impiden el envío):
  - cuando el perfil marca una declaración como obligatoria (`required`) y su sitio es el manuscrito (`manuscript` o `before-references`, o no lo dice), y el artículo no tiene una sección de nivel 1 de ese tipo;
  - cuenta el tipo efectivo (ficha 0071), así que basta un título escrito a mano como «Uso de inteligencia artificial»;
  - el aviso lleva el botón **«Añadir «…»»**, que pone la sección en su sitio (antes de la bibliografía) con su nombre en el idioma del artículo;
  - si la declaración va en la portada, en otro archivo o en el formulario de envío, no se avisa.
- **Secciones fijas del tipo de artículo** (`sections` del perfil; en Reumatología Clínica, las del caso clínico):
  - **falta una** (`missing-section`, conviene revisar), con el mismo botón «Añadir»;
  - **van en otro orden** (`section-order`), con el orden que pide la revista;
  - **sobra una** (`extra-section`): una sección del cuerpo que no está entre las fijas, con «Ir».
  - Las secciones finales (declaraciones, bibliografía, apéndices) no cuentan aquí.
- **El asistente de nuevo artículo ya crea las declaraciones obligatorias del manuscrito** como secciones antes de la bibliografía, y la vista de «Lo que se va a crear» las muestra. Un caso clínico para Reumatología Clínica empieza con «Uso de inteligencia artificial».
- Como todos los avisos, se pueden marcar «Es correcto» o «No aplica», y los que impiden el envío cuentan para «Listo para enviar» (ficha 0054).

## Por qué
- **Impide el envío:** si la revista exige la declaración en el manuscrito, la redacción lo devuelve sin ella. Si el perfil se equivoca, «No aplica» lo deja de lado.
- **Las secciones fijas solo «conviene revisar»:** la guía puede admitir variaciones, y el autor decide.
- **Crearlas desde el principio:** es más fácil dejar una sección vacía a la vista que acordarse de añadirla al final.

## Qué se descartó
- **Avisar de declaraciones que van fuera del manuscrito** (portada, formulario): no se pueden comprobar en el texto. Cuando la portada las lleve (fase posterior), se comprobarán ahí.
- **Rellenar el texto de la declaración** (por ejemplo, «No se ha usado IA»): cada autor la redacta; en el futuro puede haber textos propuestos por revista.

## Consecuencias
- **Núcleo:** cuatro códigos nuevos en `checks.ts`; `articlePlan` añade las declaraciones; los órdenes de las secciones pasan a `section-order.ts` (sin importaciones, para no crear un ciclo entre el proyecto, el nuevo artículo y las secciones).
- **Ventana:** textos de los avisos en los dos idiomas, con los nombres de las secciones en el idioma de la interfaz, y el botón «Añadir «…»» en el panel de avisos.
- **Pruebas:**
  - nuevas: con el ejemplo como caso clínico, la declaración de IA que falta (y que desaparece con un título escrito a mano), la sección fija que falta, las que sobran y el orden;
  - ajustadas: el ejemplo para Reumatología Clínica da ahora también el aviso de la declaración de IA, y el caso clínico y la carta nuevos llevan esa sección.
- **Probado en la vista del navegador:**
  - un caso clínico nuevo para Reumatología Clínica sale con «Uso de inteligencia artificial» y sin aviso;
  - al quitar ese título aparece el aviso, que impide el envío;
  - «Añadir «Uso de inteligencia artificial»» la vuelve a poner antes de la bibliografía y el aviso desaparece;
  - sin errores en la consola.
- **Pendiente:** el perfil de Reumatología Clínica solo tiene la declaración de IA. Las demás (financiación, conflictos, ética) habrá que rellenarlas desde su guía.
