import { Link } from 'react-router-dom';
import { useBuyerMatchSignals, SIGNAL_WINDOW_DAYS, type ListingSignals } from '@/hooks/useBuyerMatchSignals';
import { CAMPAIGN_STATUS, listingNextStep, type BuyerMatchCampaign, type BuyerMatchListing } from '@/lib/monetization/buyerMatchIntelligence';
import { bm, place, usd } from './buyerMatchUi';

interface Props {
  listings: BuyerMatchListing[];
  campaigns: BuyerMatchCampaign[];
  entitled: boolean;
  onStart?: (listingId: string) => void;
}

const fmt = (n: number | null | undefined, loading: boolean) => (loading ? '·' : n === null || n === undefined ? '—' : n.toLocaleString('en-US'));

/** The seller's own published sale listings with real buyer activity and one next step each. */
export default function BuyerMatchListings({ listings, campaigns, entitled, onStart }: Props) {
  const signals = useBuyerMatchSignals(listings.map(l => l.id));

  if (!listings.length) {
    return <section aria-labelledby="bm-listings" className="border-t border-[#ECE6DD] pt-10">
      <h2 id="bm-listings" className={bm.h2}>Your sale listings</h2>
      <div className="mt-6 max-w-xl">
        <p className={bm.lead}>You don&rsquo;t have a published sale listing yet. BuyerMatch works on food trucks, trailers and carts listed for sale.</p>
        <p className={bm.body + ' mt-3'}>Publish one with an asking price and at least four photos: the exterior, the serving window, the kitchen line and the equipment plates.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link to="/list" className={bm.primary}>List equipment for sale</Link><Link to="/dashboard/listings" className={bm.quiet}>Manage listings</Link></div>
      </div>
    </section>;
  }

  return <section aria-labelledby="bm-listings" className="border-t border-[#ECE6DD] pt-10">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id="bm-listings" className={bm.h2}>Your sale listings</h2>
      <p className={bm.note}>Views cover the last {SIGNAL_WINDOW_DAYS} days. The other counts are current totals.</p>
    </div>
    {signals.isError && <p role="alert" className={bm.body + ' mt-4'}>Activity counts couldn&rsquo;t be loaded. Your listings are unchanged. <button type="button" onClick={() => void signals.refetch()} className={bm.link}>Try again</button></p>}
    <ul className="mt-6 space-y-5">
      {listings.map(l => {
        const campaign = campaigns.find(c => c.listing_id === l.id);
        const s: ListingSignals | undefined = signals.data?.[l.id];
        const loading = signals.isLoading;
        const step = listingNextStep(l, s, { entitled, inCampaign: !!campaign });
        const price = usd(l.price_sale);
        const photos = Array.isArray(l.image_urls) ? l.image_urls.length : 0;
        return <li key={l.id} className={bm.card + ' grid overflow-hidden md:grid-cols-[240px_minmax(0,1fr)]'}>
          <Link to={'/listing/' + l.id} className="relative block aspect-[16/10] bg-[#F3EEE7] md:aspect-auto md:min-h-full">
            {l.cover_image_url ? <img src={l.cover_image_url} alt={l.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/> : <span className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] text-[#8A847B]">No cover photo yet</span>}
          </Link>
          <div className="min-w-0 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-semibold"><Link to={'/listing/' + l.id} className="hover:text-[#FF5124]">{l.title}</Link></h3>
                <p className={bm.body + ' mt-1'}>{[price ?? 'No asking price', place(l), `${photos} photo${photos === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
              </div>
              {campaign && <span className={bm.chip}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FF5124]"/>BuyerMatch: {CAMPAIGN_STATUS[campaign.status] ?? campaign.status}</span>}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {([['Views', s?.views30], ['Saves', s?.saves], ['Offers to answer', s?.offersWaiting], ['Conversations', s?.conversations]] as const).map(([label, n]) =>
                <div key={label} className="flex flex-col-reverse"><dt className={bm.label}>{label}</dt><dd className={bm.numSm + (label === 'Offers to answer' && (n ?? 0) > 0 ? ' text-[#FF5124]' : '')}>{fmt(n, loading)}</dd></div>)}
            </dl>
            {s?.topOffer ? <p className={bm.body + ' mt-3'}>Highest offer waiting: <span className="font-semibold text-[#1C1B1A]">{usd(s.topOffer)}</span>{price ? ` against your ${price} asking price` : ''}.</p> : null}
            <div className="mt-6 flex flex-col gap-4 border-t border-[#ECE6DD] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FF5124]">Next</p><p className="mt-1 text-[15px] font-semibold">{step.label}</p><p className={bm.body}>{step.detail}</p></div>
              {step.action === 'start_buyermatch' && onStart
                ? <button type="button" onClick={() => onStart(l.id)} className={bm.primary + ' shrink-0'}>Start a buyer search</button>
                : step.to && <Link to={step.to} className={((s?.offersWaiting ?? 0) > 0 ? bm.primary : bm.quiet) + ' shrink-0'}>{step.label}</Link>}
            </div>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
