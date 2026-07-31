import { supabase } from '@/integrations/supabase/client';

export type BillingInterval = 'monthly' | 'quarterly' | 'annual';

export interface ProductPlan {
  id: string;
  product_id: string;
  billing_interval: BillingInterval;
  price_cents: number;
  currency: string;
  trial_days: number | null;
  provider: string;
  environment: string;
  is_active: boolean;
  display_order: number;
}

/** Active billing plans for a recurring product, cheapest interval first. */
export async function listPlansForProduct(productId: string): Promise<ProductPlan[]> {
  const { data, error } = await (supabase as any)
    .from('monetization_product_plans')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as ProductPlan[];
}

export interface StartSubscriptionInput {
  productSlug: string;
  billingInterval: BillingInterval;
  /** user_consents.id from the recurring-billing clickwrap. Required. */
  consentId: string;
  returnPath?: string;
  cancelPath?: string;
}

export interface StartSubscriptionResult {
  subscriptionId: string;
  approveUrl: string;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  tier: string;
}

/**
 * Creates a subscription server-side and returns the provider approval URL.
 * Pricing is resolved from the database — never passed from the browser.
 */
export async function startSubscription(
  input: StartSubscriptionInput,
): Promise<StartSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke('paypal-subscription-create', {
    body: {
      product_slug: input.productSlug,
      billing_interval: input.billingInterval,
      consent_id: input.consentId,
      return_path: input.returnPath,
      cancel_path: input.cancelPath,
    },
  });
  if (error) throw error;
  const payload = data as {
    error?: string;
    approve_url?: string;
    subscription_id?: string;
    amount_cents?: number;
    currency?: string;
    billing_interval?: BillingInterval;
    tier?: string;
  };
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.approve_url || !payload.subscription_id) {
    throw new Error('We could not start that subscription. Please try again.');
  }
  return {
    subscriptionId: payload.subscription_id,
    approveUrl: payload.approve_url,
    amountCents: payload.amount_cents ?? 0,
    currency: payload.currency ?? 'USD',
    billingInterval: payload.billing_interval ?? input.billingInterval,
    tier: payload.tier ?? 'starter',
  };
}
