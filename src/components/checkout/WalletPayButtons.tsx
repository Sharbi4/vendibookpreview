import { useEffect, useRef, useState } from 'react';

import { getPayPalConfig, loadPayPalSdk } from '@/lib/paypalClient';

interface WalletPayButtonsProps {
  /** Creates the server-side PayPal order and resolves its order id. */
  startOrder: () => Promise<string>;
  /** Runs the server-verified capture/authorize step for an approved order. */
  finishOrder: (orderId: string) => Promise<void>;
  /** Surfaces a recoverable failure in the parent panel. */
  onFailure: (title: string, detail: string) => void;
  /** Order total in USD. Wallet sheets require a known amount up front. */
  totalUsd?: number;
  /** Label shown inside the wallet sheet. */
  lineItemLabel?: string;
  /** Notifies the parent when at least one wallet button rendered. */
  onAvailable?: (available: boolean) => void;
}

const GOOGLE_PAY_SCRIPT = 'https://pay.google.com/gp/p/js/pay.js';

function loadGooglePayScript(): Promise<any> {
  const existing = (window as any).google?.payments?.api;
  if (existing) return Promise.resolve((window as any).google);
  return new Promise((resolve, reject) => {
    const prior = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_PAY_SCRIPT}"]`);
    const script = prior ?? document.createElement('script');
    const done = () => {
      const g = (window as any).google;
      if (g?.payments?.api) resolve(g);
      else reject(new Error('Google Pay did not load.'));
    };
    script.addEventListener('load', done);
    script.addEventListener('error', () => reject(new Error('Google Pay did not load.')));
    if (!prior) {
      script.src = GOOGLE_PAY_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    } else if ((prior as any).__loaded) {
      done();
    }
    script.addEventListener('load', () => {
      (script as any).__loaded = true;
    });
  });
}

/**
 * Apple Pay and Google Pay express buttons rendered through the PayPal JS SDK.
 *
 * These are wallets on top of the SAME PayPal order lifecycle — the order is
 * created server-side, the wallet only supplies the payment token, and nothing
 * is treated as paid until `finishOrder` verifies the capture on the server.
 * Every failure path is recoverable: if a wallet is unavailable, ineligible or
 * errors, the buttons simply hide and the standard PayPal/card options remain.
 */
const WalletPayButtons = ({
  startOrder,
  finishOrder,
  onFailure,
  totalUsd,
  lineItemLabel = 'Vendibook order',
  onAvailable,
}: WalletPayButtonsProps) => {
  const applePayRef = useRef<HTMLDivElement>(null);
  const googlePayRef = useRef<HTMLDivElement>(null);
  const [appleReady, setAppleReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  const handlers = useRef({ startOrder, finishOrder, onFailure, totalUsd, lineItemLabel });
  handlers.current = { startOrder, finishOrder, onFailure, totalUsd, lineItemLabel };

  useEffect(() => {
    onAvailable?.(appleReady || googleReady);
  }, [appleReady, googleReady, onAvailable]);

  // ── Apple Pay ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!totalUsd || totalUsd <= 0) return;

    const ApplePaySession = (window as any).ApplePaySession;
    if (!ApplePaySession?.canMakePayments?.()) return;

    loadPayPalSdk()
      .then(async (paypal: any) => {
        if (cancelled || !paypal?.Applepay) return;
        const applepay = paypal.Applepay();
        const config = await applepay.config();
        if (cancelled || !config?.isEligible) return;
        (window as any).__vbApplePay = { applepay, config };
        setAppleReady(true);
      })
      .catch(() => {
        /* Apple Pay is an enhancement — the standard buttons still work. */
      });

    return () => {
      cancelled = true;
    };
  }, [totalUsd]);

  const payWithApple = async () => {
    const ctx = (window as any).__vbApplePay;
    const ApplePaySession = (window as any).ApplePaySession;
    if (!ctx || !ApplePaySession) return;
    const { applepay, config } = ctx;
    const amount = (handlers.current.totalUsd ?? 0).toFixed(2);

    setBusy('apple');
    try {
      const session = new ApplePaySession(4, {
        countryCode: config.countryCode || 'US',
        currencyCode: config.currencyCode || 'USD',
        merchantCapabilities: config.merchantCapabilities,
        supportedNetworks: config.supportedNetworks,
        requiredBillingContactFields: ['postalAddress', 'name'],
        total: { label: handlers.current.lineItemLabel, amount, type: 'final' },
      });

      let orderId: string | null = null;

      session.onvalidatemerchant = async (event: any) => {
        try {
          orderId = await handlers.current.startOrder();
          const payload = await applepay.validateMerchant({
            validationUrl: event.validationURL,
            displayName: 'Vendibook',
          });
          session.completeMerchantValidation(payload.merchantSession);
        } catch (err) {
          session.abort();
          setBusy(null);
          handlers.current.onFailure(
            'Apple Pay could not start',
            err instanceof Error
              ? err.message
              : 'Apple Pay is unavailable right now. Nothing was charged — use PayPal or a card instead.',
          );
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          if (!orderId) throw new Error('Order was not created.');
          await applepay.confirmOrder({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
          });
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          await handlers.current.finishOrder(orderId);
        } catch (err) {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          handlers.current.onFailure(
            'Apple Pay payment not completed',
            err instanceof Error
              ? err.message
              : 'That Apple Pay payment did not go through and nothing was charged. Please try again or use another method.',
          );
        } finally {
          setBusy(null);
        }
      };

      session.oncancel = () => setBusy(null);
      session.begin();
    } catch {
      setBusy(null);
      handlers.current.onFailure(
        'Apple Pay unavailable',
        'We could not open Apple Pay. Nothing was charged — please use PayPal or a card.',
      );
    }
  };

  // ── Google Pay ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!totalUsd || totalUsd <= 0) return;

    Promise.all([loadPayPalSdk(), getPayPalConfig(), loadGooglePayScript()])
      .then(async ([paypal, cfg, google]: any[]) => {
        if (cancelled || !paypal?.Googlepay) return;
        const googlepay = paypal.Googlepay();
        const gpConfig = await googlepay.config();
        if (cancelled || !gpConfig?.allowedPaymentMethods) return;

        const client = new google.payments.api.PaymentsClient({
          environment: cfg.environment === 'live' ? 'PRODUCTION' : 'TEST',
        });
        const ready = await client.isReadyToPay({
          apiVersion: gpConfig.apiVersion,
          apiVersionMinor: gpConfig.apiVersionMinor,
          allowedPaymentMethods: gpConfig.allowedPaymentMethods,
        });
        if (cancelled || !ready?.result) return;

        (window as any).__vbGooglePay = { googlepay, gpConfig, client };
        setGoogleReady(true);
      })
      .catch(() => {
        /* Google Pay is an enhancement — the standard buttons still work. */
      });

    return () => {
      cancelled = true;
    };
  }, [totalUsd]);

  const payWithGoogle = async () => {
    const ctx = (window as any).__vbGooglePay;
    if (!ctx) return;
    const { googlepay, gpConfig, client } = ctx;
    setBusy('google');
    let orderId: string | null = null;
    try {
      orderId = await handlers.current.startOrder();
      const paymentData = await client.loadPaymentData({
        apiVersion: gpConfig.apiVersion,
        apiVersionMinor: gpConfig.apiVersionMinor,
        allowedPaymentMethods: gpConfig.allowedPaymentMethods,
        merchantInfo: gpConfig.merchantInfo,
        transactionInfo: {
          countryCode: gpConfig.countryCode || 'US',
          currencyCode: 'USD',
          totalPriceStatus: 'FINAL',
          totalPrice: (handlers.current.totalUsd ?? 0).toFixed(2),
        },
        callbackIntents: [],
      });

      const confirmation = await googlepay.confirmOrder({
        orderId,
        paymentMethodData: paymentData.paymentMethodData,
      });
      if (confirmation?.status === 'PAYER_ACTION_REQUIRED') {
        await googlepay.initiatePayerAction({ orderId });
      }
      await handlers.current.finishOrder(orderId);
    } catch (err: any) {
      // The buyer simply closing the Google Pay sheet is not an error.
      if (err?.statusCode !== 'CANCELED') {
        handlers.current.onFailure(
          'Google Pay payment not completed',
          err instanceof Error
            ? err.message
            : 'That Google Pay payment did not go through and nothing was charged. Please try again or use another method.',
        );
      }
    } finally {
      setBusy(null);
    }
  };

  if (!appleReady && !googleReady) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Express checkout
      </p>

      {appleReady ? (
        <button
          type="button"
          ref={applePayRef as any}
          onClick={payWithApple}
          disabled={busy !== null}
          aria-label="Pay with Apple Pay"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
            <path d="M16.2 12.7c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-.9 2.4-1.9c.7-1.1 1-2.1 1-2.2 0 0-2-.8-2-3.2zM14.4 6.2c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1z" />
          </svg>
          <span className="text-sm font-semibold">{busy === 'apple' ? 'Opening…' : 'Pay'}</span>
        </button>
      ) : null}

      {googleReady ? (
        <button
          type="button"
          ref={googlePayRef as any}
          onClick={payWithGoogle}
          disabled={busy !== null}
          aria-label="Pay with Google Pay"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
              fill="#4285F4"
              d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
            />
            <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" />
            <path
              fill="#EA4335"
              d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"
            />
          </svg>
          <span className="text-sm font-semibold">{busy === 'google' ? 'Opening…' : 'Pay'}</span>
        </button>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
    </div>
  );
};

export default WalletPayButtons;
