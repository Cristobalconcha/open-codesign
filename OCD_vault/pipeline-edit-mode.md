# Pipeline del Modo Editar

Commit: `42b55fb` feat(edit-mode): add trusted edit constraints pipeline

## Archivos modificados

### 1. `packages/core/src/index.ts` (+46 líneas)

Nuevos tipos exportados:

```typescript
interface EditContextMaterial { path, type, role, description }
interface EditContextDefinition { id, category, label, value, confidence, source, evidence }
interface EditContext { schemaVersion, materials, detected[], active[], open[], generatedAt }
```

Campo `editContext?: EditContext` añadido a `ProjectContext`.

### 2. `packages/core/src/lib/context-format.ts` (+79 líneas)

Nueva función `formatEditConstraintsContext(editContext: EditContext): string | null`

**CRÍTICO**: Genera constraints vinculantes como texto directo del system prompt, SIN wrapper `<untrusted_scanned_content>`. A diferencia de `formatProjectDesignSystemContext()` que SÍ usa `<untrusted_scanned_content>`.

Reglas implementadas:
- `active=true` → vinculante (conservar)
- `active=false` → abierto
- `source: "manual-override"` → máxima prioridad
- No detectado → abierto implícitamente

### 3. `packages/core/src/agent.ts` (+8 líneas)

- `editContextSection(context)`: convierte editContext en sección del system prompt
- Integrado en `augmentedSystemPrompt` (línea 1253): `...editContextSection(input.projectContext)`
- Si `editContext` es undefined → retorna `[]` → cero impacto en modo Crear

### 4. `apps/desktop/src/main/prompt-context.ts` (+27 líneas)

- `readEditContext(workspaceRoot)`: lee `.codesign/edit-context.json`, valida estructura
- `readProjectContext()` extendido: incluye `editContext` en el `Promise.all`

## Flujo de datos

```
.codesign/edit-context.json
  → readEditContext() [prompt-context.ts]
    → ProjectContext.editContext
      → editContextSection() [agent.ts]
        → formatEditConstraintsContext() [context-format.ts]
          → texto vinculante en system prompt (sin untrusted)
```

## Sin impacto en modo Crear

- Si `.codesign/edit-context.json` no existe → `readEditContext()` retorna `undefined`
- `editContextSection(undefined)` → retorna `[]`
- El system prompt es idéntico al comportamiento actual



## Etapa 2 — IPC atómico (2026-08-02)

**Solución**: El problema era que `importToWorkspace` enruta todo a `references/`. La API ya tiene `files.write` que escribe directamente en el workspace root.

**Cambio en EditTab.tsx** (`handleCreate`):
- `importToWorkspace` → solo para la imagen wireframe (va a `references/`)
- `files.write` → para `.codesign/edit-context.json` (va al workspace root)

**Sin nuevo IPC**: Se reutiliza la API existente. `files.write` ya existe en el preload (línea 664).

**Verificaciones**: typecheck ✅, lint (solo .obsidian) ✅
