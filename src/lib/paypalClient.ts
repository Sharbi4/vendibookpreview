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
  currency: string;
  components: string[];
  enable_funding: string[];
}

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
export function loadPayPalSdk(): Promise<any> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = getPayPalConfig().then((config) => {
    if (!config.enabled || !config.client_id) {
      throw new Error('PayPal is not configured yet.');
    }
    const existing = (window as any).paypal;
    if (existing) return existing;

    const params = new URLSearchParams({
      'client-id': config.client_id,
      currency: config.currency || 'USD',
      intent: 'capture',
      components: (config.components ?? ['buttons']).join(','),
    });
    if (config.enable_funding?.length) {
      params.set('enable-funding', config.enable_funding.join(','));
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      script.onload = () => {
        const ns = (window as any).paypal;
        if (ns) resolve(ns);
        else reject(new Error('PayPal did not finish loading.'));
      };
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error('We could not reach PayPal. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }).catch((err) => {
    sdkPromise = null;
    throw err;
  });

  return sdkPromise;
}
