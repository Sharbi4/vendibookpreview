import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FeaturedBadge from '@/components/listing/FeaturedBadge';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { useProBoostCredit, useRedeemProBoostCredit } from '@/hooks/useProBoostCredit';
import { useListingBoostHistory } from '@/hooks/useListingBoostHistory';
import { effectivePriceCents, formatUsd } from '@/lib/monetization/products';

interface PromoteListingModalProps { open: boolean; onOpenChange: (open:boolean)=>void; listingId:string; listingTitle:string; }
export const PromoteListingModal = ({open,onOpenChange,listingId,listingTitle}:PromoteListingModalProps) => {
 const {products,loading}=useMonetizationProducts('listing_upgrade');
 const product=products.find(p=>p.slug==='featured_listing_monthly'&&p.is_active&&p.billing_type==='recurring');
 const {requestCheckout,dialog,pendingSlug}=useSubscriptionConsent();
 const {data:credit,isLoading:creditLoading}=useProBoostCredit();
 const redeem=useRedeemProBoostCredit();
 const history=useListingBoostHistory(open?listingId:null);
 const [error,setError]=useState('');
 return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sale-light max-h-[85dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl bg-white p-6 sm:max-w-lg sm:p-8">
  <DialogHeader><DialogTitle className="flex items-center gap-2"><FeaturedBadge variant="card" size="md" force/><span className="sr-only">Featured listing</span></DialogTitle><DialogDescription className="pt-3">Give {listingTitle} a spotlight.</DialogDescription></DialogHeader>
  <p className="text-4xl font-semibold tracking-tight">{product?formatUsd(effectivePriceCents(product)):loading?'Loading…':'Unavailable'}<span className="text-sm font-normal text-stone-500"> /month</span></p>
  <p className="text-sm leading-6 text-stone-600">Featured visibility and a highlighted listing card. This is a monthly subscription for this listing, with applicable tax shown at checkout.</p>
  <p className="text-xs leading-5 text-stone-500">Cancel anytime. Automatically cancels when marked sold. Rental listings renew until cancelled. No annual option or guaranteed views, inquiries or sales.</p>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  <Button variant="cta" disabled={!product||!!pendingSlug||redeem.isPending} onClick={()=>product&&void requestCheckout(product,{listingId,interval:'monthly',successPath:'/dashboard/listings?purchase=success',cancelPath:'/dashboard/listings'})}>Make this listing Featured</Button>
  {!creditLoading&&credit&&<div className="rounded-xl border p-4"><p className="text-sm font-semibold">You have a Pro Boost credit</p><p className="my-2 text-xs text-stone-500">Use your included 30-day boost without starting a subscription.</p><Button variant="outline" disabled={redeem.isPending||!!pendingSlug} onClick={async()=>{setError('');try{const result=await redeem.mutateAsync(listingId);if(result.fulfilled)onOpenChange(false);else setError('Activation is not confirmed. Check your dashboard before purchasing.');}catch{setError('Could not apply your credit. Please try again.');}}}>Apply my included credit</Button></div>}
  {history.data?.currentEndsAt&&<p className="text-xs text-stone-500">Existing boost ends {new Date(history.data.currentEndsAt).toLocaleDateString()}. Existing purchased boost time is retained.</p>}
  {!!history.data?.history.length&&<details className="border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Previous boosts and receipts</summary><ul className="mt-3 space-y-3">{history.data.history.map(entry=><li key={entry.session_id} className="text-xs leading-5 text-stone-600"><p>{formatUsd(entry.amount_cents)} · {entry.status}</p><p>{new Date(entry.starts_at).toLocaleDateString()} – {new Date(entry.ends_at).toLocaleDateString()}</p>{entry.receipt_url&&/^https:\/\//.test(entry.receipt_url)&&<a className="underline" href={entry.receipt_url} target="_blank" rel="noopener noreferrer">View receipt</a>}</li>)}</ul></details>}
 </DialogContent></Dialog>{dialog}</>;
};
