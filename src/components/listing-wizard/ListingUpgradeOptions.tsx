import { BrandIcon } from '@/components/brand/BrandIcon';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { productCheckoutPath } from '@/lib/payments/hostedCheckout';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { BUYERMATCH_DISCLOSURE } from '@/lib/monetization/buyerMatch';

function UpgradeMark({ pro = false }: { pro?: boolean }) {
  return pro ? <BrandIcon size={58} tone="steel"><span>PRO</span></BrandIcon> : <BrandIcon icon={Star} size={58}/>;
}

export function ListingUpgradeOptions({ listingId }: { listingId: string }) {
  const [selected, setSelected] = useState<'featured' | 'pro' | null>(null);
  const isPro = selected === 'pro';
  const benefits = isPro ? [
    ['BuyerMatch for sale listings', 'Submit eligible equipment for team review, buyer research, and permission-based outreach.'],
    ['Visibility and planning tools', 'Explore Featured Boost credits, priority visibility, PricePilot, and PermitPath Plus included with Pro.'],
    ['Activity you can follow', 'Review verified outreach activity and continue conversations in your Vendibook messages.'],
  ] : [
    ['Placement beyond the standard listing', 'Feature this listing in search and category pages.'],
    ['One listing. A defined promotion.', '30 days of featured placement for $49, paid once.'],
    ['Keep your listing working for you', 'Visitors can explore your photos, contact you, and use the options enabled on your listing.'],
  ];
  return <>
    <section className="px-6 pb-6 pt-5 sm:px-10 sm:pb-10" aria-label="Optional listing upgrades">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Build on your momentum</p><h3 className="mt-2 text-xl font-semibold tracking-tight">A little more reach. A bigger toolkit.</h3></div>
        <span className="rounded-full border border-[#ded6cb] px-3 py-1 text-[10px] font-medium text-muted-foreground">Optional upgrades</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setSelected('featured')} className="group flex flex-col rounded-[20px] border border-[#e2dacf] bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[#bdab97] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <div className="mb-6 flex w-full items-center justify-between"><UpgradeMark/><span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Listing visibility</span></div>
          <h4 className="text-lg font-semibold tracking-tight">Feature this listing</h4><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">Give your listing a more prominent place in search.</p>
          <span className="mt-6 flex items-center gap-2 text-sm font-semibold">Explore Featured <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5"/></span>
        </button>
        <button onClick={() => setSelected('pro')} className="group flex flex-col rounded-[20px] border border-[#d8c9b9] bg-[#f0e9df] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#bdab97] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <div className="mb-6 flex w-full items-center justify-between"><UpgradeMark pro/><span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Membership</span></div>
          <h4 className="text-lg font-semibold tracking-tight">Vendibook Pro</h4><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">Bring visibility, planning, and seller tools into one membership.</p>
          <span className="mt-6 flex items-center gap-2 text-sm font-semibold">Explore Pro <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5"/></span>
        </button>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Your listing stays live without an upgrade. Sharing and live walkthrough setup are available now.</p>
    </section>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent style={{ backgroundImage: "none", backgroundColor: "rgba(255, 251, 245, 0.9)", backdropFilter: "blur(28px) saturate(140%)", WebkitBackdropFilter: "blur(28px) saturate(140%)", boxShadow: "0 32px 100px -24px rgba(35,27,19,.45), inset 0 1px 0 rgba(255,255,255,.95)" }} className="sale-light max-h-[90dvh] overflow-y-auto rounded-[28px] border-[#e2dacf] p-0 shadow-2xl sm:max-w-xl">
        <div className="p-6 pb-5 sm:p-9 sm:pb-6">
          <DialogHeader className="text-left">
            <div className="mb-6"><UpgradeMark pro={isPro}/></div>
            <span className="mb-4 w-fit rounded-full border border-[#d9cbbc] bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">{isPro ? 'Vendibook Pro · Membership' : 'Featured · Listing upgrade'}</span>
            <DialogTitle className="text-[30px] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[36px]">{isPro ? 'More tools for your next move.' : 'Put this listing in the spotlight.'}</DialogTitle>
            <DialogDescription className="pt-3 text-sm leading-6">{isPro ? 'A membership for building your business on Vendibook, with tools to plan, promote, and manage your next opportunity.' : 'Add featured placement to the listing you just published. Your photos, pricing, and contact options stay together in one place.'}</DialogDescription>
          </DialogHeader>
          <ul className="mt-7 divide-y divide-[#e2dacf] border-y border-[#e2dacf]">
            {benefits.map(([title, body]) => <li key={title} className="flex gap-3 py-5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e9e1d6]"><Check className="h-3 w-3 text-[#514438]"/></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-[13px] leading-6 text-muted-foreground">{body}</p></div></li>)}
          </ul>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">{isPro ? BUYERMATCH_DISCLOSURE : 'Featured placement does not guarantee views, inquiries, bookings, or a sale.'}</p>
        </div>
        <div className="border-t border-[#e2dacf] bg-white/60 p-6 sm:px-9">
          <p className="mb-4 text-xs leading-5 text-muted-foreground">{isPro ? 'Review current pricing, included benefits, and renewal terms before joining.' : 'One-time purchase · 30 days of featured placement. Applicable tax shown at checkout.'}</p>
          <Button asChild className="min-h-12 h-auto w-full gap-2 whitespace-normal py-3 text-center"><a href={isPro ? '/dashboard/buyermatch/membership' : productCheckoutPath(ACTIVE_PRODUCT_SLUGS.featuredBoost, listingId)}>{isPro ? 'View Pro membership' : 'Make your listing featured · $49'}<ArrowRight/></a></Button>
          <Button variant="ghost" onClick={() => setSelected(null)} className="mt-2 w-full">Continue with my listing</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
