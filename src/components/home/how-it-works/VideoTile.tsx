import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { ImpressionTracker } from '@/components/analytics/ImpressionTracker';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer;
  onOpen: (id: Explainer['id']) => void;
}

/**
 * Homepage tile. Static poster + eyebrow + play button, title & body below.
 * Deliberately no scene animation, no chip badges, no mascot overlay — all
 * the motion happens after the user clicks Play and the modal opens.
 */
export const VideoTile = ({ explainer, onOpen }: Props) => {
  const reduced = useReducedMotion();

  const handleClick = () => {
    trackLeadEvent('homepage_video_tile_clicked', { video_type: explainer.id });
    onOpen(explainer.id);
  };

  return (
    <ImpressionTracker
      eventName="homepage_video_tile_viewed"
      payload={{ video_type: explainer.id }}
      dedupKey={`video-tile-${explainer.id}`}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="group relative flex w-full snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-md transition-shadow duration-300 hover:border-foreground/40 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Play video: ${explainer.title}`}
      >
        {/* Poster */}
        <div className="relative aspect-video w-full overflow-hidden bg-foreground">
          <img
            src={explainer.heroImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/25" />

          {/* Eyebrow — the ONLY badge on the card face. */}
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            {explainer.tileHeadline}
          </div>

          {/* Clean centered play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-background/70 transition-transform duration-200 group-hover:scale-110">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="text-base font-semibold leading-tight text-foreground sm:text-lg">
            {explainer.title}
          </div>
          <p className="text-sm text-muted-foreground">{explainer.description}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            See how it works
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </motion.button>
    </ImpressionTracker>
  );
};

export default VideoTile;
