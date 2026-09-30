import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { applyPublicListingFilter } from '@/lib/listings/publicVisibility';
import { isExcludedTestListingTitle } from '@/lib/excludeTestListings';

type Item = {
  id: string;
  title: string;
  mode: string;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price_sale: number | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_monthly: number | null;
  price_hourly: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseMetaProducts = (raw: string | null): string[] =>
  Array.from(
    new Set(
      (raw ?? '')
        .split(',')
        .map((e) => decodeURIComponent(e).trim().split(':')[0].trim())
        .filter((id) => UUID.test(id))
        .map((id) => id.toLowerCase()),
    ),
  ).slice(0, 25);

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
  const ids = parseMetaProducts(params.get('products'));
  const key = ids.join(',');
  const [items, setItems] = useState<Item[] | null>(ids.length ? null : []);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await applyPublicListingFilter(
        supabase
          .from('listings')
          .select('id,title,mode,cover_image_url,image_urls,price_sale,price_daily,price_weekly,price_monthly,price_hourly')
          .in('id', key.split(',')),
      );
      if (cancelled) return;
      if (error) { setFailed(true); return; }
      const rows = ((data ?? []) as Item[]).filter((l) => !isExcludedTestListingTitle(l.title));
      setItems(key.split(',').map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Item[]);
    })();
    return () => { cancelled = true; };
  }, [key]);

  if (items && items.length === 1) return <Navigate to={destination(items[0])} replace />;

  let body: JSX.Element;
  if (failed) {
    body = (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-3">We couldn't load this item right now</h1>
        <p className="text-muted-foreground mb-8">Please try again in a moment.</p>
        <Button variant="dark-shine" onClick={() => window.location.reload()}>Try again</Button>
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
        <ul className="space-y-4">
          {items.map((l) => {
            const img = l.cover_image_url || l.image_urls?.[0];
            const price = priceLabel(l);
            return (
              <li key={l.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                {img ? <img src={img} alt={l.title} className="h-20 w-24 rounded-lg object-cover" loading="lazy" /> : <div className="h-20 w-24 rounded-lg bg-muted" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{l.title}</p>
                  {price && <p className="text-sm text-muted-foreground">{price}</p>}
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
