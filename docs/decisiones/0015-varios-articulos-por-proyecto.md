# 0015. Un proyecto, varios artículos

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026: nombres de carpeta en inglés (P24).
- **Pregunta del plan:** P12

## Qué se decide
- **Un proyecto corresponde a un estudio y puede contener varios artículos** (protocolo, artículo principal, análisis secundarios…). El formato lo admite desde el principio; el MVP muestra un solo artículo y "Añadir otro artículo al proyecto" llega en V1.
- **Común a todo el proyecto:** la biblioteca de referencias, el directorio de personas, el diccionario y la lista de abreviaturas, y los perfiles de revista descargados.
- **Propio de cada artículo:** manuscrito y resumen, autores (quién firma, orden, afiliaciones usadas, CRediT, correspondencia, contribución igual y conflictos), documentos, material suplementario, tablas, figuras, revista objetivo, exportaciones e historial.
- **Directorio común de personas:** la ficha de cada persona (nombre, forma de cita, ORCID, correo, grado y afiliaciones) se escribe una vez, y cada artículo elige de ahí quién firma.
- **Las tablas y figuras se copian entre artículos**, no se enlazan.
- **Sin biblioteca global** entre proyectos por ahora.

## Por qué
- De un mismo estudio salen varios artículos que comparten referencias y personas. Importar, deduplicar y corregir una sola vez ahorra trabajo y evita incoherencias.
- No todas las personas firman todos los artículos, pero lo que se comparte son sus datos, no la autoría. Una corrección (un ORCID, un correo) llega a todos los artículos en curso.
- Copiar tablas y figuras protege los artículos ya enviados de cambios hechos para otro artículo.
- En el modo Zotero, la biblioteca global ya es Zotero; en el modo propio basta con "importar referencias de otro proyecto".
- Diseñar el formato para varios artículos desde el principio evita migrar proyectos más adelante.

## Qué se descartó
- Un artículo por proyecto: más simple, pero repite biblioteca y personas y obligaría a migrar.
- Lista de autores propia en cada artículo: repite datos y las correcciones hay que hacerlas en cada uno.
- Tablas y figuras enlazadas entre artículos, siempre o como opción.
- Biblioteca global de SciDesk compartida entre proyectos.

## Consecuencias
- Nueva estructura de carpetas: lo común en la raíz (`references/`, `people/`, `resources/`) y cada artículo en `articles/<nombre>/`, con nombres en inglés desde P24 ([0005](0005-alcance-e-idiomas.md)). El programa oculta ese nivel mientras solo haya un artículo.
- Cada versión con nombre pertenece a un artículo y guarda los datos exactos de las referencias citadas y de sus autores, para poder reproducir siempre la versión enviada.
- Las comprobaciones se calculan por artículo.
- Hace falta "exportar este artículo como proyecto independiente" para enviarlo o moverlo.
- Detalle en PLAN.md, 4 y 4.1.
