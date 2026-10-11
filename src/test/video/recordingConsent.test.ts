import { describe, expect, it } from 'vitest';
import { hasRecordingConsent } from '../../../supabase/functions/_shared/videoRecording.ts';
import { LEGAL_VERSIONS } from '../../../supabase/functions/_shared/legalVersions.ts';

function database(rows: Record<string, unknown>[], error: unknown = null) {
  return { from(table: string) {
    if (table !== 'video_walkthrough_consents') throw new Error('Must not use global consent');
    let matching = rows;
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { matching = matching.filter(row => row[key] === value); return query; },
      limit: async () => ({ data: matching.slice(0, 1), error }),
    };
    return query;
  } };
}
const consent = { id: 'c', user_id: 'buyer', walkthrough_id: 'meeting', recording_consent_granted: true, recording_consent_version: LEGAL_VERSIONS['recording-consent'] };
describe('meeting-specific recording consent', () => {
  it('accepts current consent for this participant and meeting', async () => {
    expect(await hasRecordingConsent(database([consent]), 'meeting', 'buyer')).toBe(true);
  });
  it('rejects consent from another meeting', async () => {
    expect(await hasRecordingConsent(database([consent]), 'other', 'buyer')).toBe(false);
  });
  it('rejects an old recording notice', async () => {
    expect(await hasRecordingConsent(database([{ ...consent, recording_consent_version: 'old' }]), 'meeting', 'buyer')).toBe(false);
  });
  it('rejects another participant or missing consent', async () => {
    expect(await hasRecordingConsent(database([consent]), 'meeting', 'seller')).toBe(false);
    expect(await hasRecordingConsent(database([]), 'meeting', 'buyer')).toBe(false);
  });
  it('fails closed on a database error', async () => {
    expect(await hasRecordingConsent(database([consent], { message: 'unavailable' }), 'meeting', 'buyer')).toBe(false);
  });
});
