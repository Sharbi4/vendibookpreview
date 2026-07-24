import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { explainers } from '@/components/home/how-it-works/data/explainers';
import { Vendi } from '@/components/home/how-it-works/Vendi';
import { trackLeadEvent } from '@/lib/leadTracking';
import { useAdaptiveMediaPolicy } from '@/lib/adaptiveMedia';

/**
 * Contextual explainer video for a listing detail page.
 *
 * Performance:
 * - The heavy modal + scene bundles are code-split via React.lazy and only
 *   fetched when the user hovers, focuses, or opens the video. On mobile the
 *   fetch is triggered on `touchstart` for the same instant-open feel.
 * - The thumbnail itself is mounted only once it enters (or nears) the
 *   viewport via IntersectionObserver, so this section costs ~0 on first
 *   paint of the listing detail page.
 * - The hero image uses `loading="lazy" decoding="async"` and drops to
 *   `fetchPriority="low"` when the visitor is on Save-Data / slow-2g.
 */
const ExplainerVideoModal = lazy(() =>
  import('@/components/home/how-it-works/ExplainerVideoModal').then((m) => ({
    default: m.ExplainerVideoModal,
  })),
);

// Warm the chunk once — subsequent calls are no-ops.
let modalWarmed = false;
const warmExplainerModal = () => {
  if (modalWarmed) return;
  modalWarmed = true;
  void import('@/components/home/how-it-works/ExplainerVideoModal');
};

export const ListingExplainerVideo = ({
  mode,
  listingId,
}: {
  mode: 'rent' | 'sale';
  listingId?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const policy = useAdaptiveMediaPolicy();

  const explainer = useMemo(
    () => explainers.find((e) => e.id === (mode === 'rent' ? 'renting' : 'buying')) ?? null,
    [mode],
  );

  // Defer any real DOM work (image request, Vendi svg mount) until the
  // section is near the viewport. 400px root margin so the thumbnail is
  // ready before the user actually scrolls to it.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  if (!explainer) return null;

  const handleOpen = () => {
    trackLeadEvent('listing_explainer_opened', {
      video_type: explainer.id,
      listing_id: listingId,
      listing_mode: mode,
      data_saver: policy.dataSaver,
    });
    warmExplainerModal();
    setOpen(true);
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="listing-explainer-heading"
      className="mt-6"
    >
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
        onMouseEnter={warmExplainerModal}
        onFocus={warmExplainerModal}
        onTouchStart={warmExplainerModal}
        aria-label={`Play video: ${explainer.title}`}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-foreground text-left shadow-lg transition-shadow hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-video w-full">
          {inView ? (
            <img
              src={explainer.heroImage}
              alt=""
              loading="lazy"
              decoding="async"
              // @ts-expect-error — fetchpriority is a valid HTML attribute; React types lag.
              fetchpriority={policy.fetchPriority}
              className={
                'absolute inset-0 h-full w-full object-cover transition-transform ease-out group-hover:scale-105 ' +
                (policy.reducedMotion ? 'duration-0' : 'duration-[6000ms]')
              }
            />
          ) : (
            // Cheap CSS-only placeholder that matches the framing so the LCP
            // slot is reserved without triggering an image fetch.
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-muted via-muted-foreground/20 to-foreground/40"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />

          {inView && !policy.dataSaver && (
            <div className="absolute inset-y-0 right-2 hidden items-center sm:flex">
              <Vendi accessory={explainer.accessory} size={112} />
            </div>
          )}

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

      {open && (
        <Suspense fallback={null}>
          <ExplainerVideoModal explainer={explainer} open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </section>
  );
};

export default ListingExplainerVideo;
