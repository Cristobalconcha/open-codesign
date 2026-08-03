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
 */
export function buildCreateReviewSources(
  request: CreateReviewRequest,
  labels: CreateReviewLabels,
  workspacePath: string,
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
  sources.push({
    kind: 'text',
    id: PROMPT_SOURCE_ID,
    label: labels.promptLabel,
    text: promptText,
  });

  const taken = new Set<string>([PROMPT_SOURCE_ID]);
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

/**
 * A design needs the pre-generation review only until it has produced
 * something. `assistant_text`, `tool_call`, and `artifact_delivered` rows all
 * mean a turn already ran, so ordinary follow-up chat stays immediate. A bare
 * `user` row does not count: a first generation that failed before delivering
 * anything must still be reviewed on retry.
 */
export function requiresContextReview(input: {
  hasEditContext: boolean;
  chatKinds: ChatMessageKind[];
}): boolean {
  if (input.hasEditContext) return false;
  return !input.chatKinds.some(
    (kind) => kind === 'assistant_text' || kind === 'tool_call' || kind === 'artifact_delivered',
  );
}
