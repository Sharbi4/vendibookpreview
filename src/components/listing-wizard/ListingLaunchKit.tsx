import { useState } from 'react';
import { ListingUpgradeOptions } from './ListingUpgradeOptions';
import { ArrowUpRight, Check, Copy, Download, Facebook, Instagram, Video, ArrowRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  return (
    <section className="sale-light overflow-hidden rounded-[28px] border border-[#e6dfd5] shadow-[0_18px_60px_-35px_rgba(43,31,20,0.22)]" style={{ background: "#fffdf9" }} aria-label="Listing launch kit">
      <div className="p-6 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">01 / Share your listing</p>
        <h2 className="mt-4 max-w-lg text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[36px]">Put your listing in the right hands.</h2>
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
      <div className="m-3 rounded-[22px] bg-[#242321] p-6 text-[#fffaf3] sm:m-4 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#ff8159]"><Video className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c8c1b8]">02 / Invite a closer look</p>
            <h3 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.025em]">Show your listing live.</h3>
            <p className="mt-2 text-sm leading-6 text-[#c8c1b8]">Let buyers and renters book a video walkthrough. Show the layout, answer questions, and help them plan their next step before they travel.</p>
            <Button asChild className="mt-5 h-auto min-h-11 whitespace-normal text-left"><a href="/dashboard/account/scheduling">Set up live walkthroughs <ArrowRight /></a></Button>
            <p className="mt-3 text-xs leading-5 text-[#c8c1b8]">Choose your available hours and save. Already enabled? Review your schedule here.</p>
          </div>
        </div>
      </div>
      <ListingUpgradeOptions listingId={props.listingId} />

    </section>
  );
}
