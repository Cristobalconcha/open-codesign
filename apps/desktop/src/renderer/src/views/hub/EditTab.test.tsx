// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditTab } from './EditTab';

const createNewDesign = vi.fn();
const softDeleteDesign = vi.fn();
const setView = vi.fn();

const config = {
  hasKey: true,
  provider: 'deepseek',
  modelPrimary: 'deepseek-chat',
};

vi.mock('../../store', () => ({
  useCodesignStore: (selector: (state: unknown) => unknown) =>
    selector({ config, createNewDesign, softDeleteDesign, setView }),
}));

const createObjectURL = vi.fn(() => 'blob:preview-1');
const revokeObjectURL = vi.fn();
const NativeURL = globalThis.URL;
class TestURL extends NativeURL {}
Object.assign(TestURL, { createObjectURL, revokeObjectURL });

const analysisResponse = {
  analysis: {
    schemaVersion: 1 as const,
    summary: 'Explicit rural brand system with pending proposals and publication guards.',
    variables: [
      {
        id: 'hero-typeface',
        category: 'typography',
        label: 'Hero typeface',
        value: { family: 'Lora' },
        detectedValue: { family: 'Lora' },
        resolution: 'preserve' as const,
        authority: 'confirmed' as const,
        usage: 'approved' as const,
        confidence: 'high' as const,
        source: 'ai-analysis',
        evidence: 'The typography table reserves Lora for the hero.',
        provenance: [{ materialId: 'source-2', locator: 'section 3' }],
      },
      {
        id: 'sales-data',
        category: 'editorial-restriction',
        label: 'Sales data',
        value: { publish: false },
        detectedValue: { publish: false },
        resolution: 'preserve' as const,
        authority: 'restriction' as const,
        usage: 'private' as const,
        confidence: 'high' as const,
        source: 'ai-analysis',
        evidence: 'Sales and buyer data are marked private.',
        provenance: [{ materialId: 'source-2', locator: 'section 7' }],
      },
      {
        id: 'accent-color',
        category: 'color',
        label: 'Accent color',
        value: { hex: '#7a8b3f' },
        detectedValue: { hex: '#7a8b3f' },
        resolution: 'preserve' as const,
        authority: 'proposal' as const,
        usage: 'confirm-before-use' as const,
        confidence: 'medium' as const,
        source: 'ai-analysis',
        evidence: 'Sampled from the scanned wireframe.',
        provenance: [{ materialId: 'source-1' }],
      },
    ],
    conflicts: [],
    gaps: [
      { category: 'imagery', label: 'Aspect ratios', reason: 'The descriptor marks them pending.' },
    ],
  },
  model: { provider: 'deepseek', modelId: 'deepseek-chat' },
  usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.001 },
};

function typeInto(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('EditTab multisource flow', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const pickInputFiles = vi.fn();
  const analyze = vi.fn();
  const initWorkspaceSources = vi.fn();

  function button(text: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes(text),
    );
  }

  function radio(definitionId: string, option: string): HTMLInputElement | undefined {
    return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
      (element) => element.name === `resolution-${definitionId}` && element.value === option,
    );
  }

  async function addThreeSources(): Promise<void> {
    await act(async () => root.render(<EditTab />));
    await act(async () => button('Add files')?.click());

    const textArea = container.querySelector<HTMLTextAreaElement>('#edit-text-source');
    await act(async () => typeInto(textArea as HTMLTextAreaElement, 'Lora is hero-only. '));
    await act(async () => button('Add text source')?.click());

    const urlInput = container.querySelector<HTMLInputElement>('#edit-url-source');
    await act(async () =>
      typeInto(urlInput as HTMLInputElement, 'https://example.com/santa-luisa'),
    );
    await act(async () => button('Add URL source')?.click());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('URL', TestURL);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    pickInputFiles.mockResolvedValue([
      { path: 'C:/refs/wireframe.png', name: 'wireframe.png', size: 2048 },
    ]);
    analyze.mockResolvedValue(analysisResponse);
    initWorkspaceSources.mockResolvedValue({
      sourcePaths: {
        'source-1': 'references/wireframe.png',
        'source-2': '.codesign/sources/source-2.txt',
        'source-3': '.codesign/sources/source-3.json',
      },
    });
    createNewDesign.mockResolvedValue({ id: 'design-1', workspacePath: 'C:/isolated' });
    Object.defineProperty(window, 'codesign', {
      configurable: true,
      value: { pickInputFiles, editMode: { analyze, initWorkspaceSources } },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('analyzes file, text, and URL sources with the configured model', async () => {
    await addThreeSources();

    expect(container.textContent).toContain('Sources (3)');
    await act(async () => button('Analyze sources')?.click());

    expect(analyze).toHaveBeenCalledWith({
      analysisId: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      model: { provider: 'deepseek', modelId: 'deepseek-chat' },
      sources: [
        {
          kind: 'image',
          id: 'source-1',
          label: 'wireframe.png',
          file: { path: 'C:/refs/wireframe.png', name: 'wireframe.png', size: 2048 },
        },
        { kind: 'text', id: 'source-2', label: 'Lora is hero-only.', text: 'Lora is hero-only.' },
        {
          kind: 'url',
          id: 'source-3',
          label: 'https://example.com/santa-luisa',
          url: 'https://example.com/santa-luisa',
        },
      ],
    });
    // Authority and usage stay visible so a proposal is never reviewed as a decision.
    expect(container.textContent).toContain('restriction');
    expect(container.textContent).toContain('private');
    expect(container.textContent).toContain('proposal');
    expect(container.textContent).toContain('confirm-before-use');
  });

  it('sends a schema v2 context whose materials mirror the sources and honours each decision', async () => {
    await addThreeSources();
    await act(async () => button('Analyze sources')?.click());

    await act(async () => radio('sales-data', 'open')?.click());
    await act(async () => radio('accent-color', 'replace')?.click());
    const override = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Replacement value for Accent color"]',
    );
    await act(async () => typeInto(override as HTMLTextAreaElement, '{"hex":"#123456"}'));

    await act(async () => button('Start Designing')?.click());

    expect(createNewDesign).toHaveBeenCalledWith(null);
    const payload = initWorkspaceSources.mock.calls[0]?.[0] as {
      designId: string;
      sources: Array<{ id: string }>;
      editContext: {
        schemaVersion: number;
        materials: Array<{ id?: string; path: string; kind?: string }>;
        detected: Array<Record<string, unknown>>;
        active: string[];
        open: string[];
      };
    };
    expect(payload.designId).toBe('design-1');
    expect(payload.editContext.schemaVersion).toBe(2);
    expect(payload.editContext.materials.map((material) => material.id)).toEqual(
      payload.sources.map((source) => source.id),
    );
    expect(payload.editContext.materials.map((material) => material.kind)).toEqual([
      'image',
      'text',
      'url',
    ]);
    expect(payload.editContext.materials.every((material) => material.path.startsWith('pending/')));
    expect(payload.editContext.active).toEqual(['hero-typeface', 'accent-color']);
    expect(payload.editContext.open).toEqual(['sales-data']);
    expect(payload.editContext.detected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'hero-typeface',
          resolution: 'preserve',
          authority: 'confirmed',
          usage: 'approved',
          evidence: 'The typography table reserves Lora for the hero.',
        }),
        expect.objectContaining({
          id: 'sales-data',
          resolution: 'open',
          authority: 'restriction',
          usage: 'private',
        }),
        expect.objectContaining({
          id: 'accent-color',
          resolution: 'replace',
          authority: 'confirmed',
          usage: 'approved',
          value: { hex: '#7a8b3f' },
          overrideValue: { hex: '#123456' },
        }),
      ]),
    );
    expect(setView).toHaveBeenCalledWith('workspace');
  });

  it('refuses a non-JSON replacement before any design is created', async () => {
    await addThreeSources();
    await act(async () => button('Analyze sources')?.click());
    await act(async () => radio('hero-typeface', 'replace')?.click());
    const override = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Replacement value for Hero typeface"]',
    );
    await act(async () => typeInto(override as HTMLTextAreaElement, 'use Inter everywhere'));

    await act(async () => button('Start Designing')?.click());

    expect(createNewDesign).not.toHaveBeenCalled();
    expect(initWorkspaceSources).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Hero typeface: The replacement must be valid JSON.');
  });

  it('soft-deletes the new design when v2 initialization fails', async () => {
    initWorkspaceSources.mockRejectedValueOnce(new Error('Disk full'));
    await addThreeSources();
    await act(async () => button('Analyze sources')?.click());
    await act(async () => button('Start Designing')?.click());

    expect(softDeleteDesign).toHaveBeenCalledWith('design-1');
    expect(setView).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Disk full');
  });

  it('revokes dropped image previews on removal and on unmount', async () => {
    await act(async () => root.render(<EditTab />));
    const dropZone = container.querySelector('div[class*="border-dashed"]');
    const dropped = new File(['image'], 'mockup.png', { type: 'image/png' });
    Object.defineProperty(dropped, 'path', { value: 'C:/refs/mockup.png' });
    Object.defineProperty(dropped, 'size', { value: 4096 });
    const drop = new Event('drop', { bubbles: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [dropped] } });
    await act(async () => dropZone?.dispatchEvent(drop));
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    const second = new File(['image'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(second, 'path', { value: 'C:/refs/photo.png' });
    Object.defineProperty(second, 'size', { value: 4096 });
    const secondDrop = new Event('drop', { bubbles: true });
    Object.defineProperty(secondDrop, 'dataTransfer', { value: { files: [second] } });
    await act(async () => dropZone?.dispatchEvent(secondDrop));

    const remove = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove mockup.png"]',
    );
    await act(async () => remove?.click());
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    root = createRoot(container);
  });

  it('reports a missing model configuration instead of calling the analyzer', async () => {
    config.hasKey = false;
    try {
      await addThreeSources();
      await act(async () => button('Analyze sources')?.click());
      expect(analyze).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Configure a provider and model');
    } finally {
      config.hasKey = true;
    }
  });
});
