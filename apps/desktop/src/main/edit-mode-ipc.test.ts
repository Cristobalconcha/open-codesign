import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EditContext } from '@open-codesign/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildEditContextV2,
  type EditSource,
  toAnalysisSources,
} from '../renderer/src/lib/edit-sources';
import {
  initEditModeWorkspace,
  initEditModeWorkspaceSources,
  parseInput,
  parseSourcesInput,
  readEditModeContext,
  writeFileAtomic,
} from './edit-mode-ipc';
import { preparePromptContext } from './prompt-context';
import { createDesign, initInMemoryDb, updateDesignWorkspace } from './snapshots-db';

// `writeFileAtomic`'s recovery path is only reachable by making the second of
// its two `rename` calls fail. `vi.spyOn` cannot redefine a Node ESM module's
// exports, so mock the module and keep every other export as the real
// implementation — only `rename` is wrapped so a single test can force one
// call to fail while every other test in this file still hits real disk I/O.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function context(): EditContext {
  return {
    schemaVersion: 1,
    materials: [{ path: 'placeholder', type: 'image/png', role: 'wireframe' }],
    detected: [
      {
        id: 'layout',
        category: 'layout',
        label: 'Layout',
        value: {},
        confidence: 'high',
        source: 'wireframe-analysis',
        evidence: 'Visible grid',
      },
    ],
    active: ['layout'],
    open: [],
    generatedAt: '2026-08-02T00:00:00.000Z',
  };
}

async function fixture() {
  const workspace = await mkdtemp(path.join(tmpdir(), 'codesign-edit-mode-'));
  temporaryRoots.push(workspace);
  const db = initInMemoryDb();
  const design = createDesign(db, 'Edit mode test');
  updateDesignWorkspace(db, design.id, workspace);
  return { db, design, workspace };
}

function input(designId: string) {
  return {
    schemaVersion: 1,
    designId,
    imageBase64: Buffer.from('image-bytes').toString('base64'),
    imageFileName: 'mock.png',
    imageMediaType: 'image/png',
    editContext: context(),
  };
}

describe('edit mode workspace initialization', () => {
  it('writes the reference and trusted context at their exact paths', async () => {
    const { db, design, workspace } = await fixture();
    const result = await initEditModeWorkspace(db, input(design.id));

    expect(result.imagePath).toBe('references/mock.png');
    expect(await readFile(path.join(workspace, 'references/mock.png'), 'utf8')).toBe('image-bytes');
    const saved = JSON.parse(
      await readFile(path.join(workspace, '.codesign/edit-context.json'), 'utf8'),
    ) as EditContext;
    expect(saved.materials[0]?.path).toBe(result.imagePath);
    expect(saved.detected[0]?.confidence).toBe('high');
    expect(saved.detected[0]?.evidence).toBe('Visible grid');

    const prepared = await preparePromptContext({ workspaceRoot: workspace });
    expect(prepared.projectContext.editContext).toEqual(saved);
  });

  it('allocates a unique name without overwriting an existing reference', async () => {
    const { db, design, workspace } = await fixture();
    await writeFile(path.join(workspace, 'mock.png'), 'unrelated');
    await initEditModeWorkspace(db, input(design.id));
    await rm(path.join(workspace, '.codesign'), { recursive: true, force: true });
    await writeFile(path.join(workspace, 'references', 'mock.png'), 'original');

    const second = await initEditModeWorkspace(db, input(design.id));
    expect(second.imagePath).toBe('references/mock-2.png');
    expect(await readFile(path.join(workspace, 'references/mock.png'), 'utf8')).toBe('original');
  });

  it('rolls back the newly written image when the context path already exists', async () => {
    const { db, design, workspace } = await fixture();
    await initEditModeWorkspace(db, input(design.id));

    await expect(initEditModeWorkspace(db, input(design.id))).rejects.toMatchObject({
      code: 'IPC_DB_ERROR',
    });
    await expect(readFile(path.join(workspace, 'references/mock-2.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await readFile(path.join(workspace, 'references/mock.png'), 'utf8')).toBe('image-bytes');
  });

  it('rejects malformed input before touching a workspace', () => {
    expect(() => parseInput({ schemaVersion: 1 })).toThrow(/designId/);
    expect(() => parseInput({ ...input('design'), schemaVersion: 2 })).toThrow(/schemaVersion/);
    expect(() =>
      parseInput({ ...input('design'), imageMediaType: 'image/gif', schemaVersion: 1 }),
    ).toThrow(/media type/);
    expect(() => parseInput({ ...input('design'), imageBase64: '%%%=' })).toThrow(/imageBase64/);
    expect(() => parseInput({ ...input('design'), imageFileName: 'mock.webp' })).toThrow(
      /extension/,
    );
  });

  it('resolves the workspace from designId and rejects unknown designs', async () => {
    const { db } = await fixture();
    await expect(initEditModeWorkspace(db, input('missing'))).rejects.toMatchObject({
      code: 'IPC_NOT_FOUND',
    });
  });
});

describe('shared CREATE context persistence', () => {
  it('reuses an imported reference instead of copying it again', async () => {
    const { db, design, workspace } = await fixture();
    const importedPath = path.join(workspace, 'references', 'brief.md');
    await mkdir(path.dirname(importedPath), { recursive: true });
    await writeFile(importedPath, 'brand guide');
    const sources: EditSource[] = [
      { kind: 'text', id: 'prompt', label: 'Project brief', text: 'Build the landing.' },
      {
        kind: 'document',
        id: 'source-1',
        label: 'brief.md',
        mediaType: 'text/markdown',
        file: { path: importedPath, name: 'brief.md', size: 11 },
        previewUrl: null,
      },
    ];
    const built = buildEditContextV2(sources, [], {});
    if (!built.ok) throw new Error(built.error);

    const result = await initEditModeWorkspaceSources(
      db,
      parseSourcesInput({
        schemaVersion: 2,
        designId: design.id,
        sources: toAnalysisSources(sources),
        editContext: built.editContext,
      }),
    );

    expect(result.sourcePaths['source-1']).toBe('references/brief.md');
    expect(await readFile(importedPath, 'utf8')).toBe('brand guide');
    await expect(readFile(path.join(workspace, 'references', 'brief-2.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('reads only a valid persisted context for the review gate', async () => {
    const { db, design, workspace } = await fixture();
    expect(await readEditModeContext(db, design.id)).toBeNull();

    const sources: EditSource[] = [
      { kind: 'text', id: 'prompt', label: 'Project brief', text: 'Build the landing.' },
    ];
    const built = buildEditContextV2(sources, [], {});
    if (!built.ok) throw new Error(built.error);
    await initEditModeWorkspaceSources(
      db,
      parseSourcesInput({
        schemaVersion: 2,
        designId: design.id,
        sources: toAnalysisSources(sources),
        editContext: built.editContext,
      }),
    );

    expect(await readEditModeContext(db, design.id)).toEqual(
      expect.objectContaining({
        schemaVersion: 2,
        materials: [expect.objectContaining({ id: 'prompt' })],
      }),
    );
    await writeFile(path.join(workspace, '.codesign', 'edit-context.json'), '{not-json');
    expect(await readEditModeContext(db, design.id)).toBeNull();
  });
});

describe('multisource edit workspace initialization', () => {
  it('atomically persists files, text, URLs, and a schema v2 context', async () => {
    const { db, design, workspace } = await fixture();
    const imagePath = path.join(workspace, 'servilleta.png');
    await writeFile(imagePath, 'scanned-wireframe');
    const sources = [
      {
        kind: 'image' as const,
        id: 'wireframe',
        label: 'Wireframe escaneado',
        file: { path: imagePath, name: 'servilleta.png', size: 17 },
      },
      {
        kind: 'text' as const,
        id: 'descriptor',
        label: 'Descriptor Santa Luisa',
        text: 'Lora se reserva exclusivamente para el hero.',
      },
      {
        kind: 'url' as const,
        id: 'current-site',
        label: 'Sitio actual',
        url: 'https://example.com/santa-luisa',
      },
    ];
    const editContext: EditContext = {
      schemaVersion: 2,
      materials: sources.map((source) => ({
        id: source.id,
        path: 'pending',
        type:
          source.kind === 'image'
            ? 'image/png'
            : source.kind === 'text'
              ? 'text/plain'
              : 'application/json',
        role: source.kind,
        kind: source.kind,
      })),
      detected: [
        {
          id: 'hero-typeface',
          category: 'typography',
          label: 'Hero typeface',
          value: { family: 'Lora' },
          detectedValue: { family: 'Lora' },
          resolution: 'preserve',
          authority: 'confirmed',
          usage: 'approved',
          confidence: 'high',
          source: 'ai-analysis',
          evidence: 'Descriptor section 3',
          provenance: [{ materialId: 'descriptor', locator: 'section 3' }],
        },
      ],
      active: ['hero-typeface'],
      open: [],
      generatedAt: '2026-08-02T00:00:00.000Z',
    };

    const parsed = parseSourcesInput({
      schemaVersion: 2,
      designId: design.id,
      sources,
      editContext,
    });
    const result = await initEditModeWorkspaceSources(db, parsed);

    expect(result.sourcePaths).toMatchObject({
      wireframe: 'references/servilleta.png',
      descriptor: '.codesign/sources/descriptor.txt',
      'current-site': '.codesign/sources/current-site.json',
    });
    expect(await readFile(path.join(workspace, 'references/servilleta.png'), 'utf8')).toBe(
      'scanned-wireframe',
    );
    const saved = JSON.parse(
      await readFile(path.join(workspace, '.codesign/edit-context.json'), 'utf8'),
    ) as EditContext;
    expect(saved.materials.map((material) => material.path)).toEqual([
      'references/servilleta.png',
      '.codesign/sources/descriptor.txt',
      '.codesign/sources/current-site.json',
    ]);
  });

  it('accepts a context built by the renderer and replaces its placeholder paths', async () => {
    const { db, design, workspace } = await fixture();
    const imagePath = path.join(workspace, 'mockup.png');
    await writeFile(imagePath, 'mockup-bytes');
    const rendererSources: EditSource[] = [
      {
        kind: 'image',
        id: 'source-1',
        label: 'mockup.png',
        mediaType: 'image/png',
        file: { path: imagePath, name: 'mockup.png', size: 12 },
        previewUrl: null,
      },
      { kind: 'text', id: 'source-2', label: 'Descriptor', text: 'Lora is hero-only.' },
    ];
    const built = buildEditContextV2(
      rendererSources,
      [
        {
          id: 'hero-typeface',
          category: 'typography',
          label: 'Hero typeface',
          value: { family: 'Lora' },
          detectedValue: { family: 'Lora' },
          resolution: 'preserve',
          authority: 'proposal',
          usage: 'confirm-before-use',
          confidence: 'high',
          source: 'ai-analysis',
          evidence: 'Descriptor section 3',
          provenance: [{ materialId: 'source-2', locator: 'section 3' }],
        },
      ],
      { 'hero-typeface': { resolution: 'replace', override: '{"family":"Inter"}' } },
    );
    if (!built.ok) throw new Error(built.error);

    const parsed = parseSourcesInput({
      schemaVersion: 2,
      designId: design.id,
      sources: toAnalysisSources(rendererSources),
      editContext: built.editContext,
    });
    const result = await initEditModeWorkspaceSources(db, parsed);

    expect(result.sourcePaths).toMatchObject({
      'source-1': 'references/mockup.png',
      'source-2': '.codesign/sources/source-2.txt',
    });
    const saved = JSON.parse(
      await readFile(path.join(workspace, '.codesign/edit-context.json'), 'utf8'),
    ) as EditContext;
    expect(saved.materials.map((material) => material.path)).toEqual([
      'references/mockup.png',
      '.codesign/sources/source-2.txt',
    ]);
    expect(saved.detected[0]).toMatchObject({
      resolution: 'replace',
      authority: 'confirmed',
      usage: 'approved',
      overrideValue: { family: 'Inter' },
    });
  });
});

function roundOneEditContext(): EditContext {
  return {
    schemaVersion: 2,
    materials: [{ id: 'brief', path: 'pending', type: 'text/plain', role: 'text', kind: 'text' }],
    detected: [
      {
        id: 'hero-typeface',
        category: 'typography',
        label: 'Hero typeface',
        value: { family: 'Lora' },
        detectedValue: { family: 'Lora' },
        resolution: 'preserve',
        authority: 'confirmed',
        usage: 'approved',
        confidence: 'high',
        source: 'ai-analysis',
        evidence: 'Brief section 1',
        provenance: [{ materialId: 'brief', locator: 'section 1' }],
      },
      {
        id: 'color-palette',
        category: 'color',
        label: 'Color palette',
        value: { primary: '#0057B8' },
        resolution: 'open',
        authority: 'inferred',
        usage: 'confirm-before-use',
        confidence: 'low',
        source: 'ai-analysis',
        evidence: 'No swatches found in the brief',
        provenance: [{ materialId: 'brief' }],
      },
    ],
    active: ['hero-typeface'],
    open: ['color-palette'],
    generatedAt: '2026-08-02T00:00:00.000Z',
  };
}

function roundTwoEditContext(): EditContext {
  return {
    schemaVersion: 2,
    materials: [{ id: 'notes', path: 'pending', type: 'text/plain', role: 'text', kind: 'text' }],
    detected: [
      {
        id: 'hero-typeface',
        category: 'typography',
        label: 'Hero typeface',
        value: { family: 'Inter' },
        overrideValue: { family: 'Inter' },
        resolution: 'replace',
        authority: 'confirmed',
        usage: 'approved',
        confidence: 'high',
        source: 'manual-override',
        evidence: 'Follow-up note',
        provenance: [{ materialId: 'notes' }],
      },
    ],
    active: ['hero-typeface'],
    open: [],
    generatedAt: '2026-08-03T00:00:00.000Z',
  };
}

describe('multi-round context accumulation', () => {
  it('a second round adds its material and decision without failing on the existing file', async () => {
    const { db, design, workspace } = await fixture();
    await initEditModeWorkspaceSources(
      db,
      parseSourcesInput({
        schemaVersion: 2,
        designId: design.id,
        sources: [
          { kind: 'text', id: 'brief', label: 'Project brief', text: 'Build the landing.' },
        ],
        editContext: roundOneEditContext(),
      }),
    );

    const result = await initEditModeWorkspaceSources(
      db,
      parseSourcesInput({
        schemaVersion: 2,
        designId: design.id,
        sources: [
          { kind: 'text', id: 'notes', label: 'Follow-up notes', text: 'Use Inter for the hero.' },
        ],
        editContext: roundTwoEditContext(),
      }),
    );

    expect(result.sourcePaths['notes']).toBe('.codesign/sources/notes.txt');
    const saved = JSON.parse(
      await readFile(path.join(workspace, '.codesign/edit-context.json'), 'utf8'),
    ) as EditContext;
    expect(saved.schemaVersion).toBe(2);
    // Both rounds' materials survive.
    expect(saved.materials.map((material) => material.id)).toEqual(['brief', 'notes']);
    // A definition round 2 never mentioned is preserved with its prior status.
    expect(saved.detected.find((definition) => definition.id === 'color-palette')).toMatchObject({
      resolution: 'open',
    });
    expect(saved.open).toEqual(['color-palette']);
    // The definition repeated in round 2 is replaced by the new decision.
    expect(saved.detected.find((definition) => definition.id === 'hero-typeface')).toMatchObject({
      resolution: 'replace',
      overrideValue: { family: 'Inter' },
    });
    expect(saved.active).toEqual(['hero-typeface']);
  });

  it('rejects a round-2 source id that collides with a persisted material, rolling back the new file and leaving round 1 byte-for-byte intact', async () => {
    const { db, design, workspace } = await fixture();
    await initEditModeWorkspaceSources(
      db,
      parseSourcesInput({
        schemaVersion: 2,
        designId: design.id,
        sources: [
          { kind: 'text', id: 'brief', label: 'Project brief', text: 'Build the landing.' },
        ],
        editContext: roundOneEditContext(),
      }),
    );
    const contextPath = path.join(workspace, '.codesign', 'edit-context.json');
    const before = await readFile(contextPath, 'utf8');

    // Round 2 reuses the round-1 source id 'brief' — exactly the collision the
    // reservation contract (buildCreateReviewSources' reservedSourceIds) exists
    // to prevent. The merge must reject it instead of persisting a duplicate id.
    await expect(
      initEditModeWorkspaceSources(
        db,
        parseSourcesInput({
          schemaVersion: 2,
          designId: design.id,
          sources: [
            { kind: 'text', id: 'brief', label: 'Duplicate id', text: 'Second round text.' },
          ],
          editContext: {
            ...roundTwoEditContext(),
            materials: [
              { id: 'brief', path: 'pending', type: 'text/plain', role: 'text', kind: 'text' },
            ],
            detected: roundTwoEditContext().detected.map((definition) => ({
              ...definition,
              provenance: [{ materialId: 'brief' }],
            })),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'IPC_BAD_INPUT' });

    const after = await readFile(contextPath, 'utf8');
    expect(after).toBe(before);
    await expect(
      readFile(path.join(workspace, '.codesign', 'sources', 'brief-2.txt')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('writeFileAtomic', () => {
  it('restores the previous file and cleans up temp state when the final rename fails', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'codesign-atomic-'));
    temporaryRoots.push(dir);
    const filePath = path.join(dir, 'edit-context.json');
    await writeFile(filePath, 'round-1-bytes', 'utf8');

    // `rename` is the mocked export (module-mocked above); every other call
    // in this suite falls through to the real implementation it wraps. Queue
    // exactly two: writeFileAtomic's 1st rename moves the existing file aside
    // (let it succeed for real), its 2nd (temp -> target) is forced to fail.
    const actualFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    const renameMock = vi.mocked(rename);
    renameMock.mockImplementationOnce(actualFs.rename);
    renameMock.mockImplementationOnce(async () => {
      throw Object.assign(new Error('simulated disk failure'), { code: 'EIO' });
    });

    await expect(writeFileAtomic(filePath, 'round-2-bytes')).rejects.toThrow(
      'simulated disk failure',
    );

    expect(await readFile(filePath, 'utf8')).toBe('round-1-bytes');
    const entries = await readdir(dir);
    expect(entries).toEqual(['edit-context.json']);
  });
});
