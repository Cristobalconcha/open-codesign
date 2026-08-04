import { describe, expect, it } from 'vitest';
import {
  buildDesignAnalysisUserPrompt,
  type DesignAnalysisSource,
  diagnoseDesignAnalysis,
  ensureCreateReviewCoverage,
  extractDesignAnalysisJson,
  parseDesignAnalysis,
} from './edit-analysis.js';

const sources: DesignAnalysisSource[] = [
  { id: 'descriptor', kind: 'document', label: 'Santa Luisa descriptor' },
];

const result = () => ({
  schemaVersion: 1,
  summary: 'A warm rural identity with explicit brand rules and guarded proposals.',
  variables: [
    {
      id: 'brand-primary-color',
      category: 'color',
      label: 'Primary brand color',
      value: { token: 'oliva-500', hex: '#6f7a52' },
      authority: 'confirmed',
      usage: 'approved',
      confidence: 'high',
      evidence: 'The palette table defines oliva-500 as the primary brand color.',
      provenance: [{ materialId: 'descriptor', locator: 'section 2' }],
      appliesTo: ['dossier', 'website'],
    },
    {
      id: 'navigation-remove-blog',
      category: 'content-architecture',
      label: 'Remove Blog from navigation',
      value: { items: ['Proyecto', 'FAQ', 'Contacto'] },
      authority: 'proposal',
      usage: 'confirm-before-use',
      confidence: 'high',
      evidence: 'The descriptor explicitly marks the reduced menu as a proposal.',
      provenance: [{ materialId: 'descriptor', locator: 'sections 6 and 10' }],
    },
  ],
  conflicts: [],
  gaps: [
    {
      category: 'imagery',
      label: 'Standard image ratios',
      reason: 'Explicitly pending definition.',
    },
  ],
});

describe('design analysis contract', () => {
  it('normalizes AI findings into reviewable variables without losing authority', () => {
    const parsed = parseDesignAnalysis(result(), sources);
    expect(parsed?.variables[0]).toMatchObject({
      resolution: 'preserve',
      detectedValue: { token: 'oliva-500', hex: '#6f7a52' },
      authority: 'confirmed',
    });
    expect(parsed?.variables[1]).toMatchObject({
      authority: 'proposal',
      usage: 'confirm-before-use',
    });
  });

  it('rejects invented provenance, duplicate variables, and malformed authority', () => {
    const invalidSource = result();
    const invalidSourceVariable = invalidSource.variables[0];
    if (invalidSourceVariable === undefined) throw new Error('Missing fixture variable');
    invalidSourceVariable.provenance[0] = { materialId: 'missing', locator: 'unknown' };
    expect(parseDesignAnalysis(invalidSource, sources)).toBeNull();

    const duplicate = result();
    const firstVariable = duplicate.variables[0];
    const secondVariable = duplicate.variables[1];
    if (firstVariable === undefined || secondVariable === undefined)
      throw new Error('Missing fixture variable');
    secondVariable.id = firstVariable.id;
    expect(parseDesignAnalysis(duplicate, sources)).toBeNull();

    const invalidAuthority = result();
    const invalidAuthorityVariable = invalidAuthority.variables[0];
    if (invalidAuthorityVariable === undefined) throw new Error('Missing fixture variable');
    invalidAuthorityVariable.authority = 'probably';
    expect(parseDesignAnalysis(invalidAuthority, sources)).toBeNull();
    expect(diagnoseDesignAnalysis(invalidAuthority, sources)).toContain(
      'variables[0].authority:invalid',
    );
  });

  it('normalizes harmless scalar and list value drift from live providers', () => {
    const scalar = result();
    const first = scalar.variables[0];
    const second = scalar.variables[1];
    if (first === undefined || second === undefined) throw new Error('Missing fixture variable');
    first.value = 'Warm and trustworthy' as never;
    second.value = ['Home', 'FAQ'] as never;
    const parsed = parseDesignAnalysis(scalar, sources);
    expect(parsed?.variables[0]?.value).toEqual({ text: 'Warm and trustworthy' });
    expect(parsed?.variables[1]?.value).toEqual({ items: ['Home', 'FAQ'] });
  });

  it('treats null optional provenance fields as absent', () => {
    const nullable = result();
    const first = nullable.variables[0];
    if (first === undefined) throw new Error('Missing fixture variable');
    first.provenance[0] = {
      materialId: 'descriptor',
      locator: null,
      excerpt: null,
    } as never;
    first.appliesTo = null as never;
    expect(parseDesignAnalysis(nullable, sources)?.variables[0]).toMatchObject({
      provenance: [{ materialId: 'descriptor' }],
    });
  });

  it('diagnoses invalid provider values without echoing private response values', () => {
    const invalid = result();
    const first = invalid.variables[0];
    if (first === undefined) throw new Error('Missing fixture variable');
    first.value = null as never;
    first.provenance = [];
    first.evidence = 'private source content';
    const diagnostics = diagnoseDesignAnalysis(invalid, sources);
    expect(diagnostics).toEqual(
      expect.arrayContaining(['variables[0].value:invalid', 'variables[0].provenance:missing']),
    );
    expect(JSON.stringify(diagnostics)).not.toContain('private source content');
  });

  it('builds an evidence manifest and extracts fenced provider JSON', () => {
    const source = sources[0];
    if (source === undefined) throw new Error('Missing source fixture');
    expect(
      buildDesignAnalysisUserPrompt([
        { ...source, text: 'Blog removal is a proposal, not a confirmed decision.' },
      ]),
    ).toContain('proposal, not a confirmed decision');
    expect(extractDesignAnalysisJson(`\n\`\`\`json\n${JSON.stringify(result())}\n\`\`\``)).toEqual(
      result(),
    );
  });

  it('demands coverage across all seven CREATE areas and gaps for absences, by default', () => {
    const prompt = buildDesignAnalysisUserPrompt(sources);
    for (const area of [
      'goal',
      'structure',
      'content',
      'visual system',
      'behavior',
      'assets and placeholders',
      'references',
    ]) {
      expect(prompt).toContain(area);
    }
    expect(prompt.toLowerCase()).toContain('gap');
    expect(prompt).not.toContain('EDIT delta review');
  });

  it('adds deterministic gaps when a CREATE provider omits checklist areas', () => {
    const parsed = parseDesignAnalysis(result(), sources);
    if (parsed === null) throw new Error('Expected valid analysis fixture');

    const covered = ensureCreateReviewCoverage(parsed, 'create');

    expect(covered.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'goal' }),
        expect.objectContaining({ category: 'structure' }),
        expect.objectContaining({ category: 'behavior' }),
        expect.objectContaining({ category: 'references' }),
      ]),
    );
    expect(ensureCreateReviewCoverage(parsed, 'edit')).toBe(parsed);
  });

  it('asks an EDIT review for only the delta, with silence meaning preserve', () => {
    const currentContext = {
      schemaVersion: 2 as const,
      materials: [
        { id: 'descriptor', path: 'references/descriptor.md', type: 'text/plain', role: 'text' },
      ],
      detected: [
        {
          id: 'brand-primary-color',
          category: 'color',
          label: 'Primary brand color',
          value: { token: 'oliva-500' },
          resolution: 'preserve' as const,
          authority: 'confirmed' as const,
          usage: 'approved' as const,
          confidence: 'high' as const,
          source: 'ai-analysis',
        },
      ],
      active: ['brand-primary-color'],
      open: [],
      generatedAt: '2026-08-01T00:00:00.000Z',
    };
    const prompt = buildDesignAnalysisUserPrompt(sources, {
      reviewMode: 'edit',
      currentContext,
    });
    expect(prompt).toContain('EDIT delta review');
    expect(prompt.toLowerCase()).toContain('silence means preserve');
    expect(prompt).toContain('oliva-500');
    expect(prompt).not.toContain('all seven areas');
  });

  it('falls back to an empty confirmed context when an EDIT review has none yet', () => {
    const prompt = buildDesignAnalysisUserPrompt(sources, {
      reviewMode: 'edit',
      currentContext: null,
    });
    expect(prompt).toContain('EDIT delta review');
    expect(prompt).toContain('"definitions":[]');
  });
});
