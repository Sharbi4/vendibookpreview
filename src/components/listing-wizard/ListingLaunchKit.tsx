import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Facebook, Instagram, Video, ArrowRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { productCheckoutPath } from '@/lib/payments/hostedCheckout';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

interface Props {
  listingId: string;
  caption: string;
  blocked?: boolean;
  linkCopied?: boolean;
  captionCopied?: boolean;
  onFacebook: () => void;
  onCopyLink: () => void;
  onCopyCaption: () => void;
  onDownloadStory: () => void;
}

/** Focused launch actions; publishing and purchases remain explicit user actions. */
export function ListingLaunchKit(props: Props) {
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm" aria-label="Listing launch kit">
      <div className="p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Your next move</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Put your listing in the right hands.</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Start with the people who already know your business. Your photos, listing link, and ready-to-use caption are all here.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button disabled={props.blocked} onClick={props.onFacebook} className="h-12 gap-2 rounded-xl"><Facebook /> Share on Facebook</Button>
          <Button variant="outline" onClick={() => setInstagramOpen(v => !v)} aria-expanded={instagramOpen} aria-controls="instagram-share-guide" className="h-12 gap-2 rounded-xl"><Instagram /> Prepare Instagram</Button>
          <Button variant="outline" disabled={props.blocked} onClick={props.onCopyLink} className="h-12 gap-2 rounded-xl">{props.linkCopied ? <Check /> : <Copy />}{props.linkCopied ? 'Link copied' : 'Copy listing link'}</Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Choose where to post. Nothing is published to your social accounts automatically.</p>
        {instagramOpen && (
          <div id="instagram-share-guide" className="mt-6 rounded-2xl border bg-muted/30 p-5">
            <h3 className="font-semibold">Your Instagram post, ready to assemble.</h3>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li><span className="font-medium text-foreground">01 / Save your Story image.</span> Add it to a new Story in Instagram.</li>
              <li><span className="font-medium text-foreground">02 / Copy your listing link.</span> Paste it into a Link sticker so people can open the listing.</li>
              <li><span className="font-medium text-foreground">03 / Add your own introduction.</span> Use the caption below as a starting point.</li>
            </ol>
            <p className="mt-4 whitespace-pre-line rounded-xl border bg-background p-4 text-sm leading-6">{props.caption}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" disabled={props.blocked} onClick={props.onDownloadStory} className="gap-2"><Download /> Save Story image</Button>
              <Button variant="outline" disabled={props.blocked} onClick={props.onCopyCaption} className="gap-2"><Copy />{props.captionCopied ? 'Caption copied' : 'Copy caption'}</Button>
              <Button variant="ghost" asChild><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram <ArrowUpRight /></a></Button>
            </div>
          </div>
        )}
      </div>
      <div className="border-t bg-muted/25 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary"><Video className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Turn interest into a conversation</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Show your listing live.</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Let buyers and renters book a video walkthrough. Show the layout, answer questions, and help them plan their next step before they travel.</p>
            <Button asChild className="mt-5 h-auto min-h-11 whitespace-normal text-left"><a href="/dashboard/account/scheduling">Set up live walkthroughs <ArrowRight /></a></Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Choose your available hours and save. Already enabled? Review your schedule here.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t p-6 sm:px-8">
        <div><p className="text-sm font-semibold">Want to take your listing further?</p><p className="mt-1 text-xs text-muted-foreground">Explore optional Featured and Vendibook Pro options.</p></div>
        <Button variant="ghost" onClick={() => setPromotionOpen(true)} className="gap-2">Explore upgrades <ArrowUpRight /></Button>
      </div>
      <Dialog open={promotionOpen} onOpenChange={setPromotionOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-2xl sm:p-8">
          <DialogHeader className="text-left">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Optional upgrades</p>
            <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">Choose your next step.</DialogTitle>
            <DialogDescription className="pt-2 leading-6">Your listing is already live. Sharing and setting up walkthroughs do not require an upgrade.</DialogDescription>
          </DialogHeader>
          <div className="my-3 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border p-5">
              <Megaphone className="mb-5 h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Feature this listing</h3>
              <p className="mb-6 mt-2 flex-1 text-sm leading-6 text-muted-foreground">Explore paid featured placement for this listing. Review the duration, current price, and tax before purchasing.</p>
              <Button asChild><a href={productCheckoutPath(ACTIVE_PRODUCT_SLUGS.featuredBoost, props.listingId)}>Review Featured <ArrowRight /></a></Button>
            </div>
            <div className="flex flex-col rounded-2xl border bg-muted/30 p-5">
              <span className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Vendibook Pro</span>
              <h3 className="text-lg font-semibold">Explore your Pro membership</h3>
              <p className="mb-6 mt-2 flex-1 text-sm leading-6 text-muted-foreground">Explore Pro tools and plan details for your business. Review what is included and the subscription terms before joining.</p>
              <Button variant="outline" asChild><a href="/dashboard/buyermatch/membership">Explore Vendibook Pro <ArrowRight /></a></Button>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setPromotionOpen(false)}>Continue with my listing</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
