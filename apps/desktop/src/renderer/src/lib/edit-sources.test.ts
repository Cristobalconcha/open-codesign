import type { EditContextDefinition } from '@open-codesign/core';
import { describe, expect, it } from 'vitest';
import {
  buildEditContextV2,
  classifyEditSourceFile,
  type EditSource,
  MAX_EDIT_SOURCE_BYTES,
  nextSourceId,
  normalizeEditSourceUrl,
  parseReplacementValue,
  toAnalysisSources,
} from './edit-sources';

const sources: EditSource[] = [
  {
    kind: 'image',
    id: 'source-1',
    label: 'wireframe.png',
    mediaType: 'image/png',
    file: { path: 'C:/refs/wireframe.png', name: 'wireframe.png', size: 2048 },
    previewUrl: 'blob:preview-1',
  },
  { kind: 'text', id: 'source-2', label: 'Descriptor', text: 'Lora is hero-only.' },
  {
    kind: 'workspace',
    id: 'source-3',
    label: 'DESIGN.md',
    mediaType: 'text/markdown',
    file: { path: 'C:/project/DESIGN.md', name: 'DESIGN.md', size: 900 },
    previewUrl: null,
  },
];

function definition(overrides: Partial<EditContextDefinition>): EditContextDefinition {
  return {
    id: 'hero-typeface',
    category: 'typography',
    label: 'Hero typeface',
    value: { family: 'Lora' },
    detectedValue: { family: 'Lora' },
    resolution: 'preserve',
    authority: 'proposal',
    usage: 'private',
    confidence: 'high',
    source: 'ai-analysis',
    evidence: 'Descriptor section 3',
    provenance: [{ materialId: 'source-2', locator: 'section 3' }],
    ...overrides,
  };
}

describe('classifyEditSourceFile', () => {
  it('accepts images and documents and rejects everything else', () => {
    expect(classifyEditSourceFile({ path: 'a', name: 'shot.PNG', size: 10 })).toEqual({
      ok: true,
      kind: 'image',
      mediaType: 'image/png',
    });
    expect(classifyEditSourceFile({ path: 'a', name: 'brief.md', size: 10 })).toEqual({
      ok: true,
      kind: 'document',
      mediaType: 'text/markdown',
    });
    expect(classifyEditSourceFile({ path: 'a', name: 'brand.sketch', size: 10 })).toMatchObject({
      ok: false,
    });
  });

  it('rejects empty and oversized files', () => {
    expect(classifyEditSourceFile({ path: 'a', name: 'shot.png', size: 0 })).toMatchObject({
      ok: false,
    });
    expect(
      classifyEditSourceFile({ path: 'a', name: 'shot.png', size: MAX_EDIT_SOURCE_BYTES + 1 }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('20 MB') });
  });
});

describe('normalizeEditSourceUrl', () => {
  it('accepts https and rejects other schemes', () => {
    expect(normalizeEditSourceUrl(' https://example.com/a ')).toEqual({
      ok: true,
      url: 'https://example.com/a',
    });
    expect(normalizeEditSourceUrl('http://example.com')).toMatchObject({ ok: false });
    expect(normalizeEditSourceUrl('file:///etc/passwd')).toMatchObject({ ok: false });
    expect(normalizeEditSourceUrl('example.com')).toMatchObject({ ok: false });
  });
});

describe('parseReplacementValue', () => {
  it('keeps objects, wraps other JSON literals, and rejects free text', () => {
    expect(parseReplacementValue('{"family":"Inter"}')).toEqual({
      ok: true,
      value: { family: 'Inter' },
    });
    expect(parseReplacementValue('["a","b"]')).toEqual({ ok: true, value: { value: ['a', 'b'] } });
    expect(parseReplacementValue('use Inter everywhere')).toEqual({
      ok: false,
      error: 'The replacement must be valid JSON.',
    });
  });
});

describe('nextSourceId', () => {
  it('skips ids already in use', () => {
    expect(nextSourceId([])).toBe('source-1');
    expect(nextSourceId(['source-1', 'source-2'])).toBe('source-3');
  });
});

describe('buildEditContextV2', () => {
  it('mirrors sources as materials with placeholder paths', () => {
    const built = buildEditContextV2(sources, [], {});
    if (!built.ok) throw new Error(built.error);
    expect(built.editContext.schemaVersion).toBe(2);
    expect(built.editContext.materials).toEqual([
      expect.objectContaining({
        id: 'source-1',
        path: 'pending/source-1',
        kind: 'image',
        type: 'image/png',
        locator: 'wireframe.png',
      }),
      expect.objectContaining({ id: 'source-2', path: 'pending/source-2', type: 'text/plain' }),
      expect.objectContaining({ id: 'source-3', path: 'pending/source-3', kind: 'workspace' }),
    ]);
    expect(built.editContext.materials.map((material) => material.id)).toEqual(
      toAnalysisSources(sources).map((source) => source.id),
    );
  });

  it('records final checklist confirmation while preserving private usage', () => {
    const built = buildEditContextV2(sources, [definition({})], {
      'hero-typeface': { resolution: 'preserve', override: '' },
    });
    if (!built.ok) throw new Error(built.error);
    expect(built.editContext.active).toEqual(['hero-typeface']);
    expect(built.editContext.open).toEqual([]);
    expect(built.editContext.detected[0]).toMatchObject({
      resolution: 'preserve',
      authority: 'confirmed',
      usage: 'private',
    });
    expect(built.editContext.detected[0]?.provenance?.at(-1)).toMatchObject({
      materialId: 'user',
    });
    expect(built.editContext.detected[0]).not.toHaveProperty('overrideValue');
  });

  it('keeps an untouched proposal open instead of silently confirming it', () => {
    const built = buildEditContextV2(sources, [definition({})], {});
    if (!built.ok) throw new Error(built.error);

    expect(built.editContext.active).toEqual([]);
    expect(built.editContext.open).toEqual(['hero-typeface']);
    expect(built.editContext.detected[0]).toMatchObject({
      resolution: 'open',
      authority: 'proposal',
      usage: 'private',
    });
  });

  it('persists analyzer gaps as open decisions for the generation agent', () => {
    const built = buildEditContextV2(sources, [], {}, [
      { category: 'behavior', label: 'Animations', reason: 'No motion rule was supplied.' },
    ]);
    if (!built.ok) throw new Error(built.error);

    expect(built.editContext.open).toEqual(['open-behavior']);
    expect(built.editContext.detected[0]).toMatchObject({
      id: 'open-behavior',
      resolution: 'open',
      authority: 'unknown',
      value: { status: 'unspecified' },
      evidence: 'No motion rule was supplied.',
    });
  });

  it('records explicit open and replace decisions with user provenance', () => {
    const built = buildEditContextV2(
      sources,
      [definition({}), definition({ id: 'palette', label: 'Palette' })],
      {
        'hero-typeface': { resolution: 'open', override: '' },
        palette: { resolution: 'replace', override: '{"primary":"#123456"}' },
      },
    );
    if (!built.ok) throw new Error(built.error);
    expect(built.editContext.open).toEqual(['hero-typeface']);
    expect(built.editContext.active).toEqual(['palette']);
    const palette = built.editContext.detected.find((item) => item.id === 'palette');
    expect(palette).toMatchObject({
      resolution: 'replace',
      value: { family: 'Lora' },
      overrideValue: { primary: '#123456' },
      authority: 'confirmed',
      usage: 'private',
    });
    expect(palette?.provenance?.at(-1)).toMatchObject({ materialId: 'user' });
  });

  it('fails with the variable label when a replacement is not valid JSON', () => {
    const built = buildEditContextV2(sources, [definition({})], {
      'hero-typeface': { resolution: 'replace', override: 'Inter' },
    });
    expect(built).toEqual({
      ok: false,
      error: 'Hero typeface: The replacement must be valid JSON.',
    });
  });

  it('requires at least one source', () => {
    expect(buildEditContextV2([], [], {})).toMatchObject({ ok: false });
  });
});
