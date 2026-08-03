import type { EditContextDefinition } from '@open-codesign/core';
import type { EditDecision } from '../../lib/edit-sources';

/**
 * Decision list shared by the Edit-mode tab and the Create pre-generation
 * review. Both surfaces show the same provenance/authority/usage/confidence
 * evidence, but they word the three resolutions differently, so every label
 * arrives through `copy` instead of being hard-coded here.
 */
export interface ContextReviewCopy {
  preserve: string;
  replace: string;
  open: string;
  evidence: string;
  provenance: string;
  replacementPlaceholder: string;
  replacementAriaLabel: (definitionLabel: string) => string;
  authorityHint: Record<string, string>;
  usageHint: Record<string, string>;
}

export const DEFAULT_AUTHORITY_HINTS: Record<string, string> = {
  confirmed: 'Explicit decision',
  proposal: 'Pending confirmation — do not treat as decided',
  inferred: 'Interpreted from evidence',
  fact: 'Project fact, not a design instruction',
  restriction: 'Legal / editorial guard',
  unknown: 'Authority could not be established',
};

export const DEFAULT_USAGE_HINTS: Record<string, string> = {
  approved: 'Approved for use',
  'confirm-before-use': 'Confirm before using',
  private: 'Private — never publishable',
};

export interface ContextReviewListProps {
  detected: EditContextDefinition[];
  decisions: Record<string, EditDecision | undefined>;
  onResolution: (id: string, resolution: EditDecision['resolution']) => void;
  onOverride: (id: string, override: string) => void;
  disabled: boolean;
  copy: ContextReviewCopy;
}

export function ContextReviewList({
  detected,
  decisions,
  onResolution,
  onOverride,
  disabled,
  copy,
}: ContextReviewListProps) {
  const optionLabel: Record<EditDecision['resolution'], string> = {
    preserve: copy.preserve,
    replace: copy.replace,
    open: copy.open,
  };

  return (
    <>
      {detected.map((definition) => {
        const decision = decisions[definition.id]?.resolution ?? 'preserve';
        return (
          <div
            key={definition.id}
            className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 space-y-2"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {definition.label}
              </span>
              <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] capitalize">
                {definition.category}
              </span>
              <span
                title={copy.authorityHint[definition.authority ?? 'unknown']}
                className="text-[var(--text-xs)] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              >
                {definition.authority ?? 'unknown'}
              </span>
              <span
                title={copy.usageHint[definition.usage ?? 'approved']}
                className="text-[var(--text-xs)] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              >
                {definition.usage ?? 'approved'}
              </span>
              <span className="text-[var(--text-xs)] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                {definition.confidence}
              </span>
            </div>

            <pre className="text-[var(--text-xs)] text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">
              {JSON.stringify(definition.value)}
            </pre>

            {definition.evidence !== undefined && (
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {copy.evidence}: {definition.evidence}
              </p>
            )}
            {definition.provenance !== undefined && (
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {copy.provenance}:{' '}
                {definition.provenance
                  .map((item) =>
                    item.locator === undefined
                      ? item.materialId
                      : `${item.materialId} (${item.locator})`,
                  )
                  .join(', ')}
              </p>
            )}

            <div className="flex gap-4 flex-wrap">
              {(['preserve', 'replace', 'open'] as const).map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--color-text-secondary)] cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`resolution-${definition.id}`}
                    value={option}
                    checked={decision === option}
                    onChange={() => onResolution(definition.id, option)}
                    disabled={disabled}
                  />
                  {optionLabel[option]}
                </label>
              ))}
            </div>

            {decision === 'replace' && (
              <textarea
                aria-label={copy.replacementAriaLabel(definition.label)}
                value={decisions[definition.id]?.override ?? ''}
                onChange={(e) => onOverride(definition.id, e.target.value)}
                rows={2}
                placeholder={copy.replacementPlaceholder}
                className="w-full px-3 py-2 text-[var(--text-xs)] font-mono rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
            )}
          </div>
        );
      })}
    </>
  );
}
