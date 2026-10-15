import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { applyPublicListingFilter } from '@/lib/listings/publicVisibility';

type Row = {
  id: string; title: string | null; mode: string | null; price_sale: number | string | null; price_daily: number | string | null;
  city: string | null; state: string | null; cover_image_url: string | null; image_urls: string[] | null;
};

const money = (n: number | string | null) => (n === null || n === '' ? null : `$${Math.round(Number(n)).toLocaleString('en-US')}`);

/**
 * Empty inbox, buyer side: the listings they saved, each one tap from asking
 * the seller a question. Renders nothing when they haven't saved anything.
 */
export default function SavedToMessage() {
  const { favorites } = useFavorites();
  const ids = (favorites as string[]).slice(0, 12);
  const saved = useQuery({
    queryKey: ['inbox-saved-listings', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = supabase.from('listings')
        .select('id, title, mode, price_sale, price_daily, city, state, cover_image_url, image_urls, status, published_at, deleted_at, moderation_status')
        .in('id', ids);
      const { data, error } = await applyPublicListingFilter(q).limit(4);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const rows = saved.data ?? [];
  if (!ids.length || !rows.length) return null;

  return (
    <section aria-labelledby="inbox-saved" className="rounded-2xl border border-[#ECE6DD] bg-white p-5">
      <h2 id="inbox-saved" className="text-[16px] font-semibold text-[#1C1B1A]">Ask about something you saved</h2>
      <p className="mt-1 text-[13.5px] text-[#5E5953]">Sellers answer here, and every message stays on Vendibook.</p>
      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {rows.map((l) => {
          const price = l.mode === 'rent' ? (money(l.price_daily) ? `${money(l.price_daily)}/day` : '') : money(l.price_sale) ?? '';
          const photo = l.cover_image_url || l.image_urls?.[0] || null;
          return (
            <li key={l.id} className="min-w-0">
              <Link to={`/listing/${l.id}#ask`} className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#ECE6DD] p-2 transition-colors hover:border-[#1C1B1A]">
                <span className="h-14 w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#F3EEE7]">
                  {photo ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#1C1B1A]">{l.title?.trim() || 'Listing'}</span>
                  <span className="block truncate text-[13px] text-[#5E5953]">{[price, [l.city, l.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#B93A12]">
                    <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" /> Message the seller
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
