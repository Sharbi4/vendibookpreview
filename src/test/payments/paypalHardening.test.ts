import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  assertionIssuerClientId,
  buildAuthAssertionToken,
} from '../../../supabase/functions/_shared/paypalAssertion';

const decodeSegment = (token: string, index: number) =>
  JSON.parse(atob(token.split('.')[index].replace(/-/g, '+').replace(/_/g, '/')));

describe('PayPal-Auth-Assertion is environment-aware', () => {
  const ids = { sandboxClientId: 'SANDBOX_ID', liveClientId: 'LIVE_ID' };

  it('issues the sandbox platform client id in sandbox', () => {
    expect(assertionIssuerClientId('sandbox', ids)).toBe('SANDBOX_ID');
  });

  it('issues the live platform client id in live', () => {
    expect(assertionIssuerClientId('live', ids)).toBe('LIVE_ID');
  });

  it('never leaks the live client id into a sandbox-only deployment', () => {
    expect(assertionIssuerClientId('live', { sandboxClientId: 'SANDBOX_ID', liveClientId: null }))
      .toBeNull();
  });

  it('falls back to the shared client id when no sandbox id is configured', () => {
    expect(assertionIssuerClientId('sandbox', { sandboxClientId: null, liveClientId: 'LIVE_ID' }))
      .toBe('LIVE_ID');
  });

  it('names the connected merchant as payer_id and the platform as iss', () => {
    const token = buildAuthAssertionToken('SANDBOX_ID', 'MERCHANT_9')!;
    expect(decodeSegment(token, 0)).toEqual({ alg: 'none' });
    expect(decodeSegment(token, 1)).toEqual({ iss: 'SANDBOX_ID', payer_id: 'MERCHANT_9' });
    expect(token.endsWith('.')).toBe(true);
  });

  it('produces nothing without both a client id and a merchant', () => {
    expect(buildAuthAssertionToken(null, 'MERCHANT_9')).toBeNull();
    expect(buildAuthAssertionToken('SANDBOX_ID', null)).toBeNull();
  });
});

// ── Browser SDK cache isolation ───────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({
        data: {
          enabled: true,
          environment: 'sandbox',
          intent: 'CAPTURE',
          user_action: 'CONTINUE',
          client_id: 'SANDBOX_ID',
          partner_attribution_id: 'VENDIBOOK_SP_PPCP',
          currency: 'USD',
          components: ['buttons', 'messages'],
          wallet_components: ['applepay', 'googlepay'],
          enable_funding: ['venmo', 'paylater'],
        },
        error: null,
      })),
    },
  },
}));

import {
  __resetPayPalSdkCache,
  loadPayPalAuthorizeSdk,
  loadPayPalSdk,
  preconnectPayPal,
} from '@/lib/paypalClient';

/** Resolves every injected PayPal script by publishing its namespace. */
function autoResolveScripts() {
  const observer = new MutationObserver(() => {
    document.head.querySelectorAll<HTMLScriptElement>('script[data-vb-paypal-key]').forEach((s) => {
      if ((s as any).__resolved) return;
      (s as any).__resolved = true;
      const ns = s.getAttribute('data-namespace')!;
      (window as any)[ns] = { __namespace: ns, __src: s.src };
      s.dispatchEvent(new Event('load'));
    });
  });
  observer.observe(document.head, { childList: true });
  return () => observer.disconnect();
}

describe('PayPal SDK loading is isolated by intent, merchant and components', () => {
  let stop: () => void;

  beforeEach(() => {
    __resetPayPalSdkCache();
    document.head.innerHTML = '';
    sessionStorage.clear();
    for (const key of Object.keys(window)) {
      if (key.startsWith('paypal_')) delete (window as any)[key];
    }
  });

  it('never reuses seller A\'s SDK instance for seller B', async () => {
    stop = autoResolveScripts();
    const a = await loadPayPalSdk({ merchantId: 'SELLER_A' });
    const b = await loadPayPalSdk({ merchantId: 'SELLER_B' });
    stop();
    expect(a).not.toBe(b);
    expect(a.__src).toContain('merchant-id=SELLER_A');
    expect(b.__src).toContain('merchant-id=SELLER_B');
  });

  it('keeps AUTHORIZE and CAPTURE instances side by side', async () => {
    stop = autoResolveScripts();
    const capture = await loadPayPalSdk({ merchantId: 'SELLER_A' });
    const authorize = await loadPayPalAuthorizeSdk({ merchantId: 'SELLER_A' });
    stop();
    expect(capture).not.toBe(authorize);
    expect(capture.__src).toContain('intent=capture');
    expect(authorize.__src).toContain('intent=authorize');
    // Both scripts still exist — one did not replace the other.
    expect(document.head.querySelectorAll('script[data-vb-paypal-key]').length).toBe(2);
  });

  it('returns the identical cached instance for an identical request', async () => {
    stop = autoResolveScripts();
    const first = await loadPayPalSdk({ merchantId: 'SELLER_A' });
    const second = await loadPayPalSdk({ merchantId: 'SELLER_A' });
    stop();
    expect(first).toBe(second);
    expect(document.head.querySelectorAll('script[data-vb-paypal-key]').length).toBe(1);
  });

  it('does not load card-fields unless explicitly requested', async () => {
    stop = autoResolveScripts();
    const sdk = await loadPayPalSdk({});
    stop();
    expect(sdk.__src).not.toContain('card-fields');
  });

  it('isolates advanced card fields from the wallet SDK', async () => {
    stop = autoResolveScripts();
    const wallet = await loadPayPalSdk({ merchantId: 'SELLER_A' });
    const cards = await loadPayPalSdk({ merchantId: 'SELLER_A', cardFields: true });
    stop();
    expect(cards).not.toBe(wallet);
    expect(cards.__src).toContain('card-fields');
    expect(cards.__src).toContain('merchant-id=SELLER_A');
    expect(cards.__src).toContain('intent=capture');
    expect(cards.__src).toContain('commit=false');
  });

  it('omits wallet components from an AUTHORIZE checkout', async () => {
    stop = autoResolveScripts();
    const sdk = await loadPayPalAuthorizeSdk({ merchantId: 'SELLER_A' });
    stop();
    expect(sdk.__src).not.toContain('applepay');
    expect(sdk.__src).not.toContain('googlepay');
    expect(sdk.__src).toContain('components=buttons%2Cmessages');
  });

  it('includes wallets only when a CAPTURE checkout asks for them', async () => {
    stop = autoResolveScripts();
    const sdk = await loadPayPalSdk({ merchantId: 'SELLER_A', wallets: true });
    stop();
    expect(sdk.__src).toContain('applepay');
    expect(sdk.__src).toContain('googlepay');
  });

  it('keeps the partner attribution (BN) code on the script tag', async () => {
    stop = autoResolveScripts();
    await loadPayPalSdk({});
    stop();
    const script = document.head.querySelector('script[data-vb-paypal-key]')!;
    expect(script.getAttribute('data-partner-attribution-id')).toBe('VENDIBOOK_SP_PPCP');
  });

  it('uses the v5 script host — sandbox is selected by the client id', async () => {
    stop = autoResolveScripts();
    const sdk = await loadPayPalSdk({});
    stop();
    expect(sdk.__src.startsWith('https://www.paypal.com/sdk/js?')).toBe(true);
    expect(sdk.__src).toContain('client-id=SANDBOX_ID');
    expect(sdk.__src).toContain('intent=capture');
    expect(sdk.__src).toContain('commit=false');
  });

  it('adds PayPal preconnect hints once', () => {
    preconnectPayPal();
    preconnectPayPal();
    expect(document.head.querySelectorAll('link[rel="preconnect"][href="https://www.paypal.com"]').length)
      .toBe(1);
    expect(
      document.head.querySelectorAll('link[rel="dns-prefetch"][href="https://www.paypalobjects.com"]').length,
    ).toBe(1);
  });
});
