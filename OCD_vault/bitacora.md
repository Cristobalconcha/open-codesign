# Bitácora de desarrollo — Open CoDesign

Registro cronológico obligatorio de avances, verificaciones, commits, pushes, decisiones y pendientes del proyecto.

## 2026-08-02 — Preparación del entorno colaborativo

**Realizado:**

- Se configuró Codex para confiar en `open-codesign` y acceder a `OCD_vault` mediante `seekstone-open-codesign`.
- Se configuró Cline con acceso al mismo vault y reglas locales del proyecto.
- Se incorporó el documento de contexto del Modo Editar y se contrastó con la rama y el repositorio real.

**Estado:** rama `feature/edit-mode`, commit base `42b55fb`.

**Pendiente:** completar y verificar gradualmente el MVP del Modo Editar.

## 2026-08-02 — Auditoría inicial del MVP

**Realizado:**

- Se auditó el flujo provisional de `EditTab`, creación de diseños, importación de archivos y lectura de `.codesign/edit-context.json`.
- Se comprobó que la pestaña Editar no estaba expuesta en `TopBar`.
- Se descubrió que el importador genérico enviaba `edit-context.json` a `references/`.
- Se confirmó que `pnpm dev` comparte por defecto identidad y datos con la aplicación instalada.
- Se separaron pruebas sin IA, simuladas y dependientes de proveedores reales.

**Verificaciones:** typecheck desktop correcto; 130 pruebas enfocadas correctas; suite global con un fallo temporal que pasó al repetirse aisladamente.

**Pendiente:** resolver navegación, inicialización segura del workspace, serialización, ciclo de vida de UI y validación integral.

## 2026-08-02 — Etapa 1 completada: navegación Editar

**Implementado:**

- `HubTab` admite `edit`.
- `TopBar` muestra Editar entre Ejemplos y Recursos.
- `HubView` monta `EditTab`.
- Se añadieron traducciones en inglés, español, portugués y chino.
- Se añadió una prueba de regresión para el orden de navegación.

**Verificaciones:** i18n 15/15; navegación enfocada 3/3; typecheck correcto; `git diff --check` correcto.

**Pendiente:** inicialización atómica de archivos del Modo Editar.

## 2026-08-02 — Etapa 2 rehecha y completada: IPC seguro

**Implementado:**

- Codex reemplazó dos implementaciones incompletas de Cline.
- El proceso principal resuelve el workspace exclusivamente desde `designId`.
- El renderer ya no envía `workspaceRoot`.
- El IPC reserva nombres exclusivos sin sobrescribir referencias existentes.
- La ruta final se registra en `materials[0].path`.
- `.codesign/edit-context.json` se escribe sin sobrescribir un contexto existente.
- Ante fallo se eliminan solamente los archivos creados por la operación actual.
- Se añadieron pruebas de ruta exacta, colisión, entrada inválida, pertenencia por `designId` y rollback.

**Verificaciones:** 5/5 pruebas específicas; 37/37 pruebas enfocadas; typecheck desktop correcto; Biome enfocado limpio; `git diff --check` correcto.

**Checkpoint:**

- Commit `8a5eb49` — `feat(edit-mode): add reference workspace initialization`.
- Push realizado a `origin/feature/edit-mode`.
- Pre-push: typecheck completo, lint de 544 archivos y suite desktop 1372/1372 correctos.

**Pendiente:** Etapa 3, serialización Base64/UTF-8 y validación temprana de archivos; no se ha implementado análisis visual real.

## Política de registro

## 2026-08-02 — Etapas 3 a 5 implementadas

**Implementado:** validación estricta de PNG/JPEG/WEBP y límite de 10 MB; conversión Base64 por bloques; reemplazo y desmontaje con revocación de object URLs; bloqueo de análisis/creación concurrentes; parser compartido de `EditContext` con IDs únicos, partición exacta `active/open`, timestamp y campos estructurados válidos. El lector del prompt y el IPC utilizan el mismo parser.

**Subsistemas:** renderer `EditTab` y utilidades de ingestión; core `edit-context`; IPC y lector de prompt desktop.

**Verificaciones:** core 3/3; desktop enfocadas 36/36; typecheck desktop correcto; Biome aplicado a los archivos afectados.

**Pendiente:** integración completa sin IA con almacenamiento temporal, revisión de regresión del Modo Crear y limpieza final.

## 2026-08-02 — Etapas 6 y 7: integración aislada y cierre técnico

**Implementado/verificado:** prueba integrada desde inicialización IPC hasta lectura de `.codesign/edit-context.json`; prueba de instrucciones confiables sin wrapper untrusted; regresión explícita del Modo Crear sin contexto de edición; build completo del monorepo; arranque smoke de Electron 39 con `userData` temporal y sin proveedores.

**Resultados:** core 12/12 pruebas enfocadas; desktop 37/37 enfocadas; typecheck completo 10/10 paquetes; lint 548 archivos limpio; build de 11 paquetes correcto; suite global desktop 1379/1379 y 10 tareas Turbo correctas; smoke Electron `smoke.ok` en Windows x64.

**Aislamiento:** el smoke usó `%TEMP%/codesign-edit-smoke-20260802`; no leyó configuración de proveedores, no consumió IA y no tocó diseños o sesiones instalados.

**Interacción UI automatizada:** prueba `happy-dom` cubre carga, reemplazo, análisis simulado, diez checkboxes seleccionados, desmarcado hacia `open`, creación mediante IPC, navegación al workspace, rechazo de archivos mayores de 10 MB y revocación de object URLs al reemplazar/desmontar. Resultado 2/2; typecheck desktop y lint global correctos.

**Pendiente externo al cierre técnico:** inspección visual humana opcional y análisis visual real con un modelo capaz; este último continúa expresamente fuera del MVP actual.

Al finalizar cada bloque material de trabajo se debe añadir una entrada con:

- fecha y título;
- qué se implementó o investigó;
- archivos o subsistemas afectados;
- verificaciones ejecutadas y resultados reales;
- commit y push, cuando existan;
- errores, riesgos y pendientes.

No registrar secretos, tokens, claves, contenido sensible de configuración ni datos personales innecesarios.
## 2026-08-02 — Auditoría final de robustez del MVP

- Se endureció la frontera IPC: Base64 canónico obligatorio y correspondencia entre MIME y extensión para PNG, JPEG y WEBP.
- Se impide crear un diseño si el servicio IPC de Modo Editar no está disponible.
- Si la inicialización del workspace falla después de crear el diseño, la UI ejecuta `softDeleteDesign` sobre ese diseño incompleto, no navega al workspace y conserva un error recuperable.
- La prueba de UI ahora cubre reemplazo real mediante drag-and-drop, además de selector, análisis simulado, diez restricciones, transición `active/open`, Unicode y creación.
- Verificación enfocada: 8/8 pruebas, typecheck desktop, Biome y `git diff --check`, todos correctos.
- Verificación final: build correcto, typecheck 10/10, lint sobre 549 archivos, suite desktop 115 archivos/1382 pruebas y suite Turbo 10/10.
- Checkpoint final `06138b5 fix(edit-mode): harden workspace initialization`, enviado a `origin/feature/edit-mode`.
- No se leyeron claves, no se usaron proveedores y no se consumieron créditos.
## 2026-08-02 — Corrección de alcance: análisis multifuente mediante IA

- Se corrigió la interpretación anterior: una imagen es solo una fuente posible; el objetivo es descubrir diseño mediante IA a partir de imágenes, escaneos, texto, documentos, web, activos y workspaces.
- Se adoptó Santa Luisa de Palpi como caso real conductor y se leyó su descriptor sin copiar su ruta temporal al código público.
- Se diseñó schema v2 compatible para conservar valor detectado, reemplazo explícito, decisión `preserve/replace/open`, autoridad, permiso de uso, procedencia y alcance.
- Se creó el contrato de salida del analizador IA: variables, contradicciones y vacíos; no usa una lista fija de diez rasgos.
- El fixture Santa Luisa verifica que una decisión confirmada y una propuesta pendiente mantengan distinta autoridad.
- Pruebas enfocadas del núcleo: 17/17; typecheck core y `git diff --check` correctos.
- Próximo paso: IPC de análisis real reutilizando proveedores configurados y enrutamiento explícito por capacidad visual/textual.

## 2026-08-02 — Auditoría de arquitectura canónica

- Se auditó la representación de artefactos, snapshots, `DESIGN.md`, `MEMORY.md`, contexto de edición, parámetros editables, selección DOM, inspección de workspace, preview, runtime, descomposición y exportadores.
- Se confirmó que no hay un AST de interfaz, modelo de escena o árbol semántico reutilizable: el núcleo conserva principalmente fuentes como strings y observa el DOM renderizado.
- Se identificaron como candidatos principales `DESIGN.md` para sistema visual, `edit-context.json` para autoridad/procedencia, `data-codesign-id` para identidad proyectada y las fronteras runtime/exporters para adaptadores futuros.
- Se documentaron riesgos de acoplamiento con React, `App.jsx`, rutas de workspace, selectores posicionales, snapshots textuales y extracción exclusivamente mediante LLM.
- Se propuso una evolución incremental que mantiene el MVP multifuente como prioridad y posterga el esquema neutral, el adaptador React y el adaptador Gutenberg a experimentos separados.
- Documento: [[auditoria-lenguaje-canonico]]. No se implementó la arquitectura mayor ni se avanzaron los cambios preliminares de producto durante esta auditoría.

## 2026-08-02 — Inicio de Open CoDesign Publisher para WordPress

- Se creó el repositorio independiente `C:\Users\Cristobal concha\open-codesign-wordpress` para no mezclar el plugin con la rama y cambios pendientes de Open CoDesign.
- Se definió un formato v0 deliberadamente pequeño para proyectos, páginas y nodos Gutenberg; no es un lenguaje canónico universal.
- Se creó un plugin instalable con pantalla en Herramientas, carga JSON protegida por capacidad y nonce, límite de 2 MB, validación estricta, creación exclusiva como borradores y rollback de las páginas creadas si falla la operación.
- Se añadió serialización inicial de secciones, grupos, columnas, encabezados, párrafos, imágenes, botones, separadores y espaciadores.
- El fixture conductor contiene Inicio, Preguntas frecuentes y Contacto de Santa Luisa de Palpi.
- Verificación local: parser sintáctico sobre 5 archivos PHP, fixture de 3 páginas y `git diff --check`, correctos. PHP y WordPress no están instalados localmente, por lo que la activación y el roundtrip real de Gutenberg continúan pendientes.

## 2026-08-02 — Primer despliegue controlado en WordPress

- Se configuró el entorno de desarrollo `santaluisadepalpi.kpispublicitarios.com` y se confirmó que WordPress usa el nuevo subdominio como `url` y `home` canónicos.
- Se estableció FTPS explícito con certificado válido mediante el hostname del servidor y una cuenta confinada a `/home/abbxyyex/santaluisadepalpi.cl`.
- Se creó un script reproducible que rechaza cualquier destino distinto de `/wp-content/plugins/open-codesign-publisher/`, ofrece simulación y verifica por tamaño cada archivo transferido.
- El plugin se desplegó inactivo: 5 archivos PHP transferidos y verificados. Las cinco rutas respondieron HTTP 200, al igual que la home y la API del sitio.
- No se modificó el núcleo, temas, contenidos ni otros plugins. Quedan pendientes activación, prueba real del importador y roundtrip Gutenberg.

## 2026-08-02 — Primer roundtrip Gutenberg exitoso

- El plugin Open CoDesign Publisher 0.1.0-dev se activó sin errores en el hosting.
- El fixture v0 fue aceptado y creó tres borradores nativos: Inicio, Preguntas frecuentes y Contacto.
- WordPress abrió Inicio como bloques editables; encabezado, párrafo y contenedor no quedaron encapsulados como HTML opaco.
- La instalación incluye Pagelayer, que añade acceso a su editor y biblioteca sobre la pantalla Gutenberg. Se mantendrá como herramienta comparativa, sin convertirlo todavía en dependencia del formato de importación.
- El activador temporal usado durante la verificación fue retirado; su endpoint responde 404 y sitio/API continúan en HTTP 200.
- Siguiente paso: traducir el contenido real de Santa Luisa y comprobar imágenes, columnas, responsive y edición persistente.

## 2026-08-02 — Primer paquete estructural real de Santa Luisa

- Se inventarió `App.jsx` y se modelaron Inicio, Preguntas frecuentes y Contacto en `fixtures/santa-luisa-project.json`.
- El importador ahora admite listas, detalles/FAQ desplegables y video HTML5, además de los bloques previamente soportados.
- La home real incluye hero, tres atributos, parcelas, ubicación 45/55, video, galería y accesos a FAQ/Contacto; FAQ contiene cinco preguntas y Contacto dos columnas.
- Se desplegó el serializador actualizado sin caída del sitio.
- Se transfirieron siete activos reales a una ruta aislada. Tres cargas parciales fueron detectadas por comparación de tamaños, reintentadas con otro cliente FTPS y finalmente verificadas 7/7 con tamaño remoto exacto.
- Checkpoint `78cdcdc feat: model real Santa Luisa project pages`.
- Pendiente inmediato: importar el paquete real y revisar validación Gutenberg, fidelidad y edición visual.

## 2026-08-02 — Definición de producto abierto y portable

- La prueba real confirmó la separación entre contenido estructurado e hidratación visual: el plugin reconstruyó páginas como bloques Gutenberg nativos y el tema activo aportó la presentación, el encabezado, el pie y las reglas globales.
- Se definió `Open CoDesign Canvas` como tema base abierto y `Open CoDesign Publisher/Tools` como plugin complementario para importación, exportación, controles visuales, asignaciones, sincronización y futura interfaz MCP.
- Open CoDesign Desktop será una herramienta opcional de creación e intervención avanzada mediante IA; un usuario podrá construir, editar y publicar completamente desde WordPress sin depender de IA ni de la aplicación de escritorio.
- Se estableció como requisito central la portabilidad bidireccional: un proyecto debe poder importarse a WordPress, exportarse íntegramente, abrirse en Open CoDesign Desktop directamente en flujo de Edición y reconstruirse en otro WordPress con fidelidad visual, estructural y editorial.
- El paquete portable deberá incluir contenido, bloques, tema o configuración de proyecto, plantillas, partes, asignaciones, componentes, navegación, activos, versiones, procedencia e identificadores estables; dominios, IDs locales y secretos se resolverán en el destino.
- El servidor MCP y el paquete exportable compartirán el mismo modelo e identidad: MCP permitirá intervención en vivo y el paquete permitirá respaldo, traslado y trabajo desconectado.
- Se incorpora la migración desde otros page builders mediante adaptadores. Gutenberg, HTML/CSS y formatos accesibles podrán normalizarse al modelo Open CoDesign; los formatos propietarios o inaccesibles podrán requerir adaptadores específicos o reconstrucción parcial desde el resultado renderizado.
- Se adopta como principio de producto: crear con IA, publicar y editar nativamente en WordPress, migrar desde otros sistemas y permitir también una salida abierta hacia otros destinos, evitando dependencia obligatoria del editor de escritorio o de un formato cerrado.
- Esta definición conforma la base del modelo de negocio: herramienta avanzada de diseño, puente de publicación, plataforma de migración y garantía de salida.
- En esta definición no se modificó código ni se desplegaron archivos.

## 2026-08-02 — Inicio del programa multiagente WordPress

- Se auditó el repositorio WordPress y se preservó el prototipo existente del tema Santa Luisa en el checkpoint `05429a7 feat: prototype Santa Luisa block theme`; `npm run check` aprobó 6 archivos PHP y 3 fixtures con 7 páginas.
- Se creó un plan incremental desde tema padre/hijo hasta paquete portable, importación idempotente, exportación integral, roundtrip, Desktop, MCP y adaptadores.
- Se añadió `AGENTS.md` específico para WordPress y tareas con allowlist, criterios de aceptación y prohibiciones de despliegue, credenciales, commits y cierres no verificados.
- Se creó el checkpoint `03773c7 docs: define WordPress implementation program`.
- Se definió el reparto: Claude Code con Opus implementa Canvas y el tema hijo; OpenCode implementa el contrato `.ocdsite` v1; Codex es propietario de arquitectura, integración, pruebas, commits, despliegue y bitácora. Cline queda fuera del camino crítico y sólo podrá recibir tareas mecánicas acotadas.
- Se crearon los worktrees aislados `agent/claude-canvas` y `agent/opencode-package-v1` desde el mismo checkpoint, con propiedad de archivos no superpuesta, y ambos procesos fueron iniciados.
- El repositorio `open-codesign-wordpress` todavía no tiene remoto configurado; los checkpoints son locales y no existe push posible hasta definir un remoto.
- No se desplegaron archivos ni se leyeron credenciales durante esta coordinación.

## 2026-08-02 — Nuevo frente IDML y motor responsive Canvas

- Se añadió como frente de producto la salida IDML editable para conectar Open CoDesign con InDesign y producción editorial; no se aceptará un PDF o captura incrustado como falsa editabilidad.
- La auditoría de sólo lectura confirmó que el runtime y los exportadores actuales ya pueden renderizar `App.jsx`/HTML y resolver activos; falta extraer una escena neutral desde el DOM computado y escribir el paquete XML/ZIP IDML.
- El equipo tiene instalado Adobe InDesign 2026, por lo que el criterio del primer spike será abrir un IDML generado sin reparación y comprobar texto, imágenes y estilos editables.
- IDML aporta un vocabulario maduro para páginas, spreads, masters, stories, frames, estilos, swatches y vínculos. No modela por sí solo responsive web, componentes semánticos, rutas, estados, datos, accesibilidad ni asignaciones WordPress.
- Se mantiene abierta la posibilidad de adoptar sus conceptos como base del núcleo visual, pero la recomendación actual es un `LayoutScene` neutral inspirado en IDML y un adaptador IDML de primera clase; JSON o XML son serializaciones, no la arquitectura.
- Se definió la separación propuesta: IDML conserva composición editorial/desktop; Canvas aplica reglas responsive deterministas; WordPress gestiona contenido y publicación; metadatos Open CoDesign conservan excepciones e interacción.
- Gutenberg no depende de Bootstrap: utiliza bloques core, estilos estructurales, layout y `theme.json`. Su responsive nativo es útil pero limitado, por ejemplo `core/columns.isStackedOnMobile`, sin controles completos por breakpoint.
- Para Canvas se compararon Bootstrap completo, grid-only y motor propio. La recomendación es un motor CSS Grid propio inspirado en Bootstrap, con presets de 12 columnas y breakpoints familiares, pero ratios exactos como 45/55, anidación, orden y gaps por breakpoint.
- No se modificó código de Desktop durante esta auditoría. El frente IDML queda separado de los cambios sin commit del Modo Editar.

## 2026-08-02 — Modelo de producto para tres mundos

- Se consolidó la visión de Open CoDesign como un sistema de diseño interoperable con salida hacia tres dominios: aplicaciones e interfaces, web/CMS y diseño editorial/impreso.
- Los tres destinos compartirán sistema visual, contenidos, activos, estructura, procedencia y asistencia mediante IA; cada adaptador conservará además las capacidades propias de su medio.
- Aplicaciones requieren estados, componentes, navegación y datos; web requiere responsive, accesibilidad, CMS, SEO y publicación; editorial requiere páginas, spreads, masters, stories, marcos y preparación de impresión.
- Canvas se define como puente web/WordPress e IDML como puente editorial/InDesign. React, HTML y futuros adaptadores cubren aplicaciones e interfaces.
- La ventaja de producto es mantener una misma intención de diseño entre los tres mundos sin encerrar al usuario en un único formato o destino.

## 2026-08-03 — Frontera entre el frente externo y el flujo interno de Open CoDesign

- El trabajo actual en WordPress, Canvas, paquete portable e IDML corresponde al frente externo de Open CoDesign y no reemplaza la intervención pendiente del flujo de la aplicación de escritorio.
- El frente interno queda suspendido de forma deliberada, no cancelado, mientras se estabilizan el puente de publicación y los contratos portables.
- Al retomarlo, Crear y Editar compartirán una fase explícita de incorporación de insumos, análisis mediante IA, normalización de decisiones y checklist vinculante.
- Los insumos podrán incluir proyectos existentes, wireframes digitales o escaneados, mockups, imágenes, documentos, descripciones textuales, manuales de estilo, activos y referencias web.
- En el flujo Editar, el proyecto existente será tratado como un insumo con procedencia y autoridad; en Crear, la fase se insertará después de la definición inicial de tipo, objetivo, concepto y particularidades del proyecto.
- La omisión en la checklist tendrá semántica explícita: mantener una característica detectada cuando existe, o permitir una propuesta del sistema cuando queda abierta. El contenido y el uso de placeholders deberán resolverse separadamente por sección.
- Ningún agente debe interpretar el avance del frente WordPress como cierre del análisis multifuente ni del rediseño del flujo Crear/Editar de Open CoDesign Desktop.
- El regreso al frente interno no esperará a que todo el ecosistema web futuro esté terminado. El umbral acordado es: Canvas padre y tema hijo instalados, Santa Luisa fiel y responsive, páginas editables/publicables, importación repetible, contrato `.ocdsite` integrado y un roundtrip básico verificable.
- MCP, adaptadores para otros page builders y refinamientos web avanzados podrán continuar después como evolución paralela, sin bloquear el desarrollo de las funcionalidades no estandarizadas del flujo interno.
- Por su mayor complejidad conceptual, el flujo interno permanecerá bajo dirección arquitectónica y revisión estrecha de Codex; los demás agentes recibirán implementaciones acotadas y verificables.

## 2026-08-03 — Contrato portable `.ocdsite` v1 integrado

- OpenCode implementó el contrato en un worktree aislado; Codex rechazó la primera revisión por mezclar identidades, aproximar JSON Schema manualmente y omitir colisiones de caja. La segunda revisión incorporó Ajv 2020, separación de paquete/proyecto/sitio y nuevas rutas de intercambio Desktop/IDML.
- Claude Code con Opus realizó una revisión independiente de sólo lectura y detectó garantías exageradas sobre secretos, ausencia de política frente a PHP ejecutable, un guard negativo permisivo, `$schema` no canónica y falta de correspondencia entre entrypoints y roles.
- OpenCode corrigió esos hallazgos en una iteración final acotada. Codex comprobó directamente el rechazo de `$schema` ajena y de `content` apuntando a un archivo con rol `idml`, corrigió dos afirmaciones documentales restantes y realizó la integración.
- El contrato distingue `package.id`, `project.id` y `origin.siteId`; admite entrypoints opcionales `designModel`, `desktopSource` e `idml`; exige rutas portables, hashes, tamaños, roles y referencias coherentes; y documenta expresamente lo que el esquema no puede garantizar sobre ZIP, bytes, secretos y código ejecutable.
- El guard de fixtures exige igualdad exacta del conjunto de códigos esperados. Resultado final: 34/34 casos, con 2 válidos y 32 inválidos; chequeo general correcto sobre 7 archivos PHP y 7 páginas; `git diff --check` correcto; instalación npm auditada con 0 vulnerabilidades.
- Checkpoint de implementación `554625d` en `agent/opencode-package-v1`; integración en `main` como `694ff90 feat: define portable site package contract`.
- El repositorio WordPress continúa sin remoto configurado, por lo que no existe destino disponible para push. No se desplegaron archivos ni se leyeron credenciales durante esta etapa.
- El contrato no implementa todavía ZIP real, verificación de hashes contra bytes, importación/exportación, secret scanning ni roundtrip; esos trabajos permanecen en fases posteriores.

## 2026-08-03 — Canvas y Santa Luisa operativos en WordPress

- Se creó `scripts/deploy-themes-ftps.ps1`, con simulación por defecto, destino fijo `/wp-content/themes/`, allowlist de los slugs `open-codesign-canvas` y `open-codesign-santa-luisa`, extensiones limitadas y verificación remota por tamaño.
- Checkpoint `670e7ee chore: add guarded theme deployment`. Se transfirieron y verificaron 14/14 archivos del tema padre y del tema hijo.
- La contraseña de aplicación configurada respondió HTTP 401 en una prueba de sólo lectura; no se modificó ni se imprimió la credencial. Para no bloquear la prueba se creó un activador temporal protegido por token aleatorio de 256 bits, limitado al tema hijo esperado y eliminado inmediatamente después de usarlo.
- WordPress confirmó `open-codesign-santa-luisa` como stylesheet activo sobre `open-codesign-canvas`. El helper temporal fue retirado y su ausencia se verificó por FTPS. Checkpoints `121f736 chore: add one-time guarded theme activation` y `3b607e0 fix: avoid reserved variable in theme verification`.
- La primera inspección visual reveló que WordPress seguía mostrando entradas porque las páginas importadas eran borradores y no existía una portada asignada. Se creó una operación temporal equivalente basada en las identidades `_ocd_project_id` y `_ocd_page_id`, sin depender de títulos ni IDs adivinados.
- Se publicaron `home-real` como página 9, `faq-real` como 10 y `contact-real` como 11; `home-real` quedó asignada como portada. Inicio, FAQ y Contacto respondieron HTTP 200 con sus marcadores esperados; el helper temporal fue eliminado. Checkpoint `cc1d729 chore: add one-time Santa page publication`.
- La inspección responsive encontró que WordPress genera `flex-wrap: nowrap` para `core/columns`. Canvas cambiaba el ancho de las columnas pero no el wrapping del contenedor, produciendo desborde. Se añadió wrapping obligatorio bajo 781 px en el motor genérico, checkpoint `92f727f fix(canvas): wrap columns on narrow screens`, y se redesplegaron/verificaron 14/14 archivos.
- Verificación visual final: composición completa en escritorio; a 500 px las columnas se apilan, el menú usa overlay/hamburguesa, imágenes y textos permanecen dentro del viewport y el diálogo de cookies cabe en pantalla.
- El resultado demuestra el flujo extremo a extremo de este MVP: contenido Gutenberg nativo + Canvas padre + identidad de tema hijo + estado editorial WordPress + responsive. No implica aprobación del diseño visual actual ni fidelidad definitiva respecto de Open CoDesign.
- El repositorio WordPress sigue sin remoto configurado; todos los checkpoints son locales y no existe destino para push.

## 2026-08-03 — Experimento IDML externo con Santa Cecilia

- En paralelo, Cristóbal está usando ChatGPT para construir un IDML a partir de una plantilla real de Santa Cecilia, incorporando definiciones, contenido, colores y estructura.
- Este experimento es deliberadamente independiente del caso web Santa Luisa de Palpi; se registran ambos nombres por separado para evitar cruces de proyecto.
- Cuando esté disponible se conservarán, idealmente, la plantilla original, el IDML generado, los insumos entregados y las observaciones del usuario.
- La auditoría futura tendrá dos niveles: apertura en InDesign sin reparación y editabilidad real; y comparación interna del ZIP/XML para revisar stories, frames, styles, swatches, links, masters y decisiones frágiles.
- Los aciertos y fallos observados se convertirán en requisitos verificables para `LayoutScene` y el adaptador IDML propio. Este experimento no sustituye todavía el spike automatizado del repositorio.

## 2026-08-03 — Navegación del tema Santa Luisa corregida

- El tema hijo dejó de utilizar `wp:page-list`, que exponía la página de ejemplo de WordPress, y pasó a declarar una navegación editable y propia del proyecto: Inicio, Preguntas frecuentes y Contacto.
- Las validaciones permanecen correctas: chequeo general sobre 7 archivos PHP y 7 páginas, contrato `.ocdsite` 34/34 y `git diff --check` sin errores.
- Checkpoint `e69d4f3 fix(santa-luisa): define project navigation`; se redesplegaron y verificaron 14/14 archivos de Canvas y del tema hijo.
- La portada pública respondió HTTP 200, contiene los tres destinos esperados y ya no contiene “Sample Page”.

## 2026-08-03 — Arranque local y exportación HTML reparados

- Se comprobó que la instalación 0.2.1 de Open CoDesign permanecía intacta. El ejecutable podía terminar antes de cargar la aplicación cuando heredaba `ELECTRON_RUN_AS_NODE=1`, condición que tampoco alcanza a producir una entrada en `main.log`.
- Se creó un lanzador personal que elimina exclusivamente esa variable del proceso hijo y conserva el ejecutable, perfil, proyectos y credenciales originales. Los accesos personales de barra de tareas, menú Inicio y Escritorio utilizan el lanzador y aprobaron ciclos independientes de cerrar/abrir; la aplicación quedó abierta y respondiendo.
- Los accesos compartidos creados por el instalador en `ProgramData` y `Public Desktop` no pudieron modificarse sin elevación. Se crearon equivalentes personales para Inicio y Escritorio, y se actualizó directamente el acceso anclado a la barra de tareas.
- El registro confirmó además que el workspace fue actualizado desde la carpeta antigua inexistente `SantaCecilia` a `SantaLuisaDePalpi`. Queda pendiente admitir el MIME de `assets/familia.mov`, actualmente rechazado por el protocolo del workspace.
- Se encontró que `App.jsx` contenía un bloque JSON `EDITMODE` huérfano: faltaban `const TWEAK_DEFAULTS =` y el punto y coma final. La vista previa ocultaba el defecto al sustituir el bloque por el bridge de ajustes, mientras el HTML independiente entregaba la fuente inválida a Babel.
- Se reparó el `App.jsx` real y se creó `Santaceciliadepalpi-fixed.html` sin sobrescribir la exportación original. Edge montó React y encontró el contenido esperado de Santa Luisa dentro de `#root`.
- El runtime ahora repara únicamente un bloque `EDITMODE` que ocupa por sí solo una línea; declaraciones y contextos de expresión válidos permanecen intactos. Resultado: Shared 231/231 pruebas, Runtime 46/46, typecheck de Shared y Runtime correcto y Biome correcto sobre los tres archivos modificados.
- Checkpoint `0cac3bf fix(runtime): repair orphaned editmode declarations`. El hook general se omitió deliberadamente porque falló por archivos pendientes ajenos a este cambio (`stage2-register.mjs`, `stage2-edittab.mjs` y formato de `edit-mode-ipc.ts`); el staged diff fue limitado y verificado antes del commit.

## 2026-08-03 — Auditoría inicial del paquete Divi `Agency.zip`

- Se analizó en modo de sólo lectura `G:\Mi unidad\Temas DIVI\Agency.zip` (SHA-256 `B3F2B08AEFB4C6EE540D32BB37449381D5C8FF6CD9F472AE49C6A6ED21271B35`). Contiene un único `Agency.json` de 3.211.423 bytes, exportado en 2019 y generado principalmente con Divi Builder 3.22.
- El JSON usa `context: et_builder_layouts` y contiene siete objetos WordPress de tipo `et_pb_layout`: Home, Landing, About, Blog, Contact, Portfolio y Pricing. Son layouts de página completos: las siete páginas comienzan con una sección `Page Header` y seis terminan con una sección `Footer`; Contact termina en `Map`. No aparecen `global_module`, por lo que este paquete conserva header/body/footer dentro de cada página en vez de depender de asignaciones globales separadas del Theme Builder.
- Cada layout conserva en `post_content` un árbol declarativo de shortcodes Divi, no HTML final: `et_pb_section → et_pb_row → et_pb_column → módulos`. La Landing contiene 12 secciones, 21 filas, 40 columnas y módulos de texto, imágenes, video, CTA, testimonios, precios, formularios, botones y otros.
- Estructura, contenido, apariencia y comportamiento viajan como atributos del mismo lenguaje: fracciones de columna (`1_4`, `1_3`, `1_2`, `2_3`, `3_4`, `4_4`), fondos, gradientes, tipografías, botones, animación, hover, padding, anchura, alineación y valores específicos para tablet/teléfono.
- El paquete incluye 20 imágenes en un diccionario URL → `{ encoded, url, id }`; los binarios están embebidos en base64 (2.940.920 caracteres codificados). Los videos externos pueden quedar referenciados por URL, como el módulo YouTube inspeccionado.
- Divi consigue roundtrip porque el mismo ecosistema entiende el vocabulario de shortcodes y sabe regenerar HTML/CSS desde todos sus atributos. El JSON es el sobre de transporte; la fuente editable real es el lenguaje declarativo Divi y su renderer, no un resumen genérico.
- Lección provisional para Canvas: no convertir HTML/CSS a un JSON reducido. Preservar el bundle web original para fidelidad y, si se adopta una representación estructurada, debe ser completa, versionada y respaldada por renderers Canvas/Gutenberg equivalentes. Un manifiesto/bindings JSON puede aportar identidad y editabilidad sin sustituir el HTML/CSS.
- No se modificó código ni se extrajo el ZIP. Conviene revisar a continuación una exportación moderna de Theme Builder y, si existe, una página individual con video de fondo y estilos responsive para cubrir capacidades que esta muestra de 2019 no representa.

## 2026-08-03 — Investigación de motores visuales y spike GrapesJS con Santa Luisa

- Se verificaron directamente los repositorios oficiales `GrapesJS/grapesjs`, `BluePointDigital/svelte-visual-builder`, `kamilskicki/oxygen-html-converter` y `silexlabs/Silex`; las descripciones, licencias y capacidades principales aportadas por Cristóbal eran correctas.
- GrapesJS es la base más madura: 26.098 estrellas, 6.250 commits en el historial visible, actividad reciente, licencia BSD-3-Clause, parser HTML, árbol de componentes, Style Manager, Layer Manager, Asset Manager, almacenamiento desacoplado y salida HTML/CSS. Está diseñado expresamente para integrarse en un CMS.
- `svelte-visual-builder` confirma una arquitectura muy cercana a Open CoDesign —schema, core, plugin API, runtime, editor, adaptadores e importadores HTML/Elementor— y usa MIT, pero todavía es joven: 18 commits y 29 estrellas. Su importador actual reconoce sólo un subconjunto y usa nodos HTML de fallback para video, iframe, SVG, formularios y otros elementos complejos.
- `oxygen-html-converter` demuestra la conversión HTML → documento nativo editable dentro de WordPress y posee una tubería rica de normalización, IR, detección de componentes/interacciones y persistencia segura. Depende de Oxygen 6.1 comercial y su código GPL-2.0-or-later no debe copiarse al núcleo Desktop sin revisar compatibilidad; sí constituye una referencia excelente de arquitectura y diagnóstico.
- Silex es un producto completo basado en GrapesJS, licencia AGPL-3.0, salida HTML estática, integración CMS/WordPress por GraphQL, plugins, escritorio y MCP. Sirve como antecedente de producto y portabilidad, pero su licencia y tamaño hacen menos conveniente incrustarlo completo que usar GrapesJS directamente.
- Se construyó un spike reproducible en `C:\Users\Cristobal concha\open-codesign-research\grapesjs-santa-spike`. Renderiza el HTML real de Santa Luisa, espera el montaje React, extrae el DOM y lo convierte en un proyecto GrapesJS que abre localmente y sin CDN en `output/santa-luisa.editor.html`.
- Resultado medido: 125 elementos visuales de 126; el único elemento no convertido es un `<style>` interno cuyo contenido se conserva íntegro como CSS de fallback. Permanecen las 65 clases, los 7 IDs fuente, las 7 secciones, 7 imágenes, 2 videos, iframe, SVG, textos y botones. La mutación programática del `h1` se serializó correctamente.
- El spike descubrió una pérdida concreta: el tipo `video` predeterminado de GrapesJS añadía controles visibles a los videos de fondo. Se registró `ocd-video` para conservar los atributos fuente sin añadir controles y la vista recuperó el hero esperado.
- Se adoptó provisionalmente una estrategia de editabilidad progresiva sin pérdida: HTML estructurado editable + CSS original preservado como autoridad visual + tipos `ocd-*` para comportamientos comprendidos + fallback crudo para lo todavía no normalizado. El iframe de GrapesJS se usa sólo dentro del lienzo del editor; la publicación continúa siendo HTML/CSS nativo.
- Checkpoint local del spike: `0c9395c spike(canvas): prove editable Santa Luisa import with GrapesJS`. El repositorio de investigación no tiene remoto, por lo que no existe destino de push.
- Pendiente inmediato: trasladar este spike a una pantalla experimental del plugin WordPress, empaquetar los activos con rutas portables y comprobar edición/guardado/reapertura sobre la instalación de prueba antes de decidir la adopción definitiva de GrapesJS.

## 2026-08-03 — Empaquetado fiel de activos JSX verificado con Santa Luisa

- Se corrigió una pérdida en los tres exportadores de Desktop: las referencias locales dentro de `App.jsx` se buscaban después de envolver y escapar la fuente en el runtime HTML. Ahora se recolectan, reescriben o embeben antes de construir el documento autónomo.
- HTML y HTML renderizado convierten imágenes y videos locales en `data:` URIs. ZIP conserva `source/App.jsx` sin modificaciones y reescribe únicamente la copia ejecutable de `index.html` hacia `assets/`.
- Se agregó soporte MIME para `.mov` (`video/quicktime`) tanto en el exportador como en el protocolo seguro del workspace; `.mp4` y `.webm` quedan cubiertos explícitamente.
- Verificación automatizada: Exporters 83/83, workspace protocol 6/6, typecheck de Exporters y Desktop correcto, y Biome correcto sobre los 10 archivos modificados.
- Prueba real con `SantaLuisaDePalpi/App.jsx`: ZIP de 128.072.585 bytes con 9 activos, incluidos `familia.mov`, `Simular drone.mp4`, imágenes y `Logo.svg`; 14 entradas totales según `manifest.json`.
- El SHA-256 de `source/App.jsx` dentro del ZIP coincide exactamente con el original (`F3B1B4DB7384687D4779297E2511E9C5B3EE7C406D6EF362A608535419401477`). `index.html` contiene las rutas portables del video y del logotipo.
- Edge abrió el `index.html` extraído desde disco y renderizó correctamente el hero, navegación, tarjetas y plano de parcelas con los activos locales. La captura de verificación quedó en `open-codesign-research/grapesjs-santa-spike/output/santa-luisa-desktop-export.png`.
- Checkpoint de implementación `bc338bb` en `agent/opencode-fidelity`; integrado en `feature/edit-mode` como `e207718 fix(exporters): preserve JSX asset references`.
- El push de la rama se intentó, pero Git quedó esperando autenticación de GitHub y se canceló para no bloquear el trabajo nocturno. Los commits locales y los artefactos de prueba quedaron preservados.
- Se agregó `open-codesign-research/grapesjs-santa-spike/open-editor.cmd` como acceso de doble clic al editor experimental local de Santa Luisa.

## 2026-08-03 — Corrección de identidad del prototipo Santa Cecilia

- Cristóbal precisó que el prototipo utilizado para investigar la conversión y el editor visual corresponde a **Santa Cecilia**.
- El caso publicado y configurado en WordPress continúa siendo **Santa Luisa de Palpi**. No deben tratarse como un único proyecto aunque hoy algunos artefactos compartan la carpeta histórica `SantaLuisaDePalpi`.
- Los archivos fuente que identifican el prototipo son `Santaceciliadepalpi.html` y `Santaceciliadepalpi-fixed.html`. El segundo sólo corrige la declaración JSX inválida para permitir la ejecución del mismo prototipo.
- Los nombres internos del spike GrapesJS todavía dicen `santa-luisa`; se consideran nombres provisionales de artefactos y no una declaración de identidad. No se renombrarán hasta revisar las dependencias y referencias para evitar romper el experimento reproducible.

## 2026-08-03 — Editor Canvas funcional e integrado en WordPress

- Se reemplazó el spike superficial por una prueba funcional de edición. OpenCode implementó y probó el comportamiento declarativo de scroll; Claude Code construyó la base aislada de persistencia WordPress; Codex auditó, corrigió, integró, probó, consolidó y desplegó ambos aportes.
- El editor local del prototipo **Santa Cecilia** incorpora un inspector que lee `getComputedStyle()` dentro del lienzo y explica la procedencia de cada valor mediante selector y variables CSS. Permite aplicar cambios locales o a una clase reutilizable.
- Se añadió edición de CSS Grid mediante presets `1/1/1`, `2/1/1`, `1/2/1`, `1/1/2`, `1/2`, `2/1` y `45/55`, proporciones libres, gap por breakpoint y manejadores arrastrables sobre el lienzo.
- El cambio de apariencia del menú al desplazarse se modeló como conducta allowlisted `scroll-threshold`; se persiste mediante atributos `data-*` y se exporta con un runtime pequeño sin `eval`, `Function` ni JavaScript arbitrario importado.
- El editor local guarda, altera, reabre e importa/exporta el proyecto estructurado. Su prueba integrada verifica hero de 16 px, tarjeta de 12 px, grid `1/2/1`, persistencia y comportamiento. Resultado: Canvas Grid 6/6, inspector correcto y self-test de navegador completo.
- Checkpoints del repositorio de investigación: `3d81854 feat(canvas): model declarative scroll behavior`, `5bc57d6 feat(canvas): add effective style and grid editing` y `3ad4b3e fix(canvas): restore Santa Cecilia prototype identity`. No existe remoto configurado para este repositorio.
- En WordPress se añadió `Herramientas → Open CoDesign Canvas (Experimental)`, con GrapesJS 0.23.4 local, entidad privada `ocd_canvas_doc`, ID estable, revisiones y almacenamiento separado de `projectData`, HTML y CSS. Cada carga/guardado exige `manage_options` y nonce.
- La auditoría de navegador descubrió que GrapesJS descartaba declaraciones que todavía no interpreta, como `border-radius: var(--radius-card)`. Se corrigió conservando el CSS fuente literalmente como autoridad visual y guardando las modificaciones en una capa delimitada de overrides. La prueba dejó de ver `0 px` y pasó con 16 px en hero y 12 px en tarjeta después de guardar y reabrir.
- Se admite iframe sólo para embeds HTTPS allowlisted de Google Maps, YouTube/YouTube No-Cookie y Vimeo. Esto conserva el mapa del caso Santa Luisa sin aceptar orígenes arbitrarios.
- Verificaciones WordPress: parser sobre 10 archivos PHP y tres fixtures/7 páginas; 182 comprobaciones estáticas Canvas; runtime de navegador con hero 16 px, tarjeta 12 px, grid `1/2/1`, gap `2rem`, revisión 1 y una conducta persistida; `git diff --check` correcto.
- Checkpoints WordPress: `29fa204 feat(canvas): add experimental WordPress editor storage`, `3435376 chore(canvas): preserve vendor asset bytes`, `8aaf1cd feat(canvas): integrate faithful visual editing in WordPress`, `fedaf2d chore(deploy): allow Canvas runtime assets` y `6b6dd74 fix(deploy): create nested plugin asset directories`.
- El plugin se desplegó por FTPS a la instalación de prueba: 18 archivos transferidos y verificados por tamaño. La home pública respondió HTTP 200; la ruta administrativa del Canvas respondió 302 hacia login sin sesión, como corresponde.
- Pendientes honestos: el Canvas administra por ahora un único documento experimental; no publica todavía ese documento como página, no ofrece biblioteca/listado de documentos ni subida de activos, y falta realizar manualmente el primer guardado autenticado dentro del WordPress remoto. El repositorio WordPress no tiene remoto y por tanto no existe push posible.
- Se conserva la distinción de identidad: el prototipo del editor es Santa Cecilia; la instalación y el caso web publicado son Santa Luisa de Palpi. El flujo multifuente de Crear/Editar en Desktop continúa suspendido hasta cerrar este frente web.
- El hook global del repositorio Desktop no aprobó el commit documental por cambios pendientes ajenos a este frente: errores previos en `scripts/stage2-register.mjs`, `scripts/stage2-edittab.mjs` y formato de `apps/desktop/src/main/edit-mode-ipc.ts`. No se modificaron ni ocultaron esos archivos; el contenido del registro fue verificado con `git diff --cached --check` y se mantuvo acotado a esta bitácora.
- Se intentó el push reglamentario de `feature/edit-mode`. El typecheck completo aprobó, pero el pre-push se detuvo en el mismo lint global ajeno al frente; no se omitió el hook y la rama permanece ocho commits por delante de `origin/feature/edit-mode`.

## 2026-08-03 — Activos, video y publicación del Canvas

- La primera prueba humana remota confirmó tres límites: las rutas `file://` no cargaban imágenes, el video era reinterpretado con controles y `Guardar` persistía sólo el documento privado sin crear una página pública.
- Se registró `ocd-video` antes de importar componentes. La prueba de navegador confirma tipo propio y ausencia de controles agregados.
- Se añadió un resolver seguro que toma referencias `file://` o `assets/`, normaliza el nombre y busca coincidencias únicamente dentro de `wp-content/uploads/open-codesign`, con límites de 100 referencias y 2.000 archivos inspeccionados. El caso Santa Luisa reutiliza los siete activos previamente cargados.
- Se subió y verificó `Logo.svg` en el árbol administrado: HTTP 200 y 17.934 bytes. `familia.mov` no se publicó porque pesa 189.551.588 bytes; requiere optimización/transcodificación antes de usarse responsablemente en web.
- Se añadió `Publicar/actualizar página`: guarda primero el Canvas, crea o actualiza una página WordPress mediante la identidad estable `_ocd_canvas_document_id`, usa una plantilla standalone y entrega un enlace `Ver página`.
- La serialización elimina el wrapper `<body>` antes de guardar para evitar HTML anidado al renderizar mediante shortcode. El runtime público conserva `scroll-threshold`.
- Verificaciones: 13 archivos PHP parseados, tres fixtures/7 páginas, 221 comprobaciones estáticas y runtime completo con video propio, resolución de activo, revisión 2 y URL publicada simulada; `git diff --check` correcto.
- Checkpoints WordPress: `45171dc feat(canvas): resolve assets and publish pages` y `b5f6dde chore(plugin): bump Canvas asset version`.
- Despliegue: 22 archivos transferidos y verificados; versión de assets `0.1.1-dev` para invalidar caché. Home, JavaScript del editor y logo respondieron HTTP 200. Falta únicamente que Cristóbal ejecute el primer `Publicar/actualizar página` con su sesión autenticada para validar el permalink real.

## 2026-08-03 — Corrección del flujo real de publicación Canvas

- La prueba autenticada de Cristóbal confirmó que el botón no había creado ninguna página. La API pública de WordPress mostró solamente las tres páginas existentes (Inicio, Preguntas frecuentes y Contacto), por lo que el fallo no se dio por cerrado mediante la simulación local.
- Se reemplazaron las dos peticiones sucesivas —guardar y después publicar— por una operación de servidor única: valida `projectData`, HTML y CSS, guarda la revisión y sólo entonces crea o actualiza la página vinculada por ID estable. La respuesta incluye revisión, fecha y permalink.
- El cliente bloquea el botón mientras procesa, muestra el estado en una franja visible, abre automáticamente la página resultante y presenta un error explícito si WordPress rechaza alguna fase.
- La primera ejecución diagnosticó el motivo exacto del rechazo: el HTML importado conservaba `<base>` y `<meta>`, elementos de cabecera que no deben formar parte del contenido de una página. No se relajó la seguridad del saneador; la serialización ahora analiza la salida y conserva exclusivamente `body.innerHTML`.
- La prueba de navegador incorpora deliberadamente `<base>` y `<meta>` y exige su eliminación. Verificaciones finales: 13 PHP parseados, tres fixtures/7 páginas, 221 comprobaciones estáticas, runtime con `headTagsStripped: true`, revisión 2, estilos, grid, conducta, video y permalink simulados; `git diff --check` correcto.
- Checkpoints WordPress: `b553b07 fix(canvas): publish saved page atomically` y `7d3ae3c fix(canvas): publish body markup only`.
- Se desplegaron y verificaron por FTPS los 22 archivos del plugin. La versión remota `0.1.3-dev` contiene tanto la publicación atómica como el serializador de cuerpo; falta repetir un único clic autenticado para comprobar el permalink real.

## 2026-08-03 — Metadatos desplazados y autoguardado Canvas

- El primer reintento remoto con la versión nueva mostró que GrapesJS había conservado `<base>` y `<meta>` dentro de su propio `<body>`; extraer `body.innerHTML` no bastaba. Se eliminaron explícitamente `base`, `meta`, `link` y `title` en el cliente y se añadió la misma normalización defensiva en el servidor antes del saneamiento.
- La defensa del servidor permite que una pestaña ya abierta publique sin depender de actualizar el JavaScript. No se habilitaron metadatos de cabecera como contenido de página.
- Cristóbal detectó además que actualizar el editor borraba una importación todavía no guardada. La carga HTML/CSS ahora crea inmediatamente una revisión persistida y los cambios posteriores se autoguardan con un debounce de 1,2 segundos; el botón Guardar permanece como checkpoint manual explícito.
- La prueba de navegador reproduce metadatos dentro de `<body>`, exige `headTagsStripped: true` y confirma que la importación autoguardada avanza a revisión 3. Las 221 comprobaciones estáticas, runtime completo y `git diff --check` aprobaron.
- Checkpoints WordPress: `46f714b fix(canvas): strip misplaced document metadata` y `72026b3 fix(canvas): autosave imported and edited content`.
- Despliegue verificado: 22 archivos, versión remota `0.1.5-dev`; el JavaScript servido contiene saneamiento explícito y autoguardado.

## 2026-08-03 — Falso positivo en propiedades CSS `*-behavior`

- El siguiente intento remoto fue rechazado con `El CSS no admite behavior:`. La causa era una búsqueda por subcadena que confundía la propiedad heredada y peligrosa `behavior:` con propiedades modernas legítimas como `scroll-behavior` y `transition-behavior` presentes en el diseño.
- El saneador ahora bloquea `behavior:` sólo cuando es el nombre completo de una declaración CSS, delimitada por el inicio, `{` o `;`; las propiedades con prefijo permanecen admitidas.
- Verificaciones: 13 PHP, tres fixtures/7 páginas, 221 comprobaciones estáticas, runtime de navegador completo y `git diff --check` correctos.
- Checkpoint WordPress `ac090f7 fix(canvas): allow modern behavior CSS properties`; versión `0.1.6-dev` desplegada por FTPS con 22 archivos verificados.

## 2026-08-03 — Header bajo WordPress y video de fondo bloqueado

- La primera página Canvas real quedó publicada como `pagina-open-codesign-canvas` (ID 23). La inspección remota confirmó que `.nav` usa `position: fixed; top: 0`, por lo que una sesión autenticada la ubicaba debajo de la barra administrativa.
- El runtime público ahora mide `#wpadminbar` y compensa únicamente los elementos fijos del Canvas cuyo `top` efectivo es cero. La prueba de navegador confirma `publicHeaderTop: 32px`; el valor se recalcula al cambiar el tamaño para admitir la barra móvil.
- El video final `Simular-drone.mp4` responde HTTP 200 como `video/mp4`, pero el HTML había perdido `muted`; el navegador bloqueaba su `autoplay`. El runtime aplica `muted`, `defaultMuted`, `playsinline` y solicita `play()` de forma segura. La serialización futura conserva además esos atributos en todo `video[autoplay]`.
- Verificaciones: 222 comprobaciones estáticas, runtime completo con `publicVideoMuted: true`, compensación de header, estructura, estilos, autoguardado y publicación; `git diff --check` correcto.
- Checkpoint WordPress `5e5a36a fix(canvas): offset admin header and start background video`.
- El primer despliegue `0.1.7-dev` sufrió un corte transitorio FTPS y no se aceptó como completo. El reintento transfirió y verificó los 22 archivos (`DEPLOY_OK`). La página pública sirve `ocd-canvas-public.js?ver=0.1.7-dev` con ambas correcciones.

## 2026-08-03 — Color SVG, panel lateral unificado y sonido ambiental

- El logotipo importado no es un SVG inline sino una imagen externa `<img src="Logo.svg">`; por eso una propiedad CSS `fill` aplicada directamente a la imagen no podía cambiar su color. El inspector ahora ofrece `fill` y `stroke` para SVG inline y, para SVG externos, un tratamiento por máscara CSS con color claro y color oscuro.
- La variante oscura responde tanto a `.dark` y `[data-theme="dark"]` como a `prefers-color-scheme: dark`. La implementación conserva el activo SVG original y permite aplicar la personalización a una clase reutilizable.
- Durante la prueba se encontró y corrigió una carrera del autoguardado: si ya había una escritura en curso, el cambio nuevo podía quedar sin persistir. La cola espera la operación activa y guarda después el estado más reciente.
- Los dos paneles laterales que se comprimían mutuamente se reorganizaron como pestañas del mismo ancho: `Estructura y componentes` e `Inspector Open CoDesign`. La pestaña elegida se recuerda localmente y GrapesJS recalcula el lienzo al cambiarla.
- La conexión actual con Open CoDesign Desktop sigue siendo un intercambio explícito: Desktop exporta HTML/CSS/activos y Canvas los importa, persiste y publica. Todavía no existe sincronización viva, exportación inversa a Desktop ni servidor MCP. El importador admite HTML/CSS renderizado de múltiples fuentes, pero no ejecuta JavaScript arbitrario ni interpreta JSX/React sin renderizar.
- El navegador permite reproducir automáticamente el video de fondo sólo silenciado. El runtime mantiene `muted`, `defaultMuted` y `playsinline` para iniciar la reproducción, pero ahora añade un control accesible `Activar sonido`; el gesto del visitante habilita el audio ambiental sin reiniciar el video y permite volver a silenciarlo.
- Verificaciones: 13 PHP, tres fixtures/7 páginas, 225 comprobaciones estáticas y runtime completo con estilos computados, SVG adaptable, pestañas laterales, video silenciado al inicio y audio habilitado tras interacción.
- Checkpoints WordPress: `54a18ef feat(canvas): add adaptive SVG color controls`, `5d8d427 feat(canvas): merge side panels behind tabs` y `6f678db feat(canvas): let visitors enable background audio`.
- Despliegue verificado por FTPS: 22 archivos, versión remota `0.1.10-dev`. La página pública respondió HTTP 200 y confirmó tanto la versión como el control de sonido en el JavaScript servido.

## 2026-08-03 — Inspector SVG visible y eliminación de franja fantasma

- La prueba humana detectó que el control de color sólo aparecía al seleccionar exactamente el nodo `<img>` del logo. El inspector ahora localiza una imagen SVG externa dentro del elemento seleccionado, de modo que también funciona al seleccionar el contenedor del logotipo o un contenedor inmediato.
- El panel identifica explícitamente `Logotipo SVG detectado` y conserva los colores claro/oscuro y la aplicación reutilizable.
- El recuadro vacío que desplazaba el diseño dentro del editor provenía de la franja superior reservada por GrapesJS: se ocultaban sus paneles, pero el Canvas mantenía `--gjs-canvas-top`. En la pestaña del inspector ahora se colapsa a `0px`, se oculta el chrome nativo y el lienzo ocupa el alto completo. La página publicada no estaba afectada.
- Verificaciones: 225 comprobaciones estáticas y runtime real con detección del SVG desde su contenedor, `inspectorCanvasTop: 0px`, estilos, grid, publicación, video y sonido correctos.
- Checkpoint WordPress `2e237f1 fix(canvas): expose SVG controls and collapse editor chrome`; versión `0.1.11-dev` desplegada y verificada en el servidor.

## 2026-08-03 — Brand convierte logotipos SVG en vectores nativos

- La captura humana aclaró que la franja gris era el chrome nativo de GrapesJS y que el navegador recordaba la pestaña de componentes. El editor ahora abre siempre en `Inspector Open CoDesign`; GrapesJS sigue disponible mediante su pestaña, pero un estado local antiguo ya no puede ocultar Brand.
- Se reemplazó la recoloración por máscara. La sección permanente `Brand · logotipo vectorial` detecta el SVG externo del documento aunque no exista selección y ofrece convertirlo explícitamente.
- La conversión lee el SVG, rechaza o elimina contenido activo, materializa reglas geométricas necesarias, conserva `viewBox`, ID y clases, y sustituye `<img src="Logo.svg">` por un `<svg data-ocd-brand-logo="primary">` con sus trazados nativos.
- Los colores claro y oscuro se guardan como variables Brand y se aplican a las geometrías vectoriales. El saneador admite `fill-rule` y `clip-rule` para no deformar trazados al publicar. La implementación anterior de `mask-image` fue eliminada.
- No se requiere recargar el HTML: la migración opera sobre el documento Canvas ya persistido y luego entra en el autoguardado normal.
- Verificaciones: 225 comprobaciones estáticas y runtime completo con `brandVectorApplied: true`, ausencia de máscaras, inspector en `top: 0`, persistencia, publicación, video y audio correctos.
- Checkpoint WordPress `f2d9b8e feat(canvas): promote SVG logos to native Brand vectors`; versión `0.1.12-dev` desplegada por FTPS con 22 archivos verificados. El primer intento agotó el tiempo después de transferir los archivos; una segunda ejecución cerró formalmente con `DEPLOY_OK`.

## 2026-08-03 — Brand conserva el tamaño del SVG convertido

- La prueba humana mostró que sustituir `<img>` por un SVG inline eliminaba la regla de tamaño que dependía del selector de la imagen; el logotipo convertido podía quedar en `0 × 0 px` y exigía una corrección manual difícil.
- Antes de reemplazar el nodo, el conversor ahora captura el rectángulo y los estilos computados del `<img>` y transfiere ancho, alto y `display` al SVG nativo. La conversión conserva así la geometría visible aunque el CSS original estuviera dirigido al elemento imagen.
- El fixture de navegador incorpora un logo externo de `100 × 40 px` y exige que el vector Brand conserve esas dimensiones después de la conversión.
- Verificaciones WordPress: 13 PHP, tres fixtures/7 páginas, 225 comprobaciones estáticas y runtime completo con `brandVectorSizePreserved: true`.
- Checkpoint WordPress `e3185e7 fix(canvas): preserve SVG dimensions during Brand conversion`; versión `0.1.13-dev` desplegada y verificada por FTPS con 22 archivos.

## 2026-08-03 — Checklist de IA compartido por Crear y Editar

- Se integró el analizador multifuente del Modo Editar con el primer envío del flujo normal de Crear. El descriptor escrito por el usuario siempre entra como evidencia; archivos importados y URL HTTPS se suman como fuentes opcionales.
- Antes de la primera generación, la aplicación consulta el historial real y un `.codesign/edit-context.json` válido. Sólo los diseños nuevos sin contexto ni entrega previa abren el checklist; los turnos posteriores del chat conservan el envío inmediato.
- La revisión muestra valor detectado, confianza, autoridad, uso, evidencia y procedencia. El usuario puede usar lo detectado, reemplazarlo mediante JSON estructurado o dejarlo abierto para propuesta de la IA. Al confirmar el checklist, las propuestas aceptadas quedan registradas como decisiones confirmadas; los materiales privados mantienen su protección.
- Confirmar persiste primero el contexto schema v2 y sus fuentes mediante el IPC atómico, y sólo después invoca la generación. Los adjuntos que ya están en `references/` o `assets/` se reutilizan sin duplicarlos. Un fallo de análisis o disco impide generar; cancelar devuelve el descriptor al compositor y conserva los adjuntos.
- Se extrajo un listado de revisión reutilizable por la pestaña Editar y el nuevo diálogo Crear. La interfaz fue traducida en inglés, español, portugués y chino.
- Claude Code CLI con Opus y esfuerzo alto realizó la auditoría y dejó una extracción parcial; alcanzó su límite de sesión antes de conectar el flujo. Codex completó la integración, corrigió rutas relativas, estados, persistencia, pruebas y la semántica de confirmación.
- Verificaciones: typecheck Desktop e i18n correctos; 199 pruebas Desktop y 15 pruebas i18n; build de producción y `git diff --check` correctos.
- Pendiente de prueba humana: ejecutar el análisis con el proveedor configurado en la instalación real y evaluar calidad/latencia del checklist. La selección de un modelo con visión según capacidades todavía no está automatizada; se usa el proveedor y modelo activo sin claves ni modelos hardcodeados.
- Checkpoints Desktop: `26da0d5 feat(edit-mode): integrate AI multisource review flow` y `41bad83 feat(create): review evidence before first generation`.
- Se generó el instalador x64 `apps/desktop/release/open-codesign-0.2.1-x64-setup.exe` (SHA-256 `1C4D49806526A32E36A6E60234D306398467DE97A7112677926307D5B084798D`). Para evitar alterar aún la instalación estable, se abrió y verificó `release/win-unpacked/Open CoDesign.exe`: cinco procesos respondieron y `main.log` registró un arranque limpio usando el perfil compartido.
- Se crearon accesos personales `Open CoDesign - Desarrollo` en Inicio y Escritorio. El acceso estable existente conserva `C:\Program Files\Open CoDesign`; el lanzador de desarrollo elimina `ELECTRON_RUN_AS_NODE` y abre exclusivamente el build empaquetado del fork.
- El push reglamentario ejecutó con éxito todos los typechecks del monorepo, pero el hook volvió a detenerse en el lint global por los archivos no rastreados y preexistentes `scripts/stage2-edittab.mjs` y `scripts/stage2-register.mjs`. No se omitió el hook remoto y esos archivos no fueron modificados.

## 2026-08-03 — Estados Entrada/Scroll del encabezado Canvas

- El comportamiento declarativo `scroll-threshold` ya existente se convirtió en una capacidad editable del inspector. Al seleccionar un `header` o `nav`, el usuario puede activar el comportamiento, alternar la previsualización `Entrada` / `Con scroll` y definir el umbral en píxeles.
- Cada estado admite fondo, texto y enlaces, logo SVG, alto mínimo, padding, sombra, desenfoque y duración de transición. El resto de las propiedades del inspector también respeta el estado seleccionado.
- Los cambios locales usan una identidad estable `data-ocd-header-id`; no se escriben sobre la clase global `.nav`. Un segundo encabezado no recibe accidentalmente los cambios del primero y un `<header>` sin clase `.nav` también funciona.
- La previsualización se fija sólo en el DOM del Canvas mediante `data-ocd-preview-scroll-state`; no se serializa, pero sobrevive a cambios de umbral, scroll y resize durante la edición. La página publicada decide el estado por el desplazamiento real.
- La revisión independiente detectó antes de publicar la pérdida de preview y el selector global; ambos problemas fueron corregidos. La segunda revisión terminó sin hallazgos.
- La prueba real de navegador cubre dos navs, un header sin `.nav`, aislamiento del estilo local, cambio de umbral, resize, guardado y recarga. `npm run check`, `npm run check:canvas-runtime`, ambos `node --check` y `git diff --check` aprobaron.
- Checkpoint WordPress: `a7c7dc3 feat(canvas): edit header entry and scroll states`.
- Despliegue FTPS verificado: 22 archivos (`DEPLOY_OK`), versión remota `0.1.14-dev`; la página Canvas respondió HTTP 200 con esa versión.

## 2026-08-03 — Decisión para ambiente sonoro y playlist

- Se acordó incorporar un módulo portable de ambiente sonoro para secuencias de pájaros, agua, viento u otros audios, en vez de depender de un único loop corto del video.
- La representación será HTML estándar con fuentes de audio y comportamiento declarativo allowlisted: playlist secuencial o aleatoria, continuidad entre pistas, transición suave y control accesible de sonido. No se guardará como JavaScript arbitrario ni como un bloque opaco.
- Las políticas de los navegadores bloquean cualquier reproducción audible automática, incluido audio puro, antes de una interacción. La experiencia prevista inicia el ambiente mediante un gesto natural o el control `Escuchar el entorno`, continúa automáticamente durante la visita y recuerda la preferencia de silencio del visitante.
- Pendiente de implementación: bloque Canvas, selección de audios desde Medios, editor de orden/loop/transición y runtime público compartido con el control de sonido del video.

## 2026-08-03 — Estados del encabezado accesibles sobre el lienzo

- La prueba humana mostró que Entrada/Scroll estaba mal ubicado: el inspector sólo lo hacía visible al seleccionar exactamente el nodo técnico `header` o `nav`. Ahora cualquier selección dentro del encabezado —incluidos logo, enlaces y contenedores internos— reconoce su ancestro y muestra el panel correspondiente.
- El propio objeto seleccionado incorpora un toolbar contextual: `⚑` activa o abre los estados; `E` previsualiza Entrada y `S` previsualiza Scroll. Los indicadores activos se muestran en color de acento y el inspector detallado sigue disponible para editar sus propiedades y el umbral.
- Los controles son transitorios del editor. Al abandonar el encabezado se restaura el toolbar original, no se serializan comandos ni atributos de interfaz en `project_data`, y el runtime recalcula inmediatamente el estado real correspondiente a la posición de scroll.
- La prueba de navegador cubre selección desde un hijo, aparición del toolbar, alternancia E/S, activación mediante pin, restauración del toolbar, ausencia de serialización, salida del preview y persistencia tras guardar/recargar.
- Verificaciones: 13 PHP, tres fixtures/7 páginas, 225 comprobaciones estáticas, ambos `node --check`, `git diff --check` y runtime real completo. Una revisión independiente detectó el recálculo pendiente al salir del header; fue corregido y cubierto por la prueba.
- Checkpoint WordPress: `2d567f2 feat(canvas): expose header states on canvas`.
- Despliegue FTPS verificado: 22 archivos (`DEPLOY_OK`), versión remota `0.1.15-dev`; la página Canvas respondió HTTP 200 y el JavaScript remoto confirmó los controles y la detección de ancestro.

## 2026-08-04 — Flujo incremental real de Crear y Editar en Desktop

- Se retomó el frente interno de Open CoDesign Desktop con un criterio de aceptación completo: proyecto existente → nuevos insumos → análisis IA delta → checklist intermedia → confirmación → edición localizada sobre el mismo workspace → preview. El mapa, el folleto y WordPress quedaron explícitamente fuera de esta entrega.
- Claude Code CLI con Sonnet realizó la auditoría y dos implementaciones acotadas. Codex revisó cada diff, corrigió atomicidad, nombres temporales, límites de IDs, clasificación de workspaces existentes, persistencia de gaps y semántica de propuestas antes de aceptar los checkpoints.
- `.codesign/edit-context.json` admite ahora rondas sucesivas. Los materiales y decisiones no mencionados se conservan; una definición nueva sustituye a la previa sólo si comparte su ID. La escritura usa temporal y backup recuperable, y un fallo revierte únicamente los archivos creados en la ronda actual.
- El compositor abre revisión en cada solicitud explícita no silenciosa. `create` exige objetivo, estructura, contenido, sistema visual, comportamiento, activos/placeholders y referentes; toda omisión del proveedor se materializa como pregunta abierta. `edit` recibe el contexto validado, devuelve sólo el delta y aplica la regla “silencio = preservar”.
- Un workspace vinculado que ya contiene una fuente se reconoce como edición aunque aún no tenga chat ni contexto. Después de confirmar, el store persiste sobre el mismo `designId` y reanuda `sendPrompt` sin crear otro diseño. El agente conserva su regla de inspeccionar el source existente y editarlo localmente.
- Las propuestas o autoridades desconocidas que el usuario no confirma quedan `open`; ya no se convierten por omisión en decisiones confirmadas. Los gaps del análisis se guardan también como decisiones abiertas para que el agente pueda proponer una solución o usar placeholders.
- Checkpoints Desktop: `b0cac54 feat(edit-mode): accumulate reviewed evidence rounds` y `cd3d241 feat(edit-mode): review creation and edit deltas`.
- Verificación amplia: Shared 231/231, Core 455/455 y Desktop 1.424/1.424. Un test de temporización falló una vez bajo carga paralela y aprobó aislado y en la repetición completa. Typecheck de Shared/Core/Desktop, Biome focalizado, lint del hook y build de producción aprobaron.
- Se generó un instalador separado de la versión estable en `apps/desktop/release-edit-mode-cd3d241/open-codesign-0.2.1-x64-setup.exe`, 95.408.207 bytes, SHA-256 `353DE254F034DB26F39792931248B504A16A6AFC54728CBFEBBA77E2FBF14FA6`. Es un build local sin firma digital y no fue instalado.
- El ejecutable desempaquetado pasó el smoke de arranque con perfil aislado: cuatro procesos Electron permanecieron activos. Para la prueba se anuló sólo en el proceso hijo la variable de esta terminal `ELECTRON_RUN_AS_NODE=1`; desde un acceso directo normal esa variable no existe.
- Pendiente de prueba humana: abrir el build con la configuración real del proveedor, vincular una copia de un proyecto existente, pedir una modificación pequeña con un nuevo insumo, revisar el checklist delta y evaluar calidad/latencia de la IA. No se hardcodearon claves ni modelos.
