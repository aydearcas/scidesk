# 0087. Comprobaciones del manuscrito cegado (R9)

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). El usuario pidió hacerla antes de la fase 2a.
- **Pregunta del plan:** R9 (PLAN 5.8), adelantada de V1.

## Qué se hizo
Quitar la portada no basta para la revisión doble ciego: el propio texto puede decir quién lo firma. SciDesk sabe quién firma y de qué centros es (Autores), así que busca en lo que va a la revista lo que identifica a los autores y lo avisa en «Avisos». No cambia nada.

- **Cuándo:** solo si la revista del artículo hace revisión doble ciego (`review.blind` del perfil; Reumatología Clínica lo es). Sin revista, o con otra revisión, no hay avisos.
- **Dónde busca:** el manuscrito (título, resumen y palabras clave, texto) y las tablas y figuras (título, celdas, notas y pie), sin el texto borrado con control de cambios. La bibliografía se genera aparte y no se mira.
- **Qué avisa** (`packages/core/src/blinding.ts`), siempre como «Conviene revisar», con «Ir» y el fragmento:
  1. **Un autor** (`blind-author`):
     - el apellido de alguien que firma (entero, el primero de dos apellidos y la forma de cita), con mayúscula;
     - su correo o su ORCID;
     - el nombre de un grupo que firma.
     
     El mensaje dice que una cita en tercera persona («García et al.») es correcta.
  2. **Un centro** (`blind-institution`): el nombre de la institución de las afiliaciones con que firman, sin su principio genérico («Gran Canaria Doctor Negrín» de «Hospital Universitario de Gran Canaria Doctor Negrín») o una palabra propia de ella («Negrín», «IDIBAPS»). Las palabras genéricas (hospital, universitario, instituto, doctor, norte…) no cuentan. Una mención es un aviso, aunque la palabra esté en dos afiliaciones.
  3. **Su ciudad** (`blind-city`).
  4. **Autocitas en primera persona** (`blind-self-citation`), en español y en inglés:
     - «nuestro estudio previo», «un trabajo anterior de nuestro grupo», «nuestro grupo ha descrito»;
     - «como describimos», «hemos publicado previamente»;
     - «our previous study», «we previously reported», «our group has shown».
     
     No cuentan las del propio estudio («como describimos en los métodos», «en nuestra cohorte»). Si van juntas, son un aviso.
  5. **El comité de ética con un código de aprobación** (`blind-ethics`): una frase que nombra al comité (comité de ética, CEI, CEIC, CEIm, IRB, *ethics committee*…) y lleva un código («código PI-2019-045», «acta 21/045», «protocol no. 2020-118»). Sin código no avisa: el nombre del centro ya lo vigila el punto 2. COVID-19, IL-6 y similares no son códigos.
  6. **Secciones que van en la portada** (`blind-section`): agradecimientos, contribuciones y las declaraciones que el perfil pone en la portada (en Reumatología Clínica, también los conflictos de intereses).
  7. **El archivo de una figura con el nombre de un autor** (`blind-file-name`), para cuando se envíen los archivos de las figuras.
- **Al exportar para la revista** (Word y PDF), el mensaje dice cuántas cosas pueden identificar a los autores y que se miren en «Avisos», como ya hacía con los pendientes (`journalExportWarnings`). Lo marcado como «Es correcto» o «No aplica» ya no cuenta. La exportación para coautores no lo dice.
- **No impide el envío** ni cuenta para «Listo para enviar»: son sospechas, no errores.
- **Lo que ya estaba:**
  - la portada aparte (ficha 0034);
  - el Word y el PDF para la revista sin autores, sin metadatos;
  - con los cambios aceptados y sin comentarios.

## Pruebas
- Núcleo (`blinding.test.ts`):
  - plegar mayúsculas y tildes;
  - palabras de una institución;
  - autocitas en los dos idiomas, y lo que no lo es;
  - comités con y sin código;
  - el ejemplo knee-oa sin avisos;
  - con un párrafo con su hospital, su ciudad, un apellido, una autocita y el comité, más «Agradecimientos» y una figura con un apellido: los siete avisos, uno por mención;
  - minúsculas no son nombres;
  - el aviso del Word para la revista desaparece al marcarlos como correctos;
  - sin doble ciego, ninguno.
- **Con los tres Word del usuario** (casi 97.000 palabras, en local): ninguna autocita ni comité falsos.
- **En la vista del navegador:** un artículo nuevo para Reumatología Clínica con una autocita y el comité con código da los dos avisos, con «Ir» al párrafo.

## Qué se descartó
- **Avisar de la financiación con código de proyecto y del registro del estudio.** Reumatología Clínica pide la financiación en el manuscrito y el número de registro al final del resumen. Avisar de ellos sería ruido.
- **Avisar de «nuestro hospital» o «nuestro servicio».** No nombran el centro.
- **Buscar las iniciales de los autores** («LH y MA revisaron…»): demasiados falsos avisos con siglas.

## Qué queda
- **Sustituir solo en la versión cegada** lo que se marque («[centro eliminado para la revisión]»), sin tocar el manuscrito. R9 lo proponía. Hoy el aviso pide cambiar el texto o marcarlo como correcto.
- **Los metadatos de las imágenes** (EXIF, autor de un SVG).
