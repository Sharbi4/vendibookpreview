import { describe, expect, it } from 'vitest';
import { MONEY_ACTIONS, payoutBlockers } from '../../../supabase/functions/_shared/payoutReleasePolicy';

const payable = { status: 'pending_release', net_payout_cents: 9000 };
const rental = { payment_status: 'completed', transaction_type: 'rental', booking_request_id: 'booking' };
const completed = { status: 'completed', payment_status: 'paid' };
const sale = { payment_status: 'completed', transaction_type: 'sale', sale_transaction_id: 'sale' };
const saleReady = { ...payable, release_state: 'ready_for_review', walkthrough_media_id: 'video', walkthrough_recorded_at: '2026-10-01', signnow_document_id: 'agreement', agreement_completed_at: '2026-10-02' };

describe('manual payout completion requirements', () => {
  it('allows a paid completed rental without a dispute or hold', () => {
    expect(payoutBlockers(payable, rental, null, completed)).toEqual([]);
  });
  it.each([null, { ...completed, status: 'approved' }, { ...completed, status: 'cancelled' }, { ...completed, payment_status: 'refunded' }])('blocks an unverified or unfinished rental: %j', booking => {
    expect(payoutBlockers(payable, rental, null, booking).length).toBeGreaterThan(0);
  });
  it('blocks an orphaned rental payment', () => {
    expect(payoutBlockers(payable, { ...rental, booking_request_id: null }).length).toBeGreaterThan(0);
  });
  it('blocks rental disputes and future holds even after completion', () => {
    expect(payoutBlockers(payable, rental, null, { ...completed, dispute_status: 'open' }).length).toBeGreaterThan(0);
    expect(payoutBlockers(payable, rental, null, { ...completed, payout_hold_until: '2026-10-12' }, Date.parse('2026-10-10')).length).toBeGreaterThan(0);
    expect(payoutBlockers(payable, rental, null, { ...completed, payout_hold_until: 'invalid' }).length).toBeGreaterThan(0);
  });
  it('allows an expired rental hold', () => {
    expect(payoutBlockers(payable, rental, null, { ...completed, payout_hold_until: '2026-10-08' }, Date.parse('2026-10-10'))).toEqual([]);
  });
  it('allows a sale only when its saved walkthrough and agreement are ready', () => {
    expect(payoutBlockers(saleReady, sale, 'completed')).toEqual([]);
  });
  it.each(['walkthrough_media_id', 'walkthrough_recorded_at', 'signnow_document_id', 'agreement_completed_at', 'release_state'])('blocks missing %s even if readiness was previously recorded', field => {
    expect(payoutBlockers({ ...saleReady, [field]: null }, sale, 'completed').length).toBeGreaterThan(0);
  });
  it.each([null, 'cancelled', 'disputed', 'refunded'])('blocks an unverified or ineligible sale: %s', status => {
    expect(payoutBlockers(saleReady, sale, status).length).toBeGreaterThan(0);
  });
  it('includes retry in the dispute-checked money actions', () => {
    expect(MONEY_ACTIONS).toContain('retry');
    expect(payoutBlockers({ ...saleReady, status: 'payout_failed' }, { ...sale, dispute_status: 'open' }, 'completed').length).toBeGreaterThan(0);
  });
  it('blocks duplicate payouts and payment review', () => {
    expect(payoutBlockers({ ...saleReady, status: 'payout_completed' }, sale, 'completed').length).toBeGreaterThan(0);
    expect(payoutBlockers(saleReady, { ...sale, internal_status: 'refund_review' }, 'completed').length).toBeGreaterThan(0);
  });
});
