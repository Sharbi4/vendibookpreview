import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HeroListing {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  category: string | null;
  mode: string | null;
  cover_image_url: string | null;
  priority: number;
}

const ROTATE_MS = 7000;

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: 'Food truck',
  food_trailer: 'Food trailer',
  ghost_kitchen: 'Shared kitchen',
  vendor_space: 'Vendor space',
};

/**
 * Editorial hero: real listing photography, crossfading every 7s.
 * Pro-member listings first, then paid Featured, then recent inventory —
 * ordering is resolved server-side by `get_hero_listings`.
 */
const HeroListingRotator = () => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['hero-listings-v1'],
    queryFn: async (): Promise<HeroListing[]> => {
      const { data, error } = await (supabase as any).rpc('get_hero_listings', { p_limit: 6 });
      if (error) throw error;
      return (data ?? []).filter((l: HeroListing) => !!l.cover_image_url);
    },
    staleTime: 5 * 60 * 1000,
  });

  const count = listings.length;
  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (count ? (i + dir + count) % count : 0)),
    [count],
  );

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  // Preload the next photo so the crossfade never flashes.
  useEffect(() => {
    if (count < 2) return;
    const next = listings[(index + 1) % count];
    if (next?.cover_image_url) {
      const img = new Image();
      img.src = next.cover_image_url;
    }
  }, [index, count, listings]);

  if (!isLoading && count === 0) return null;

  const active = listings[index];
  const place = [active?.city, active?.state].filter(Boolean).join(', ');
  const categoryLabel = active?.category ? CATEGORY_LABEL[active.category] : null;

  return (
    <div
      className="group relative mx-auto w-full max-w-5xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
      }}
      aria-roledescription="carousel"
      aria-label="Featured Vendibook inventory"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:aspect-[16/9] lg:aspect-[16/8]">
        {isLoading && <div className="absolute inset-0 animate-pulse bg-white/[0.05]" />}

        <AnimatePresence mode="sync">
          {active && (
            <motion.div
              key={active.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.2 : 1.1, ease: 'easeInOut' }}
            >
              <motion.img
                src={active.cover_image_url ?? ''}
                alt={active.title}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
                initial={reduced ? undefined : { scale: 1.04 }}
                animate={reduced ? undefined : { scale: 1.1 }}
                transition={{ duration: 9, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Readability scrim */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {active && (
          <Link
            to={`/listing/${active.id}`}
            className="absolute inset-0 flex items-end rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={`View listing in ${place || active.title}`}
          >
            <div className="p-5 sm:p-7">
              {categoryLabel && (
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">
                  {categoryLabel}
                </p>
              )}
              <p className="text-lg font-semibold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                {place || active.title}
              </p>
            </div>
          </Link>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous listing"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next listing"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5">
              {listings.map((l, i) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show listing ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HeroListingRotator;
