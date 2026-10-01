import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
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

const priceLabel = (l: Item) => {
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (l.mode === 'rent') {
    if (l.price_daily) return `${fmt(l.price_daily)}/day`;
    if (l.price_weekly) return `${fmt(l.price_weekly)}/week`;
    if (l.price_monthly) return `${fmt(l.price_monthly)}/month`;
    if (l.price_hourly) return `${fmt(l.price_hourly)}/hour`;
    return null;
  }
  return l.price_sale ? fmt(l.price_sale) : null;
};

/**
 * Meta Shop "checkout on website" landing. Public (no auth wall): resolves
 * catalog retailer_ids (= listing UUIDs) and hands off to existing checkout.
 * Coupons are ignored — listing checkout has no coupon support.
 */
export default function MetaCheckout() {
  const [params] = useSearchParams();
  const products = parseMetaProducts(params.get('products'));
  const ids = products.map((product) => product.id);
  const key = ids.join(',');
  const [result, setResult] = useState<{ key: string; items: Item[]; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
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

  if (!failed && items?.length === 1 && products.length === 1 && products[0].quantity === 1) {
    return <Navigate to={destination(items[0])} replace />;
  }

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
  } else if (items.length === 0) {
    body = (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-3">This item is no longer available</h1>
        <p className="text-muted-foreground mb-8">It may have sold or been removed. There's plenty more to explore.</p>
        <Button variant="dark-shine" asChild><Link to="/browse">Browse listings</Link></Button>
      </div>
    );
  } else {
    body = (
      <div className="py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Your selected items</h1>
        <p className="text-muted-foreground mb-6">Each item checks out separately with its seller.</p>
        {items.length < products.length && (
          <p role="status" className="text-muted-foreground mb-6">Some selected items are no longer available. You can continue with the items below.</p>
        )}
        <ul className="space-y-4">
          {items.map((l) => {
            const img = l.cover_image_url || l.image_urls?.[0];
            const price = priceLabel(l);
            const quantity = products.find((product) => product.id === l.id)?.quantity ?? 1;
            return (
              <li key={l.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                {img ? <img src={img} alt={l.title} className="h-20 w-24 rounded-lg object-cover" loading="lazy" /> : <div className="h-20 w-24 rounded-lg bg-muted" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{l.title}</p>
                  {price && <p className="text-sm text-muted-foreground">{price}</p>}
                  {quantity > 1 && (
                    <p className="text-sm text-muted-foreground">You requested {quantity}. Each listing is a single asset; continue with one. Rental dates and duration are selected when booking.</p>
                  )}
                </div>
                <Button variant="dark-shine" asChild>
                  <Link to={destination(l)}>{l.mode === 'rent' ? 'Book' : 'Checkout'}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
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
