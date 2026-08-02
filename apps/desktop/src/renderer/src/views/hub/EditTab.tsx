import type { EditContext, EditContextDefinition } from '@open-codesign/core';
import { Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useCodesignStore } from '../../store';

const MVP_DEFINITIONS: Omit<EditContextDefinition, 'id' | 'confidence' | 'source' | 'evidence'>[] =
  [
    { category: 'layout', label: 'Structure', value: {} },
    { category: 'layout', label: 'Hierarchy', value: {} },
    { category: 'color', label: 'Palette', value: {} },
    { category: 'typography', label: 'Typography', value: {} },
    { category: 'spacing', label: 'Spacing', value: {} },
    { category: 'layout', label: 'Containers', value: {} },
    { category: 'component', label: 'Buttons', value: {} },
    { category: 'imagery', label: 'Image Treatment', value: {} },
    { category: 'layout', label: 'Header', value: {} },
    { category: 'motion', label: 'Animations', value: {} },
  ];

interface FileWithPreview {
  file: File;
  previewUrl: string;
}

export function EditTab() {
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState<EditContextDefinition[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createNewDesign = useCodesignStore((s) => s.createNewDesign);
  const setView = useCodesignStore((s) => s.setView);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    setError(null);
    setDetected([]);
    setActiveIds(new Set());
    const previewUrl = URL.createObjectURL(selected);
    setFile({ file: selected, previewUrl });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped?.type.startsWith('image/')) {
      setError('Please drop an image file (PNG, JPG, WEBP).');
      return;
    }
    setError(null);
    setDetected([]);
    setActiveIds(new Set());
    const previewUrl = URL.createObjectURL(dropped);
    setFile({ file: dropped, previewUrl });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      // MVP: simulate analysis with predefined definitions
      // Future: send image to vision-capable LLM for real extraction
      await new Promise((r) => setTimeout(r, 600));

      const defs: EditContextDefinition[] = MVP_DEFINITIONS.map((d) => ({
        ...d,
        id: d.label.toLowerCase().replace(/\s+/g, '-'),
        confidence: 'medium' as const,
        source: 'wireframe-analysis',
        evidence: `Detected from uploaded ${file.file.type}`,
      }));

      setDetected(defs);
      setActiveIds(new Set(defs.map((d) => d.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [file]);

  const toggleDefinition = useCallback((id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!file) return;
    setCreating(true);
    setError(null);

    try {
      const activeDefs = detected.filter((d) => activeIds.has(d.id));
      const openDefs = detected.filter((d) => !activeIds.has(d.id));

      const editContext: EditContext = {
        schemaVersion: 1,
        materials: [
          {
            path: `references/${file.file.name}`,
            type: file.file.type,
            role: 'wireframe',
            description: `Uploaded wireframe: ${file.file.name}`,
          },
        ],
        detected,
        active: activeDefs.map((d) => d.id),
        open: openDefs.map((d) => d.id),
        generatedAt: new Date().toISOString(),
      };

      // Create the design
      const design = await createNewDesign(null);
      if (!design) {
        setError('Failed to create design');
        return;
      }

      // Atomic workspace init via dedicated IPC
      if (window.codesign?.editMode?.initWorkspace) {
        const buffer = await file.file.arrayBuffer();
        const imageBase64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
        );
        await window.codesign.editMode.initWorkspace({
          designId: design.id,
          imageBase64,
          imageFileName: file.file.name,
          imageMediaType: file.file.type,
          editContext,
        });
      }

      setView('workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  }, [file, detected, activeIds, createNewDesign, setView]);

  const handleClearFile = useCallback(() => {
    if (file) URL.revokeObjectURL(file.previewUrl);
    setFile(null);
    setDetected([]);
    setActiveIds(new Set());
    setError(null);
  }, [file]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
          Edit Mode
        </h2>
        <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
          Upload a wireframe, mockup, or screenshot to start designing from reference material.
        </p>
      </div>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-xl)] p-12 text-center hover:border-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="edit-file-input"
          />
          <label htmlFor="edit-file-input" className="cursor-pointer block">
            <Upload className="w-8 h-8 mx-auto mb-3 text-[var(--color-text-muted)]" />
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              Drop a wireframe or click to browse
            </p>
            <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] mt-1">
              PNG, JPG, WEBP — max 10MB
            </p>
          </label>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <div className="flex items-start gap-4">
            <img
              src={file.previewUrl}
              alt="Wireframe preview"
              className="w-32 h-32 object-cover rounded-[var(--radius-md)] border border-[var(--color-border)]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] truncate">
                {file.file.name}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {(file.file.size / 1024).toFixed(1)} KB — {file.file.type}
              </p>
              <div className="flex gap-2 mt-3">
                {!detected.length && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-4 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing…' : 'Analyze Wireframe'}
                  </button>
                )}
                <button
                  onClick={handleClearFile}
                  className="px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detected.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[var(--text-md)] font-medium text-[var(--color-text-primary)]">
            Detected Definitions
          </h3>

          <div className="space-y-1">
            {detected.map((def) => (
              <label
                key={def.id}
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={activeIds.has(def.id)}
                  onChange={() => toggleDefinition(def.id)}
                  className="w-4 h-4 rounded border-[var(--color-border)]"
                />
                <span className="flex-1 text-[var(--text-sm)] text-[var(--color-text-primary)]">
                  {def.label}
                </span>
                <span className="text-[var(--text-xs)] text-[var(--color-text-muted)] capitalize">
                  {def.category}
                </span>
                {def.confidence && (
                  <span
                    className={`text-[var(--text-xs)] px-1.5 py-0.5 rounded ${
                      def.confidence === 'high'
                        ? 'bg-green-100 text-green-700'
                        : def.confidence === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {def.confidence}
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
            <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              <strong>Rule:</strong> Everything not defined or unchecked remains <em>open</em> for
              the system to determine.
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creating workspace…' : `Start Designing (${activeIds.size} constraints)`}
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
