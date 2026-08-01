import { supabase } from '@/integrations/supabase/client';

export type ProductCategory =
  | 'listing_upgrade'
  | 'seller_service'
  | 'buyer_service'
  | 'protected_sale'
  | 'host_subscription'
  | 'permit_upgrade'
  | 'partner_service'
  | 'promo_credit';

export type BillingType = 'one_time' | 'recurring' | 'percentage' | 'custom';

export type PromoType =
  | 'featured_7'
  | 'featured_30'
  | 'top_of_search'
  | 'highlight'
  | 'motivated_seller'
  | 'email_campaign'
  | 'social_feature';

export type PurchaseStatus =
  | 'pending'
  | 'paid'
  | 'fulfilled'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export interface MonetizationProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  billing_type: BillingType;
  price_cents: number;
  currency: string;
  promo_price_cents: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  applicable_listing_types: string[];
  features: string[];
  refund_policy: string | null;
  duration_days: number | null;
  promo_type: PromoType | null;
  display_order: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

export interface MonetizationPurchase {
  id: string;
  user_id: string | null;
  product_id: string;
  listing_id: string | null;
  amount_cents: number;
  currency: string;
  status: PurchaseStatus;
  fulfillment_status: string;
  created_at: string;
  paid_at: string | null;
}

export interface ListingPromotion {
  id: string;
  listing_id: string;
  product_id: string;
  purchase_id: string;
  promo_type: PromoType;
  starts_at: string;
  ends_at: string;
  active: boolean;
  metrics: {
    impressions?: number;
    views?: number;
    saves?: number;
    messages?: number;
    offers?: number;
  };
}

export const effectivePriceCents = (p: MonetizationProduct): number => {
  const now = Date.now();
  const inPromo =
    p.promo_price_cents != null &&
    (!p.promo_starts_at || new Date(p.promo_starts_at).getTime() <= now) &&
    (!p.promo_ends_at || new Date(p.promo_ends_at).getTime() > now);
  return inPromo ? (p.promo_price_cents as number) : p.price_cents;
};

export const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

export async function listProductsByCategory(category: ProductCategory): Promise<MonetizationProduct[]> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: unknown) => {
          eq: (col: string, val: unknown) => {
            order: (col: string) => Promise<{ data: MonetizationProduct[] | null; error: Error | null }>;
          };
        };
      };
    };
  })
    .from('monetization_products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export interface StartCheckoutInput {
  productSlug: string;
  listingId?: string;
  discountCode?: string;
  successPath?: string;
  cancelPath?: string;
  /**
   * user_consents.id captured via SubscriptionConsentDialog. REQUIRED for
   * recurring products (ROSCA / CA AB 2863). Ignored for one-time products.
   */
  consentId?: string;
}

export async function startMonetizationCheckout(input: StartCheckoutInput): Promise<{ url: string }> {
  // One-time products are paid through PayPal on our own hosted checkout page.
  // Recurring plans still route through the legacy provider session below.
  const { data: product } = await (supabase as any)
    .from('monetization_products')
    .select('billing_type')
    .eq('slug', input.productSlug)
    .maybeSingle();

  if (product?.billing_type === 'one_time') {
    const search = new URLSearchParams();
    if (input.listingId) search.set('listing_id', input.listingId);
    if (input.successPath) search.set('success', input.successPath);
    if (input.cancelPath) search.set('cancel', input.cancelPath);
    const qs = search.toString();
    return {
      url: `${window.location.origin}/checkout/product/${input.productSlug}${qs ? `?${qs}` : ''}`,
    };
  }

  const { data, error } = await supabase.functions.invoke('create-monetization-checkout', {
    body: {
      product_slug: input.productSlug,
      listing_id: input.listingId,
      discount_code: input.discountCode,
      success_path: input.successPath,
      cancel_path: input.cancelPath,
      consent_id: input.consentId,
    },
  });
  if (error) throw error;
  const payload = data as { url?: string; error?: string };
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.url) throw new Error('Checkout URL missing from response');
  return { url: payload.url };
}
