import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EditContext } from '@open-codesign/core';
import { afterEach, describe, expect, it } from 'vitest';
import { initEditModeWorkspace, parseInput } from './edit-mode-ipc';
import { preparePromptContext } from './prompt-context';
import { createDesign, initInMemoryDb, updateDesignWorkspace } from './snapshots-db';

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
