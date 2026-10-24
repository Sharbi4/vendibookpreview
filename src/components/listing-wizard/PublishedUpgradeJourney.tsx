import { useState } from 'react';
import { ArrowRight, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useCatalogPrices } from '@/hooks/useCatalogPrices';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { useProBoostCredit, useRedeemProBoostCredit } from '@/hooks/useProBoostCredit';
import { productCheckoutPath } from '@/lib/payments/hostedCheckout';
import { priceDetailLabel } from '@/lib/monetization/catalogPricing';
import type { ShareKitListing } from './ShareKit';

export default function PublishedUpgradeJourney({ listing, featured, onComplete }: { listing: ShareKitListing; featured: boolean; onComplete: () => void }) {
  const [step, setStep] = useState<'pro' | 'featured'>('pro');
  const [error, setError] = useState('');
  const { tier, isLoading } = useHostEntitlements();
  const { products } = useMonetizationProducts('host_subscription');
  const { data: catalog } = useCatalogPrices();
  const { requestCheckout, dialog, pendingSlug } = useSubscriptionConsent();
  const { data: credit, isLoading: creditLoading } = useProBoostCredit();
  const redeem = useRedeemProBoostCredit();
  const isPro = tier === 'pro' || tier === 'premium';
  const pro = products.find(p => p.slug === 'vendibook_pro' && p.is_active);
  const price = catalog?.[step === 'pro' ? 'vendibook_pro' : 'boost-featured-30'];
  const next = () => { if (step === 'pro' && !featured) setStep('featured'); else onComplete(); };
  const returnPath = `/listing-published/${listing.id}`;
  return <section aria-label="Optional listing upgrades" className="overflow-hidden rounded-[28px] border border-stone-200 bg-[#fffdf9] shadow-[0_20px_65px_-40px_rgba(28,27,26,.35)]">
    <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 text-xs"><span className="font-semibold uppercase tracking-[.16em] text-stone-500">Your listing is already live</span><button onClick={onComplete} className="text-stone-600 underline underline-offset-4">Skip to sharing</button></div>
    <div className="grid sm:grid-cols-[1.5fr_1fr]">
      <div className="p-6 sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#1c1b1a] px-3 py-1.5 text-xs font-semibold tracking-widest text-white">{step === 'pro' ? <>VENDIBOOK <span className="text-orange-300">PRO</span></> : <><Star className="h-3 w-3 fill-orange-400 text-orange-400" /> FEATURED</>}</span>
        <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[#1c1b1a]">{step === 'pro' ? listing.mode === 'sale' ? 'Give your listing a team behind it.' : 'Give your rental more ways to stand out.' : 'Put this listing in the spotlight.'}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{step === 'pro' ? listing.mode === 'sale' ? 'With BuyerMatch, our team researches potential buyers for eligible sale listings and reports reviewed outreach activity in your dashboard.' : 'Bring your rental to market with Featured Boost credits, pricing tools, and priority placement and support.' : 'Add featured visibility and a highlighted listing card, while keeping your listing easy to discover and share.'}</p>
        <ul className="mt-5 space-y-3 text-sm text-stone-700">{(step === 'pro' ? ['One Featured Boost credit each billing period', 'PricePilot and PermitPath Plus included', 'Priority placement and support'] : [`${price?.duration_days ?? 30} days of Featured visibility`, 'One-time upgrade for this listing', 'Your listing stays live if you skip']).map(item => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-orange-600" />{item}</li>)}</ul>
        <p className="mt-5 text-xs leading-5 text-stone-500">{step === 'pro' ? listing.mode === 'sale' ? 'BuyerMatch starts after review and depends on eligibility and capacity. Buyers, leads and sales are not guaranteed. Pro does not discount commissions.' : 'BuyerMatch currently supports eligible sale listings; renter matching is not included. Pro does not discount commissions.' : 'Visibility does not guarantee views, inquiries or a transaction.'}</p>
      </div>
      <div className="flex flex-col justify-center border-t border-stone-200 bg-stone-100/70 p-6 sm:border-l sm:border-t-0 sm:p-7">
        {listing.coverImageUrl && <img src={listing.coverImageUrl} alt={listing.title} className="mb-4 aspect-[16/10] w-full rounded-xl object-cover" />}
        <p className="truncate text-sm font-medium text-stone-600">{listing.title}</p>
        <p className="mt-3 text-xl font-semibold text-[#1c1b1a]">{step === 'pro' && isPro ? 'Already included in your Pro plan' : step === 'featured' && credit ? 'Use your included Boost credit' : price?.is_active ? priceDetailLabel(price) : 'Checking current pricing…'}</p>
        <p className="mb-5 mt-2 text-xs leading-5 text-stone-500">{step === 'pro' ? 'Recurring membership. Review billing terms before subscribing. Cancel anytime.' : 'Review any applicable tax at checkout.'}</p>
        <Button className="h-auto min-h-12 whitespace-normal rounded-xl bg-[#ff5124] px-4 py-3 text-white shadow-[0_8px_24px_-10px_#ff5124] hover:bg-[#e8461c]" disabled={isLoading || !!pendingSlug || redeem.isPending || (step === 'pro' ? !isPro && (!pro || !price?.is_active) : creditLoading || (!credit && !price?.is_active))} onClick={async () => {
          setError('');
          if (step === 'pro') { if (isPro) { next(); return; } if (pro) await requestCheckout(pro, { listingId: listing.id, successPath: returnPath, cancelPath: returnPath }); }
          else if (credit) { try { const result = await redeem.mutateAsync(listing.id); if (result.fulfilled) onComplete(); else setError('Your boost is not confirmed yet. Check your dashboard before purchasing again.'); } catch { setError('Could not apply your credit. Try again from your dashboard.'); } }
          else window.location.assign(productCheckoutPath('boost-featured-30', listing.id, { success: returnPath + '?featured_paid=true', cancel: returnPath + '?featured_cancelled=true' }));
        }}>{step === 'pro' ? isPro ? 'Continue with Pro' : 'Upgrade to Pro' : credit ? 'Apply my Boost credit' : 'Make this listing Featured'}<ArrowRight className="ml-2 h-4 w-4 shrink-0" /></Button>
        <button onClick={next} className="mt-4 min-h-11 text-sm font-medium text-stone-600">{step === 'pro' ? 'Skip Pro for now' : 'Continue to my share kit'}</button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>{dialog}
  </section>;
}
