import { matchingListingPrice } from '@/lib/monetization/buyerMatchIntelligence';
import { Link } from 'react-router-dom';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import type { BuyerMatchListing } from '@/lib/monetization/buyerMatchIntelligence';
import { bm, place, usd } from './buyerMatchUi';

const HOW = [
  ['You pick a sale or rental listing', 'Tell us where to look and who the right buyer or renter is: a region, a budget, equipment needs or rental dates.'],
  ['Our team searches', 'We look for public posts from people shopping for a truck, trailer or cart like yours and log each one we find.'],
  ['Outreach with permission', 'Nobody is messaged until outreach is approved and documented. Replies go to your Vendibook messages.'],
] as const;

/** Shown when the seller has no current Pro access. No sample numbers: it uses the seller's own listing. */
export default function BuyerMatchPreview({ listing }: { listing?: BuyerMatchListing }) {
  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const price = `${usd(pro.cents / 100)}${pro.billingType === 'recurring' ? '/mo' : ''}`;
  return <section aria-label="BuyerMatch with Vendibook Pro" className={bm.card + ' grid overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]'}>
    <div className="relative min-h-[240px] bg-[#1C1B1A] sm:min-h-[320px]">
      {listing?.cover_image_url && <img src={listing.cover_image_url} alt={listing.title} className="absolute inset-0 h-full w-full object-cover opacity-90"/>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1C1B1A]/85 via-[#1C1B1A]/20 to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
        {listing
          ? <><p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/70">Your listing</p><p className="mt-2 font-display text-[26px] leading-tight sm:text-[32px]">{listing.title}</p><p className="mt-1 text-[14px] text-white/75">{[matchingListingPrice(listing), place(listing)].filter(Boolean).join(' · ')}</p></>
          : <p className="font-display text-[26px] leading-tight sm:text-[32px]">Publish a sale or rental listing and submit it for BuyerMatch review.</p>}
      </div>
    </div>
    <div className="p-6 sm:p-10">
      <p className={bm.eyebrow}>Included with Vendibook Pro</p>
      <h2 className={bm.h2 + ' mt-3'}>{listing ? 'Have our team find the right buyer or renter.' : 'Have our team find your next buyer or renter.'}</h2>
      <ol className="mt-7 space-y-6">
        {HOW.map(([t, b], i) => <li key={t} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3"><span className="font-display text-[18px] leading-6 text-[#FF5124]">{i + 1}</span><div><p className="text-[15px] font-semibold">{t}</p><p className={bm.body + ' mt-1'}>{b}</p></div></li>)}
      </ol>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to="/dashboard/buyermatch/membership" className={bm.primary}>Get Vendibook Pro · {price}</Link>
        <Link to="/dashboard/buyermatch/membership#benefits" className={bm.link + ' whitespace-nowrap sm:ml-3'}>What&rsquo;s included</Link>
      </div>
      <p className={bm.note + ' mt-4'}>Campaign review and capacity apply. No matches, sales or bookings are guaranteed.</p>
    </div>
  </section>;
}
