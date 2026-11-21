# 0018. Paquetes para LLM con niveles de confidencialidad

- **Fecha:** 20/11/2026
- **Estado:** aceptada
- **Pregunta del plan:** P22

## Qué se decide
SciDesk no se conecta a ningún modelo: prepara **paquetes** (instrucciones, datos de contexto y esquema de la respuesta esperada) que el usuario procesa con el LLM que prefiera y cuya respuesta importa después. Cada paquete declara uno de estos **niveles de confidencialidad**:

| Nivel | Qué sale del equipo | Ejemplos |
|---|---|---|
| 0. Público | Nada del proyecto; solo información pública o general elegida por el usuario | Perfil de una revista a partir de su guía; diccionario de una especialidad |
| 1. Términos sueltos | Palabras o listas, sin el texto que las rodea | Validar palabras desconocidas; desarrollar abreviaturas |
| 2. Fragmentos elegidos | Solo el texto que se selecciona | Sugerir palabras clave MeSH a partir del resumen |
| 3. Documento completo | Todo el manuscrito | Revisión del inglés, solo a petición expresa |

- Por defecto solo se ofrecen los niveles 0 y 1.
- Antes de crear un paquete, el programa muestra la lista exacta de lo que contiene.
- Primeros usos: perfiles de revista y diccionarios de especialidad.

## Por qué
- Permite usar un LLM sin clave de API ni conexión desde el programa, con el modelo que se prefiera.
- La investigación es confidencial: los niveles hacen visible qué sale del equipo y evitan que salga información específica sin elegirlo.

## Qué se descartó
- Limitar los paquetes a los niveles 0 y 1: se perderían usos útiles, como las palabras clave MeSH o la revisión del inglés.
- No clasificar los paquetes y decidir caso a caso: menos claro y más fácil de pasar por alto.

## Consecuencias
- La respuesta importada se trata como datos no confiables: se valida contra el esquema y nunca se ejecuta.
- El formato de los paquetes y sus esquemas se definen cuando llegue la fase en que se usen (perfiles de revista en la fase 3), con la misma herramienta de esquemas que los demás formatos (R34, [0010](0010-pila-tecnologica.md)).
- Las respuestas que proponen cambios en el texto llegan a la vista de propuestas, como las de un coautor ([0019](0019-modelo-unico-de-propuestas.md)).
- Detalle en PLAN.md, 5.12.
