import { trackFinancingApplyClick } from '@/lib/analytics';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

export default function FinancingTopBanner() {
  return <section aria-label="APPROVE equipment financing" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer" onClick={()=>trackFinancingApplyClick('home_banner')} className="block overflow-hidden rounded-2xl outline-offset-4 transition-shadow hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
      <img src="/images/partners/approve-financing-banner.png" alt="Fast, flexible financing with APPROVE. Apply online, match with lenders, and compare offers. Learn more." width={1475} height={400} loading="lazy" className="hidden h-auto w-full sm:block" />
      <div className="bg-[#181C58] p-6 text-white sm:hidden"><img src="https://assets.approvepayments.com/images/approve_logo_primary.svg" alt="APPROVE" className="h-7 w-auto rounded bg-white p-1"/><h2 className="mt-5 text-2xl font-semibold">Fast, flexible financing available</h2><p className="mt-3 text-sm leading-6 text-white/80">Apply online. Match with lenders. Compare your options.</p><span className="mt-5 inline-block rounded-full bg-[#3072F5] px-6 py-3 font-semibold">Learn more</span></div>
    </a>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Subject to lender approval and terms. Vendibook is not a lender.</p>
  </section>;
}
