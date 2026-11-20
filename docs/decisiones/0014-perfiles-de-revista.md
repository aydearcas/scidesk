# 0014. Perfiles de revista bajo demanda

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** P20

## Qué se decide
Los perfiles de revista (límites, resumen, formato de envío, revisión ciega, declaraciones…) se consiguen **bajo demanda, cuando alguien elige una revista**:
1. El estilo de cita y los datos de la revista (ISSN, abreviatura, editorial, área) se obtienen automáticamente de fuentes abiertas: repositorio CSL, catálogo de la NLM, OpenAlex y DOAJ.
2. Si la revista está en el catálogo público de perfiles, se descarga su perfil.
3. Si no está, el programa ofrece un paquete para LLM con la guía para autores y el esquema del perfil. El LLM devuelve el perfil con una cita literal de la guía para cada dato, y el usuario lo revisa campo por campo antes de guardarlo. El perfil verificado se puede aportar al catálogo.
4. Cada dato lleva su fuente y la fecha de comprobación, y el programa avisa cuando un perfil tiene más de un año.

## Por qué
- No existe ninguna base de datos abierta y estructurada con los requisitos de las revistas: solo están en el texto de cada guía para autores.
- Hay demasiadas revistas para preparar todos los perfiles por adelantado; bajo demanda, el catálogo crece con el uso.
- La guía es pública, así que el paquete para LLM no plantea problemas de confidencialidad.

## Qué se descartó
- Incluir de serie los perfiles de muchas revistas: no el tamaño, sino mantenerlos verificados, es lo que lo hace inviable.
- Solo perfiles hechos a mano por el usuario.

## Consecuencias
- El programa incluye de serie un perfil genérico (ICMJE) y el de Reumatología Clínica.
- *Supuesto:* un perfil de revista puede heredar de un perfil base de su editorial y guardar solo lo que cambia.
- Hay que definir el esquema del perfil en la fase 0.
- Detalle en PLAN.md, 5.9.
