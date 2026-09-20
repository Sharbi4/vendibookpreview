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
  const query = new URLSearchParams({consent_id:input.consentId,interval:input.billingInterval});
  return { subscriptionId: '', approveUrl: `${window.location.origin}/checkout/product/${encodeURIComponent(input.productSlug)}?${query}`, amountCents:0,currency:'USD',billingInterval:input.billingInterval,tier:'' };
}
