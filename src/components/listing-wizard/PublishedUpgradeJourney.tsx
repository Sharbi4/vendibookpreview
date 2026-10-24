import { useState } from 'react';
import { ArrowRight, Check, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [error, setError] = useState('');
  const { tier, isLoading } = useHostEntitlements();
  const { products } = useMonetizationProducts('host_subscription');
  const { data: catalog } = useCatalogPrices();
  const { requestCheckout, dialog, pendingSlug } = useSubscriptionConsent();
  const { data: credit, isLoading: creditLoading } = useProBoostCredit();
  const redeem = useRedeemProBoostCredit();
  const isPro = tier === 'pro' || tier === 'premium';
  const pro = products.find(p => p.slug === 'vendibook_pro' && p.is_active);
  const proPrice = catalog?.vendibook_pro;
  const boostPrice = catalog?.['boost-featured-30'];
  const returnPath = `/listing-published/${listing.id}`;
  const benefits = (items: string[]) => <ul className="mt-6 space-y-3 text-sm leading-5">{items.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{item}</li>)}</ul>;
  return <><Dialog open onOpenChange={open => { if (!open) onComplete(); }}><DialogContent className="sale-light max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl overflow-y-auto rounded-[28px] border-stone-200 bg-white p-5 text-[#1c1b1a] sm:p-9">
    <header className="mx-auto max-w-xl pb-2 pt-4 text-center">
      <img src="/brand/vendibook-logo-email-white.png" alt="Vendibook" className="mx-auto mb-4 h-7 w-auto mix-blend-multiply" />
      <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-stone-600">Published. Ready for what’s next.</span>
      <DialogTitle className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Your listing is live.<br/>Choose how it gets seen.</DialogTitle>
      <DialogDescription className="mt-3 text-sm leading-6 text-stone-500">Keep sharing for free, put this listing in the spotlight, or add the tools and support of Vendibook Pro.</DialogDescription>
    </header>
    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-stone-500">{listing.coverImageUrl && <img src={listing.coverImageUrl} alt="" className="h-7 w-7 rounded-md object-cover" />}<span className="max-w-xs truncate">{listing.title}</span><span className="text-emerald-700">• Live</span></div>
    <div className="mt-6 grid items-stretch gap-5 md:grid-cols-3">
      <article className="flex flex-col rounded-[22px] bg-[#f5f5f5] p-4"><h3 className="text-lg font-semibold">Keep it simple</h3><p className="mt-1 text-xs text-stone-500">Your free publishing essentials</p><div className="mt-4 flex flex-1 flex-col rounded-[18px] border border-[#ededed] bg-white p-5"><p className="text-3xl font-semibold tracking-tight">$0<span className="ml-1 text-sm font-normal text-stone-400">to share</span></p><p className="mt-2 text-xs text-stone-500">Your listing stays live.</p>{benefits(['Facebook and Instagram share kit', 'A direct link to your listing', 'Upgrade whenever you’re ready'])}<p className="mt-auto pt-6 text-xs font-medium text-stone-400">Included with your live listing</p></div></article>
      <article className="flex flex-col rounded-[22px] bg-[#242424] p-4 shadow-[0_12px_32px_-24px_rgba(0,0,0,.5)]"><div className="flex items-center justify-between gap-2"><h3 className="flex min-w-0 items-center gap-2"><img src="/brand/vendibook-logo-email.png" alt="Vendibook" className="h-auto w-28 brightness-0 invert" /><span className="rounded-md border border-orange-300/30 bg-orange-300/10 px-2 py-1 text-[10px] font-semibold tracking-[.12em] text-orange-200">PRO</span></h3></div><p className="mt-1 text-xs text-white/60">For active sellers and hosts</p><div className="mt-4 flex flex-1 flex-col rounded-[18px] bg-white p-5"><p className="text-2xl font-semibold tracking-tight">{isPro ? 'Your current plan' : proPrice?.is_active ? priceDetailLabel(proPrice) : 'Loading pricing…'}</p><p className="mt-2 text-xs leading-5 text-stone-500">Recurring membership. Cancel anytime.</p>{benefits([listing.mode === 'sale' ? 'BuyerMatch AI for eligible sale listings' : 'Priority placement for your rental', 'One Featured Boost credit each billing period', 'PricePilot and PermitPath Plus', 'Priority support'])}<Button className="mt-6 h-auto min-h-11 w-full whitespace-normal rounded-lg bg-[#ff5124] py-3 text-white hover:bg-[#e8461c]" disabled={isLoading || !!pendingSlug || (!isPro && (!pro || !proPrice?.is_active))} onClick={async () => { if (isPro) { onComplete(); return; } if (pro) await requestCheckout(pro, { listingId: listing.id, successPath: returnPath, cancelPath: returnPath }); }}>{isPro ? 'Continue with Pro' : 'Upgrade to Pro'}<ArrowRight className="ml-2 h-4 w-4" /></Button></div></article>
      <article className="flex flex-col rounded-[22px] bg-[#f5f5f5] p-4"><h3 className="flex items-center gap-2 text-lg font-semibold"><Star className="h-4 w-4 fill-orange-500 text-orange-500" />Featured listing</h3><p className="mt-1 text-xs text-stone-500">A spotlight for this listing</p><div className="mt-4 flex flex-1 flex-col rounded-[18px] border border-[#ededed] bg-white p-5"><p className="text-2xl font-semibold tracking-tight">{featured ? 'Already featured' : credit ? 'Included credit' : boostPrice?.is_active ? priceDetailLabel(boostPrice) : 'Loading pricing…'}</p><p className="mt-2 text-xs text-stone-500">One listing. No subscription.</p>{benefits([`${boostPrice?.duration_days ?? 30} days of Featured visibility`, 'Highlighted listing card', 'Use a Pro credit when available'])}<Button variant="outline" className="mt-auto h-auto min-h-11 w-full whitespace-normal py-3" disabled={!featured && (creditLoading || redeem.isPending || (!credit && !boostPrice?.is_active))} onClick={async () => { setError(''); if (featured) { onComplete(); return; } if (credit) { try { const result = await redeem.mutateAsync(listing.id); if (result.fulfilled) onComplete(); else setError('Activation is not confirmed yet. Check your dashboard before purchasing again.'); } catch { setError('Could not apply your credit. Please try again from your dashboard.'); } } else window.location.assign(productCheckoutPath('boost-featured-30', listing.id, { success: returnPath + '?featured_paid=true', cancel: returnPath + '?featured_cancelled=true' })); }}>{featured ? 'Continue to sharing' : credit ? 'Apply my Boost credit' : 'Make this listing Featured'}</Button></div></article>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <footer className="flex w-full flex-col items-center justify-center gap-3 pb-1 pt-2 text-center"><p className="mx-auto max-w-2xl text-[11px] leading-5 text-stone-500">{listing.mode === 'sale' ? 'BuyerMatch requires review, eligibility and campaign capacity. No buyer, lead or sale is guaranteed.' : 'BuyerMatch currently supports eligible sale listings; renter matching is not included.'} Pro does not discount commissions. Applicable tax and billing terms are shown at checkout.</p><button onClick={onComplete} className="mx-auto inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-7 py-2.5 text-center text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Skip upgrades — continue to share kit</button></footer>
  </DialogContent></Dialog>{dialog}</>;
}
