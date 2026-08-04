import type { EditContext, EditContextDefinition, EditContextMaterial } from '@open-codesign/core';
import type { EditAnalysisSourceInput, LocalInputFile } from '@open-codesign/shared';

export const MAX_EDIT_SOURCES = 20;
export const MAX_EDIT_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_EDIT_SOURCE_TEXT_CHARS = 120_000;

export type EditSourceFileKind = 'image' | 'document' | 'asset' | 'workspace';

export type EditSource =
  | {
      kind: EditSourceFileKind;
      id: string;
      label: string;
      mediaType: string;
      file: LocalInputFile;
      previewUrl: string | null;
    }
  | { kind: 'text'; id: string; label: string; text: string }
  | { kind: 'url'; id: string; label: string; url: string };

export interface EditDecision {
  resolution: 'preserve' | 'replace' | 'open';
  override: string;
}

const IMAGE_MEDIA_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

const DOCUMENT_MEDIA_TYPES = new Map([
  ['.css', 'text/css'],
  ['.csv', 'text/csv'],
  ['.html', 'text/html'],
  ['.json', 'application/json'],
  ['.md', 'text/markdown'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain'],
  ['.xml', 'application/xml'],
  ['.yaml', 'application/yaml'],
  ['.yml', 'application/yaml'],
]);

export const SUPPORTED_EDIT_SOURCE_EXTENSIONS = [
  ...IMAGE_MEDIA_TYPES.keys(),
  ...DOCUMENT_MEDIA_TYPES.keys(),
].sort();

export type EditSourceClassification =
  | { ok: true; kind: 'image' | 'document'; mediaType: string }
  | { ok: false; error: string };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function classifyEditSourceFile(file: LocalInputFile): EditSourceClassification {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: `"${file.name}" is empty.` };
  }
  if (file.size > MAX_EDIT_SOURCE_BYTES) {
    return { ok: false, error: `"${file.name}" exceeds the 20 MB limit.` };
  }
  const extension = extensionOf(file.name);
  const imageMediaType = IMAGE_MEDIA_TYPES.get(extension);
  if (imageMediaType !== undefined) return { ok: true, kind: 'image', mediaType: imageMediaType };
  const documentMediaType = DOCUMENT_MEDIA_TYPES.get(extension);
  if (documentMediaType !== undefined) {
    return { ok: true, kind: 'document', mediaType: documentMediaType };
  }
  return {
    ok: false,
    error: `"${file.name}" is not a supported source (${SUPPORTED_EDIT_SOURCE_EXTENSIONS.join(', ')}).`,
  };
}

export function normalizeEditSourceUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Enter a URL.' };
  if (trimmed.length > 4_096) return { ok: false, error: 'The URL is too long.' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Enter an absolute URL, for example https://example.com/page.' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'Only https:// URLs are accepted.' };
  return { ok: true, url: parsed.toString() };
}

/**
 * The user types a structured value, not a prompt. Objects pass through as the
 * variable value; any other JSON literal is wrapped so the stored shape stays a
 * record. Free text is rejected rather than reinterpreted.
 */
export function parseReplacementValue(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Enter a replacement value.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'The replacement must be valid JSON.' };
  }
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return { ok: true, value: parsed as Record<string, unknown> };
  }
  return { ok: true, value: { value: parsed } };
}

export function nextSourceId(taken: Iterable<string>): string {
  const used = new Set(taken);
  // MAX_EDIT_SOURCES limits one analysis batch, not the lifetime of a
  // workspace. Later review rounds may already have many persisted ids.
  for (let index = 1; index <= 10_000; index += 1) {
    const id = `source-${index}`;
    if (!used.has(id)) return id;
  }
  throw new Error('No free edit source id');
}

export function toAnalysisSources(sources: EditSource[]): EditAnalysisSourceInput[] {
  return sources.map((source) => {
    if (source.kind === 'text') {
      return { kind: 'text', id: source.id, label: source.label, text: source.text };
    }
    if (source.kind === 'url') {
      return { kind: 'url', id: source.id, label: source.label, url: source.url };
    }
    return { kind: source.kind, id: source.id, label: source.label, file: source.file };
  });
}

function materialType(source: EditSource): string {
  if (source.kind === 'text') return 'text/plain';
  if (source.kind === 'url') return 'application/json';
  return source.mediaType;
}

function materialLocator(source: EditSource): string {
  if (source.kind === 'text') return source.label;
  if (source.kind === 'url') return source.url;
  return source.file.name;
}

/**
 * Materials mirror the submitted sources 1:1 and carry a placeholder path until
 * the main process reports where each source landed in the workspace.
 */
export function toEditMaterials(sources: EditSource[]): EditContextMaterial[] {
  return sources.map((source) => ({
    id: source.id,
    path: `pending/${source.id}`,
    type: materialType(source),
    role: source.kind,
    kind: source.kind,
    locator: materialLocator(source),
    description: source.label,
  }));
}

export function buildEditContextV2(
  sources: EditSource[],
  detected: EditContextDefinition[],
  decisions: Record<string, EditDecision | undefined>,
): { ok: true; editContext: EditContext } | { ok: false; error: string } {
  if (sources.length === 0) return { ok: false, error: 'Add at least one source.' };
  const active: string[] = [];
  const open: string[] = [];
  const resolved: EditContextDefinition[] = [];

  for (const definition of detected) {
    // An untouched finding is preserved; only an explicit action changes that.
    const decision = decisions[definition.id] ?? { resolution: 'preserve', override: '' };
    if (decision.resolution === 'open') {
      open.push(definition.id);
      resolved.push({ ...definition, resolution: 'open' });
      continue;
    }
    active.push(definition.id);
    if (decision.resolution === 'preserve') {
      resolved.push({
        ...definition,
        resolution: 'preserve',
        authority:
          definition.authority === 'proposal' || definition.authority === 'unknown'
            ? 'confirmed'
            : definition.authority,
        usage: definition.usage === 'confirm-before-use' ? 'approved' : definition.usage,
        provenance: [
          ...(definition.provenance ?? []),
          { materialId: 'user', excerpt: 'Confirmed in the design decision checklist' },
        ],
      });
      continue;
    }
    const replacement = parseReplacementValue(decision.override);
    if (!replacement.ok) {
      return { ok: false, error: `${definition.label}: ${replacement.error}` };
    }
    resolved.push({
      ...definition,
      resolution: 'replace',
      overrideValue: replacement.value,
      authority:
        definition.authority === 'proposal' || definition.authority === 'unknown'
          ? 'confirmed'
          : definition.authority,
      usage: definition.usage === 'confirm-before-use' ? 'approved' : definition.usage,
      provenance: [
        ...(definition.provenance ?? []),
        { materialId: 'user', excerpt: 'Replacement value supplied by the user' },
      ],
    });
  }

  return {
    ok: true,
    editContext: {
      schemaVersion: 2,
      materials: toEditMaterials(sources),
      detected: resolved,
      active,
      open,
      generatedAt: new Date().toISOString(),
    },
  };
}
