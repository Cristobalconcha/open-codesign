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
});
