// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditTab } from './EditTab';

const createNewDesign = vi.fn();
const softDeleteDesign = vi.fn();
const setView = vi.fn();

vi.mock('../../store', () => ({
  useCodesignStore: (selector: (state: unknown) => unknown) =>
    selector({ createNewDesign, softDeleteDesign, setView }),
}));

function setInputFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('EditTab', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const revokeObjectURL = vi.fn();
  const initWorkspace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:preview-${Math.random()}`),
      revokeObjectURL,
    });
    createNewDesign.mockResolvedValue({ id: 'design-1', workspacePath: 'C:/isolated' });
    initWorkspace.mockResolvedValue({ imagePath: 'references/mock.png' });
    Object.defineProperty(window, 'codesign', {
      configurable: true,
      value: { editMode: { initWorkspace } },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads, replaces, selects constraints, and creates an edit workspace', async () => {
    await act(async () => root.render(<EditTab />));
    const input = container.querySelector<HTMLInputElement>('#edit-file-input');
    expect(input).not.toBeNull();

    await act(async () =>
      setInputFile(
        input as HTMLInputElement,
        new File(['first'], 'first.png', { type: 'image/png' }),
      ),
    );
    const replace = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Replace'),
    );
    await act(async () => replace?.click());
    const replacementInput = container.querySelector<HTMLInputElement>('#edit-file-input');
    const dropZone = replacementInput?.parentElement;
    const drop = new Event('drop', { bubbles: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { files: [new File(['second'], 'diseño.png', { type: 'image/png' })] },
    });
    await act(async () => dropZone?.dispatchEvent(drop));
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    const analyze = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analyze Wireframe'),
    );
    await act(async () => analyze?.click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));

    const checkboxes = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    );
    expect(checkboxes).toHaveLength(10);
    expect(checkboxes.every((checkbox) => checkbox.checked)).toBe(true);
    await act(async () => checkboxes[0]?.click());

    const start = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Designing'),
    );
    await act(async () => start?.click());

    expect(initWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        designId: 'design-1',
        imageFileName: 'diseño.png',
        editContext: expect.objectContaining({
          active: expect.not.arrayContaining(['structure']),
          open: expect.arrayContaining(['structure']),
        }),
      }),
    );
    expect(setView).toHaveBeenCalledWith('workspace');
  });

  it('removes a newly created design when workspace initialization fails', async () => {
    initWorkspace.mockRejectedValueOnce(new Error('Disk full'));
    await act(async () => root.render(<EditTab />));
    const input = container.querySelector<HTMLInputElement>('#edit-file-input') as HTMLInputElement;
    await act(async () => setInputFile(input, new File(['ok'], 'ok.png', { type: 'image/png' })));
    const analyze = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analyze Wireframe'),
    );
    await act(async () => analyze?.click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
    const start = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Designing'),
    );
    await act(async () => start?.click());

    expect(softDeleteDesign).toHaveBeenCalledWith('design-1');
    expect(setView).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Disk full');
  });

  it('rejects oversized files and revokes the active preview on unmount', async () => {
    await act(async () => root.render(<EditTab />));
    const input = container.querySelector<HTMLInputElement>('#edit-file-input') as HTMLInputElement;
    const oversized = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 + 1 });
    await act(async () => setInputFile(input, oversized));
    expect(container.textContent).toContain('exceeds the 10 MB limit');

    await act(async () => setInputFile(input, new File(['ok'], 'ok.png', { type: 'image/png' })));
    await act(async () => root.unmount());
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });
});
