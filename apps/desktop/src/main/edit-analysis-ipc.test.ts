import { hydrateConfig } from '@open-codesign/shared';
import { describe, expect, it, vi } from 'vitest';
import { runEditAnalysis } from './edit-analysis-ipc';

const config = hydrateConfig({
  version: 3,
  activeProvider: 'deepseek',
  activeModel: 'deepseek-chat',
  secrets: { deepseek: { ciphertext: 'encrypted' } },
  providers: {
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      builtin: true,
      wire: 'openai-chat',
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
    },
  },
});

const santaLuisaAnalysis = {
  schemaVersion: 1,
  summary: 'Explicit rural brand system with pending proposals and publication guards.',
  variables: [
    {
      id: 'hero-typeface',
      category: 'typography',
      label: 'Hero typeface',
      value: { family: 'Lora', weight: 500, usage: 'hero-only' },
      authority: 'confirmed',
      usage: 'approved',
      confidence: 'high',
      evidence: 'The typography table reserves Lora exclusively for the hero.',
      provenance: [{ materialId: 'descriptor', locator: 'section 3' }],
      appliesTo: ['dossier', 'website'],
    },
    {
      id: 'sales-data-publication',
      category: 'editorial-restriction',
      label: 'Sales data publication',
      value: { publish: false },
      authority: 'restriction',
      usage: 'private',
      confidence: 'high',
      evidence: 'Sales and buyer data are explicitly marked private.',
      provenance: [{ materialId: 'descriptor', locator: 'section 7' }],
    },
  ],
  conflicts: [],
  gaps: [
    {
      category: 'imagery',
      label: 'Image aspect ratios',
      reason: 'The descriptor marks standard ratios as pending.',
    },
  ],
};

describe('edit analysis IPC pipeline', () => {
  it('calls the configured AI boundary and validates evidence-backed Santa Luisa variables', async () => {
    const resolveCredential = vi.fn(async () => 'secret-without-logging');
    const completeAnalysis = vi.fn(async () => ({
      content: `\`\`\`json\n${JSON.stringify(santaLuisaAnalysis)}\n\`\`\``,
      inputTokens: 1200,
      outputTokens: 600,
      costUsd: 0.01,
    }));
    const response = await runEditAnalysis(
      {
        schemaVersion: 1,
        analysisId: 'santa-luisa-1',
        model: { provider: 'deepseek', modelId: 'deepseek-chat' },
        sources: [
          {
            kind: 'text',
            id: 'descriptor',
            label: 'Santa Luisa descriptor',
            text: 'Lora is exclusive to hero titles. Sales and buyer data are private.',
          },
        ],
      },
      {
        config,
        resolveCredential,
        acquireSources: async () => ({
          sources: [
            {
              id: 'descriptor',
              kind: 'text',
              label: 'Santa Luisa descriptor',
              text: 'Lora is exclusive to hero titles. Sales and buyer data are private.',
            },
          ],
          images: [],
        }),
        completeAnalysis,
      },
    );

    expect(resolveCredential).toHaveBeenCalledWith('deepseek', false);
    expect(completeAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { provider: 'deepseek', modelId: 'deepseek-chat' },
        apiKey: 'secret-without-logging',
        userText: expect.stringContaining('Santa Luisa descriptor'),
      }),
    );
    expect(response.analysis.variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'hero-typeface', authority: 'confirmed' }),
        expect.objectContaining({
          id: 'sales-data-publication',
          authority: 'restriction',
          usage: 'private',
        }),
      ]),
    );
    expect(response.usage).toEqual({ inputTokens: 1200, outputTokens: 600, costUsd: 0.01 });
  });

  it('rejects provider output whose provenance is not one of the supplied sources', async () => {
    const invalid = structuredClone(santaLuisaAnalysis);
    const variable = invalid.variables[0];
    const provenance = variable?.provenance[0];
    if (provenance === undefined) throw new Error('Missing provenance fixture');
    provenance.materialId = 'invented-source';
    await expect(
      runEditAnalysis(
        {
          schemaVersion: 1,
          analysisId: 'bad-analysis',
          model: { provider: 'deepseek', modelId: 'deepseek-chat' },
          sources: [{ kind: 'text', id: 'descriptor', label: 'Descriptor', text: 'Evidence' }],
        },
        {
          config,
          resolveCredential: async () => 'secret',
          acquireSources: async () => ({
            sources: [{ id: 'descriptor', kind: 'text', label: 'Descriptor', text: 'Evidence' }],
            images: [],
          }),
          completeAnalysis: async () => ({
            content: JSON.stringify(invalid),
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
          }),
        },
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
  });
});
