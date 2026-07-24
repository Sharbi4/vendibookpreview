import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { explainers } from '@/components/home/how-it-works/data/explainers';
import { ExplainerVideoModal } from '@/components/home/how-it-works/ExplainerVideoModal';
import { Vendi } from '@/components/home/how-it-works/Vendi';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Contextual explainer video for a listing detail page.
 * Automatically picks the *relevant* video based on the listing mode:
 *   - rent  → "Renting on Vendibook"
 *   - sale  → "Buying on Vendibook"
 * We intentionally avoid host/seller videos here — this surface is aimed at
 * the shopper, not the owner.
 */
export const ListingExplainerVideo = ({
  mode,
  listingId,
}: {
  mode: 'rent' | 'sale';
  listingId?: string;
}) => {
  const [open, setOpen] = useState(false);
  const explainer = useMemo(
    () => explainers.find((e) => e.id === (mode === 'rent' ? 'renting' : 'buying')) ?? null,
    [mode],
  );
  if (!explainer) return null;

  const handleOpen = () => {
    trackLeadEvent('listing_explainer_opened', {
      video_type: explainer.id,
      listing_id: listingId,
      listing_mode: mode,
    });
    setOpen(true);
  };

  return (
    <section aria-labelledby="listing-explainer-heading" className="mt-6">
      <div className="mb-3">
        <h2 id="listing-explainer-heading" className="text-lg md:text-xl font-semibold text-foreground">
          How {mode === 'rent' ? 'renting' : 'buying'} works on Vendibook
        </h2>
        <p className="text-sm text-muted-foreground">
          A quick, guided walkthrough of what happens after you tap {mode === 'rent' ? 'Book' : 'Buy'}.
        </p>
      </div>

      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Play video: ${explainer.title}`}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-foreground text-left shadow-lg transition-shadow hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-video w-full">
          <img
            src={explainer.heroImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[6000ms] ease-out group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />

          <div className="absolute inset-y-0 right-2 hidden items-center sm:flex">
            <Vendi accessory={explainer.accessory} size={112} />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-background/60 transition-transform group-hover:scale-105">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </span>
          </div>

          <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            {explainer.tileHeadline}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            ≈{explainer.durationSeconds}s
          </span>

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <div className="text-base font-semibold leading-tight text-white drop-shadow-lg sm:text-lg">
              {explainer.title}
            </div>
            <div className="mt-1 line-clamp-2 max-w-xl text-xs text-white/85 sm:text-sm">
              {explainer.description}
            </div>
          </div>
        </div>
      </button>

      <ExplainerVideoModal explainer={explainer} open={open} onOpenChange={setOpen} />
    </section>
  );
};

export default ListingExplainerVideo;
