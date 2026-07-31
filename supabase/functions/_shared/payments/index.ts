/**
 * Payment provider registry.
 *
 * `getPaymentProvider()` is the ONLY sanctioned way business logic obtains a
 * payment integration. Swapping processors is a one-line change here.
 */
import type { PaymentProvider, ProviderName } from "./types.ts";
import { PayPalProvider } from "./paypalProvider.ts";
import { DwollaProvider } from "./dwollaProvider.ts";

export * from "./types.ts";
export { PayPalProvider } from "./paypalProvider.ts";

/** Active default. Change once when we migrate off PayPal. */
export const DEFAULT_PROVIDER: ProviderName =
  (Deno.env.get("PAYMENTS_DEFAULT_PROVIDER") as ProviderName | undefined) ?? "paypal";

const registry = new Map<ProviderName, () => PaymentProvider>([
  ["paypal", () => new PayPalProvider()],
  ["dwolla", () => new DwollaProvider()],
]);

const cache = new Map<ProviderName, PaymentProvider>();

export function getPaymentProvider(name: ProviderName = DEFAULT_PROVIDER): PaymentProvider {
  const cached = cache.get(name);
  if (cached) return cached;
  const factory = registry.get(name);
  if (!factory) throw new Error(`Unknown payment provider: ${name}`);
  const instance = factory();
  cache.set(name, instance);
  return instance;
}

/** Which providers are wired up AND have credentials present. */
export function availableProviders(): { name: ProviderName; configured: boolean }[] {
  return [...registry.keys()].map((name) => {
    try {
      return { name, configured: getPaymentProvider(name).isConfigured() };
    } catch {
      return { name, configured: false };
    }
  });
}

/**
 * Fails fast at request time when the active provider is missing credentials,
 * so we never render a checkout that cannot possibly succeed.
 */
export function assertProviderConfigured(name: ProviderName = DEFAULT_PROVIDER): PaymentProvider {
  const provider = getPaymentProvider(name);
  if (!provider.isConfigured()) {
    throw new Error(`Payment provider "${name}" is not configured in this environment.`);
  }
  return provider;
}
