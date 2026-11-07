import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SEO from '@/components/SEO';
import SquareBillingCheckout from '@/components/checkout/SquareBillingCheckout';
import { useState } from 'react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import SubscriptionConsentDialog from '@/components/monetization/SubscriptionConsentDialog';
import { effectivePriceCents } from '@/lib/monetization/products';

function FeaturedCheckout({listingId, initialConsent, onClose}: {listingId?:string;initialConsent?:string;onClose:()=>void}) {
  const {products,loading,error}=useMonetizationProducts('listing_upgrade');
  const product=products.find(p=>p.slug==='featured_listing_monthly' && p.billing_type==='recurring');
  const [consentId,setConsentId]=useState(initialConsent);
  const [reviewOpen,setReviewOpen]=useState(true);
  if (!listingId) return <p>Select a listing in <a className="underline" href="/dashboard/listings">your dashboard</a> before subscribing.</p>;
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
