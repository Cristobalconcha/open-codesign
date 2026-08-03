import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type EditContext, parseEditContext } from '@open-codesign/core';
import {
  CodesignError,
  EditAnalysisSourceInput,
  type EditAnalysisSourceInput as EditSourceInput,
  ERROR_CODES,
} from '@open-codesign/shared';
import { ipcMain } from './electron-runtime';
import { type Database, getDesign, touchDesignActivity } from './snapshots-db';
import { resolveSafeWorkspaceChildPath } from './workspace-reader';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 50 * 1024 * 1024;
/** Directories `codesign:files:v1:import-to-workspace` writes into. */
const IMPORTED_SOURCE_DIRS = ['references', 'assets'] as const;
const ALLOWED_EXTENSIONS = new Map([
  ['image/png', new Set(['.png'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/webp', new Set(['.webp'])],
]);
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export interface EditModeInitInput {
  designId: string;
  imageBase64: string;
  imageFileName: string;
  imageMediaType: string;
  editContext: EditContext;
}

export interface EditModeInitResult {
  imagePath: string;
}

export function registerEditModeIpc(db: Database): void {
  ipcMain.handle('codesign:edit-mode:v1:init-workspace', async (_event, raw: unknown) => {
    return initEditModeWorkspace(db, parseInput(raw));
  });
  ipcMain.handle('codesign:edit-mode:v2:init-workspace', async (_event, raw: unknown) => {
    return initEditModeWorkspaceSources(db, parseSourcesInput(raw));
  });
  ipcMain.handle('codesign:edit-mode:v2:read-context', async (_event, raw: unknown) => {
    return readEditModeContext(db, parseReadContextInput(raw));
  });
}

export function parseReadContextInput(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) badInput('Invalid input');
  const value = raw as Record<string, unknown>;
  if (value['schemaVersion'] !== 2) badInput('schemaVersion must be 2');
  if (typeof value['designId'] !== 'string' || value['designId'].trim().length === 0)
    badInput('designId is required');
  return value['designId'];
}

/**
 * Read the persisted edit context for a design. A missing, unreadable, or
 * schema-invalid file reads as "no context" so callers gate on a context they
 * can actually trust.
 */
export async function readEditModeContext(
  db: Database,
  designId: string,
): Promise<EditContext | null> {
  const design = getDesign(db, designId);
  if (design === null || design.workspacePath === null) return null;
  try {
    const contextPath = await resolveSafeWorkspaceChildPath(
      design.workspacePath,
      '.codesign/edit-context.json',
    );
    const raw = await readFile(contextPath, 'utf8');
    return parseEditContext(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export interface EditModeSourcesInitInput {
  designId: string;
  sources: EditSourceInput[];
  editContext: EditContext;
}

export function parseSourcesInput(raw: unknown): EditModeSourcesInitInput {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) badInput('Invalid input');
  const value = raw as Record<string, unknown>;
  if (value['schemaVersion'] !== 2) badInput('schemaVersion must be 2');
  if (typeof value['designId'] !== 'string' || value['designId'].trim().length === 0)
    badInput('designId is required');
  const sourcesResult = EditAnalysisSourceInput.array().min(1).max(20).safeParse(value['sources']);
  if (!sourcesResult.success) badInput('sources are invalid');
  const sourceIds = sourcesResult.data.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) badInput('source ids must be unique');
  const editContext = parseEditContext(value['editContext']);
  if (editContext === null || editContext.schemaVersion !== 2)
    badInput('editContext v2 is invalid');
  const materialIds = editContext.materials.map((material) => material.id);
  if (
    materialIds.some((id) => id === undefined) ||
    materialIds.length !== sourceIds.length ||
    sourceIds.some((id) => !materialIds.includes(id))
  )
    badInput('editContext materials must match source ids');
  return { designId: value['designId'], sources: sourcesResult.data, editContext };
}

function badInput(message: string): never {
  throw new CodesignError(message, ERROR_CODES.IPC_BAD_INPUT);
}

export function parseInput(raw: unknown): EditModeInitInput {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) badInput('Invalid input');
  const value = raw as Record<string, unknown>;
  if (value['schemaVersion'] !== 1) badInput('schemaVersion must be 1');

  const designId = value['designId'];
  const imageBase64 = value['imageBase64'];
  const imageFileName = value['imageFileName'];
  const imageMediaType = value['imageMediaType'];
  const editContext = value['editContext'];

  if (typeof designId !== 'string' || designId.trim().length === 0)
    badInput('designId is required');
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0)
    badInput('imageBase64 is required');
  if (typeof imageFileName !== 'string' || imageFileName.trim().length === 0) {
    badInput('imageFileName is required');
  }
  if (typeof imageMediaType !== 'string' || !ALLOWED_EXTENSIONS.has(imageMediaType)) {
    badInput('Unsupported image media type');
  }
  const extension = path.extname(imageFileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.get(imageMediaType)?.has(extension)) {
    badInput('Image file extension does not match its media type');
  }
  const parsedEditContext = parseEditContext(editContext);
  if (parsedEditContext === null) badInput('editContext is invalid');

  if (!BASE64_PATTERN.test(imageBase64)) badInput('imageBase64 is invalid');
  const imageBytes = Buffer.from(imageBase64, 'base64');
  if (imageBytes.length === 0) badInput('imageBase64 is invalid');
  if (imageBytes.length > MAX_IMAGE_BYTES) {
    throw new CodesignError('Image exceeds 10 MB limit', ERROR_CODES.ATTACHMENT_TOO_LARGE);
  }

  return {
    designId,
    imageBase64,
    imageFileName,
    imageMediaType,
    editContext: parsedEditContext,
  };
}

function safeImageName(input: string): string {
  const name = path.basename(input.trim()).replace(/[\\/:*?"<>|]/g, '-');
  return name.length > 0 ? name : 'reference-image';
}

async function reserveImagePath(
  workspaceRoot: string,
  fileName: string,
  bytes: Buffer,
): Promise<{ relativePath: string; absolutePath: string }> {
  const parsed = path.parse(safeImageName(fileName));
  const stem = parsed.name || 'reference-image';
  for (let index = 1; index < 10_000; index += 1) {
    const name = index === 1 ? `${stem}${parsed.ext}` : `${stem}-${index}${parsed.ext}`;
    const relativePath = `references/${name}`;
    const absolutePath = await resolveSafeWorkspaceChildPath(workspaceRoot, relativePath);
    try {
      await writeFile(absolutePath, bytes, { flag: 'wx' });
      return { relativePath, absolutePath };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      throw error;
    }
  }
  throw new CodesignError('Could not allocate reference filename', ERROR_CODES.IPC_DB_ERROR);
}

async function reserveSourcePath(
  workspaceRoot: string,
  directory: 'references' | '.codesign/sources',
  fileName: string,
  bytes: Buffer,
): Promise<{ relativePath: string; absolutePath: string }> {
  const parsed = path.parse(safeImageName(fileName));
  const stem = parsed.name || 'source';
  for (let index = 1; index < 10_000; index += 1) {
    const name = index === 1 ? `${stem}${parsed.ext}` : `${stem}-${index}${parsed.ext}`;
    const relativePath = `${directory}/${name}`;
    const absolutePath = await resolveSafeWorkspaceChildPath(workspaceRoot, relativePath);
    try {
      await writeFile(absolutePath, bytes, { flag: 'wx' });
      return { relativePath, absolutePath };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      throw error;
    }
  }
  throw new CodesignError('Could not allocate source filename', ERROR_CODES.IPC_DB_ERROR);
}

export async function initEditModeWorkspace(
  db: Database,
  input: EditModeInitInput,
): Promise<EditModeInitResult> {
  const design = getDesign(db, input.designId);
  if (design === null) throw new CodesignError('Design not found', ERROR_CODES.IPC_NOT_FOUND);
  if (design.workspacePath === null) {
    throw new CodesignError('Design is not bound to a workspace', ERROR_CODES.IPC_BAD_INPUT);
  }

  const workspaceRoot = design.workspacePath;
  await mkdir(await resolveSafeWorkspaceChildPath(workspaceRoot, 'references'), {
    recursive: true,
  });
  await mkdir(await resolveSafeWorkspaceChildPath(workspaceRoot, '.codesign'), { recursive: true });

  const createdPaths: string[] = [];
  try {
    const image = await reserveImagePath(
      workspaceRoot,
      input.imageFileName,
      Buffer.from(input.imageBase64, 'base64'),
    );
    createdPaths.push(image.absolutePath);

    const editContext: EditContext = {
      ...input.editContext,
      materials: input.editContext.materials.map((material, index) =>
        index === 0 ? { ...material, path: image.relativePath } : material,
      ),
    };
    const contextPath = await resolveSafeWorkspaceChildPath(
      workspaceRoot,
      '.codesign/edit-context.json',
    );
    await writeFile(contextPath, JSON.stringify(editContext, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    createdPaths.push(contextPath);
    touchDesignActivity(db, input.designId);
    return { imagePath: image.relativePath };
  } catch (error) {
    for (const createdPath of createdPaths.reverse()) {
      try {
        await unlink(createdPath);
      } catch {
        // Best-effort rollback of files created by this operation only.
      }
    }
    if (error instanceof CodesignError) throw error;
    throw new CodesignError('Failed to initialize edit mode workspace', ERROR_CODES.IPC_DB_ERROR, {
      cause: error,
    });
  }
}

function sourceExtension(source: EditSourceInput): string {
  if (source.kind === 'text') return '.txt';
  if (source.kind === 'url') return '.json';
  return path.extname(source.file.name).toLowerCase() || '.bin';
}

async function sourceBytes(source: EditSourceInput): Promise<Buffer> {
  if (source.kind === 'text') return Buffer.from(source.text, 'utf8');
  if (source.kind === 'url') {
    return Buffer.from(JSON.stringify({ url: source.url, label: source.label }, null, 2), 'utf8');
  }
  const metadata = await stat(source.file.path);
  if (!metadata.isFile()) badInput(`Source "${source.label}" is not a regular file`);
  if (metadata.size !== source.file.size)
    badInput(`Source "${source.label}" changed after selection`);
  if (metadata.size > MAX_SOURCE_BYTES) {
    throw new CodesignError(
      `Source "${source.label}" exceeds the 20 MB limit`,
      ERROR_CODES.ATTACHMENT_TOO_LARGE,
    );
  }
  return readFile(source.file.path);
}

/**
 * A file the user already imported into `references/` or `assets/` is recorded
 * in place instead of being copied a second time. Anything outside those
 * directories — including workspace-root files — is still copied, so the
 * context always points at a stable, workspace-relative source record.
 */
async function reuseImportedSourcePath(
  workspaceRoot: string,
  source: Extract<EditSourceInput, { file: unknown }>,
): Promise<{ relativePath: string; size: number } | null> {
  const absoluteRoot = path.resolve(workspaceRoot);
  const absoluteFile = path.resolve(source.file.path);
  const relative = path.relative(absoluteRoot, absoluteFile);
  if (relative.length === 0 || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const relativePath = relative.split(path.sep).join('/');
  if (!IMPORTED_SOURCE_DIRS.some((dir) => relativePath.startsWith(`${dir}/`))) return null;

  const resolved = await resolveSafeWorkspaceChildPath(workspaceRoot, relativePath);
  if (path.resolve(resolved) !== absoluteFile) return null;
  const metadata = await stat(absoluteFile);
  if (!metadata.isFile()) badInput(`Source "${source.label}" is not a regular file`);
  if (metadata.size !== source.file.size)
    badInput(`Source "${source.label}" changed after selection`);
  if (metadata.size > MAX_SOURCE_BYTES) {
    throw new CodesignError(
      `Source "${source.label}" exceeds the 20 MB limit`,
      ERROR_CODES.ATTACHMENT_TOO_LARGE,
    );
  }
  return { relativePath, size: metadata.size };
}

export async function initEditModeWorkspaceSources(
  db: Database,
  input: EditModeSourcesInitInput,
): Promise<{ sourcePaths: Record<string, string> }> {
  const design = getDesign(db, input.designId);
  if (design === null) throw new CodesignError('Design not found', ERROR_CODES.IPC_NOT_FOUND);
  if (design.workspacePath === null) {
    throw new CodesignError('Design is not bound to a workspace', ERROR_CODES.IPC_BAD_INPUT);
  }
  const workspaceRoot = design.workspacePath;
  await mkdir(await resolveSafeWorkspaceChildPath(workspaceRoot, 'references'), {
    recursive: true,
  });
  await mkdir(await resolveSafeWorkspaceChildPath(workspaceRoot, '.codesign/sources'), {
    recursive: true,
  });

  const createdPaths: string[] = [];
  const sourcePaths: Record<string, string> = {};
  let totalBytes = 0;
  try {
    for (const source of input.sources) {
      if (source.kind !== 'text' && source.kind !== 'url') {
        const reused = await reuseImportedSourcePath(workspaceRoot, source);
        if (reused !== null) {
          totalBytes += reused.size;
          if (totalBytes > MAX_TOTAL_SOURCE_BYTES) {
            throw new CodesignError(
              'Combined edit sources exceed the 50 MB limit',
              ERROR_CODES.ATTACHMENT_TOO_LARGE,
            );
          }
          sourcePaths[source.id] = reused.relativePath;
          continue;
        }
      }
      const bytes = await sourceBytes(source);
      totalBytes += bytes.length;
      if (totalBytes > MAX_TOTAL_SOURCE_BYTES) {
        throw new CodesignError(
          'Combined edit sources exceed the 50 MB limit',
          ERROR_CODES.ATTACHMENT_TOO_LARGE,
        );
      }
      const fileName =
        source.kind === 'image' || source.kind === 'asset'
          ? safeImageName(source.file.name)
          : `${source.id}${sourceExtension(source)}`;
      const directory =
        source.kind === 'image' || source.kind === 'asset' ? 'references' : '.codesign/sources';
      const reserved = await reserveSourcePath(workspaceRoot, directory, fileName, bytes);
      createdPaths.push(reserved.absolutePath);
      sourcePaths[source.id] = reserved.relativePath;
    }

    const editContext: EditContext = {
      ...input.editContext,
      materials: input.editContext.materials.map((material) => ({
        ...material,
        path: sourcePaths[material.id ?? ''] ?? material.path,
      })),
    };
    const contextPath = await resolveSafeWorkspaceChildPath(
      workspaceRoot,
      '.codesign/edit-context.json',
    );
    await writeFile(contextPath, JSON.stringify(editContext, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    createdPaths.push(contextPath);
    touchDesignActivity(db, input.designId);
    return { sourcePaths };
  } catch (error) {
    for (const createdPath of createdPaths.reverse()) {
      try {
        await unlink(createdPath);
      } catch {
        // Best-effort rollback of files created by this operation only.
      }
    }
    if (error instanceof CodesignError) throw error;
    throw new CodesignError('Failed to initialize edit mode workspace', ERROR_CODES.IPC_DB_ERROR, {
      cause: error,
    });
  }
}
