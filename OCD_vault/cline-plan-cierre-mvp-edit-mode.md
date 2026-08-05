# Cline — Plan gradual para cerrar el MVP del Modo Editar

## Objetivo

Completar el MVP del Modo Editar sin alterar el comportamiento del Modo Crear y sin implementar todavía análisis visual real.

La regla funcional principal es:

- Detectado y seleccionado = restricción vinculante.
- Detectado y desmarcado = abierto.
- No detectado = abierto.
- Definición explícita del usuario = vinculante y de máxima prioridad.

## Instrucciones de arranque

Antes de actuar:

1. Leer `AGENTS.md` completo.
2. Leer en el vault `indice.md`, `pipeline-edit-mode.md`, `ui-edit-mode.md`, `hallazgos-arquitectura.md` y `decisiones.md`.
3. Confirmar que la rama activa sea `feature/edit-mode` y que el commit base siga siendo `42b55fb` o un descendiente suyo.
4. Revisar `git status` y preservar todos los cambios preexistentes.
5. No leer, imprimir ni registrar claves API.
6. No ejecutar `pnpm dev` contra el `userData` real de forma automática. Una instancia con `userData` temporal no tendrá proveedores, modelos ni sesiones configurados; sirve para pruebas locales y de interfaz sin IA, pero no demuestra integración real con los proveedores.
7. No implementar análisis visual real en esta tarea.

## Entorno de IA del usuario

La configuración habitual que debe preservarse conceptualmente es:

- DeepSeek para tareas generales, razonamiento operativo y construcción de interfaces/código.
- La suscripción de ChatGPT configurada en Open CoDesign para las capacidades de imagen que la aplicación exponga.

No asumir que una instancia nueva o un `userData` temporal contiene esta configuración. Tampoco asumir que generación de imágenes equivale a comprensión visual de imágenes: son capacidades diferentes y deben detectarse por separado.

Dividir las validaciones en tres niveles:

1. **Sin IA:** UI, estado, IPC, filesystem, esquema, prompt assembly y regresión del Modo Crear. Deben ejecutarse con fixtures y almacenamiento temporal, sin proveedores ni créditos.
2. **Configuración simulada:** pruebas automatizadas con metadatos falsos de proveedores/modelos y secretos simulados. Nunca copiar claves reales a fixtures, logs o snapshots.
3. **Proveedor real:** llamadas efectivas a DeepSeek o ChatGPT. Requieren autorización explícita del usuario, aviso de posible consumo y una estrategia que no altere proyectos o sesiones existentes. Si la instancia aislada no tiene configuración, reportar la prueba como pendiente; no declararla fallida ni improvisar credenciales.

Antes de una prueba real, presentar exactamente qué perfil se usará, qué datos puede modificar y cómo se aislará el workspace. No imprimir `config.toml`, `auth.json`, tokens ni claves.

## Forma de trabajo obligatoria

Trabajar una etapa por vez. Para cada etapa:

1. Inspeccionar el código relacionado.
2. Presentar un plan corto de la etapa.
3. Implementar únicamente esa etapa.
4. Añadir o actualizar pruebas.
5. Ejecutar las verificaciones enfocadas y el typecheck correspondiente.
6. Revisar `git diff --check` y el diff completo de los archivos tocados.
7. Informar resultados, errores y pendientes antes de comenzar la etapa siguiente.

No mezclar refactors, análisis visual real ni cambios ajenos al Modo Editar. No hacer commit ni push sin autorización explícita del usuario.

## Etapa 1 — Hacer visible la pestaña Editar

**Estado:** completada y verificada el 2026-08-02. La navegación incluye `edit`, los cuatro locales contienen `hub.tabs.edit`, existe una prueba de regresión para el orden de pestañas y pasan i18n, pruebas enfocadas, typecheck y `git diff --check`.

### Problema conocido

`HubView` puede montar `EditTab`, pero `TopBar` no incluye `edit` en `HUB_TABS`, por lo que el usuario no puede acceder normalmente a la pestaña.

### Trabajo

- Añadir `edit` a la navegación del Hub en una posición coherente.
- Añadir las claves de traducción necesarias en todos los idiomas soportados.
- Mantener intactas las pestañas existentes y su persistencia.
- Añadir pruebas que demuestren que la pestaña aparece, puede seleccionarse y monta `EditTab`.

### Criterios de aceptación

- La pestaña Editar es visible y seleccionable.
- No aparecen claves de i18n sin resolver.
- Las pruebas de navegación existentes siguen pasando.

## Etapa 2 — Crear un flujo IPC específico y atómico

**Estado final:** completada y verificada por Codex el 2026-08-02 después de reemplazar la implementación defectuosa. El proceso principal resuelve el workspace desde `designId`, reserva nombres con escritura exclusiva, actualiza `materials[0].path`, escribe `.codesign/edit-context.json` sin sobrescribir y revierte solamente los archivos nuevos ante fallo. Resultado: 5/5 pruebas específicas, 37/37 pruebas enfocadas, typecheck correcto, Biome enfocado limpio y `git diff --check` correcto.

**Revisión del 2026-08-02: no completada.** La segunda implementación de Cline tampoco es aceptable:

- `preload/index.ts` contiene un error de sintaxis (`;` donde corresponde `,`) y el typecheck falla.
- Biome enfocado únicamente en los cuatro archivos relacionados reporta 126 errores, 67 warnings y 59 infos; no son solo errores de `.obsidian`.
- `registerEditModeIpc` se importa en `main/index.ts`, pero nunca se invoca; el handler no queda registrado.
- El renderer envía `workspaceRoot`, permitiendo que una frontera no confiable elija la raíz. El proceso principal debe resolver el workspace a partir de `designId` en su store.
- `designId` se valida pero no se utiliza para comprobar la pertenencia del workspace.
- La escritura usa directamente `references/<basename>` y sobrescribe colisiones en vez de asignar un nombre único.
- Si sobrescribe un archivo preexistente y luego falla, el rollback lo elimina, causando pérdida de datos.
- No valida estructuralmente `EditContext`; solo comprueba que sea JSON.
- No existen pruebas nuevas para ruta, colisión, entrada inválida, rollback o correspondencia de `materials[].path`.

No avanzar a la Etapa 3 hasta corregir todos estos puntos y obtener verificaciones terminadas con exit code 0.

### Problema conocido

`EditTab` utiliza el importador genérico `importToWorkspace`. Para blobs con origen `composer`, ese importador siempre elige `references/` y aplica `basename`, de modo que `.codesign/edit-context.json` termina como `references/edit-context.json`.

### Trabajo

- Diseñar una operación IPC específica para iniciar un diseño en Modo Editar, o una operación workspace segura equivalente.
- La operación debe:
  - crear o recibir el diseño y su workspace;
  - copiar el material a `references/`;
  - escribir exactamente `.codesign/edit-context.json`;
  - devolver la ruta relativa final del material;
  - evitar estados parciales o limpiar correctamente si una escritura falla;
  - respetar las validaciones de rutas y límites del workspace.
- No debilitar el importador genérico ni permitir rutas arbitrarias aportadas por el renderer.

### Criterios de aceptación

- El archivo existe exactamente en `.codesign/edit-context.json`.
- El material existe en la ruta declarada en `materials[].path`.
- Las colisiones de nombres no rompen esa correspondencia.
- Un fallo no deja un diseño o workspace incoherente.
- Hay pruebas IPC para ruta correcta, colisión, entrada inválida y fallo parcial.

## Etapa 3 — Corregir serialización y validación de archivos

**Estado:** completada y verificada el 2026-08-02. La serialización binaria usa conversión por bloques, Unicode se conserva en el objeto estructurado, renderer y main aplican 10 MB, y ambos validan PNG/JPEG/WEBP con correspondencia MIME-extensión. El main rechaza además Base64 malformado.

### Problemas conocidos

- `String.fromCharCode(...new Uint8Array(buffer))` puede desbordar la pila con archivos grandes.
- La interfaz anuncia un máximo de 10 MB, pero no lo aplica.
- `btoa(editContextJson)` falla si el nombre o la descripción contienen caracteres Unicode.
- La constante `_encoder` está creada pero no se utiliza.

### Trabajo

- Usar una conversión Base64 segura para datos binarios y texto UTF-8.
- Aplicar realmente el límite de 10 MB tanto en selección como en drag-and-drop y, preferiblemente, volver a validarlo en el proceso principal.
- Aceptar únicamente los formatos definidos para el MVP: PNG, JPEG y WEBP, comprobando MIME y extensión de forma razonable.
- Mostrar errores claros y recuperables.

### Criterios de aceptación

- Funcionan nombres de archivo con tildes, eñes y otros caracteres Unicode.
- Un archivo mayor de 10 MB es rechazado antes de crear el diseño.
- Un MIME no permitido es rechazado.
- Una imagen cercana al límite se serializa sin `RangeError`.
- Hay pruebas unitarias para todos estos casos.

## Etapa 4 — Corregir el ciclo de vida de la UI

**Estado:** completada y verificada el 2026-08-02. Las object URLs se revocan al reemplazar, limpiar y desmontar; análisis y creación están interbloqueados; un fallo de IPC retira mediante soft-delete el diseño recién creado y conserva el error recuperable para reintento.

### Problemas conocidos

- Al seleccionar o soltar un reemplazo directamente no se revoca la URL temporal anterior.
- No están claramente protegidos todos los estados durante análisis y creación.
- Un fallo posterior a crear el diseño puede dejar al usuario dentro de un diseño incompleto.

### Trabajo

- Centralizar el reemplazo del archivo y revocar siempre la URL anterior.
- Revocar la URL al desmontar el componente.
- Evitar doble envío durante análisis o creación.
- Mantener selección, detecciones y errores en un estado coherente al reemplazar.
- Manejar explícitamente los fallos del nuevo flujo IPC.

### Criterios de aceptación

- Seleccionar, reemplazar, soltar y limpiar funcionan repetidamente.
- No quedan object URLs activas después de reemplazo o desmontaje.
- Los botones no permiten operaciones concurrentes incompatibles.
- Los errores dejan la UI lista para reintentar.

## Etapa 5 — Validar el contrato de `edit-context.json`

**Estado:** completada y verificada el 2026-08-02. Existe un parser compartido entre IPC y lector de prompt que valida esquema, IDs únicos, partición exacta active/open, campos de definiciones y timestamp. Los contextos inválidos no ingresan al prompt.

### Trabajo

- Confirmar o introducir una validación de esquema compartida para `EditContext`.
- Conservar en el JSON:
  - `schemaVersion`;
  - `materials`;
  - todas las definiciones `detected`;
  - `id`, `category`, `label`, `value`, `confidence`, `source` y `evidence`;
  - listas `active` y `open` sin solapamientos;
  - `generatedAt`.
- Rechazar IDs duplicados, IDs desconocidos en `active/open` y datos mal formados.
- Mantener el contenido derivado del análisis como datos estructurados; no convertir texto libre del analizador en instrucciones confiables.

### Criterios de aceptación

- Toda definición detectada pertenece exactamente a `active` o `open`.
- Desmarcar una definición la mueve a `open` sin perder `confidence` ni `evidence`.
- El lector de prompt ignora o reporta contextos inválidos de forma segura.
- Existen pruebas de esquema, lectura y formateo del system prompt.

## Etapa 6 — Probar la integración completa sin IA

**Estado:** completada y verificada el 2026-08-02 con pruebas automatizadas y un smoke de Electron usando `userData` temporal. Se cubren carga, reemplazo por selector y drag-and-drop, análisis simulado, diez definiciones, active/open, creación, disco, apertura del workspace, prompt confiable y regresión de Modo Crear. No se llamó a proveedores.

### Casos obligatorios

1. Abrir el Hub y entrar en Editar.
2. Cargar una imagen válida.
3. Reemplazarla mediante selector y drag-and-drop.
4. Ejecutar el análisis simulado.
5. Confirmar que las diez definiciones aparecen seleccionadas.
6. Desmarcar varias y comprobar `active/open`.
7. Crear el workspace.
8. Comprobar el material y `.codesign/edit-context.json` en disco.
9. Abrir normalmente el workspace creado.
10. Preparar el contexto de prompt y comprobar que las restricciones activas aparecen como instrucciones confiables, sin `<untrusted_scanned_content>`.
11. Crear un diseño mediante Modo Crear y comprobar que su comportamiento no cambia y que no aparece contexto de edición.

Usar fixtures y un `userData` temporal. Estas pruebas no deben llamar a proveedores ni consumir créditos.

La ausencia de proveedores en ese perfil temporal es el comportamiento esperado, no un error del Modo Editar.

## Etapa 7 — Limpieza de integración del repositorio

**Estado:** completada y verificada el 2026-08-02. El vault y `.clinerules` permanecen locales por decisión del usuario; Biome no inspecciona el estado interno local en la entrega versionada. Pasaron build, typecheck, lint, suite completa y `git diff --check`; los checkpoints fueron enviados a `origin/feature/edit-mode`.

### Trabajo

- Evitar que `pnpm lint` analice el estado interno de `OCD_vault/.obsidian`, sin ocultar archivos fuente reales del proyecto.
- Decidir con el usuario si `OCD_vault/` y `.clinerules` deben versionarse o permanecer locales antes de modificar `.gitignore` o añadirlos al índice.
- Ejecutar:
  - pruebas enfocadas;
  - typecheck de los paquetes afectados;
  - `pnpm lint`;
  - `pnpm test`;
  - `git diff --check`.
- Si vuelve a fallar `generate.workspace-rename.test.ts` por su espera de 20 ms, repetirla aisladamente y reportarla como intermitente; no mezclar una reparación no relacionada sin autorización.

## Pruebas dependientes de proveedor — ejecutar aparte y con autorización

Separar claramente estas pruebas. No son necesarias para cerrar el flujo local sin IA y no deben ejecutarse automáticamente:

- Análisis visual real de wireframes o mockups.
- Selección automática de un modelo con visión.
- Compatibilidad real de DeepSeek con imágenes.
- Llamadas a OpenAI u otros proveedores.
- Generación de imágenes.
- Ejecución completa del agente contra un proveedor real.

Para estas pruebas, comprobar primero mediante las APIs de configuración de la aplicación —sin mostrar secretos— qué proveedores, modelos y capacidades están realmente disponibles. Si se decide usar el perfil existente, crear un diseño/workspace de prueba claramente identificable y no tocar sesiones previas. Si no existe un mecanismo seguro para aislar la prueba conservando la autenticación, detenerse y solicitar una decisión al usuario.

## Resultado esperado al finalizar

Entregar un informe con cuatro secciones:

1. Implementado.
2. Pruebas sin IA ejecutadas y resultados.
3. Pruebas dependientes de proveedor todavía pendientes.
4. Riesgos o decisiones que requieren aprobación del usuario.

Actualizar las notas pertinentes del vault después de cada etapa, pero no marcar el MVP como cerrado hasta que las etapas 1 a 7 estén verificadas.
