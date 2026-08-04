# Flujo incremental de creación y edición

## Objetivo verificable

Conseguir un recorrido completo en Open CoDesign Desktop:

1. abrir o seleccionar un proyecto existente;
2. incorporar uno o más insumos nuevos en momentos sucesivos;
3. analizar con IA solamente las decisiones afectadas;
4. presentar una checklist intermedia con semántica `preserve`, `replace` u `open`;
5. confirmar las decisiones;
6. aplicar una modificación localizada sobre el mismo workspace;
7. mantener una vista previa verificable, sin reconstruir el proyecto como uno nuevo.

El flujo de creación debe usar la misma revisión, pero como checklist inicial completa antes de la primera generación.

## Restricciones

- No desarrollar ahora el mapa, WordPress ni el folleto.
- No crear una segunda aplicación ni un prototipo aislado.
- No añadir dependencias ni SQLite.
- Preservar los cambios no relacionados que ya existen en el worktree.
- Mantener la configuración de proveedores y claves del usuario.
- Usar checkpoints pequeños, pruebas focalizadas y registrar avances en `OCD_vault/bitacora.md`.

## Entregas incrementales

- [x] Auditar el flujo real y fijar el contrato de aceptación.
- [x] Hacer que el contexto admita incorporaciones sucesivas y actualización atómica.
- [x] Permitir elegir y conservar como destino el workspace existente.
- [x] Integrar la checklist delta antes de una edición con IA.
- [x] Entregar la tarea confirmada al agente sobre el proyecto existente.
- [ ] Verificar persistencia, reapertura, preview y regresiones de Crear.
- [ ] Crear commits de checkpoint, actualizar bitácora y realizar el push de la sesión.

## Política de revisión

Claude Code implementa tareas acotadas. Codex revisa cada diff, corrige los defectos, ejecuta las pruebas y sólo da por completada una entrega cuando cumple su criterio observable.
