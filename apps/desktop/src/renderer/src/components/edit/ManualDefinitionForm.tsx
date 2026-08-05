import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { ManualEditDefinitionInput } from '../../lib/edit-sources';

export interface ManualDefinitionCopy {
  title: string;
  description: string;
  category: string;
  label: string;
  instruction: string;
  add: string;
}

interface ManualDefinitionFormProps {
  copy: ManualDefinitionCopy;
  disabled?: boolean;
  onAdd: (input: ManualEditDefinitionInput) => void;
}

export function ManualDefinitionForm({ copy, disabled = false, onAdd }: ManualDefinitionFormProps) {
  const [category, setCategory] = useState('special');
  const [label, setLabel] = useState('');
  const [instruction, setInstruction] = useState('');
  const ready = label.trim().length > 0 && instruction.trim().length > 0;

  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div>
        <h3 className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
          {copy.title}
        </h3>
        <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
          {copy.description}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
          <span>{copy.category}</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={disabled}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
          />
        </label>
        <label className="space-y-1 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
          <span>{copy.label}</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={disabled}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
          />
        </label>
      </div>
      <label className="block space-y-1 text-[var(--text-xs)] text-[var(--color-text-secondary)]">
        <span>{copy.instruction}</span>
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
        />
      </label>
      <button
        type="button"
        disabled={disabled || !ready}
        onClick={() => {
          onAdd({ category, label, instruction });
          setLabel('');
          setInstruction('');
        }}
        className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
        {copy.add}
      </button>
    </section>
  );
}
