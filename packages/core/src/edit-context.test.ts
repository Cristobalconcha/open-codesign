import { describe, expect, it } from 'vitest';
import { mergeEditContext, parseEditContext } from './edit-context.js';
import type { EditContext, EditContextMaterial } from './index.js';

const valid = () => ({
  schemaVersion: 1,
  materials: [{ path: 'references/mock.png', type: 'image/png', role: 'wireframe' }],
  detected: [
    {
      id: 'layout',
      category: 'layout',
      label: 'Layout',
      value: {},
      confidence: 'high',
      source: 'wireframe-analysis',
      evidence: 'Grid',
    },
  ],
  active: ['layout'],
  open: [],
  generatedAt: '2026-08-02T00:00:00.000Z',
});

describe('parseEditContext', () => {
  it('accepts and preserves a valid structured context', () => {
    expect(parseEditContext(valid())).toEqual(valid());
  });

  it('rejects duplicate, unknown, overlapping, and unclassified ids', () => {
    expect(parseEditContext({ ...valid(), active: ['layout'], open: ['layout'] })).toBeNull();
    expect(parseEditContext({ ...valid(), active: ['unknown'], open: [] })).toBeNull();
    expect(parseEditContext({ ...valid(), active: [], open: [] })).toBeNull();
    expect(parseEditContext({ ...valid(), active: ['layout', 'layout'] })).toBeNull();
  });

  it('rejects malformed definitions and timestamps', () => {
    expect(
      parseEditContext({
        ...valid(),
        detected: [{ ...valid().detected[0], confidence: 'certain' }],
      }),
    ).toBeNull();
    expect(parseEditContext({ ...valid(), generatedAt: 'not-a-date' })).toBeNull();
  });

  it('accepts schema v2 decisions with traceable sources and explicit replacements', () => {
    const context = {
      schemaVersion: 2,
      materials: [
        {
          id: 'brand-guide',
          path: 'references/brand-guide.pdf',
          type: 'application/pdf',
          role: 'brand-guide',
          kind: 'document',
        },
      ],
      detected: [
        {
          id: 'primary-color',
          category: 'color',
          label: 'Primary color',
          value: { hex: '#0057B8' },
          detectedValue: { hex: '#0057B8' },
          overrideValue: { hex: '#16324F' },
          resolution: 'replace',
          authority: 'confirmed',
          usage: 'approved',
          confidence: 'high',
          source: 'manual-override',
          evidence: 'Brand guide page 12',
          provenance: [{ materialId: 'brand-guide', locator: 'page 12' }],
        },
      ],
      active: ['primary-color'],
      open: [],
      generatedAt: '2026-08-02T00:00:00.000Z',
    } as const;
    expect(parseEditContext(context)).toEqual(context);
  });

  it('rejects inconsistent schema v2 decisions and unknown provenance', () => {
    const base = {
      schemaVersion: 2,
      materials: [
        { id: 'source-1', path: 'references/ref.txt', type: 'text/plain', role: 'brief' },
      ],
      detected: [
        {
          id: 'typography',
          category: 'typography',
          label: 'Typography',
          value: { family: 'Inter' },
          resolution: 'open',
          authority: 'inferred',
          usage: 'approved',
          confidence: 'medium',
          source: 'document-analysis',
          provenance: [{ materialId: 'source-1' }],
        },
      ],
      active: [],
      open: ['typography'],
      generatedAt: '2026-08-02T00:00:00.000Z',
    };
    expect(parseEditContext(base)).not.toBeNull();
    expect(parseEditContext({ ...base, active: ['typography'], open: [] })).toBeNull();
    expect(
      parseEditContext({
        ...base,
        detected: [{ ...base.detected[0], provenance: [{ materialId: 'missing-source' }] }],
      }),
    ).toBeNull();
  });
});

describe('mergeEditContext', () => {
  const previous: EditContext = {
    schemaVersion: 2,
    materials: [
      { id: 'm1', path: 'references/m1.png', type: 'image/png', role: 'wireframe', kind: 'image' },
    ],
    detected: [
      {
        id: 'def-a',
        category: 'layout',
        label: 'Layout',
        value: {},
        resolution: 'preserve',
        authority: 'confirmed',
        usage: 'approved',
        confidence: 'high',
        source: 'wireframe-analysis',
        provenance: [{ materialId: 'm1' }],
      },
      {
        id: 'def-b',
        category: 'color',
        label: 'Color',
        value: { hex: '#111111' },
        resolution: 'open',
        authority: 'inferred',
        usage: 'confirm-before-use',
        confidence: 'medium',
        source: 'wireframe-analysis',
        provenance: [{ materialId: 'm1' }],
      },
    ],
    active: ['def-a'],
    open: ['def-b'],
    generatedAt: '2026-08-02T00:00:00.000Z',
  };

  const deltaMaterial: EditContextMaterial = {
    id: 'm2',
    path: '.codesign/sources/m2.txt',
    type: 'text/plain',
    role: 'text',
    kind: 'text',
  };

  const delta: EditContext = {
    schemaVersion: 2,
    materials: [deltaMaterial],
    detected: [
      {
        id: 'def-b',
        category: 'color',
        label: 'Color',
        value: { hex: '#222222' },
        overrideValue: { hex: '#222222' },
        resolution: 'replace',
        authority: 'confirmed',
        usage: 'approved',
        confidence: 'high',
        source: 'manual-override',
        provenance: [{ materialId: 'm2' }],
      },
      {
        id: 'def-c',
        category: 'typography',
        label: 'Typography',
        value: { family: 'Inter' },
        resolution: 'preserve',
        authority: 'confirmed',
        usage: 'approved',
        confidence: 'high',
        source: 'document-analysis',
        provenance: [{ materialId: 'm2' }],
      },
    ],
    active: ['def-b', 'def-c'],
    open: [],
    generatedAt: '2026-08-03T00:00:00.000Z',
  };

  it('accumulates materials, keeps an untouched definition, and swaps a repeated one', () => {
    const merged = mergeEditContext(previous, delta);

    expect(merged.materials).toEqual([...previous.materials, ...delta.materials]);
    expect(merged.detected.map((definition) => definition.id)).toEqual(['def-a', 'def-b', 'def-c']);
    // def-a is untouched: same object, still active.
    expect(merged.detected[0]).toEqual(previous.detected[0]);
    // def-b is replaced by the round-2 decision, no longer open.
    expect(merged.detected[1]).toEqual(delta.detected[0]);
    expect(merged.active).toEqual(['def-a', 'def-b', 'def-c']);
    expect(merged.open).toEqual([]);
    expect(merged.generatedAt).toBe(delta.generatedAt);
    expect(parseEditContext(merged)).not.toBeNull();
  });

  it('passes a delta through unchanged when there is no previous context', () => {
    expect(mergeEditContext(null, delta)).toEqual(delta);
  });

  it('produces an invalid context when a delta material id collides with a previous one', () => {
    const collidingDelta: EditContext = {
      ...delta,
      materials: [{ ...deltaMaterial, id: 'm1' }],
    };
    const merged = mergeEditContext(previous, collidingDelta);
    expect(parseEditContext(merged)).toBeNull();
  });
});
