import { useT } from '@open-codesign/i18n';
import { LoaderCircle, X } from 'lucide-react';
import { useCodesignStore } from '../../store';
import {
  type ContextReviewCopy,
  ContextReviewList,
  DEFAULT_AUTHORITY_HINTS,
  DEFAULT_USAGE_HINTS,
} from './ContextReviewList';
import { ManualDefinitionForm } from './ManualDefinitionForm';

export function ContextReviewDialog() {
  const t = useT();
  const review = useCodesignStore((state) => state.contextReview);
  const setResolution = useCodesignStore((state) => state.setContextReviewResolution);
  const setOverride = useCodesignStore((state) => state.setContextReviewOverride);
  const addDefinition = useCodesignStore((state) => state.addContextReviewDefinition);
  const retry = useCodesignStore((state) => state.retryContextReview);
  const confirm = useCodesignStore((state) => state.confirmContextReview);
  const cancel = useCodesignStore((state) => state.cancelContextReview);

  if (review === null) return null;

  const busy = review.status === 'analyzing' || review.status === 'persisting';
  const copy: ContextReviewCopy = {
    preserve: t('contextReview.useDetected'),
    replace: t('contextReview.replace'),
    open: t('contextReview.leaveOpen'),
    evidence: t('contextReview.evidence'),
    provenance: t('contextReview.provenance'),
    replacementPlaceholder: '{"value":"..."}',
    replacementAriaLabel: (label) => t('contextReview.replacementFor', { label }),
    authorityHint: DEFAULT_AUTHORITY_HINTS,
    usageHint: DEFAULT_USAGE_HINTS,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-review-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-overlay)] p-5"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
          <div className="space-y-1">
            <h2
              id="context-review-title"
              className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]"
            >
              {t('contextReview.title')}
            </h2>
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              {t('contextReview.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={review.status === 'persisting'}
            aria-label={t('common.close')}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="codesign-scroll-area flex-1 space-y-4 overflow-y-auto p-5">
          {review.notes.length > 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              {review.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}

          {review.status === 'analyzing' ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              {t('contextReview.analyzing')}
            </div>
          ) : null}

          {review.summary !== null ? (
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              {review.summary}
            </p>
          ) : null}

          {review.status === 'review' && review.detected.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              {t('contextReview.noVariables')}
            </p>
          ) : null}

          {review.detected.length > 0 ? (
            <ContextReviewList
              detected={review.detected}
              decisions={review.decisions}
              onResolution={setResolution}
              onOverride={setOverride}
              disabled={busy}
              copy={copy}
            />
          ) : null}

          {review.status === 'review' ? (
            <ManualDefinitionForm
              disabled={busy}
              onAdd={addDefinition}
              copy={{
                title: t('contextReview.manual.title'),
                description: t('contextReview.manual.description'),
                category: t('contextReview.manual.category'),
                label: t('contextReview.manual.label'),
                instruction: t('contextReview.manual.instruction'),
                add: t('contextReview.manual.add'),
              }}
            />
          ) : null}

          {review.conflicts.length > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <h3 className="mb-2 text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {t('contextReview.conflicts')}
              </h3>
              {review.conflicts.map((conflict) => (
                <p
                  key={`${conflict.description}:${conflict.variableIds.join(',')}`}
                  className="text-[var(--text-xs)] text-[var(--color-text-secondary)]"
                >
                  {conflict.description}
                </p>
              ))}
            </section>
          ) : null}

          {review.gaps.length > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <h3 className="mb-2 text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {t('contextReview.openQuestions')}
              </h3>
              {review.gaps.map((gap) => (
                <p
                  key={`${gap.category}:${gap.label}`}
                  className="text-[var(--text-xs)] text-[var(--color-text-secondary)]"
                >
                  {gap.label}: {gap.reason}
                </p>
              ))}
            </section>
          ) : null}

          {review.error !== null ? (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--color-error)]/40 bg-[var(--color-error)]/5 p-3 text-[var(--text-sm)] text-[var(--color-error)]"
            >
              {review.error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            onClick={cancel}
            disabled={review.status === 'persisting'}
            className="h-9 rounded-[var(--radius-md)] px-4 text-[var(--text-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
          >
            {t('common.cancel')}
          </button>
          {review.status === 'error' ? (
            <button
              type="button"
              onClick={() => void retry()}
              className="h-9 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-[var(--text-sm)] font-medium text-[var(--color-on-accent)]"
            >
              {t('common.retry')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={review.status !== 'review'}
              className="h-9 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-[var(--text-sm)] font-medium text-[var(--color-on-accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {review.status === 'persisting'
                ? t('contextReview.saving')
                : t('contextReview.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
