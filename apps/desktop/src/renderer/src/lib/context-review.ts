import type { ChatMessageKind, LocalInputFile } from '@open-codesign/shared';
import {
  classifyEditSourceFile,
  type EditSource,
  MAX_EDIT_SOURCE_TEXT_CHARS,
  MAX_EDIT_SOURCES,
  nextSourceId,
  normalizeEditSourceUrl,
} from './edit-sources';

/** Reserved id for the project prompt so it never collides with `source-N`. */
export const PROMPT_SOURCE_ID = 'prompt';

/**
 * Pick `preferredId`, or the first `${preferredId}-N` (N >= 2) not already in
 * `taken`. Used for the prompt source id: a later review round on a design
 * that already has a persisted context must not reuse the `prompt` id from an
 * earlier round.
 */
function nextAvailableId(preferredId: string, taken: ReadonlySet<string>): string {
  if (!taken.has(preferredId)) return preferredId;
  for (let index = 2; index <= 10_000; index += 1) {
    const candidate = `${preferredId}-${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`No free id for "${preferredId}"`);
}

export interface CreateReviewRequest {
  prompt: string;
  attachments: LocalInputFile[];
  referenceUrl?: string | undefined;
}

function isAbsolutePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\') || value.startsWith('/');
}

function sourceFileInWorkspace(file: LocalInputFile, workspacePath: string): LocalInputFile {
  if (isAbsolutePath(file.path)) return file;
  const root = workspacePath.replace(/[\\/]+$/, '');
  const relative = file.path.replace(/^[\\/]+/, '');
  return { ...file, path: `${root}/${relative}` };
}

export interface CreateReviewSources {
  sources: EditSource[];
  /** User-visible notes for inputs that could not become evidence sources. */
  notes: string[];
}

export interface CreateReviewLabels {
  promptLabel: string;
  unsupportedFile: (name: string) => string;
  tooManySources: string;
  promptTruncated: string;
  invalidUrl: (reason: string) => string;
}

/**
 * Turn a CREATE request into evidence sources. The prompt itself is always the
 * first source — a design started from text alone still gets reviewed. Files
 * and the reference URL are additional sources; anything the analyzer cannot
 * ingest is reported as a note rather than silently dropped.
 *
 * `reservedSourceIds` are source ids already persisted in `.codesign/
 * edit-context.json` from an earlier review round on the same design (see
 * `evaluateContextReview`). A later round must not reuse them — the main
 * process merges each round's context onto the previous one by id, so a
 * collision would silently replace or invalidate prior evidence. First
 * creation passes no reserved ids and keeps the original `prompt`/`source-N`
 * ids unchanged.
 */
export function buildCreateReviewSources(
  request: CreateReviewRequest,
  labels: CreateReviewLabels,
  workspacePath: string,
  reservedSourceIds: Iterable<string> = [],
): CreateReviewSources {
  const sources: EditSource[] = [];
  const notes: string[] = [];

  const prompt = request.prompt.trim();
  if (prompt.length === 0) return { sources, notes };
  const promptText =
    prompt.length > MAX_EDIT_SOURCE_TEXT_CHARS
      ? prompt.slice(0, MAX_EDIT_SOURCE_TEXT_CHARS)
      : prompt;
  if (promptText.length !== prompt.length) notes.push(labels.promptTruncated);

  const taken = new Set<string>(reservedSourceIds);
  const promptId = nextAvailableId(PROMPT_SOURCE_ID, taken);
  taken.add(promptId);
  sources.push({
    kind: 'text',
    id: promptId,
    label: labels.promptLabel,
    text: promptText,
  });

  let capacityExceeded = false;
  for (const originalFile of request.attachments) {
    if (sources.length >= MAX_EDIT_SOURCES) {
      capacityExceeded = true;
      break;
    }
    const file = sourceFileInWorkspace(originalFile, workspacePath);
    const classification = classifyEditSourceFile(file);
    if (!classification.ok) {
      notes.push(labels.unsupportedFile(file.name));
      continue;
    }
    const id = nextSourceId(taken);
    taken.add(id);
    sources.push({
      kind: classification.kind,
      id,
      label: file.name,
      mediaType: classification.mediaType,
      file,
      previewUrl: null,
    });
  }

  const rawUrl = request.referenceUrl?.trim() ?? '';
  if (rawUrl.length > 0) {
    const normalized = normalizeEditSourceUrl(rawUrl);
    if (!normalized.ok) {
      notes.push(labels.invalidUrl(normalized.error));
    } else if (sources.length >= MAX_EDIT_SOURCES) {
      capacityExceeded = true;
    } else {
      const id = nextSourceId(taken);
      taken.add(id);
      sources.push({ kind: 'url', id, label: normalized.url, url: normalized.url });
    }
  }

  if (capacityExceeded) notes.push(labels.tooManySources);
  return { sources, notes };
}

export type ContextReviewMode = 'create' | 'edit';

/**
 * Every explicit, non-silent composer request passes through review before
 * generating — this only decides which mode. CREATE is the full checklist and
 * applies only while the design has no confirmed context AND has not yet
 * delivered a turn. `assistant_text`, `tool_call`, and `artifact_delivered`
 * rows all mean a turn already ran; a bare `user` row does not count, so a
 * first generation that failed before delivering anything is still CREATE on
 * retry. Every other case — an existing context, or a prior delivered turn
 * even without one — is an EDIT delta review against what's already confirmed.
 */
export function requiresContextReview(input: {
  hasEditContext: boolean;
  hasExistingSource?: boolean;
  chatKinds: ChatMessageKind[];
}): ContextReviewMode {
  if (input.hasEditContext || input.hasExistingSource === true) return 'edit';
  const hasDelivered = input.chatKinds.some(
    (kind) => kind === 'assistant_text' || kind === 'tool_call' || kind === 'artifact_delivered',
  );
  return hasDelivered ? 'edit' : 'create';
}
