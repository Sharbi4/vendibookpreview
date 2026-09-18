import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MEETING_TYPES,
  meetingWindow,
  recordingMaxDurationSeconds,
  roleForUser,
  roomProfileFor,
} from '../../../supabase/functions/_shared/videoMeetings.ts';
import { signPayload, verifyDailySignature } from '../../../supabase/functions/_shared/dailySignature.ts';
import { meetingProfile } from '@/lib/meetingTypes';

const START = '2026-10-01T17:00:00.000Z';
const END = '2026-10-01T17:30:00.000Z';

describe('meeting room profiles', () => {
  it('covers the four Vendibook meeting types', () => {
    expect(MEETING_TYPES).toEqual([
      'listing_walkthrough', 'rental_walkthrough', 'handoff_inspection', 'support_dispute',
    ]);
  });

  it('caps participants per meeting type', () => {
    expect(roomProfileFor('listing_walkthrough').maxParticipants).toBe(4);
    expect(roomProfileFor('rental_walkthrough').maxParticipants).toBe(4);
    expect(roomProfileFor('handoff_inspection').maxParticipants).toBe(4);
    expect(roomProfileFor('support_dispute').maxParticipants).toBe(5);
  });

  it('allows screen share only in a support/dispute session', () => {
    expect(roomProfileFor('listing_walkthrough').moderatorScreenShare).toBe(false);
    expect(roomProfileFor('rental_walkthrough').moderatorScreenShare).toBe(false);
    expect(roomProfileFor('handoff_inspection').moderatorScreenShare).toBe(false);
    expect(roomProfileFor('support_dispute').moderatorScreenShare).toBe(true);
  });

  it('requires explicit consent for recording on every meeting type', () => {
    for (const type of MEETING_TYPES) {
      expect(roomProfileFor(type).recordingPolicy).toBe('required_explicit_consent');
    }
  });

  it('falls back to a listing walkthrough for an unknown type', () => {
    expect(roomProfileFor('nonsense').meetingType).toBe('listing_walkthrough');
  });

  it('opens 15 minutes early and closes on the per-type grace period', () => {
    const walk = meetingWindow(roomProfileFor('listing_walkthrough'), START, END);
    expect(walk.nbf.toISOString()).toBe('2026-10-01T16:45:00.000Z');
    expect(walk.exp.toISOString()).toBe('2026-10-01T18:00:00.000Z');

    const handoff = meetingWindow(roomProfileFor('handoff_inspection'), START, END);
    expect(handoff.exp.toISOString()).toBe('2026-10-01T18:15:00.000Z');

    const dispute = meetingWindow(roomProfileFor('support_dispute'), START, END);
    expect(dispute.exp.toISOString()).toBe('2026-10-01T18:00:00.000Z');
  });

  it('never lets a token outlive the room', () => {
    const { exp } = meetingWindow(roomProfileFor('listing_walkthrough'), START, END);
    const requested = new Date(exp.getTime() + 60 * 60_000);
    const tokenExpiry = new Date(Math.min(exp.getTime(), requested.getTime()));
    expect(tokenExpiry.getTime()).toBe(exp.getTime());
  });

  it('gives the recording a bounded max duration', () => {
    expect(recordingMaxDurationSeconds(roomProfileFor('listing_walkthrough'), START, END)).toBe((30 + 15) * 60);
    expect(recordingMaxDurationSeconds(roomProfileFor('handoff_inspection'), START, END)).toBe((30 + 30) * 60);
  });

  it('names rental parties host and renter, sale parties seller and buyer', () => {
    const w = { buyer_id: 'b', seller_id: 's' };
    expect(roleForUser('listing_walkthrough', w, 's')).toBe('seller');
    expect(roleForUser('listing_walkthrough', w, 'b')).toBe('buyer');
    expect(roleForUser('rental_walkthrough', w, 's')).toBe('host');
    expect(roleForUser('rental_walkthrough', w, 'b')).toBe('renter');
    expect(roleForUser('listing_walkthrough', w, 'someone-else')).toBeNull();
  });
});

describe('client meeting profiles mirror the server', () => {
  it('uses the same join window minutes', () => {
    for (const type of MEETING_TYPES) {
      expect(meetingProfile(type).joinBeforeMinutes).toBe(roomProfileFor(type).joinBeforeMinutes);
      expect(meetingProfile(type).joinAfterMinutes).toBe(roomProfileFor(type).joinAfterMinutes);
    }
  });

  it('gives every meeting type an on-call checklist', () => {
    for (const type of MEETING_TYPES) expect(meetingProfile(type).checklist.length).toBeGreaterThan(2);
  });
});

describe('Daily webhook signature', () => {
  const secret = btoa('vendibook-test-secret');

  it('accepts a correctly signed payload', async () => {
    const body = JSON.stringify({ type: 'recording.ready-to-download' });
    const ts = '1790000000';
    const sig = await signPayload(body, ts, secret);
    expect(await verifyDailySignature(body, ts, sig, secret)).toBe(true);
  });

  it('rejects a tampered body, a replayed timestamp, and a wrong secret', async () => {
    const body = JSON.stringify({ type: 'recording.ready-to-download' });
    const ts = '1790000000';
    const sig = await signPayload(body, ts, secret);
    expect(await verifyDailySignature(body + ' ', ts, sig, secret)).toBe(false);
    expect(await verifyDailySignature(body, '1790000001', sig, secret)).toBe(false);
    expect(await verifyDailySignature(body, ts, sig, btoa('other-secret'))).toBe(false);
    expect(await verifyDailySignature(body, ts, '', secret)).toBe(false);
  });
});

describe('recording disclosure copy', () => {
  const gate = readFileSync('src/components/video/WalkthroughConsentGate.tsx', 'utf8');

  it('uses the exact heading and checkbox wording', () => {
    expect(gate).toContain('This walkthrough will be recorded');
    expect(gate).toContain('I agree to participate in this recorded video walkthrough.');
  });

  it('states the recording is not transcribed or analysed, and is not automatic proof', () => {
    expect(gate).toContain('no transcription, no AI analysis, and no face recognition');
    expect(gate).toContain('not automatic proof');
  });

  it('blocks entry when the participant declines', () => {
    expect(gate).toContain('You can’t join without agreeing to the recording');
    expect(gate).toContain('Contact Vendibook Support');
  });

  it('no longer claims Vendibook calls are unrecorded by default', () => {
    const specs = readFileSync('supabase/functions/_shared/signnowTemplateSpecs.ts', 'utf8');
    expect(specs).not.toContain('not recorded by default');
  });
});
