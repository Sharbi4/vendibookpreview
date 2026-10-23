import { describe, it, expect } from 'vitest';
import { checkAtlasLimits, trustedClientIp, type LimitDb } from '../../../supabase/functions/atlas-agent-token/limits';

const W = [{ scope: 'min', limit: 6, minutes: 1 }, { scope: 'day', limit: 40, minutes: 1440 }];
const db = (o: Partial<LimitDb> & { counts?: Record<string, number> } = {}): LimitDb => ({
  count: o.count ?? (async (s) => o.counts?.[s] ?? 0),
  insert: o.insert ?? (async () => true),
});

describe('Atlas token rate limits', () => {
  it('ignores spoofable x-forwarded-for and uses cf-connecting-ip', () => {
    expect(trustedClientIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4' } }))).toBeNull();
    expect(trustedClientIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4', 'cf-connecting-ip': '5.6.7.8' } }))).toBe('5.6.7.8');
  });
  it('allows under caps and records both windows', async () => {
    const seen: string[] = [];
    expect(await checkAtlasLimits(db({ insert: async (s) => (seen.push(s), true) }), 'ip', W)).toBe('allowed');
    expect(seen).toEqual(['min', 'day']);
  });
  it('limits at 6 per minute and 40 per day', async () => {
    expect(await checkAtlasLimits(db({ counts: { min: 6 } }), 'ip', W)).toBe('limited');
    expect(await checkAtlasLimits(db({ counts: { day: 40 } }), 'ip', W)).toBe('limited');
  });
  it('fails closed on read, write or thrown errors', async () => {
    expect(await checkAtlasLimits(db({ count: async () => null }), 'ip', W)).toBe('unavailable');
    expect(await checkAtlasLimits(db({ insert: async () => false }), 'ip', W)).toBe('unavailable');
    expect(await checkAtlasLimits(db({ count: async () => { throw new Error('x'); } }), 'ip', W)).toBe('unavailable');
  });
});
