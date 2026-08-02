import { describe, expect, it } from 'vitest';
import { parseEditContext } from './edit-context.js';

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
