export const MAX_EDIT_REFERENCE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EDIT_REFERENCE_TYPES = new Map([
  ['image/png', new Set(['.png'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/webp', new Set(['.webp'])],
]);

export interface EditReferenceFileMetadata {
  name: string;
  type: string;
  size: number;
}

export function validateEditReferenceFile(file: EditReferenceFileMetadata): string | null {
  const allowedExtensions = ALLOWED_EDIT_REFERENCE_TYPES.get(file.type.toLowerCase());
  if (allowedExtensions === undefined) return 'Please select a PNG, JPG, or WEBP image.';
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!allowedExtensions.has(extension)) {
    return 'The file extension does not match its image format.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return 'The selected image is empty.';
  if (file.size > MAX_EDIT_REFERENCE_BYTES) return 'The selected image exceeds the 10 MB limit.';
  return null;
}
