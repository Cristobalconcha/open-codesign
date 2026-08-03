import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildExportHtmlDocument } from './rendered-html';

let tempDir = '';

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'codesign-rendered-html-test-'));
  mkdirSync(join(tempDir, 'assets'), { recursive: true });
  writeFileSync(join(tempDir, 'assets', 'logo.svg'), '<svg></svg>');
  writeFileSync(join(tempDir, 'assets', 'familia.mov'), Buffer.from([0, 1, 2, 3]));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('buildExportHtmlDocument', () => {
  it('inlines JSX assets before the standalone source is escaped into the runtime', async () => {
    const html = await buildExportHtmlDocument(
      'function App() { return <main><img src="assets/logo.svg" /><video src="assets/familia.mov" /></main>; }',
      {
        assetBasePath: tempDir,
        assetRootPath: tempDir,
        sourcePath: 'App.jsx',
        injectTailwind: false,
      },
    );

    expect(html).toContain('data:image/svg+xml;charset=utf-8,');
    expect(html).toContain('data:video/quicktime;base64,AAECAw==');
    expect(html).not.toContain('assets/familia.mov');
  });
});
