/**
 * Runtime loader for the PayPal JS SDK.
 *
 * The client id is fetched from the `paypal-config` edge function at runtime
 * (never a VITE_ build-time variable) so sandbox/live can be switched without
 * a redeploy.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PayPalRuntimeConfig {
  enabled: boolean;
  environment: 'sandbox' | 'live';
  client_id: string | null;
  /** PayPal-assigned BN code. Required on the SDK script tag. */
  partner_attribution_id?: string | null;
  currency: string;
  components: string[];
  enable_funding: string[];
}

/**
 * PayPal-assigned BN code for Vendibook LC. The server sends the authoritative
 * value with the runtime config; this is the fallback so the attribute can
 * never be missing from the SDK tag.
 */
export const PARTNER_ATTRIBUTION_ID = 'VENDIBOOK_SP_PPCP';


let configPromise: Promise<PayPalRuntimeConfig> | null = null;
let sdkPromise: Promise<any> | null = null;

export function getPayPalConfig(): Promise<PayPalRuntimeConfig> {
  if (!configPromise) {
    configPromise = supabase.functions
      .invoke('paypal-config')
      .then(({ data, error }) => {
        if (error) throw error;
        return data as PayPalRuntimeConfig;
      })
      .catch((err) => {
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

/** Loads (once) and resolves the global `window.paypal` namespace. */
export interface PayPalSdkOptions {
  /**
   * Seller's PayPal merchant id. Required by PayPal when the order is routed
   * to a connected seller; omitted for first-party checkout.
   */
  merchantId?: string | null;
  /** PayPal analytics hint: which page the buttons are rendered on. */
  pageType?: 'checkout' | 'cart' | 'product-details' | 'home' | 'mini-cart' | 'search-results';
}

export function loadPayPalSdk(options: PayPalSdkOptions = {}): Promise<any> {
  return loadSdk('capture', options);
}

/**
 * Loads a SECOND, isolated SDK instance configured with `intent=authorize`.
 *
 * Used by flows that must hold funds and capture later (Verified Seller).
 * PayPal only allows one intent per SDK instance, so this mounts under its own
 * `data-namespace` and never disturbs the standard capture checkout.
 */
export function loadPayPalAuthorizeSdk(options: PayPalSdkOptions = {}): Promise<any> {
  return loadSdk('authorize', options);
}

const sdkPromises: Partial<Record<'capture' | 'authorize', Promise<any>>> = {};
let loadedKey: string | null = null;

function loadSdk(intent: 'capture' | 'authorize', options: PayPalSdkOptions = {}): Promise<any> {
  const namespace = intent === 'authorize' ? 'paypalAuthorize' : 'paypal';
  // A different payee means a different SDK instance — never reuse a cached
  // loader across merchants.
  const cacheKey = `${intent}:${options.merchantId ?? 'first-party'}`;
  if (loadedKey && loadedKey !== cacheKey) {
    sdkPromise = null;
    delete sdkPromises[intent];
  }
  loadedKey = cacheKey;
  const cached = intent === 'capture' ? sdkPromise : sdkPromises[intent];
  if (cached) return cached;

  const promise = getPayPalConfig().then((config) => {
    if (!config.enabled || !config.client_id) {
      throw new Error('PayPal is not configured yet.');
    }
    const existing = (window as any)[namespace];
    if (existing) return existing;

    const params = new URLSearchParams({
      'client-id': config.client_id,
      currency: config.currency || 'USD',
      intent,
      components: (config.components ?? ['buttons']).join(','),
      // Pay Now: buyers see "Pay Now" in PayPal, never "Continue".
      commit: intent === 'capture' ? 'true' : 'false',
    });
    // Seller-routed (Connected Path) checkout must name the payee here.
    if (options.merchantId) params.set('merchant-id', options.merchantId);
    if (config.enable_funding?.length) {
      params.set('enable-funding', config.enable_funding.join(','));
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      // Mandatory PayPal Partner attribution on the SDK tag itself.
      script.setAttribute(
        'data-partner-attribution-id',
        config.partner_attribution_id || PARTNER_ATTRIBUTION_ID,
      );
      script.setAttribute('data-page-type', options.pageType ?? 'checkout');
      if (namespace !== 'paypal') script.setAttribute('data-namespace', namespace);

      script.onload = () => {
        const ns = (window as any)[namespace];
        if (ns) resolve(ns);
        else reject(new Error('PayPal did not finish loading.'));
      };
      script.onerror = () => {
        if (intent === 'capture') sdkPromise = null;
        else delete sdkPromises[intent];
        reject(new Error('We could not reach PayPal. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }).catch((err) => {
    if (intent === 'capture') sdkPromise = null;
    else delete sdkPromises[intent];
    throw err;
  });

  if (intent === 'capture') sdkPromise = promise;
  else sdkPromises[intent] = promise;

  return promise;
}

