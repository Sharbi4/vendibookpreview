/**
 * Runtime loader for the PayPal JS SDK (v5).
 *
 * The client id is fetched from the `paypal-config` edge function at runtime
 * (never a VITE_ build-time variable) so sandbox/live can be switched without
 * a redeploy. NOTE: v5 always loads from https://www.paypal.com/sdk/js — the
 * sandbox client id is what selects the sandbox environment. Do not "fix" this
 * host. (A v6 migration, which uses a sandbox-specific host, is a separate
 * change.)
 */
import { supabase } from '@/integrations/supabase/client';

export interface PayPalRuntimeConfig {
  enabled: boolean;
  environment: 'sandbox' | 'live';
  intent: 'CAPTURE';
  user_action: 'CONTINUE';
  client_id: string | null;
  /** PayPal-assigned BN code. Required on the SDK script tag. */
  partner_attribution_id?: string | null;
  currency: string;
  components: string[];
  /** Wallet components, added only for a CAPTURE checkout. */
  wallet_components?: string[];
  enable_funding: string[];
}

/**
 * PayPal-assigned BN code for Vendibook LC. The server sends the authoritative
 * value with the runtime config; this is the fallback so the attribute can
 * never be missing from the SDK tag.
 */
export const PARTNER_ATTRIBUTION_ID = 'VENDIBOOK_SP_PPCP';

let configPromise: Promise<PayPalRuntimeConfig> | null = null;

/**
 * The runtime config only changes when the environment is switched, so a short
 * per-tab cache removes a cold-start edge call from every checkout paint. The
 * client id it carries is publishable; nothing secret is stored.
 */
const CONFIG_CACHE_KEY = 'vb:paypal-config:v2';
const CONFIG_TTL_MS = 10 * 60 * 1000;

function readCachedConfig(): PayPalRuntimeConfig | null {
  try {
    const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; config: PayPalRuntimeConfig };
    if (!parsed?.at || Date.now() - parsed.at > CONFIG_TTL_MS) return null;
    if (parsed.config?.intent !== 'CAPTURE' || parsed.config?.user_action !== 'CONTINUE') return null;
    return parsed.config ?? null;
  } catch {
    return null;
  }
}

export function getPayPalConfig(): Promise<PayPalRuntimeConfig> {
  if (!configPromise) {
    const cached = readCachedConfig();
    if (cached?.client_id) {
      configPromise = Promise.resolve(cached);
      return configPromise;
    }
    configPromise = supabase.functions
      .invoke('paypal-config')
      .then(({ data, error }) => {
        if (error) throw error;
        const config = data as PayPalRuntimeConfig;
        // Never cache a disabled/unconfigured response — that would keep
        // checkout switched off for the rest of the session.
        if (!config?.enabled || !config.client_id) return config;
        try {
          sessionStorage.setItem(
            CONFIG_CACHE_KEY,
            JSON.stringify({ at: Date.now(), config }),
          );
        } catch {
          /* private mode — fall back to a network fetch next time */
        }
        return config;
      })
      .catch((err) => {
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

/**
 * One-time DNS/connection warm-up for PayPal's script and asset hosts. Costs
 * nothing, creates no order, and shaves the TLS handshake off the first SDK
 * fetch when the buyer reaches the payment step.
 */
export function preconnectPayPal(): void {
  if (typeof document === 'undefined') return;
  const hosts = ['https://www.paypal.com', 'https://www.paypalobjects.com'];
  for (const host of hosts) {
    for (const rel of ['dns-prefetch', 'preconnect']) {
      const selector = `link[rel="${rel}"][href="${host}"]`;
      if (document.head.querySelector(selector)) continue;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = host;
      if (rel === 'preconnect') link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }
}

/** Loads (once per exact configuration) and resolves a `window.paypal*` namespace. */
export interface PayPalSdkOptions {
  /**
   * Seller's PayPal merchant id. Required by PayPal when the order is routed
   * to a connected seller; omitted for first-party checkout.
   */
  merchantId?: string | null;
  /** PayPal analytics hint: which page the buttons are rendered on. */
  pageType?: 'checkout' | 'cart' | 'product-details' | 'home' | 'mini-cart' | 'search-results';
  /**
   * Adds the wallet components (Apple Pay / Google Pay). Only meaningful for a
   * CAPTURE checkout, where WalletPayButtons actually renders.
   */
  wallets?: boolean;
}

export function loadPayPalSdk(options: PayPalSdkOptions = {}): Promise<any> {
  return loadSdk(null, options);
}

/**
 * Loads an SDK instance configured with `intent=authorize`.
 *
 * Used by flows that must hold funds and capture later. PayPal only allows one
 * intent per SDK instance, so this mounts under its own `data-namespace` and
 * never disturbs a capture checkout loaded in the same tab.
 */
export function loadPayPalAuthorizeSdk(options: PayPalSdkOptions = {}): Promise<any> {
  return loadSdk('authorize', options);
}

/**
 * Every distinct (environment + client id + intent + merchant + component set)
 * combination is its own SDK instance with its own namespace. A namespace is
 * NEVER shared across merchants or intents: reusing seller A's SDK for seller
 * B would pay the wrong payee, and reusing a CAPTURE namespace for an
 * AUTHORIZE order makes PayPal reject the approval.
 */
const sdkPromises = new Map<string, Promise<any>>();
const warmSdkSignatures = new Set<string>();

function sdkSignature(intent: 'capture' | 'authorize', options: PayPalSdkOptions): string {
  return `${intent}|${options.merchantId || 'first-party'}|${options.wallets === true}`;
}

/** Synchronous hint used only to avoid flashing a skeleton after preloading. */
export function isPayPalSdkWarm(
  intent: 'CAPTURE' | 'AUTHORIZE',
  options: PayPalSdkOptions = {},
): boolean {
  return warmSdkSignatures.has(sdkSignature(intent.toLowerCase() as 'capture' | 'authorize', options));
}

/** Stable, DOM-safe namespace suffix derived from the full cache key. */
function namespaceFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `paypal_${hash.toString(36)}`;
}

function componentsFor(config: PayPalRuntimeConfig, intent: 'capture' | 'authorize', wallets: boolean): string[] {
  const base = config.components?.length ? [...config.components] : ['buttons', 'messages'];
  // Wallets are only rendered on a CAPTURE checkout; never ship those bundles
  // to an AUTHORIZE checkout that cannot use them.
  if (intent === 'capture' && wallets) {
    for (const c of config.wallet_components ?? ['applepay', 'googlepay']) {
      if (!base.includes(c)) base.push(c);
    }
  }
  return base.filter((c) => c !== 'card-fields');
}

function loadSdk(requestedIntent: 'authorize' | null, options: PayPalSdkOptions = {}): Promise<any> {
  const wallets = options.wallets === true;
  const merchant = options.merchantId || 'first-party';

  const promise = getPayPalConfig().then((config) => {
    if (!config.enabled || !config.client_id) {
      throw new Error('PayPal is not configured yet.');
    }
    // Normal checkout always follows the server-provided canonical intent.
    // The explicit authorize branch is only for separate verification holds.
    const intent = requestedIntent ?? config.intent.toLowerCase();
    const components = componentsFor(config, intent, wallets);
    const key = [
      config.environment,
      config.client_id,
      intent,
      merchant,
      components.join('+'),
    ].join('|');

    const cached = sdkPromises.get(key);
    if (cached) return cached;

    const namespace = namespaceFor(key);
    const loader = new Promise<any>((resolve, reject) => {
      const existing = (window as any)[namespace];
      if (existing) {
        resolve(existing);
        return;
      }

      const params = new URLSearchParams({
        'client-id': config.client_id as string,
        currency: config.currency || 'USD',
        intent,
        components: components.join(','),
        // `CONTINUE` returns the buyer for Vendibook's final review. It is
        // independent of CAPTURE vs AUTHORIZE and therefore always false here.
        commit: config.user_action === 'CONTINUE' ? 'false' : 'true',
      });
      // Seller-routed (Connected Path) checkout must name the payee here.
      if (options.merchantId) params.set('merchant-id', options.merchantId);
      // Sandbox-only: makes funding eligibility deterministic while testing.
      // Never sent in live.
      if (config.environment === 'sandbox') params.set('buyer-country', 'US');
      if (config.enable_funding?.length) {
        params.set('enable-funding', config.enable_funding.join(','));
      }

      const src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      // Reuse an identical script tag rather than downloading it twice.
      const prior = document.head.querySelector<HTMLScriptElement>(
        `script[data-vb-paypal-key="${namespace}"]`,
      );
      const script = prior ?? document.createElement('script');

      const settle = () => {
        const ns = (window as any)[namespace];
        if (ns) resolve(ns);
        else reject(new Error('PayPal did not finish loading.'));
      };

      script.addEventListener('load', settle);
      script.addEventListener('error', () => {
        sdkPromises.delete(key);
        script.remove();
        reject(new Error('We could not reach PayPal. Check your connection and try again.'));
      });

      if (!prior) {
        script.src = src;
        script.async = true;
        script.setAttribute('data-vb-paypal-key', namespace);
        // Mandatory PayPal Partner attribution on the SDK tag itself.
        script.setAttribute(
          'data-partner-attribution-id',
          config.partner_attribution_id || PARTNER_ATTRIBUTION_ID,
        );
        script.setAttribute('data-page-type', options.pageType ?? 'checkout');
        script.setAttribute('data-namespace', namespace);
        document.head.appendChild(script);
      } else if ((prior as any).__vbLoaded) {
        settle();
      }
      script.addEventListener('load', () => {
        (script as any).__vbLoaded = true;
      });
    }).catch((err) => {
      sdkPromises.delete(key);
      throw err;
    });

    sdkPromises.set(key, loader);
    return loader;
  });

  return promise.then((paypal) => {
    warmSdkSignatures.add(sdkSignature(requestedIntent ?? 'capture', options));
    return paypal;
  });
}

/** Test-only: forget every cached SDK instance. */
export function __resetPayPalSdkCache(): void {
  sdkPromises.clear();
  warmSdkSignatures.clear();
}
