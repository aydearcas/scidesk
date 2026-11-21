# 0038. Formulario de autores y afiliaciones, con CRediT

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1).
- **Pregunta del plan:** fase 1, «autores y afiliaciones: bloque de autores y portada automáticos» (PLAN.md 5.3 y 8). Completa la ficha [0034](0034-portada-aparte.md), que dejaba pendiente el formulario.

## Qué se decide
- **El núcleo tiene un módulo de autoría** (`packages/core/src/authorship.ts`). Trabaja sobre el directorio común (`people/people.json`) y sobre la lista de cada artículo (`articles/<artículo>/authors.json`), con los archivos solo por `ProjectFs`:
  - **Funciones puras** para editar:
    - crear afiliaciones, personas y grupos;
    - añadir un autor (con todas sus afiliaciones) y moverlo;
    - poner o quitar un rol CRediT con su grado (sin grado, principal, igual o de apoyo; quedan en el orden de la norma);
    - quitar una persona (sale también de los grupos);
    - quitar una afiliación (de las personas y, con `withoutAffiliation`, de la lista del artículo).
  - **Forma de cita propuesta** (`defaultCitationName`):
    - Dos apellidos se unen con guion: «Lucía Herrera Gil» da «Herrera-Gil L».
    - Las partículas se respetan: «García de la Fuente AM», «van der Berg J».
    - Se toman las iniciales de todos los nombres, también los compuestos con guion.
    - Es solo una sugerencia: se guarda únicamente si se escribe otra.
  - **ORCID**: se acepta pegado como enlace o sin guiones y se normaliza (`normalizeOrcid`).
  - **Comprobación conjunta** (`checkAuthorship`) del directorio y de la lista del artículo, más las listas de los demás artículos del proyecto:
    - **Errores, que impiden guardar:**
      - falta un nombre o un centro;
      - el ORCID no tiene la forma correcta o falla su dígito de control;
      - el correo, el país (código ISO de dos letras) o el ROR no son válidos;
      - una persona, afiliación o miembro ya no existe;
      - una afiliación del artículo no es de esa persona;
      - un autor está repetido;
      - una persona borrada sigue firmando en otro artículo.

      Son las reglas del validador (ficha 0031), dichas una a una; el esquema completo solo se comprueba si no hay otro error.
    - **Avisos, que se guardan igual:**
      - nadie firma;
      - falta el autor de correspondencia, o no tiene correo;
      - un autor no lleva afiliación;
      - un grupo de contribución igual tiene una sola persona;
      - un autor no tiene rol CRediT cuando otros sí;
      - alguien firma y también está en los agradecimientos.
  - **Guardar** (`saveAuthorship`):
    - escribe `people.json` y `authors.json` a la vez;
    - si hay un error, no escribe ninguno de los dos;
    - no reescribe un archivo que no ha cambiado;
    - no guarda los campos vacíos.
- **En la ventana**, el botón «Autores…» abre un diálogo con cuatro pestañas:
  - **Firman:** orden con ↑ y ↓; autor de correspondencia; grupo de contribución igual; afiliaciones que se imprimen, elegidas entre las de la persona; conflictos de interés; añadir del directorio; y agradecimientos a quien no firma.
  - **Personas:** personas y grupos. Nombre, apellidos, forma de cita (con la propuesta como texto de ayuda), grados, ORCID, correo, afiliaciones y notas; en un grupo, su nombre y sus miembros. No deja borrar a quien firma el artículo.
  - **Afiliaciones:** centro, servicio, ciudad, país y ROR. El país se elige de una lista con los nombres en el idioma de la interfaz, sin códigos antiguos (DD, UK, SU…) ni territorios que no son de ISO 3166-1. Se ve quién usa cada afiliación.
  - **CRediT:** matriz de los 14 roles por autor, con su grado, y los nombres de los roles en español o en inglés.

  Los errores y avisos se ven al momento debajo, y «Guardar autores» se desactiva mientras haya errores. Es un diálogo mínimo: su sitio y su aspecto definitivos dependen de las decisiones de interfaz (D1–D8; la maqueta tiene una lámina de autores y CRediT).
- **Línea de comandos:** `scidesk authors <proyecto> [--article main]` muestra la lista con los números de afiliación, la correspondencia, la contribución igual, los roles CRediT y los avisos.

## Por qué
- **Hacía falta para la portada de la ficha 0034**, que se genera de estos dos archivos y hasta ahora solo se podía probar con el ejemplo.
- **Editar copias y guardar los dos archivos juntos:** una persona y sus afiliaciones viven en el directorio, pero lo que se imprime vive en el artículo. Guardarlos por separado dejaría a medias un cambio que toca los dos, por ejemplo quitar una afiliación.
- **La matriz CRediT entra ya**, aunque PLAN.md la tenía en V1: el formato la guarda desde la ficha 0031 y la matriz es una tabla de desplegables. El documento de contribuciones y la comprobación de los criterios ICMJE siguen en V1.
- **Pruebas:**
  - 5 nuevas en el núcleo, 33 en total:
    - forma de cita y ORCID;
    - directorio y lista guardados juntos, con la portada como resultado: orden, afiliaciones numeradas, país en el idioma del artículo, correspondencia y miembros del grupo;
    - cada error impide guardar y no escribe ningún archivo;
    - avisos;
    - quitar una afiliación;
    - el ejemplo de artrosis de rodilla no da errores, y guardarlo sin cambios no escribe nada.
  - En la ventana (navegador, con el núcleo simulado), sobre el proyecto de demostración vacío:
    - dos afiliaciones, con su aviso de ROR mal escrito;
    - dos personas (ORCID pegado como enlace y normalizado; forma de cita propuesta «Pérez-García AM») y un grupo con miembros;
    - cambiar el orden, marcar la autora de correspondencia, quitarle una afiliación y poner dos roles CRediT;
    - guardar y reabrir.

    La portada exportada sale de esos datos: «Luis Soto1, Ana María Pérez García2,*, Grupo Ficticio de Estudio», las dos afiliaciones numeradas, el correo de correspondencia y los miembros del grupo. Sin errores en la consola.

## Qué se descartó
- **Guardar cada cambio al momento, campo a campo:** un cambio a medias (una persona sin apellidos) no valida. El diálogo guarda todo junto o nada.
- **Borrar a una persona que firma, quitándola de la lista:** se quita primero de la lista, a la vista.
- **Escribir el país a mano:** las revistas y la portada lo necesitan normalizado (ISO 3166-1), y el nombre sale del código en el idioma del artículo.
- **Guardar siempre la forma de cita calculada:** se desincronizaría al corregir el nombre.

## Consecuencias
- **Queda para V1** (PLAN.md 5.3): el documento de contribuciones generado de la matriz CRediT (tabla, frase con iniciales o criterios ICMJE) y la comprobación de los criterios ICMJE; la búsqueda de ROR y ORCID en sus registros, que sale a la red y pide permiso.
- **El bloque de autores dentro del manuscrito para coautores** sigue sin generarse: la revista recibe la portada aparte y el manuscrito cegado (ficha 0034).
- El diálogo es el primer formulario grande de la ventana. Cuando se decida la interfaz, se moverá a su pestaña o panel.
