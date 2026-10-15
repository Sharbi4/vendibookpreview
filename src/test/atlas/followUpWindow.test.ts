import { describe, expect, it } from 'vitest';
import { followUpDueAt, formatEt, inFollowUpHours } from '../../../supabase/functions/_shared/followUpWindow';

const due = (iso: string) => followUpDueAt(new Date(iso)).toISOString();

describe('team follow-up window: 2 business hours, Mon–Fri 8 AM–8 PM ET', () => {
  it('during hours: 2 hours later', () => {
    expect(inFollowUpHours(new Date('2026-10-15T14:00:00Z'))).toBe(true); // Thu 10:00 EDT
    expect(due('2026-10-15T14:00:00Z')).toBe('2026-10-15T16:00:00.000Z');
  });
  it('late evening carries into the next business morning', () => {
    expect(due('2026-10-15T23:30:00Z')).toBe('2026-10-16T13:30:00.000Z'); // Thu 7:30 PM → Fri 9:30 AM
    expect(due('2026-10-16T23:59:00Z')).toBe('2026-10-19T13:59:00.000Z'); // Fri 7:59 PM → Mon 9:59 AM
  });
  it('weekends and early mornings start at 8 AM ET', () => {
    expect(inFollowUpHours(new Date('2026-10-17T15:00:00Z'))).toBe(false); // Saturday
    expect(due('2026-10-17T15:00:00Z')).toBe('2026-10-19T14:00:00.000Z'); // → Mon 10 AM EDT
    expect(due('2026-10-16T11:00:00Z')).toBe('2026-10-16T14:00:00.000Z'); // Fri 7 AM → 10 AM
  });
  it('handles the daylight-saving change', () => {
    expect(due('2026-11-01T15:00:00Z')).toBe('2026-11-02T15:00:00.000Z'); // Sun → Mon 10 AM EST
  });
  it('labels the time in Eastern', () => {
    expect(formatEt(new Date('2026-10-15T16:00:00Z'))).toBe('Thursday 12:00 PM ET');
  });
});
