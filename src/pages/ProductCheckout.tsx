import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import PayPalPaymentPanel from '@/components/checkout/PayPalPaymentPanel';
import { effectivePriceCents, formatUsd, type MonetizationProduct } from '@/lib/monetization/products';
import { useToast } from '@/hooks/use-toast';

/**
 * Hosted checkout surface for a single monetization product.
 * Amounts shown here are display-only — the server always re-derives the
 * charge from `monetization_products` before creating the PayPal order.
 */
const ProductCheckout = () => {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const listingId = params.get('listing_id') ?? undefined;
  const successPath = params.get('success') ?? '/dashboard';
  const cancelPath = params.get('cancel') ?? '/pricing';

  const [product, setProduct] = useState<MonetizationProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('monetization_products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      setProduct((data as MonetizationProduct) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const priceCents = useMemo(() => (product ? effectivePriceCents(product) : 0), [product]);

  // Estimated sales tax — server-computed; the authoritative amount is
  // re-locked at order creation in `paypal-create-order`.
  const [taxEstimate, setTaxEstimate] = useState<{ tax_cents: number; rate_pct: number; label: string } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    supabase.functions
      .invoke('tax-quote', { body: { kind: 'product', slug } })
      .then(({ data, error }) => {
        if (!error && data && !cancelled) setTaxEstimate(data);
      })
      .catch(() => { /* estimate is cosmetic; server re-computes authoritatively */ });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const taxCents = taxEstimate?.tax_cents ?? 0;
  const totalCents = priceCents + taxCents;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">That product isn't available</h1>
        <p className="mt-3 text-muted-foreground">
          It may have been renamed or retired. Browse the current packages to find the right fit.
        </p>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="mt-6 rounded-full border border-border px-5 py-2 text-sm"
        >
          View packages
        </button>
      </div>
    );
  }

  return (
    <>
      <SEO title={`Checkout — ${product.name} | Vendibook`} description={product.description ?? undefined} noindex />
      <PayPalPaymentPanel
        target={{ kind: 'product', slug: product.slug, listing_id: listingId }}
        totalUsd={totalCents / 100}
        returnUrl={successPath}
        onClose={() => navigate(cancelPath)}
        onSuccess={(result) => {
          toast({
            title: result.pending ? 'Payment processing' : 'Purchase complete',
            description: result.pending
              ? 'PayPal is still confirming this payment. We\u2019ll unlock it the moment it clears.'
              : `${product.name} is now unlocked.`,
          });
          navigate(successPath);
        }}
        summary={
          <div className="space-y-1">
            <p className="text-sm font-medium">{product.name}</p>
            {product.description && (
              <p className="text-xs text-muted-foreground">{product.description}</p>
            )}
            <div className="space-y-0.5 pt-1">
              <p className="text-sm">{formatUsd(priceCents)}</p>
              {taxCents > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {taxEstimate?.label || 'Estimated sales tax'} · {formatUsd(taxCents)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sales tax, if applicable, is calculated at payment.
                </p>
              )}
              <p className="text-lg font-semibold">{formatUsd(totalCents)}</p>
            </div>
          </div>
        }
      />
    </>
  );
};

export default ProductCheckout;
