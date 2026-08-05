# Auditoría para un futuro lenguaje canónico de interfaz

## Alcance y conclusión

Esta revisión identifica piezas reutilizables y riesgos, sin implementar el lenguaje canónico, el plugin de WordPress ni nuevos adaptadores. El objetivo inmediato sigue siendo el MVP multifuente del Modo Editar.

Open CoDesign no posee actualmente un AST de JSX/HTML, un modelo de escena ni un árbol semántico de interfaz que pueda adoptarse como formato maestro. Su representación central es código fuente almacenado como texto (`App.jsx` por defecto), complementado por documentos de diseño, memoria narrativa, parámetros editables y observación del DOM renderizado.

Hay cuatro bases aprovechables:

1. `DESIGN.md` como proyección del sistema visual.
2. `.codesign/edit-context.json` como registro de decisiones, autoridad y procedencia.
3. `data-codesign-id` como puente potencial entre nodos canónicos y elementos renderizados.
4. Las fronteras existentes de inspección, runtime y exportación como lugares donde conectar futuros importadores y adaptadores.

La evolución más segura consiste en mantener esas piezas separadas, dar estabilidad a sus identificadores y añadir más adelante una representación canónica versionada entre la normalización y los renderizadores. No conviene convertir `edit-context.json` en el esquema universal ni detener el MVP para diseñar todo el ecosistema.

## Traducción posible desde los artefactos actuales

| Fuente | Información recuperable | Autoridad adecuada | Límites actuales |
|---|---|---|---|
| `App.jsx` / HTML | Jerarquía DOM renderizada, contenido visible, atributos, estilos, activos e interacciones observables | Implementación existente o evidencia | No hay parser semántico; el DOM pierde límites de componentes, estados, condiciones y fuentes de datos |
| `DESIGN.md` | Colores, tipografía, radios, espaciado, tokens de componentes y reglas narrativas | Sistema visual declarado | No describe páginas, contenido, comportamiento ni procedencia |
| `MEMORY.md` | Objetivo, decisiones narrativas, estado, preguntas y antecedentes | Contexto orientativo | Prosa resumida por IA, sin IDs ni esquema; no debe ser una definición canónica vinculante |
| `.codesign/edit-context.json` | Materiales, valores detectados y sustitutos, `preserve/replace/open`, autoridad, uso, procedencia y alcance | Restricciones vinculantes de una operación | No es árbol de páginas/componentes; su ubicación está ligada al workspace |
| brief de sesión | Objetivo, audiencia, dirección visual, decisiones estables, tareas y archivos | Resumen operativo | Inferido por IA y deliberadamente incompleto |
| `EDITMODE` / `TWEAK_SCHEMA` | Valores editables y controles | Proyección de parámetros | Claves planas incrustadas en código, sin propiedad semántica ni procedencia |

Una futura importación de `App.jsx` deberá producir un **borrador canónico con niveles de confianza**, combinando análisis de fuente, DOM renderizado, `DESIGN.md` y decisiones del contexto. El DOM por sí solo no reconstruye fielmente la intención.

## Estructuras y formatos internos encontrados

### Artefactos y revisiones

- `Artifact` guarda principalmente `content: string`, `sourceFormat`, `renderRuntime` y `entryPath`.
- Las instantáneas guardan `artifactSource: string`; no hay diffs semánticos ni identidad estable de componentes entre revisiones.
- `createDesignSourceArtifact` crea por defecto fuente JSX, runtime React y entrada `App.jsx`.
- Los IDs `design-N` dependen del orden y no sirven como identidad canónica durable.

### Componentes, regiones y selección

- No hay un registro estructural de páginas, regiones o componentes.
- La descomposición a UI kit pide a un modelo componentes React, tokens y manifiesto. Es un prototipo de extracción, pero sus límites son inferidos por IA, el contenido sigue siendo código y el resultado es React-específico.
- La selección opera sobre el DOM. Prefiere `[data-codesign-id="…"]`, después `#id` y finalmente una ruta posicional tipo XPath.
- `SelectedElement` contiene selector, etiqueta, `outerHTML` truncado y rectángulo; no contiene ID de componente o nodo de fuente.

### Inspección, preview y parser

- La inspección del workspace clasifica archivos, documentos, activos y posibles entradas; no analiza su semántica.
- Preview ofrece captura o un outline DOM limitado a cuatro niveles y veinte hijos por nodo, métricas y errores. Es evidencia para IA y verificación, no un modelo maestro.
- Runtime clasifica y envuelve código mediante heurísticas textuales.
- El parser de artefactos solo enmarca streams `<artifact>`; no analiza la interfaz.
- No se encontraron dependencias o usos de Babel parser, Acorn, Recast, ts-morph, `createSourceFile`, parse5 ni una estructura AST/scene graph propia en estas capas.
- `DesignParam`, `EDITMODE`, `TWEAK_SCHEMA`, el brief y `MEMORY.md` son modelos auxiliares, no modelos de interfaz.

## Candidatos de reutilización

### Adquisición y normalización

- `inspectWorkspaceFiles` y su adaptador desktop para inventariar fuentes y activos.
- El pipeline multifuente para detección IA, contradicciones, vacíos, procedencia, autoridad y resolución del usuario.
- El parser/validador de `DESIGN.md` para tokens y reglas visuales.
- Preview con captura como evidencia visual y mecanismo de comparación.

### Identidad y edición

- Estandarizar `data-codesign-id` como proyección de un futuro `node.id` estable.
- Conservar los IDs estables de materiales, definiciones y activos introducidos en el contexto v2.
- Reutilizar `TWEAK_SCHEMA` como descripción de controles generada desde propiedades canónicas, nunca como fuente de verdad.

### Adaptadores

- La frontera de `packages/runtime` puede alojar un adaptador React.
- La frontera de `packages/exporters` puede incorporar una exportación canónica o delegar en adaptadores.
- Un futuro paquete neutral, por ejemplo `packages/canonical`, puede contener esquema, validación y migraciones sin importar Electron, React, Gutenberg ni el filesystem.
- El plugin WordPress debería consumir ese contrato versionado como paquete publicable o especificación compartida, no importar módulos del desktop.

## Riesgos de acoplamiento

| Riesgo | Impacto futuro | Mitigación compatible con el MVP |
|---|---|---|
| `App.jsx` y React como representación primaria | Confunde formato maestro con renderizador | Tratarlo como `implementation/react`; no cambiar aún el flujo |
| Snapshots basados en strings | Impiden sincronización semántica | Añadir después revisiones canónicas paralelas, conservando snapshots actuales |
| Selectores DOM posicionales | Se rompen al reordenar | Preferir `data-codesign-id` durable |
| Inflar `edit-context.json` | Mezcla evidencia y estructura final; retrasa el MVP | Mantenerlo como registro de decisiones enlazable por IDs |
| Inferir componentes solo con LLM | Resultado no determinista | Guardar confianza/procedencia y validar estructura posteriormente |
| Usar DOM como fuente completa | Pierde estados, componentes y datos | Combinar fuente, runtime y documentos; declarar pérdidas |
| Usar `MEMORY.md` como datos | Deriva y contradicciones silenciosas | Mantenerlo narrativo y promover decisiones explícitamente |
| Guardar rutas del workspace en el núcleo | Dificulta otros destinos | Referenciar activos por IDs/URI lógicas y resolver por adaptador |
| IDs derivados de índices/selectores | Rompe reimportación | Generar IDs opacos durables y conservarlos en proyecciones |
| Exportadores que exigen `artifactSource` | Obligan a pasar por JSX | Añadir luego una entrada canónica separada |

## Puntos de extensión

```text
materiales / workspace / definición del usuario
                 │
                 ▼
       análisis y normalización IA
                 │
       decisiones + procedencia
                 │
                 ▼
    [futuro paquete canonical, versionado]
       │          │          │
       ▼          ▼          ▼
   React      Gutenberg    HTML / AngleSpec
   adapter      adapter       adapters
```

- **Importador canónico:** después de inspección/análisis y antes de generar archivos. Para proyectos existentes produce un borrador y un informe de pérdidas.
- **Exportador canónico:** parte del estado canónico validado, no de `App.jsx`, y convive inicialmente con el exportador actual.
- **Adaptador React:** genera `App.jsx`, componentes y `data-codesign-id`; React pasa a ser una proyección regenerable.
- **Adaptador Gutenberg:** vive en el plugin y resuelve bloques nativos, bloques propios, activos y global styles conservando IDs canónicos.
- **Sincronización:** requerirá posteriormente identidad de nodo canónico, identidad de proyección y revisión/base común; no pertenece al MVP actual.

## Propuesta incremental sin retrasar el MVP

### Ahora

1. Conservar el contexto v2 como contrato de decisiones y procedencia.
2. Asegurar IDs durables para materiales, definiciones y activos.
3. No introducir páginas, secciones ni componentes universales en `edit-context.json`.
4. Documentar que rutas de workspace y valores detectados son entradas, no formato maestro.
5. Mantener la regla acordada: omisión significa preservar; lo abierto habilita propuesta IA y placeholders cuando falte contenido.

### Siguiente incremento pequeño

1. Redactar un RFC del núcleo mínimo, sin implementarlo: `document`, `nodes`, `content`, `tokens`, `assets`, `behaviors`, `decisions` y `provenance` por referencias.
2. Definir identidad y versionado antes que una taxonomía exhaustiva de componentes.
3. Crear fuera del flujo crítico un experimento de ida y vuelta de una sola página: implementación existente → borrador canónico → React.
4. Medir pérdidas en componentes, estados, responsive, datos e interacciones.

### Solo después del experimento

1. Extraer esquema, validación y migraciones a un paquete neutral.
2. Añadir adaptador React manteniendo el pipeline actual como fallback.
3. Diseñar un fixture Gutenberg y mapear pocos componentes comunes.
4. Definir entonces sincronización y conflictos de reimportación.

## Principios recomendados

- El núcleo describe intención y reglas; JSX o markup Gutenberg nunca son requisitos centrales.
- Procedencia y autoridad se enlazan a decisiones o propiedades relevantes, posiblemente mediante un registro asociado para evitar duplicación.
- Los componentes desconocidos admiten extensiones con namespace; no se fuerza una lista universal cerrada.
- Cada adaptador puede guardar metadatos propios separados del núcleo.
- La importación de implementaciones existentes admite incertidumbre y datos abiertos; no finge equivalencia perfecta.

## Estado

- No se implementó el lenguaje canónico.
- No se implementó ni modificó un plugin WordPress.
- No se modificaron runtime ni exportadores debido a esta propuesta.
- Hay cambios preliminares sin commit de análisis multifuente iniciados antes de fijar este alcance; quedaron detenidos y fuera de esta auditoría.
