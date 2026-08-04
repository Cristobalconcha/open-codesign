import {
  buildDesignAnalysisUserPrompt,
  DESIGN_ANALYSIS_SYSTEM_PROMPT,
  type DesignAnalysisResult,
  type DesignAnalysisSource,
  diagnoseDesignAnalysis,
  type EditContext,
  ensureCreateReviewCoverage,
  extractDesignAnalysisJson,
  parseDesignAnalysis,
  parseEditContext,
} from '@open-codesign/core';
import { complete } from '@open-codesign/providers';
import {
  CodesignError,
  type Config,
  EditAnalysisPayloadV1,
  ERROR_CODES,
  type ModelRef,
  type WireApi,
} from '@open-codesign/shared';
import { getCodexTokenStore } from './codex-oauth-ipc';
import { ipcMain } from './electron-runtime';
import { getLogger } from './logger';
import { getApiKeyForProvider, getCachedConfig, hasApiKeyForProvider } from './onboarding-ipc';
import { preparePromptContext } from './prompt-context';
import { resolveActiveModel } from './provider-settings';
import { resolveCredentialForProvider } from './resolve-api-key';

interface AcquiredAnalysisSources {
  sources: DesignAnalysisSource[];
  images: Array<{ data: string; mimeType: string }>;
}

export interface EditAnalysisCompletionInput {
  model: ModelRef;
  apiKey: string;
  baseUrl?: string | undefined;
  wire?: WireApi | undefined;
  httpHeaders?: Record<string, string> | undefined;
  allowKeyless?: boolean | undefined;
  reasoning?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | undefined;
  systemPrompt: string;
  userText: string;
  userImages: Array<{ data: string; mimeType: string }>;
}

export interface EditAnalysisCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface RunEditAnalysisDeps {
  config: Config;
  resolveCredential: (provider: string, allowKeyless: boolean) => Promise<string>;
  acquireSources: (sources: EditAnalysisPayloadV1['sources']) => Promise<AcquiredAnalysisSources>;
  completeAnalysis: (input: EditAnalysisCompletionInput) => Promise<EditAnalysisCompletionResult>;
}

export interface EditAnalysisResponse {
  analysis: DesignAnalysisResult;
  model: ModelRef;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

function dataUrlImage(
  value: string,
  expectedMediaType?: string,
): { data: string; mimeType: string } {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value.trim());
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new CodesignError(
      'Prepared image has invalid data URL',
      ERROR_CODES.ATTACHMENT_READ_FAILED,
    );
  }
  const mimeType = match[1].toLowerCase();
  if (expectedMediaType !== undefined && mimeType !== expectedMediaType.toLowerCase()) {
    throw new CodesignError(
      'Prepared image media type does not match its attachment metadata',
      ERROR_CODES.ATTACHMENT_READ_FAILED,
    );
  }
  return { data: match[2], mimeType };
}

export async function acquireEditAnalysisSources(
  inputs: EditAnalysisPayloadV1['sources'],
): Promise<AcquiredAnalysisSources> {
  const sources: DesignAnalysisSource[] = [];
  const images: Array<{ data: string; mimeType: string }> = [];
  for (const input of inputs) {
    if (input.kind === 'text') {
      sources.push({ id: input.id, kind: 'text', label: input.label, text: input.text });
      continue;
    }
    if (input.kind === 'url') {
      const prepared = await preparePromptContext({ referenceUrl: input.url });
      const reference = prepared.referenceUrl;
      if (reference === null) {
        throw new CodesignError(
          'Reference URL produced no analyzable content',
          ERROR_CODES.REFERENCE_URL_FETCH_FAILED,
        );
      }
      sources.push({
        id: input.id,
        kind: 'url',
        label: input.label,
        text: JSON.stringify(reference),
      });
      continue;
    }
    const prepared = await preparePromptContext({ attachments: [input.file] });
    const attachment = prepared.attachments[0];
    if (attachment === undefined) {
      throw new CodesignError(
        'Source file produced no analyzable content',
        ERROR_CODES.ATTACHMENT_READ_FAILED,
      );
    }
    sources.push({
      id: input.id,
      kind: input.kind,
      label: input.label,
      ...(attachment.excerpt !== undefined
        ? { text: attachment.excerpt }
        : attachment.note !== undefined
          ? { text: attachment.note }
          : {}),
    });
    if (attachment.imageDataUrl !== undefined) {
      images.push(dataUrlImage(attachment.imageDataUrl, attachment.mediaType));
    }
  }
  return { sources, images };
}

/**
 * Re-parse a renderer-supplied context JSON string with `parseEditContext`
 * instead of trusting it. Anything unparsable — malformed JSON, a schema
 * mismatch, a forged shape — reads as "no context" rather than being inserted
 * raw into the analyzer prompt.
 */
function parseCurrentContext(raw: string | undefined): EditContext | null {
  if (raw === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseEditContext(parsed);
}

export async function runEditAnalysis(
  raw: unknown,
  deps: RunEditAnalysisDeps,
): Promise<EditAnalysisResponse> {
  const payload = EditAnalysisPayloadV1.parse(raw);
  const active = resolveActiveModel(deps.config, payload.model);
  const credential = await deps.resolveCredential(active.model.provider, active.allowKeyless);
  const acquired = await deps.acquireSources(payload.sources);
  const currentContext = parseCurrentContext(payload.currentContextJson);
  const completion = await deps.completeAnalysis({
    model: active.model,
    apiKey: credential,
    ...(active.baseUrl !== null ? { baseUrl: active.baseUrl } : {}),
    wire: active.wire,
    ...(active.httpHeaders !== undefined ? { httpHeaders: active.httpHeaders } : {}),
    allowKeyless: active.allowKeyless,
    ...(active.reasoningLevel !== undefined ? { reasoning: active.reasoningLevel } : {}),
    systemPrompt: DESIGN_ANALYSIS_SYSTEM_PROMPT,
    userText: buildDesignAnalysisUserPrompt(acquired.sources, {
      ...(payload.reviewMode !== undefined ? { reviewMode: payload.reviewMode } : {}),
      currentContext,
    }),
    userImages: acquired.images,
  });
  let parsedJson: unknown;
  try {
    parsedJson = extractDesignAnalysisJson(completion.content);
  } catch (error) {
    throw new CodesignError('Design analyzer returned malformed JSON', ERROR_CODES.PROVIDER_ERROR, {
      cause: error,
    });
  }
  const parsedAnalysis = parseDesignAnalysis(parsedJson, acquired.sources);
  if (parsedAnalysis === null) {
    const diagnostics = diagnoseDesignAnalysis(parsedJson, acquired.sources)
      .slice(0, 12)
      .join(', ');
    throw new CodesignError(
      `Design analyzer returned data that does not match the evidence schema (${diagnostics})`,
      ERROR_CODES.PROVIDER_ERROR,
    );
  }
  const analysis = ensureCreateReviewCoverage(
    parsedAnalysis,
    payload.reviewMode === 'edit' ? 'edit' : 'create',
  );
  return {
    analysis,
    model: active.model,
    usage: {
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      costUsd: completion.costUsd,
    },
  };
}

function resolveAnalysisCredential(provider: string, allowKeyless: boolean): Promise<string> {
  return resolveCredentialForProvider(provider, allowKeyless, {
    getCodexAccessToken: () => getCodexTokenStore().getValidAccessToken(),
    getApiKeyForProvider,
    hasApiKeyForProvider,
  });
}

export function registerEditAnalysisIpc(): void {
  const logger = getLogger('edit-analysis');
  ipcMain.handle('codesign:edit-analysis:v1:analyze', async (_event, raw: unknown) => {
    const config = getCachedConfig();
    if (config === null) {
      throw new CodesignError(
        'No configuration found. Complete onboarding first.',
        ERROR_CODES.CONFIG_MISSING,
      );
    }
    const startedAt = Date.now();
    const response = await runEditAnalysis(raw, {
      config,
      resolveCredential: resolveAnalysisCredential,
      acquireSources: acquireEditAnalysisSources,
      completeAnalysis: async (input) =>
        complete(
          input.model,
          [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.userText },
          ],
          {
            apiKey: input.apiKey,
            maxTokens: 8_192,
            userImages: input.userImages,
            ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
            ...(input.wire !== undefined ? { wire: input.wire } : {}),
            ...(input.httpHeaders !== undefined ? { httpHeaders: input.httpHeaders } : {}),
            ...(input.allowKeyless !== undefined ? { allowKeyless: input.allowKeyless } : {}),
            ...(input.reasoning !== undefined ? { reasoning: input.reasoning } : {}),
          },
        ),
    });
    logger.info('analysis.complete', {
      analysisId:
        typeof raw === 'object' && raw !== null && 'analysisId' in raw
          ? String((raw as { analysisId: unknown }).analysisId)
          : '<unknown>',
      provider: response.model.provider,
      modelId: response.model.modelId,
      sourceCount: response.analysis.variables.length,
      ms: Date.now() - startedAt,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      costUsd: response.usage.costUsd,
    });
    return response;
  });
}
