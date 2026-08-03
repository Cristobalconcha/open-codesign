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
