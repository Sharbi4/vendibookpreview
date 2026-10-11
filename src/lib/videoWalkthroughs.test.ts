import { expect, it } from 'vitest';
import { walkthroughDisplayStatus } from './videoWalkthroughs';
it('keeps the join grace period and never invents attendance after it closes', () => {
  const meeting = { status: 'scheduled', ends_at: '2026-09-26T18:00:00Z' };
  expect(walkthroughDisplayStatus(meeting, Date.parse('2026-09-26T18:29:00Z'))).toBe('scheduled');
  expect(walkthroughDisplayStatus(meeting, Date.parse('2026-10-09T18:00:00Z'))).toBe('needs follow-up');
  expect(walkthroughDisplayStatus({ ...meeting, status: 'completed' }, Date.parse('2026-10-09T18:00:00Z'))).toBe('completed');
  expect(walkthroughDisplayStatus({ ...meeting, status: 'cancelled' }, Date.parse('2026-10-09T18:00:00Z'))).toBe('cancelled');
});
