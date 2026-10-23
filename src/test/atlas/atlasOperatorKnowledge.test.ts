import { describe, expect, it } from 'vitest';
import { getOperatorGuidance, OPERATOR_CHAPTERS } from '@/lib/atlas/atlasOperatorKnowledge';

describe('Atlas researched operator guidance', () => {
  it('rejects unknown and inherited topic names instead of inventing an answer', () => {
    for (const topic of ['unknown', '__proto__', 'constructor', null, {}]) {
      expect(getOperatorGuidance(topic).status).toBe('unknown_topic');
    }
  });
  it('flags faster-changing platform guidance before general technical guidance', () => {
    const now = new Date('2026-11-22T00:00:00Z');
    expect(getOperatorGuidance('delivery_kitchen', now)).toMatchObject({ requiresRevalidation: true });
    expect(getOperatorGuidance('electrical', now)).toMatchObject({ requiresRevalidation: false });
    expect(getOperatorGuidance('electrical', new Date('2027-01-21T00:00:00Z'))).toMatchObject({ requiresRevalidation: true });
  });
  it('does not treat invalid or pre-review dates as fresh evidence', () => {
    for (const now of [new Date('invalid'), new Date('2026-10-22')]) {
      expect(getOperatorGuidance('economics', now)).toMatchObject({ requiresRevalidation: true });
    }
  });
  it('returns scoped sources and separates summaries from planning recommendations for every topic', () => {
    for (const topic of Object.keys(OPERATOR_CHAPTERS)) {
      const result = getOperatorGuidance(topic, new Date('2026-10-23T12:00:00Z'));
      expect(result.status).toBe('reference_guidance');
      if (!('sources' in result)) throw new Error('Missing guidance');
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.limits.length).toBeGreaterThan(0);
      for (const source of result.sources) {
        expect(new URL(source.url).protocol).toBe('https:');
        expect(source.scope.length).toBeGreaterThan(10);
      }
    }
  });
});
