import { describe, it, expect } from 'vitest';
import {
  badgeAllowedForMoneyState,
  canSelfServiceRetry,
  classifyVoidError,
  decideFromPlaidStatus,
  extractCaptureIdFromOrder,
  isBadgeEligible,
  needsPaymentOnly,
  plaidEnvironmentMatches,
  resolveMoneyOutcome,
  shouldApplyPlaidStatus,
  webhookConvergenceKey,
} from '../../../supabase/functions/_shared/verifiedSellerLogic';

/**
 * Verified Seller pure-logic coverage.
 *
 * Everything that can move money or light up a badge is decided here, so each
 * branch is asserted directly rather than through source-string checks.
 */
describe('decideFromPlaidStatus', () => {
  it('captures only on success', () => {
    const d = decideFromPlaidStatus('success');
    expect(d.action).toBe('capture');
    expect(d.identitySucceeded).toBe(true);
  });

  it.each(['failed', 'expired', 'canceled'] as const)('voids on %s', (status) => {
    const d = decideFromPlaidStatus(status);
    expect(d.action).toBe('void');
    expect(d.identitySucceeded).toBe(false);
  });

  it.each(['active', 'pending_review'] as const)('waits on %s', (status) => {
    expect(decideFromPlaidStatus(status).action).toBe('wait');
  });
});

describe('shouldApplyPlaidStatus (out-of-order protection)', () => {
  it('never downgrades a settled success', () => {
    expect(shouldApplyPlaidStatus('success', 'active')).toBe(false);
    expect(shouldApplyPlaidStatus('success', 'pending_review')).toBe(false);
  });

  it('accepts progress from a non-terminal state', () => {
    expect(shouldApplyPlaidStatus('active', 'pending_review')).toBe(true);
    expect(shouldApplyPlaidStatus('pending_review', 'success')).toBe(true);
  });
});

describe('badge eligibility', () => {
  const eligible = {
    identity_status: 'success',
    payment_state: 'captured',
    verified_at: '2026-01-01T00:00:00Z',
    revoked_at: null,
  };

  it('requires identity success AND a live capture', () => {
    expect(isBadgeEligible(eligible as never)).toBe(true);
    expect(isBadgeEligible({ ...eligible, payment_state: 'authorized' } as never)).toBe(false);
    expect(isBadgeEligible({ ...eligible, identity_status: 'pending_review' } as never)).toBe(false);
  });

  it('is suppressed after a refund or revocation', () => {
    expect(isBadgeEligible({ ...eligible, payment_state: 'refunded' } as never)).toBe(false);
    expect(isBadgeEligible({ ...eligible, revoked_at: '2026-01-01' } as never)).toBe(false);
  });

  it('never shows for unresolved money', () => {
    expect(badgeAllowedForMoneyState(true, 'captured')).toBe(true);
    expect(badgeAllowedForMoneyState(true, 'unresolved')).toBe(false);
    expect(badgeAllowedForMoneyState(true, 'refunded')).toBe(false);
    expect(badgeAllowedForMoneyState(false, 'captured')).toBe(false);
  });
});

describe('payment-only behaviour', () => {
  it('asks for payment when identity passed but money did not land', () => {
    expect(
      needsPaymentOnly({ identity_status: 'success', payment_state: 'voided' } as never),
    ).toBe(true);
    expect(
      needsPaymentOnly({ identity_status: 'success', payment_state: 'captured' } as never),
    ).toBe(false);
    expect(
      needsPaymentOnly({ identity_status: 'failed', payment_state: 'voided' } as never),
    ).toBe(false);
  });
});

describe('retry allowance', () => {
  it('allows one retry after a terminal failure', () => {
    expect(
      canSelfServiceRetry({ identity_status: 'failed', retry_count: 0, retry_allowance: 1 } as never),
    ).toBe(true);
  });

  it('refuses a second retry', () => {
    expect(
      canSelfServiceRetry({ identity_status: 'failed', retry_count: 1, retry_allowance: 1 } as never),
    ).toBe(false);
  });

  it('refuses while still in flight or already successful', () => {
    expect(canSelfServiceRetry({ identity_status: 'active', retry_count: 0 } as never)).toBe(false);
    expect(canSelfServiceRetry({ identity_status: 'success', retry_count: 0 } as never)).toBe(false);
    expect(canSelfServiceRetry(null)).toBe(false);
  });
});

describe('webhook convergence key', () => {
  const base = { webhookCode: 'STATUS_UPDATED', verificationId: 'idv_1' };

  it('processes each authoritative status even when raw bodies are identical', () => {
    const keys = ['active', 'pending_review', 'success'].map((s) =>
      webhookConvergenceKey({ ...base, authoritativeStatus: s }),
    );
    expect(new Set(keys).size).toBe(3);
  });

  it('coalesces exact duplicate deliveries of one state', () => {
    expect(webhookConvergenceKey({ ...base, authoritativeStatus: 'success' })).toBe(
      webhookConvergenceKey({ ...base, authoritativeStatus: 'success' }),
    );
  });

  it('separates different verifications', () => {
    expect(webhookConvergenceKey({ ...base, authoritativeStatus: 'success' })).not.toBe(
      webhookConvergenceKey({ ...base, verificationId: 'idv_2', authoritativeStatus: 'success' }),
    );
  });
});

describe('plaid environment guard', () => {
  it('accepts a matching environment only', () => {
    expect(plaidEnvironmentMatches('production', 'production')).toBe(true);
    expect(plaidEnvironmentMatches('PRODUCTION', 'production')).toBe(true);
    expect(plaidEnvironmentMatches('sandbox', 'production')).toBe(false);
    expect(plaidEnvironmentMatches(undefined, 'production')).toBe(false);
  });
});

describe('money resolution', () => {
  it('void success releases the hold and is safe to report', () => {
    const r = resolveMoneyOutcome({ void: 'confirmed' });
    expect(r).toMatchObject({ ok: true, moneyState: 'voided', safeToSayNotCharged: true });
  });

  it('void failure is unresolved and never claims "not charged"', () => {
    const r = resolveMoneyOutcome({ void: 'failed', errorCode: 'BOOM' });
    expect(r.ok).toBe(false);
    expect(r.moneyState).toBe('unresolved');
    expect(r.safeToSayNotCharged).toBe(false);
    expect(r.needsAdminAttention).toBe(true);
  });

  it('already captured then refunded settles as refunded', () => {
    const r = resolveMoneyOutcome({ alreadyCaptured: true, refund: 'succeeded' });
    expect(r).toMatchObject({ ok: true, moneyState: 'refunded', needsAdminAttention: false });
    expect(r.safeToSayNotCharged).toBe(false);
  });

  it('already captured and unresolved stays captured and escalates', () => {
    const failed = resolveMoneyOutcome({ alreadyCaptured: true, refund: 'failed' });
    expect(failed).toMatchObject({ ok: false, moneyState: 'captured', needsAdminAttention: true });

    const noCaptureId = resolveMoneyOutcome({ alreadyCaptured: true, refund: 'not_attempted' });
    expect(noCaptureId.ok).toBe(false);
    expect(noCaptureId.moneyState).toBe('captured');
  });

  it('keeps a legitimate capture when identity actually succeeded', () => {
    const r = resolveMoneyOutcome({ alreadyCaptured: true, identitySucceeded: true });
    expect(r).toMatchObject({ ok: true, moneyState: 'captured', needsAdminAttention: false });
  });
});

describe('classifyVoidError', () => {
  it('separates benign, already-captured and real failures', () => {
    expect(classifyVoidError('AUTHORIZATION_ALREADY_CAPTURED')).toBe('already_captured');
    expect(classifyVoidError('RESOURCE_NOT_FOUND')).toBe('benign');
    expect(classifyVoidError('EXPIRED authorization')).toBe('benign');
    expect(classifyVoidError('INTERNAL_SERVER_ERROR')).toBe('failed');
    expect(classifyVoidError(null)).toBe('failed');
  });
});

describe('extractCaptureIdFromOrder', () => {
  it('reads the capture id from the order resource', () => {
    expect(
      extractCaptureIdFromOrder({
        purchase_units: [{ payments: { captures: [{ id: 'CAP-1', status: 'COMPLETED' }] } }],
      }),
    ).toBe('CAP-1');
  });

  it('returns null when the order carries no capture', () => {
    expect(extractCaptureIdFromOrder({ purchase_units: [{ payments: {} }] })).toBeNull();
    expect(extractCaptureIdFromOrder(null)).toBeNull();
  });
});
