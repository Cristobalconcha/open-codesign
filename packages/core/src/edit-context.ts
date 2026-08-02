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
  return {
    path: value['path'],
    type: value['type'],
    role: value['role'],
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
  return {
    id: value['id'],
    category: value['category'],
    label: value['label'],
    value: value['value'],
    confidence,
    source: value['source'],
    ...(typeof value['evidence'] === 'string' ? { evidence: value['evidence'] } : {}),
  };
}

export function parseEditContext(value: unknown): EditContext | null {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
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
  const ids = definitions.map((definition) => definition.id);
  const active = value['active'] as string[];
  const open = value['open'] as string[];
  if (
    new Set(ids).size !== ids.length ||
    new Set(active).size !== active.length ||
    new Set(open).size !== open.length
  )
    return null;
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
    schemaVersion: 1,
    materials: materials as EditContextMaterial[],
    detected: definitions,
    active: [...active],
    open: [...open],
    generatedAt: value['generatedAt'],
  };
}
