import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Image as ImageIcon, Pencil, ShoppingCart, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { cn } from '@/lib/utils';

type ListingRow = {
  id: string;
  title: string | null;
  mode: string | null;
  status: string | null;
  price_sale: number | string | null;
  price_daily: number | string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  accepts_offers: boolean | null;
  host_id: string;
};

const money = (n: number | string | null) => (n === null || n === '' ? null : `$${Math.round(Number(n)).toLocaleString('en-US')}`);

/**
 * The listing a conversation is about, pinned under the thread header so both
 * sides always see what they're talking about. Buyers get the next steps
 * (Make offer, Request to buy / Book); sellers get View and Edit.
 */
export default function ThreadListingCard({ listingId, isHost }: { listingId: string; isHost: boolean }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const listing = useQuery({
    queryKey: ['thread-listing-card', listingId],
    enabled: Boolean(listingId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, mode, status, price_sale, price_daily, city, state, cover_image_url, image_urls, accepts_offers, host_id')
        .eq('id', listingId)
        .maybeSingle();
      if (error) throw error;
      return data as ListingRow | null;
    },
  });

  const l = listing.data;
  if (listing.isLoading) return <div className="mx-3 mt-3 h-[72px] animate-pulse rounded-2xl bg-[#F3EEE7] sm:mx-5" aria-hidden="true" />;
  if (!l) return null;

  const rent = l.mode === 'rent';
  const live = l.status === 'published';
  const price = rent ? (money(l.price_daily) ? `${money(l.price_daily)}/day` : null) : money(l.price_sale);
  const photo = l.cover_image_url || l.image_urls?.[0] || null;
  const place = [l.city, l.state].filter(Boolean).join(', ');
  const btn =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E2DBD0] bg-white px-3 text-[12.5px] font-semibold text-[#1C1B1A] sm:h-9 sm:px-3.5 sm:text-[13px] transition-colors hover:border-[#1C1B1A]';
  const primary =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#FF5124] px-3 text-[12.5px] sm:h-9 sm:px-3.5 sm:text-[13px] font-semibold text-white transition-colors hover:bg-[#E8461D]';

  return (
    <section aria-label="Listing in this conversation" className="mx-3 mt-2 rounded-2xl border border-[#ECE6DD] bg-white p-2 sm:mx-5 sm:mt-3 sm:p-2.5">
      <div className="flex items-center gap-3">
        <Link to={`/listing/${l.id}`} className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F3EEE7] sm:h-14 sm:w-[72px] sm:rounded-xl">
          {photo ? (
            <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center"><ImageIcon aria-hidden="true" className="h-5 w-5 text-[#6F6961]" /></span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/listing/${l.id}`} className="block truncate text-[13.5px] font-semibold sm:text-[14px] text-[#1C1B1A] hover:underline">
            {l.title?.trim() || 'Listing'}
          </Link>
          <p className="truncate text-[12.5px] text-[#5E5953] sm:mt-0.5 sm:text-[13px]">
            {[price, place].filter(Boolean).join(' · ')}
            {!live && <span className="ml-1.5 rounded-full bg-[#F3EEE7] px-2 py-0.5 text-[11.5px] font-semibold text-[#5E5953]">Not available</span>}
          </p>
        </div>
      </div>

      <div className={cn('mt-2 flex gap-2 overflow-x-auto pb-0.5 sm:mt-2.5', '[scrollbar-width:none]')}>
        <Link to={`/listing/${l.id}`} className={btn}>
          View listing <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
        {isHost ? (
          <Link to={`/dashboard/listings/${l.id}/edit`} className={btn}>
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Edit listing
          </Link>
        ) : live && rent ? (
          <Link to={`/listing/${l.id}#book`} className={primary}>Pick dates</Link>
        ) : live ? (
          <>
            {l.accepts_offers && l.price_sale ? (
              <button type="button" className={btn} onClick={() => setOfferOpen(true)}>
                <Tag aria-hidden="true" className="h-3.5 w-3.5" /> Make offer
              </button>
            ) : null}
            <Link to={`/checkout/${l.id}`} className={primary}>
              <ShoppingCart aria-hidden="true" className="h-3.5 w-3.5" /> Request to buy
            </Link>
          </>
        ) : null}
      </div>

      {!isHost && l.price_sale ? (
        <MakeOfferModal
          open={offerOpen}
          onOpenChange={setOfferOpen}
          listingId={l.id}
          sellerId={l.host_id}
          listingTitle={l.title ?? ''}
          askingPrice={Number(l.price_sale)}
        />
      ) : null}
    </section>
  );
}
