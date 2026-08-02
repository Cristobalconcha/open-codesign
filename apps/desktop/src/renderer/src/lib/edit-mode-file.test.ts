import { describe, expect, it } from 'vitest';
import { MAX_EDIT_REFERENCE_BYTES, validateEditReferenceFile } from './edit-mode-file';

describe('validateEditReferenceFile', () => {
  it.each([
    ['wireframe.png', 'image/png'],
    ['mock.jpg', 'image/jpeg'],
    ['mock.JPEG', 'image/jpeg'],
    ['screen.webp', 'image/webp'],
  ])('accepts %s as %s', (name, type) => {
    expect(validateEditReferenceFile({ name, type, size: 100 })).toBeNull();
  });

  it('rejects unsupported or mismatched formats', () => {
    expect(validateEditReferenceFile({ name: 'image.gif', type: 'image/gif', size: 100 })).toMatch(
      /PNG/,
    );
    expect(validateEditReferenceFile({ name: 'image.jpg', type: 'image/png', size: 100 })).toMatch(
      /extension/,
    );
  });

  it('rejects empty and oversized files', () => {
    expect(validateEditReferenceFile({ name: 'image.png', type: 'image/png', size: 0 })).toMatch(
      /empty/,
    );
    expect(
      validateEditReferenceFile({
        name: 'image.png',
        type: 'image/png',
        size: MAX_EDIT_REFERENCE_BYTES + 1,
      }),
    ).toMatch(/10 MB/);
  });
});
