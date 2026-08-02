import type { EditContext, EditContextDefinition, EditContextMaterial } from './index.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function parseMaterial(value: unknown): EditContextMaterial | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value['path']) ||
    !nonEmptyString(value['type']) ||
    !nonEmptyString(value['role'])
  )
    return null;
  if (value['description'] !== undefined && typeof value['description'] !== 'string') return null;
  if (value['id'] !== undefined && !nonEmptyString(value['id'])) return null;
  const kind = value['kind'];
  if (
    kind !== undefined &&
    kind !== 'image' &&
    kind !== 'document' &&
    kind !== 'text' &&
    kind !== 'url' &&
    kind !== 'asset' &&
    kind !== 'workspace'
  )
    return null;
  if (value['locator'] !== undefined && typeof value['locator'] !== 'string') return null;
  return {
    ...(typeof value['id'] === 'string' ? { id: value['id'] } : {}),
    path: value['path'],
    type: value['type'],
    role: value['role'],
    ...(kind !== undefined ? { kind } : {}),
    ...(typeof value['locator'] === 'string' ? { locator: value['locator'] } : {}),
    ...(typeof value['description'] === 'string' ? { description: value['description'] } : {}),
  };
}

function parseDefinition(value: unknown): EditContextDefinition | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value['id']) ||
    !nonEmptyString(value['category']) ||
    !nonEmptyString(value['label']) ||
    !isRecord(value['value']) ||
    !nonEmptyString(value['source'])
  )
    return null;
  const confidence = value['confidence'];
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') return null;
  if (value['evidence'] !== undefined && typeof value['evidence'] !== 'string') return null;
  if (value['detectedValue'] !== undefined && !isRecord(value['detectedValue'])) return null;
  if (value['overrideValue'] !== undefined && !isRecord(value['overrideValue'])) return null;
  const resolution = value['resolution'];
  if (
    resolution !== undefined &&
    resolution !== 'preserve' &&
    resolution !== 'replace' &&
    resolution !== 'open'
  )
    return null;
  const authority = value['authority'];
  if (
    authority !== undefined &&
    authority !== 'confirmed' &&
    authority !== 'proposal' &&
    authority !== 'inferred' &&
    authority !== 'fact' &&
    authority !== 'restriction' &&
    authority !== 'unknown'
  )
    return null;
  const usage = value['usage'];
  if (
    usage !== undefined &&
    usage !== 'approved' &&
    usage !== 'confirm-before-use' &&
    usage !== 'private'
  )
    return null;
  if (
    value['appliesTo'] !== undefined &&
    (!Array.isArray(value['appliesTo']) || !value['appliesTo'].every(nonEmptyString))
  )
    return null;
  const provenance = value['provenance'];
  if (
    provenance !== undefined &&
    (!Array.isArray(provenance) ||
      provenance.length === 0 ||
      provenance.some(
        (item) =>
          !isRecord(item) ||
          !nonEmptyString(item['materialId']) ||
          (item['locator'] !== undefined && typeof item['locator'] !== 'string') ||
          (item['excerpt'] !== undefined && typeof item['excerpt'] !== 'string'),
      ))
  )
    return null;
  return {
    id: value['id'],
    category: value['category'],
    label: value['label'],
    value: value['value'],
    ...(isRecord(value['detectedValue']) ? { detectedValue: value['detectedValue'] } : {}),
    ...(isRecord(value['overrideValue']) ? { overrideValue: value['overrideValue'] } : {}),
    ...(resolution !== undefined ? { resolution } : {}),
    ...(authority !== undefined ? { authority } : {}),
    ...(usage !== undefined ? { usage } : {}),
    confidence,
    source: value['source'],
    ...(typeof value['evidence'] === 'string' ? { evidence: value['evidence'] } : {}),
    ...(Array.isArray(provenance)
      ? {
          provenance: provenance.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              materialId: record['materialId'] as string,
              ...(typeof record['locator'] === 'string' ? { locator: record['locator'] } : {}),
              ...(typeof record['excerpt'] === 'string' ? { excerpt: record['excerpt'] } : {}),
            };
          }),
        }
      : {}),
    ...(Array.isArray(value['appliesTo'])
      ? { appliesTo: [...value['appliesTo']] as string[] }
      : {}),
  };
}

export function parseEditContext(value: unknown): EditContext | null {
  if (
    !isRecord(value) ||
    (value['schemaVersion'] !== 1 && value['schemaVersion'] !== 2) ||
    !Array.isArray(value['materials']) ||
    value['materials'].length === 0 ||
    !Array.isArray(value['detected']) ||
    !Array.isArray(value['active']) ||
    !Array.isArray(value['open'])
  )
    return null;
  const materials = value['materials'].map(parseMaterial);
  const detected = value['detected'].map(parseDefinition);
  if (
    materials.some((item) => item === null) ||
    detected.some((item) => item === null) ||
    !value['active'].every(nonEmptyString) ||
    !value['open'].every(nonEmptyString)
  )
    return null;
  const definitions = detected as EditContextDefinition[];
  const parsedMaterials = materials as EditContextMaterial[];
  const ids = definitions.map((definition) => definition.id);
  const active = value['active'] as string[];
  const open = value['open'] as string[];
  if (
    new Set(ids).size !== ids.length ||
    new Set(active).size !== active.length ||
    new Set(open).size !== open.length
  )
    return null;
  if (value['schemaVersion'] === 2) {
    const materialIds = parsedMaterials.map((material) => material.id);
    if (
      materialIds.some((id) => id === undefined) ||
      new Set(materialIds).size !== materialIds.length ||
      definitions.some((definition) => {
        if (
          definition.resolution === undefined ||
          definition.authority === undefined ||
          definition.usage === undefined ||
          definition.provenance === undefined
        )
          return true;
        if (
          definition.provenance.some(
            (item) => item.materialId !== 'user' && !materialIds.includes(item.materialId),
          )
        )
          return true;
        if (definition.resolution === 'open') return !open.includes(definition.id);
        if (!active.includes(definition.id)) return true;
        if (definition.resolution === 'replace' && definition.overrideValue === undefined)
          return true;
        if (definition.resolution === 'preserve' && definition.overrideValue !== undefined)
          return true;
        return false;
      })
    )
      return null;
  }
  const selected = new Set([...active, ...open]);
  if (
    selected.size !== ids.length ||
    ids.some((id) => !selected.has(id)) ||
    active.some((id) => open.includes(id))
  )
    return null;
  if (!nonEmptyString(value['generatedAt']) || Number.isNaN(Date.parse(value['generatedAt'])))
    return null;
  return {
    schemaVersion: value['schemaVersion'],
    materials: parsedMaterials,
    detected: definitions,
    active: [...active],
    open: [...open],
    generatedAt: value['generatedAt'],
  };
}
