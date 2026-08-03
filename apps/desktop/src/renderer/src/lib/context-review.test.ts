import { describe, expect, it } from 'vitest';
import { buildCreateReviewSources, requiresContextReview } from './context-review';

const labels = {
  promptLabel: 'Project brief',
  unsupportedFile: (name: string) => `unsupported:${name}`,
  tooManySources: 'too-many',
  promptTruncated: 'truncated',
  invalidUrl: (reason: string) => `invalid:${reason}`,
};

describe('CREATE context review helpers', () => {
  it('always treats the project prompt as the first evidence source', () => {
    const result = buildCreateReviewSources(
      { prompt: '  Create a rural landing page.  ', attachments: [] },
      labels,
      'C:/workspace',
    );

    expect(result.sources).toEqual([
      {
        kind: 'text',
        id: 'prompt',
        label: 'Project brief',
        text: 'Create a rural landing page.',
      },
    ]);
  });

  it('resolves imported workspace files for analysis without changing their identity', () => {
    const result = buildCreateReviewSources(
      {
        prompt: 'Use the attached guide.',
        attachments: [{ path: 'references/guide.md', name: 'guide.md', size: 42 }],
        referenceUrl: 'https://example.com/style',
      },
      labels,
      'C:/workspace',
    );

    expect(result.sources[1]).toMatchObject({
      kind: 'document',
      label: 'guide.md',
      file: { path: 'C:/workspace/references/guide.md', name: 'guide.md', size: 42 },
    });
    expect(result.sources[2]).toMatchObject({
      kind: 'url',
      url: 'https://example.com/style',
    });
  });

  it('requires review until a valid context or a delivered turn exists', () => {
    expect(requiresContextReview({ hasEditContext: false, chatKinds: [] })).toBe(true);
    expect(requiresContextReview({ hasEditContext: false, chatKinds: ['user', 'error'] })).toBe(
      true,
    );
    expect(requiresContextReview({ hasEditContext: false, chatKinds: ['assistant_text'] })).toBe(
      false,
    );
    expect(requiresContextReview({ hasEditContext: true, chatKinds: [] })).toBe(false);
  });
});
