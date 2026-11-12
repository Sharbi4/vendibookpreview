import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SEO from '@/components/SEO';
import SquareBillingCheckout from '@/components/checkout/SquareBillingCheckout';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import SubscriptionConsentDialog from '@/components/monetization/SubscriptionConsentDialog';
import { effectivePriceCents } from '@/lib/monetization/products';

/**
 * Featured checkout opened without a listing (e.g. from a shared link): let the
 * seller pick one of their live listings instead of dead-ending. A single live
 * listing is selected automatically.
 */
function FeaturedListingPicker() {
  const { user, loading: authLoading } = useAuth() as { user: { id: string } | null; loading?: boolean };
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = useQuery({
    queryKey: ['featured-checkout-live-listings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('id, title, city, state').eq('host_id', user!.id).eq('status', 'published').is('deleted_at', null).order('published_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const choose = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('listing_id', id);
    navigate(`/checkout/product/featured_listing_monthly?${next.toString()}`, { replace: true });
  };
  const only = q.data?.length === 1 ? q.data[0].id : null;
  useEffect(() => { if (only) choose(only); }, [only]); // eslint-disable-line react-hooks/exhaustive-deps
  if (authLoading) return <p>Loading…</p>;
  if (!user) return <p><Link className="underline" to={`/auth?redirect=${encodeURIComponent('/checkout/product/featured_listing_monthly')}`}>Sign in</Link> to choose which listing to feature.</p>;
  if (q.isLoading || only) return <p>Finding your live listings…</p>;
  if (q.isError) return <p role="alert">We couldn’t load your listings. <button className="underline" onClick={() => q.refetch()}>Try again</button></p>;
  if (!q.data?.length) return <p>Featured applies to a live listing. Publish a listing from <Link className="underline" to="/dashboard/listings">your dashboard</Link>, then come back to feature it.</p>;
  return <section className="mx-auto max-w-xl space-y-3">
    <h1 className="text-xl font-semibold">Which listing do you want to feature?</h1>
    <ul className="space-y-2">{q.data.map(l => <li key={l.id}><button type="button" onClick={() => choose(l.id)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-foreground/30"><span className="block font-medium">{l.title}</span>{(l.city || l.state) && <span className="text-sm text-muted-foreground">{[l.city, l.state].filter(Boolean).join(', ')}</span>}</button></li>)}</ul>
  </section>;
}

function FeaturedCheckout({listingId, initialConsent, onClose}: {listingId?:string;initialConsent?:string;onClose:()=>void}) {
  const {products,loading,error}=useMonetizationProducts('listing_upgrade');
  const product=products.find(p=>p.slug==='featured_listing_monthly' && p.billing_type==='recurring');
  const [consentId,setConsentId]=useState(initialConsent);
  const [reviewOpen,setReviewOpen]=useState(true);
  if (!listingId) return <FeaturedListingPicker />;
  if (loading) return <p>Loading Featured subscription terms…</p>;
  if (error || !product) return <p role="alert">Featured checkout is unavailable. Please return to your dashboard and try again.</p>;
  if (consentId) return <SquareBillingCheckout slug={product.slug} listingId={listingId} consentId={consentId} interval="monthly" onClose={onClose}/>;
  return <><button className="underline" onClick={()=>setReviewOpen(true)}>Review Featured subscription terms</button><SubscriptionConsentDialog open={reviewOpen} onOpenChange={setReviewOpen} payload={{productSlug:product.slug,productName:product.name,priceCents:effectivePriceCents(product),interval:'month'}} onConsented={setConsentId}/></>;
}
export default function ProductCheckout() {
  const {slug=''}=useParams();const [params]=useSearchParams();const navigate=useNavigate();
  // Listing Concierge is retired (owner request 2026-10-13); old checkout links go to the free self-serve flow.
  if (slug === 'listing_concierge') return <Navigate to="/list" replace />;
  if (slug === 'boost-featured-30') return <Navigate to={`/checkout/product/featured_listing_monthly?${params.toString()}`} replace />;
  return <main className="sale-light min-h-screen bg-[#f8f6f2] px-4 py-6">
    <SEO title="Secure checkout | Vendibook" description="Complete your Vendibook checkout securely." noindex />
    {slug === 'featured_listing_monthly' ? <FeaturedCheckout listingId={params.get('listing_id')||undefined} initialConsent={params.get('consent_id')||undefined} onClose={()=>navigate('/dashboard')}/> : <SquareBillingCheckout slug={slug} listingId={params.get('listing_id')||undefined} consentId={params.get('consent_id')||undefined} interval={params.get('interval')||undefined} onClose={()=>navigate('/dashboard')}/>}
  </main>;
}
