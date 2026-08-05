# UI del Modo Editar

## Archivos

### `apps/desktop/src/renderer/src/views/hub/EditTab.tsx`

Componente principal del Modo Editar, ahora multifuente y con análisis real por IA.

#### Estados

1. **Reunir fuentes** — «Add files» y «Add project file» usan `window.codesign.pickInputFiles()`
   (rutas reales del proceso principal); drag-and-drop acepta archivos que traen ruta local y crea
   una object URL sólo para las imágenes; además se pueden añadir texto pegado y URLs `https`.
2. **Análisis** — `window.codesign.editMode.analyze({ analysisId, model, sources })` con el modelo
   activo (`config.provider` + `config.modelPrimary` vía `isReadyConfig`). No hay lista fija de
   definiciones: los hallazgos los produce la IA y llegan validados por `parseDesignAnalysis`.
3. **Revisión** — cada variable muestra label, categoría, valor estructurado, autoridad, permiso de
   uso, confianza, evidencia y procedencia. Decisión por variable: `preserve`, `replace` u `open`.
   No tocar una variable equivale a `preserve`. `replace` exige JSON válido y añade una procedencia
   `materialId: 'user'`. Autoridad y uso nunca se reescriben.
4. **Creación** — `createNewDesign(null)` y luego
   `window.codesign.editMode.initWorkspaceSources({ designId, sources, editContext })` (IPC v2).
   Fallo ⇒ soft-delete del diseño recién creado y error recuperable en la UI.

### `apps/desktop/src/renderer/src/lib/edit-sources.ts`

Helpers puros y testeables: clasificación de archivos (imagen/documento, límite 20 MB), URL sólo
`https`, `parseReplacementValue` (JSON validable; el texto libre se rechaza, no se reinterpreta),
`toAnalysisSources`, `toEditMaterials` y `buildEditContextV2`.

`materials` corresponde 1:1 con las fuentes enviadas y conserva `id`/`kind` con `path` de marcador
`pending/<id>` hasta que el proceso principal resuelve la ruta real.

## Cómo probar

1. `pnpm dev` en open-codesign.
2. Hub → pestaña «Edit».
3. Añadir varias fuentes (archivos, texto, URL) y pulsar «Analyze sources».
4. Revisar la checklist y elegir `preserve`/`replace`/`open` por variable.
5. «Start Designing (N constraints)» crea el workspace con `.codesign/edit-context.json` v2.

La checklist también permite agregar una **definición especial** manual con
categoría, nombre e instrucción. Se serializa como una variable estructurada
con procedencia `user`, en vez de atribuirla al análisis de IA, y participa de
las mismas decisiones y persistencia incremental que los hallazgos detectados.

## Pruebas

- `apps/desktop/src/renderer/src/lib/edit-sources.test.ts`
- `apps/desktop/src/renderer/src/views/hub/EditTab.test.tsx`
- `apps/desktop/src/main/edit-mode-ipc.test.ts` (incluye un test de contrato que valida en el
  proceso principal un `EditContext` construido por el renderer)

## Limitaciones actuales

- El análisis multimodal depende de la capacidad del modelo activo; no hay enrutado por capacidad.
- En Electron 39 un archivo soltado suele no exponer `File.path`; en ese caso la UI pide usar
  «Add files». Las miniaturas sólo existen para imágenes soltadas con ruta.
- El flujo v1 (`initWorkspace`, una sola imagen) sigue disponible en preload/IPC pero el renderer ya
  no lo usa; `validateEditReferenceFile` queda asociado a ese camino.
- No se genera `DESIGN.md` automáticamente.
