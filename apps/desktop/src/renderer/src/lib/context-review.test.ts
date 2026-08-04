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

  it('avoids source ids already persisted from an earlier review round', () => {
    const result = buildCreateReviewSources(
      {
        prompt: 'Add a pricing section.',
        attachments: [{ path: 'references/pricing.md', name: 'pricing.md', size: 10 }],
      },
      labels,
      'C:/workspace',
      ['prompt', 'source-1'],
    );

    // 'prompt' was already used by round 1's material, so this round's prompt
    // source must pick a different id instead of colliding with it.
    expect(result.sources[0]).toMatchObject({ kind: 'text', id: 'prompt-2' });
    // 'source-1' was already used too, so the attachment must skip it.
    expect(result.sources[1]).toMatchObject({ kind: 'document', id: 'source-2' });
  });

  it('is CREATE only while there is no context and no delivered turn yet', () => {
    expect(requiresContextReview({ hasEditContext: false, chatKinds: [] })).toBe('create');
    expect(requiresContextReview({ hasEditContext: false, chatKinds: ['user', 'error'] })).toBe(
      'create',
    );
  });

  it('is EDIT once a turn has delivered, even without a persisted context', () => {
    expect(requiresContextReview({ hasEditContext: false, chatKinds: ['assistant_text'] })).toBe(
      'edit',
    );
    expect(requiresContextReview({ hasEditContext: false, chatKinds: ['tool_call'] })).toBe('edit');
    expect(
      requiresContextReview({ hasEditContext: false, chatKinds: ['artifact_delivered'] }),
    ).toBe('edit');
  });

  it('is EDIT whenever a context already exists, regardless of chat history', () => {
    expect(requiresContextReview({ hasEditContext: true, chatKinds: [] })).toBe('edit');
    expect(requiresContextReview({ hasEditContext: true, chatKinds: ['user'] })).toBe('edit');
  });

  it('is EDIT for an imported workspace that already has source but no chat or context', () => {
    expect(
      requiresContextReview({
        hasEditContext: false,
        hasExistingSource: true,
        chatKinds: [],
      }),
    ).toBe('edit');
  });
});
