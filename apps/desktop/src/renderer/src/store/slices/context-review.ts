import type { EditContext, EditContextDefinition } from '@open-codesign/core';
import {
  buildCreateReviewSources,
  type ContextReviewMode,
  type CreateReviewLabels,
  type CreateReviewRequest,
  requiresContextReview,
} from '../../lib/context-review.js';
import {
  buildEditContextV2,
  createManualEditDefinition,
  type EditDecision,
  type EditSource,
  toAnalysisSources,
} from '../../lib/edit-sources.js';
import type { CodesignState } from '../../store.js';
import { modelRef, newId, tr } from '../lib/locale.js';
import { isReadyConfig } from '../lib/ready-config.js';

type SetState = (
  updater: ((state: CodesignState) => Partial<CodesignState> | object) | Partial<CodesignState>,
) => void;
type GetState = () => CodesignState;

export type ContextReviewStatus = 'analyzing' | 'review' | 'persisting' | 'error';

export interface ContextReviewState {
  designId: string;
  request: CreateReviewRequest;
  sources: EditSource[];
  /** Inputs that could not become evidence sources, surfaced to the user. */
  notes: string[];
  /** CREATE runs the full checklist; EDIT runs a delta review against
   *  `currentContext`. See `requiresContextReview` for how this is decided. */
  mode: ContextReviewMode;
  /** Previously confirmed context for an EDIT review, or null when there is
   *  none yet (still EDIT if a turn already delivered without one). */
  currentContext: EditContext | null;
  status: ContextReviewStatus;
  summary: string | null;
  detected: EditContextDefinition[];
  conflicts: Array<{ description: string; variableIds: string[] }>;
  gaps: Array<{ category: string; label: string; reason: string }>;
  decisions: Record<string, EditDecision>;
  error: string | null;
}

export function reviewLabels(): CreateReviewLabels {
  return {
    promptLabel: tr('contextReview.promptSourceLabel'),
    promptTruncated: tr('contextReview.notes.promptTruncated'),
    tooManySources: tr('contextReview.notes.tooManySources'),
    unsupportedFile: (name) => tr('contextReview.notes.unsupportedFile', { name }),
    invalidUrl: (reason) => tr('contextReview.notes.invalidUrl', { reason }),
  };
}

/**
 * Decide whether the current composer request must pass evidence review
 * before it generates. Every explicit, non-silent request does — this only
 * picks CREATE (full checklist) or EDIT (delta against `currentContext`).
 * Returns the initial review state, or null when there is nothing to review
 * (no host edit-mode IPC, or an empty request). See `requiresContextReview`
 * for the create/edit decision.
 */
export async function evaluateContextReview(
  designId: string,
  request: CreateReviewRequest,
  chatKinds: CodesignState['chatMessages'][number]['kind'][],
  workspacePath: string,
  hasExistingSource: boolean,
): Promise<ContextReviewState | null> {
  const readContext = window.codesign?.editMode?.readContext;
  if (readContext === undefined) return null;
  const existing = await readContext(designId);
  const mode = requiresContextReview({
    hasEditContext: existing !== null,
    hasExistingSource,
    chatKinds,
  });
  // Reserve ids already persisted from an earlier round so this round's
  // sources cannot collide with them once the main process merges contexts.
  const reservedSourceIds =
    existing?.materials
      .map((material) => material.id)
      .filter((id): id is string => id !== undefined) ?? [];
  const { sources, notes } = buildCreateReviewSources(
    request,
    reviewLabels(),
    workspacePath,
    reservedSourceIds,
  );
  if (sources.length === 0) return null;
  return {
    designId,
    request,
    sources,
    notes,
    mode,
    currentContext: mode === 'edit' ? existing : null,
    status: 'analyzing',
    summary: null,
    detected: [],
    conflicts: [],
    gaps: [],
    decisions: {},
    error: null,
  };
}

async function runContextAnalysis(get: GetState, set: SetState): Promise<void> {
  const review = get().contextReview;
  if (review === null) return;
  const analyze = window.codesign?.editMode?.analyze;
  const cfg = get().config;
  if (analyze === undefined || !isReadyConfig(cfg)) {
    patchReview(get, set, review.designId, {
      status: 'error',
      error: tr('contextReview.errors.analysisUnavailable'),
    });
    return;
  }
  try {
    const response = await analyze({
      analysisId: newId(),
      model: modelRef(cfg.provider, cfg.modelPrimary),
      sources: toAnalysisSources(review.sources),
      reviewMode: review.mode,
      ...(review.currentContext !== null
        ? { currentContextJson: JSON.stringify(review.currentContext) }
        : {}),
    });
    patchReview(get, set, review.designId, {
      status: 'review',
      summary: response.analysis.summary,
      detected: response.analysis.variables,
      conflicts: response.analysis.conflicts.map((conflict) => ({
        description: conflict.description,
        variableIds: conflict.variableIds,
      })),
      gaps: response.analysis.gaps,
      decisions: {},
      error: null,
    });
  } catch (err) {
    patchReview(get, set, review.designId, {
      status: 'error',
      error: err instanceof Error ? err.message : tr('errors.unknown'),
    });
  }
}

/** Apply a patch only while the same design's review is still open. */
function patchReview(
  get: GetState,
  set: SetState,
  designId: string,
  patch: Partial<ContextReviewState>,
): void {
  const current = get().contextReview;
  if (current === null || current.designId !== designId) return;
  set({ contextReview: { ...current, ...patch } });
}

export interface ContextReviewSliceActions {
  openContextReview: CodesignState['openContextReview'];
  setContextReviewResolution: CodesignState['setContextReviewResolution'];
  addContextReviewDefinition: CodesignState['addContextReviewDefinition'];
  setContextReviewOverride: CodesignState['setContextReviewOverride'];
  retryContextReview: CodesignState['retryContextReview'];
  confirmContextReview: CodesignState['confirmContextReview'];
  cancelContextReview: CodesignState['cancelContextReview'];
}

export function makeContextReviewSlice(set: SetState, get: GetState): ContextReviewSliceActions {
  return {
    async openContextReview(review) {
      set({ contextReview: review });
      await runContextAnalysis(get, set);
    },

    setContextReviewResolution(id, resolution) {
      const review = get().contextReview;
      if (review === null) return;
      const previous = review.decisions[id];
      set({
        contextReview: {
          ...review,
          decisions: {
            ...review.decisions,
            [id]: { resolution, override: previous?.override ?? '' },
          },
        },
      });
    },
    addContextReviewDefinition(input) {
      const review = get().contextReview;
      if (review === null || review.status !== 'review') return;
      const definition = createManualEditDefinition(
        input,
        review.detected.map((item) => item.id),
      );
      set({
        contextReview: {
          ...review,
          detected: [...review.detected, definition],
          decisions: {
            ...review.decisions,
            [definition.id]: { resolution: 'preserve', override: '' },
          },
        },
      });
    },

    setContextReviewOverride(id, override) {
      const review = get().contextReview;
      if (review === null) return;
      const previous = review.decisions[id];
      set({
        contextReview: {
          ...review,
          decisions: {
            ...review.decisions,
            [id]: { resolution: previous?.resolution ?? 'replace', override },
          },
        },
      });
    },

    async retryContextReview() {
      const review = get().contextReview;
      if (review === null || review.status === 'persisting') return;
      set({ contextReview: { ...review, status: 'analyzing', error: null } });
      await runContextAnalysis(get, set);
    },

    async confirmContextReview() {
      const review = get().contextReview;
      if (review === null || review.status !== 'review') return;
      const initWorkspaceSources = window.codesign?.editMode?.initWorkspaceSources;
      if (initWorkspaceSources === undefined) {
        patchReview(get, set, review.designId, {
          status: 'error',
          error: tr('contextReview.errors.persistUnavailable'),
        });
        return;
      }
      const built = buildEditContextV2(
        review.sources,
        review.detected,
        review.decisions,
        review.gaps,
      );
      if (!built.ok) {
        patchReview(get, set, review.designId, { status: 'error', error: built.error });
        return;
      }
      patchReview(get, set, review.designId, { status: 'persisting', error: null });
      try {
        // Persist before generating: the main process reads
        // .codesign/edit-context.json while planning the prompt, so a failure
        // here must abort the run rather than generate without constraints.
        await initWorkspaceSources({
          designId: review.designId,
          sources: toAnalysisSources(review.sources),
          editContext: built.editContext,
        });
      } catch (err) {
        patchReview(get, set, review.designId, {
          status: 'error',
          error: err instanceof Error ? err.message : tr('errors.unknown'),
        });
        return;
      }
      const request = review.request;
      set({ contextReview: null });
      await get().sendPrompt({
        prompt: request.prompt,
        attachments: request.attachments,
        ...(request.referenceUrl !== undefined ? { referenceUrl: request.referenceUrl } : {}),
        contextReviewed: true,
      });
    },

    cancelContextReview() {
      const review = get().contextReview;
      if (review === null || review.status === 'persisting') return;
      // The composer cleared its textarea on submit and the attachments were
      // never consumed, so hand the prompt back and leave the chips in place.
      set({
        contextReview: null,
        promptRestore: { id: Date.now(), text: review.request.prompt },
      });
    },
  };
}

export type { CreateReviewRequest };
