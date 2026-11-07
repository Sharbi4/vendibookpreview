import { trackFinancingApplyClick } from '@/lib/analytics';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

const DESKTOP_BANNER = '/images/partners/approve-financing-banner.png';
const MOBILE_BANNER = '/images/partners/approve-financing-square-hd.webp';

/*
 * Both sizes show the same supplied APPROVE creative — never a hand-built
 * substitute. The wide artwork is unreadable at phone width, so mobile gets the
 * square layout of that same creative instead.
 */
export default function FinancingTopBanner() {
  // Extra bottom room on phones lets the disclaimer scroll clear of the fixed Ask Atlas orb.
  return <section aria-label="APPROVE equipment financing" className="mx-auto w-full max-w-6xl px-4 py-8 max-sm:pb-28 sm:px-6">
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer" onClick={()=>trackFinancingApplyClick('home_banner')} className="block overflow-hidden rounded-2xl outline-offset-4 transition-shadow hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
      <img src={DESKTOP_BANNER} alt="Fast, flexible financing with APPROVE. Apply online, match with lenders, and compare offers. Learn more." width={1475} height={400} loading="lazy" className="hidden h-auto w-full sm:block" />
      <img src={MOBILE_BANNER} alt="APPROVE financing: fast, flexible financing available. Apply online in 60 seconds, match with best-fit lenders, choose your best offer. Learn more." width={1024} height={1024} loading="lazy" className="block h-auto w-full sm:hidden" />
    </a>
    <p className="mt-3 text-xs leading-5 text-muted-foreground max-sm:pr-20">Subject to lender approval and terms. Vendibook is not a lender.</p>
  </section>;
}
