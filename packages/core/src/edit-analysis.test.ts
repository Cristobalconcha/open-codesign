import { describe, expect, it } from 'vitest';
import {
  buildDesignAnalysisUserPrompt,
  type DesignAnalysisSource,
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
});
