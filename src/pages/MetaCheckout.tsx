import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { applyPublicListingFilter } from '@/lib/listings/publicVisibility';
import { isExcludedTestListingTitle } from '@/lib/excludeTestListings';
import { parseMetaProducts } from '@/lib/metaCheckout';
import type { Tables } from '@/integrations/supabase/types';

type Item = Pick<Tables<'listings'>,
  'id' | 'title' | 'mode' | 'cover_image_url' | 'image_urls' |
  'price_sale' | 'price_daily' | 'price_weekly' | 'price_monthly' | 'price_hourly'>;

const destination = (l: Item) => (l.mode === 'rent' ? `/book/${l.id}` : `/checkout/${l.id}`);

const money = (cents: number) => (cents / 100).toLocaleString('en-US', {
  style: 'currency', currency: 'USD',
});

// Match meta-catalog-feed's positive-price selection and two-decimal currency.
const catalogPrice = (l: Item) => {
  const prices: [number | null, string][] = l.mode === 'rent'
    ? [[l.price_daily, '/day'], [l.price_weekly, '/week'], [l.price_monthly, '/month'], [l.price_hourly, '/hour']]
    : [[l.price_sale, '']];
  for (const [raw, period] of prices) {
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount > 0) {
      const cents = Math.round(Number(amount.toFixed(2)) * 100);
      if (Number.isSafeInteger(cents)) return { cents, period };
    }
  }
  return null;
};

/**
 * Meta Shop "checkout on website" landing. Public (no auth wall): resolves
 * catalog retailer_ids (= listing UUIDs) and hands off to existing checkout.
 * This is a catalog order summary; payments remain separate per listing.
 */
export default function MetaCheckout() {
  const [params, setParams] = useSearchParams();
  const products = parseMetaProducts(params.get('products'));
  const ids = products.map((product) => product.id);
  const key = ids.join(',');
  const [result, setResult] = useState<{ key: string; items: Item[]; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const selectionKey = products.map(({ id, quantity }) => `${id}:${quantity}`).join(',');
  const items = !key ? [] : result?.key === key ? result.items : null;
  const failed = Boolean(key && result?.key === key && result.failed);

  useEffect(() => {
    setResult(null);
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const requestedIds = key.split(',');
        const rows: Item[] = [];
        // Keep lookup URLs small without silently dropping selected products.
        for (let start = 0; start < requestedIds.length; start += 25) {
          const query = supabase.from('listings')
            .select('id,title,mode,cover_image_url,image_urls,price_sale,price_daily,price_weekly,price_monthly,price_hourly');
          // PostgREST filters mutate the same builder. Narrow only the filter
          // interface to avoid TS2589 when the helper compares the complete
          // generated schema recursively; keep the selected result fully typed.
          applyPublicListingFilter(query as unknown as Parameters<typeof applyPublicListingFilter>[0]);
          const { data, error } = await query.in('id', requestedIds.slice(start, start + 25));
          if (cancelled) return;
          if (error) throw error;
          rows.push(...(data ?? []).filter((l) => !isExcludedTestListingTitle(l.title)));
        }
        const ordered = requestedIds.flatMap((id) => {
          const item = rows.find((row) => row.id === id);
          return item ? [item] : [];
        });
        setResult({ key, items: ordered, failed: false });
      } catch {
        if (!cancelled) setResult({ key, items: [], failed: true });
      }
    })();
    return () => { cancelled = true; };
  }, [key, attempt]);

  const lines = products.map((product) => {
    const listing = items?.find((item) => item.id === product.id);
    const price = listing ? catalogPrice(listing) : null;
    const total = price ? price.cents * product.quantity : null;
    return { ...product, listing, price, total: Number.isSafeInteger(total) ? total : null };
  });
  const sum = lines.reduce((total, line) => total + (line.total ?? 0), 0);
  const subtotal = lines.every((line) => line.total !== null) && Number.isSafeInteger(sum) ? sum : null;
  const canCheckout = lines.length > 0 && subtotal !== null && lines.every((line) => line.listing && line.price && line.quantity === 1);
  const hasRentals = lines.some((line) => line.listing?.mode === 'rent');
  const coupon = params.get('coupon')?.trim();

  let body: JSX.Element;
  if (failed) {
    body = (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-3">We couldn't load this item right now</h1>
        <p className="text-muted-foreground mb-8">Please try again in a moment.</p>
        <Button variant="dark-shine" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Try again</Button>
      </div>
    );
  } else if (!items) {
    body = <p className="text-center py-20 text-muted-foreground">Loading your item…</p>;
  } else if (products.length === 0) {
    body = (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-3">This item is no longer available</h1>
        <p className="text-muted-foreground mb-8">It may have sold or been removed. There's plenty more to explore.</p>
        <Button variant="dark-shine" asChild><Link to="/browse">Browse listings</Link></Button>
      </div>
    );
  } else {
    body = (
      <div className="py-12 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Your cart</h1>
        <p className="text-muted-foreground mb-6">
          {products.length} {products.length === 1 ? 'product' : 'products'}{params.get('cart_origin') === 'meta_shops' ? ' from Facebook or Instagram' : ''}. Review your order summary.
        </p>
        {items.length < products.length && (
          <p role="status" className="text-muted-foreground mb-6">Some selected items are no longer available. Remove them to continue.</p>
        )}
        <ul aria-label="Cart items" className="space-y-4">
          {lines.map(({ id, quantity, listing: l, price, total }) => {
            const img = l?.cover_image_url || l?.image_urls?.[0];
            return (
              <li key={id} className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4">
                {img ? <img src={img} alt={l.title} className="h-20 w-24 shrink-0 rounded-lg object-cover" loading="lazy" /> : <div className="h-20 w-24 shrink-0 rounded-lg bg-muted" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground break-words">{l?.title ?? 'Unavailable item'}</p>
                  {!l && <p className="text-sm text-muted-foreground break-all">Product ID: {id}</p>}
                  <p className="text-sm text-muted-foreground">Quantity: {quantity}</p>
                  <p className="text-sm text-muted-foreground">{price ? `Unit price: ${money(price.cents)}${price.period}` : l ? 'Price unavailable' : 'This item is no longer available'}</p>
                  {quantity > 1 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Each listing is one asset. Change the quantity to one before checkout. Rental duration is selected when booking.</p>
                      <Button variant="outline" className="mt-2" onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('products', products.map((product) => `${product.id}:${product.id === id ? 1 : product.quantity}`).join(','));
                        setParams(next, { replace: true });
                      }}>Use quantity 1</Button>
                    </div>
                  )}
                  {!l && <Button variant="outline" className="mt-2" onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('products', products.filter((product) => product.id !== id).map((product) => `${product.id}:${product.quantity}`).join(','));
                    setParams(next, { replace: true });
                  }}>Remove unavailable item</Button>}
                </div>
                <p className="w-full sm:w-auto font-semibold text-foreground">Line total: {total === null ? 'Unavailable' : money(total)}</p>
              </li>
            );
          })}
        </ul>
        <section aria-label="Order summary" className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex justify-between gap-4 text-lg font-semibold"><span>Subtotal</span><span>{subtotal === null ? 'Unavailable' : money(subtotal)}</span></div>
          <p className="mt-2 text-sm text-muted-foreground">USD. Taxes, delivery, and applicable fees are calculated at checkout.</p>
          {hasRentals && <p className="mt-2 text-sm text-muted-foreground">Rental lines use one listed billing period at the catalog rate. Your dates and duration determine the final booking total.</p>}
          {coupon && <p role="status" className="mt-2 text-sm text-muted-foreground">Coupon not applied. Listing purchases and rentals do not support coupon codes.</p>}
          <div className="mt-5">
            {canCheckout && items.length === 1 ? (
              <Button variant="dark-shine" className="w-full" asChild><Link to={destination(items[0])}>Continue to {items[0].mode === 'rent' ? 'booking' : 'checkout'}</Link></Button>
            ) : (
              <Button variant="dark-shine" className="w-full" disabled={!canCheckout} aria-expanded={checkoutKey === selectionKey} aria-controls="meta-checkout-options" onClick={() => setCheckoutKey(selectionKey)}>Continue to checkout</Button>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Each purchase or booking is completed separately. This summary does not create a combined payment.</p>
          {items.length === 0 && <Button variant="outline" className="mt-4" asChild><Link to="/browse">Browse listings</Link></Button>}
        </section>
        {canCheckout && items.length > 1 && checkoutKey === selectionKey && (
          <section id="meta-checkout-options" aria-label="Checkout options" className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold">Complete your purchases</h2>
            <p className="text-sm text-muted-foreground">Complete one item at a time. Return to this summary for the next item.</p>
            {items.map((l) => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <p className="font-medium">{l.title}</p>
              <Button variant="dark-shine" asChild><Link to={destination(l)}>{l.mode === 'rent' ? 'Book' : 'Checkout'}</Link></Button>
            </div>)}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Checkout | Vendibook" description="Continue to checkout on Vendibook." noindex />
      <Header />
      <main className="flex-1 container">{body}</main>
      <Footer />
    </div>
  );
}
