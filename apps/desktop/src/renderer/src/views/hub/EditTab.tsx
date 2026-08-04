import type { EditContextDefinition } from '@open-codesign/core';
import type { LocalInputFile } from '@open-codesign/shared';
import { FileText, FolderOpen, Globe, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ContextReviewCopy,
  ContextReviewList,
  DEFAULT_AUTHORITY_HINTS,
  DEFAULT_USAGE_HINTS,
} from '../../components/edit/ContextReviewList';
import {
  buildEditContextV2,
  classifyEditSourceFile,
  defaultEditResolution,
  type EditDecision,
  type EditSource,
  MAX_EDIT_SOURCE_TEXT_CHARS,
  MAX_EDIT_SOURCES,
  nextSourceId,
  normalizeEditSourceUrl,
  toAnalysisSources,
} from '../../lib/edit-sources';
import { useCodesignStore } from '../../store';
import { newId } from '../../store/lib/locale';
import { isReadyConfig } from '../../store/lib/ready-config';

type FileWithPath = File & { path?: string };

interface AnalysisView {
  summary: string;
  conflicts: Array<{ description: string; variableIds: string[] }>;
  gaps: Array<{ category: string; label: string; reason: string }>;
}

const REVIEW_COPY: ContextReviewCopy = {
  preserve: 'preserve',
  replace: 'replace',
  open: 'open',
  evidence: 'Evidence',
  provenance: 'Provenance',
  replacementPlaceholder: '{"family":"Inter"}',
  replacementAriaLabel: (label) => `Replacement value for ${label}`,
  authorityHint: DEFAULT_AUTHORITY_HINTS,
  usageHint: DEFAULT_USAGE_HINTS,
};

export function EditTab() {
  const [sources, setSources] = useState<EditSource[]>([]);
  const [textDraft, setTextDraft] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [detected, setDetected] = useState<EditContextDefinition[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(null);
  const [decisions, setDecisions] = useState<Record<string, EditDecision>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlsRef = useRef(new Map<string, string>());

  const config = useCodesignStore((s) => s.config);
  const createNewDesign = useCodesignStore((s) => s.createNewDesign);
  const softDeleteDesign = useCodesignStore((s) => s.softDeleteDesign);
  const setView = useCodesignStore((s) => s.setView);

  const releasePreview = useCallback((id: string) => {
    const url = previewUrlsRef.current.get(id);
    if (url === undefined) return;
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const previews = previewUrlsRef.current;
    return () => {
      for (const url of previews.values()) URL.revokeObjectURL(url);
      previews.clear();
    };
  }, []);

  // Findings are provenance-bound to the submitted sources, so any change to the
  // source set invalidates them.
  const discardAnalysis = useCallback(() => {
    setDetected([]);
    setAnalysis(null);
    setDecisions({});
  }, []);

  const appendSources = useCallback(
    (added: EditSource[], failures: string[]) => {
      setError(failures.length > 0 ? (failures[0] ?? null) : null);
      if (added.length === 0) return;
      setSources((prev) => [...prev, ...added]);
      discardAnalysis();
    },
    [discardAnalysis],
  );

  const capacityLeft = MAX_EDIT_SOURCES - sources.length;

  const addPickedFiles = useCallback(
    async (asWorkspace: boolean) => {
      if (analyzing || creating) return;
      const pickInputFiles = window.codesign?.pickInputFiles;
      if (pickInputFiles === undefined) {
        setError('The file picker is unavailable.');
        return;
      }
      const picked = await pickInputFiles();
      const taken = new Set(sources.map((source) => source.id));
      const added: EditSource[] = [];
      const failures: string[] = [];
      for (const file of picked) {
        if (added.length >= capacityLeft) {
          failures.push(`Only ${MAX_EDIT_SOURCES} sources can be analyzed at once.`);
          break;
        }
        const classification = classifyEditSourceFile(file);
        if (!classification.ok) {
          failures.push(classification.error);
          continue;
        }
        const id = nextSourceId(taken);
        taken.add(id);
        added.push({
          kind: asWorkspace ? 'workspace' : classification.kind,
          id,
          label: file.name,
          mediaType: classification.mediaType,
          file,
          previewUrl: null,
        });
      }
      appendSources(added, failures);
    },
    [analyzing, creating, sources, capacityLeft, appendSources],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (analyzing || creating) return;
      const dropped = Array.from(event.dataTransfer.files ?? []);
      const taken = new Set(sources.map((source) => source.id));
      const added: EditSource[] = [];
      const failures: string[] = [];
      for (const dropFile of dropped) {
        if (added.length >= capacityLeft) {
          failures.push(`Only ${MAX_EDIT_SOURCES} sources can be analyzed at once.`);
          break;
        }
        const localPath = (dropFile as FileWithPath).path;
        if (typeof localPath !== 'string' || localPath.length === 0) {
          failures.push(`"${dropFile.name}" has no local path — use “Add files” instead.`);
          continue;
        }
        const file: LocalInputFile = { path: localPath, name: dropFile.name, size: dropFile.size };
        const classification = classifyEditSourceFile(file);
        if (!classification.ok) {
          failures.push(classification.error);
          continue;
        }
        const id = nextSourceId(taken);
        taken.add(id);
        let previewUrl: string | null = null;
        if (classification.kind === 'image') {
          previewUrl = URL.createObjectURL(dropFile);
          previewUrlsRef.current.set(id, previewUrl);
        }
        added.push({
          kind: classification.kind,
          id,
          label: dropFile.name,
          mediaType: classification.mediaType,
          file,
          previewUrl,
        });
      }
      appendSources(added, failures);
    },
    [analyzing, creating, sources, capacityLeft, appendSources],
  );

  const addTextSource = useCallback(() => {
    if (analyzing || creating) return;
    const text = textDraft.trim();
    if (text.length === 0) {
      setError('Paste some text first.');
      return;
    }
    if (text.length > MAX_EDIT_SOURCE_TEXT_CHARS) {
      setError('The pasted text is too long.');
      return;
    }
    if (capacityLeft <= 0) {
      setError(`Only ${MAX_EDIT_SOURCES} sources can be analyzed at once.`);
      return;
    }
    const id = nextSourceId(sources.map((source) => source.id));
    const firstLine = text.split('\n', 1)[0] ?? 'Pasted text';
    appendSources([{ kind: 'text', id, label: firstLine.slice(0, 80) || 'Pasted text', text }], []);
    setTextDraft('');
  }, [analyzing, creating, textDraft, capacityLeft, sources, appendSources]);

  const addUrlSource = useCallback(() => {
    if (analyzing || creating) return;
    const normalized = normalizeEditSourceUrl(urlDraft);
    if (!normalized.ok) {
      setError(normalized.error);
      return;
    }
    if (capacityLeft <= 0) {
      setError(`Only ${MAX_EDIT_SOURCES} sources can be analyzed at once.`);
      return;
    }
    const id = nextSourceId(sources.map((source) => source.id));
    appendSources([{ kind: 'url', id, label: normalized.url, url: normalized.url }], []);
    setUrlDraft('');
  }, [analyzing, creating, urlDraft, capacityLeft, sources, appendSources]);

  const removeSource = useCallback(
    (id: string) => {
      if (analyzing || creating) return;
      releasePreview(id);
      setSources((prev) => prev.filter((source) => source.id !== id));
      discardAnalysis();
      setError(null);
    },
    [analyzing, creating, releasePreview, discardAnalysis],
  );

  const handleAnalyze = useCallback(async () => {
    if (analyzing || creating || sources.length === 0) return;
    const analyze = window.codesign?.editMode?.analyze;
    if (analyze === undefined) {
      setError('The edit analysis service is unavailable.');
      return;
    }
    if (!isReadyConfig(config)) {
      setError('Configure a provider and model before analyzing sources.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const response = await analyze({
        analysisId: newId(),
        model: { provider: config.provider, modelId: config.modelPrimary },
        sources: toAnalysisSources(sources),
      });
      setDetected(response.analysis.variables);
      setAnalysis({
        summary: response.analysis.summary,
        conflicts: response.analysis.conflicts.map((conflict) => ({
          description: conflict.description,
          variableIds: conflict.variableIds,
        })),
        gaps: response.analysis.gaps,
      });
      setDecisions({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, creating, sources, config]);

  const setResolution = useCallback((id: string, resolution: EditDecision['resolution']) => {
    setDecisions((prev) => ({ ...prev, [id]: { resolution, override: prev[id]?.override ?? '' } }));
  }, []);

  const setOverride = useCallback((id: string, override: string) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { resolution: prev[id]?.resolution ?? 'replace', override },
    }));
  }, []);

  const handleCreate = useCallback(async () => {
    if (analyzing || creating || sources.length === 0) return;
    const initWorkspaceSources = window.codesign?.editMode?.initWorkspaceSources;
    if (initWorkspaceSources === undefined) {
      setError('The edit mode workspace service is unavailable.');
      return;
    }
    const built = buildEditContextV2(sources, detected, decisions, analysis?.gaps ?? []);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setCreating(true);
    setError(null);
    let createdDesignId: string | null = null;
    try {
      const design = await createNewDesign(null);
      if (!design) {
        setError('Failed to create design');
        return;
      }
      createdDesignId = design.id;
      await initWorkspaceSources({
        designId: design.id,
        sources: toAnalysisSources(sources),
        editContext: built.editContext,
      });
      setView('workspace');
    } catch (err) {
      if (createdDesignId !== null) {
        try {
          await softDeleteDesign(createdDesignId);
        } catch {
          // Preserve the initialization error; the incomplete design stays deletable.
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  }, [
    analyzing,
    creating,
    sources,
    detected,
    decisions,
    analysis,
    createNewDesign,
    softDeleteDesign,
    setView,
  ]);

  const busy = analyzing || creating;
  const activeCount = detected.filter(
    (definition) =>
      (decisions[definition.id]?.resolution ?? defaultEditResolution(definition)) !== 'open',
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
          Edit Mode
        </h2>
        <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
          Combine wireframes, brand assets, briefs, existing project files, pasted text, and web
          pages. The model reads the evidence and proposes reviewable design variables.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 text-center hover:border-[var(--color-accent)] transition-colors"
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-[var(--color-text-muted)]" />
        <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Drop files here, or add sources explicitly
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          <button
            type="button"
            onClick={() => void addPickedFiles(false)}
            disabled={busy}
            className="px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Add files
          </button>
          <button
            type="button"
            onClick={() => void addPickedFiles(true)}
            disabled={busy}
            className="px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4 inline mr-1" />
            Add project file
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="edit-text-source"
            className="text-[var(--text-sm)] text-[var(--color-text-secondary)]"
          >
            Pasted text (brief, style notes, descriptor)
          </label>
          <textarea
            id="edit-text-source"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
          />
          <button
            type="button"
            onClick={addTextSource}
            disabled={busy}
            className="px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            Add text source
          </button>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="edit-url-source"
            className="text-[var(--text-sm)] text-[var(--color-text-secondary)]"
          >
            Reference URL (https only)
          </label>
          <input
            id="edit-url-source"
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
          />
          <button
            type="button"
            onClick={addUrlSource}
            disabled={busy}
            className="px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
          >
            <Globe className="w-4 h-4 inline mr-1" />
            Add URL source
          </button>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[var(--text-md)] font-medium text-[var(--color-text-primary)]">
            Sources ({sources.length})
          </h3>
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-3 border border-[var(--color-border)] rounded-[var(--radius-md)] p-2"
            >
              {source.kind !== 'text' && source.kind !== 'url' && source.previewUrl !== null && (
                <img
                  src={source.previewUrl}
                  alt=""
                  className="w-12 h-12 object-cover rounded-[var(--radius-sm)] border border-[var(--color-border)]"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-sm)] text-[var(--color-text-primary)] truncate">
                  {source.label}
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {source.kind}
                  {source.kind !== 'text' && source.kind !== 'url'
                    ? ` — ${(source.file.size / 1024).toFixed(1)} KB`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSource(source.id)}
                disabled={busy}
                aria-label={`Remove ${source.label}`}
                className="px-2 py-1 text-[var(--text-xs)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={busy}
            className="px-4 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing…' : 'Analyze sources'}
          </button>
        </div>
      )}

      {analysis !== null && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              {analysis.summary}
            </p>
          </div>

          <h3 className="text-[var(--text-md)] font-medium text-[var(--color-text-primary)]">
            Detected variables ({detected.length})
          </h3>

          <ContextReviewList
            detected={detected}
            decisions={decisions}
            onResolution={setResolution}
            onOverride={setOverride}
            disabled={busy}
            copy={REVIEW_COPY}
          />

          {analysis.conflicts.length > 0 && (
            <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
              <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                Conflicts between sources
              </p>
              <ul className="mt-1 space-y-1">
                {analysis.conflicts.map((conflict) => (
                  <li
                    key={conflict.variableIds.join('|')}
                    className="text-[var(--text-xs)] text-[var(--color-text-secondary)]"
                  >
                    {conflict.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.gaps.length > 0 && (
            <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
              <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                Deliberate gaps
              </p>
              <ul className="mt-1 space-y-1">
                {analysis.gaps.map((gap) => (
                  <li
                    key={`${gap.category}-${gap.label}`}
                    className="text-[var(--text-xs)] text-[var(--color-text-secondary)]"
                  >
                    {gap.label}: {gap.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
            <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              <strong>Rule:</strong> a variable you do not touch is preserved. Marking it{' '}
              <em>open</em> hands the decision back to the agent; <em>replace</em> records your
              explicit value. Authority and usage stay exactly as detected.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy}
            className="w-full py-2.5 text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creating workspace…' : `Start Designing (${activeCount} constraints)`}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[var(--text-sm)] rounded-[var(--radius-md)] p-3">
          {error}
        </div>
      )}
    </div>
  );
}
