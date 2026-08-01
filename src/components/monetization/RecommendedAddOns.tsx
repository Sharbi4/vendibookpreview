import { useState } from 'react';
import { Loader2, ArrowRight, BadgePercent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import {
  useProductRecommendations,
  type RecommendationContext,
} from '@/hooks/useProductRecommendations';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { startMonetizationCheckout, type MonetizationProduct } from '@/lib/monetization/products';

interface Props {
  context: RecommendationContext;
  listingId?: string;
  listingType?: 'rent' | 'sale' | string;
  heading?: string;
  subheading?: string;
  className?: string;
  limit?: number;
}

const fmt = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export function RecommendedAddOns({
  context,
  listingId,
  listingType,
  heading = 'Recommended for you',
  subheading,
  className = '',
  limit = 3,
}: Props) {
  const { data: products, isLoading } = useProductRecommendations({ context, listingType, limit });
  const entitlements = useHostEntitlements();
  const [busy, setBusy] = useState<string | null>(null);
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!products?.length) return null;

  const handleBuy = async (product: MonetizationProduct) => {
    // Recurring subscriptions must pass through the consent gate; one-time
    // add-ons go to our hosted PayPal product checkout.
    if (product.billing_type === 'recurring') {
      await requestCheckout(product, {
        successPath: '/dashboard?purchase=success',
        cancelPath: window.location.pathname + '?purchase=cancelled',
      });
      return;
    }
    setBusy(product.slug);
    try {
      const { url } = await startMonetizationCheckout({
        productSlug: product.slug,
        listingId,
        successPath: '/dashboard?purchase=success',
        cancelPath: window.location.pathname + '?purchase=cancelled',
      });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Could not start checkout');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{heading}</CardTitle>
        {subheading && (
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const memberEligible =
            entitlements.isActive &&
            p.billing_type === 'one_time' &&
            (p.member_discount_pct ?? 0) > 0;
          const memberPriceCents = memberEligible
            ? p.price_cents - Math.floor((p.price_cents * (p.member_discount_pct ?? 0)) / 100)
            : null;
          return (
            <div
              key={p.slug}
              className="rounded-lg border border-border/60 bg-card/40 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>
                {memberEligible && (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <BadgePercent className="h-3 w-3" />
                    {p.member_discount_pct}% off
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                {memberPriceCents != null ? (
                  <>
                    <span className="text-lg font-semibold">
                      {fmt(memberPriceCents, p.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {fmt(p.price_cents, p.currency)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-semibold">
                    {fmt(p.price_cents, p.currency)}
                    {p.billing_type === 'recurring' && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        /{(p as any).metadata?.interval === 'year' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                className="mt-auto gap-2"
                disabled={busy === p.slug || pendingSlug === p.slug}
                onClick={() => handleBuy(p as unknown as MonetizationProduct)}
              >
                {busy === p.slug || pendingSlug === p.slug ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {p.billing_type === 'recurring' ? 'Review terms' : 'Add'} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
      {consentDialog}
    </Card>
  );
}
