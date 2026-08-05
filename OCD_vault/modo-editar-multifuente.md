# Modo Editar multifuente — alcance corregido

## Propósito

Modo Editar no significa «crear desde una imagen». Debe descubrir mediante IA las decisiones y rasgos de diseño presentes en un conjunto heterogéneo de evidencias y permitir que el usuario gobierne cada hallazgo antes de producir artefactos.

## Fuentes previstas

- Wireframes digitales o escaneados, incluso bocetos informales.
- Mockups, capturas, fotografías, logotipos y activos de marca.
- Briefs, manuales de estilo, DESIGN.md, documentos y descripciones textuales.
- Páginas web, combinando captura visual y extracción textual segura.
- Workspaces o interfaces existentes.
- Combinaciones de todas las anteriores.

## Responsabilidad de la IA

La IA debe observar, leer, relacionar e inferir rasgos reales. No se admite una lista algorítmica fija como sustituto del análisis. El código convencional queda limitado a adquisición segura, límites, validación de esquema, procedencia, persistencia y presentación.

El análisis se desacopla del proveedor y se enruta por capacidad:

- visión para imágenes y escaneos;
- comprensión textual para documentos y descriptores;
- captura visual más texto para páginas web;
- síntesis multimodal para deduplicar, relacionar y detectar contradicciones.

## Variable revisable

Cada hallazgo conserva:

- identificador, categoría, etiqueta y valor estructurado;
- autoridad: `confirmed`, `proposal`, `inferred`, `fact`, `restriction` o `unknown`;
- permiso de uso: `approved`, `confirm-before-use` o `private`;
- confianza y evidencia;
- procedencia precisa por material;
- artefactos o contextos a los que aplica;
- decisión del usuario: `preserve`, `replace` u `open`;
- valor detectado y, si existe, reemplazo explícito por separado.

Una propuesta nunca se eleva silenciosamente a decisión confirmada. Un material privado nunca se vuelve publicable. Dejar una variable abierta no borra el hallazgo: registra que el usuario autoriza una propuesta nueva.

## Caso conductor: Santa Luisa de Palpi

Descriptor: `santa-luisa-descriptor.md` (fuente externa local indicada por el usuario; no versionar su ruta temporal).

El caso debe demostrar, entre otros:

- extracción de paleta, jerarquía tipográfica y reglas de imagen;
- alcance por dosier, web y mapa;
- distinción entre decisiones explícitas y propuestas pendientes;
- vacíos deliberados, como proporciones y filtros de imagen;
- restricciones editoriales y datos privados;
- conservación, reemplazo y apertura de cada variable.

El descriptor es un buen caso textual. Para probar descubrimiento visual real deberán incorporarse además los insumos originales disponibles del proyecto.
