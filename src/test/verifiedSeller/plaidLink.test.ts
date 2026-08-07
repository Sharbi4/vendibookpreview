import { describe, it, expect, vi } from 'vitest';
import { openPlaidLinkWith, type PlaidLinkNamespace } from '@/lib/plaidLink';
import { failedResultCopy } from '@/lib/verifiedSellerCopy';

/**
 * Plaid Link may fire onSuccess and close WITHOUT ever firing onExit, so the
 * promise must settle exactly once from whichever callback arrives first.
 */
function fakePlaid(): { ns: PlaidLinkNamespace; fire: Record<string, any> } {
  const fire: Record<string, any> = {};
  const ns: PlaidLinkNamespace = {
    create: (config) => {
      fire.onSuccess = config.onSuccess;
      fire.onExit = config.onExit;
      return { open: () => {}, destroy: vi.fn() };
    },
  };
  return { ns, fire };
}

describe('openPlaidLinkWith', () => {
  it('resolves on onSuccess even when onExit never fires', async () => {
    const { ns, fire } = fakePlaid();
    const promise = openPlaidLinkWith(ns, 'link-token');
    fire.onSuccess('public', {});
    await expect(promise).resolves.toEqual({ submitted: true, exited: false });
  });

  it('resolves on onExit with the display message', async () => {
    const { ns, fire } = fakePlaid();
    const promise = openPlaidLinkWith(ns, 'link-token');
    fire.onExit({ display_message: 'You closed the check.' });
    await expect(promise).resolves.toEqual({
      submitted: false,
      exited: true,
      errorMessage: 'You closed the check.',
    });
  });

  it('settles once when both callbacks fire', async () => {
    const { ns, fire } = fakePlaid();
    const promise = openPlaidLinkWith(ns, 'link-token');
    fire.onSuccess('public', {});
    fire.onExit(null);
    fire.onSuccess('public', {});
    await expect(promise).resolves.toEqual({ submitted: true, exited: false });
  });
});

describe('failed-result copy branches on payment state', () => {
  it('only claims "not charged" when the money is actually released', () => {
    expect(failedResultCopy('voided')).toMatch(/not charged/i);
    expect(failedResultCopy(null)).toMatch(/not charged/i);
  });

  it('never claims a released hold while money is still authorized or captured', () => {
    expect(failedResultCopy('authorized')).not.toMatch(/hold has been released/i);
    expect(failedResultCopy('authorized')).toMatch(/still on hold/i);
    expect(failedResultCopy('captured')).not.toMatch(/not charged/i);
    expect(failedResultCopy('refunded')).toMatch(/refunded/i);
  });
});
