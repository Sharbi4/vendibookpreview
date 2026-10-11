import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { ImpressionTracker } from '@/components/analytics/ImpressionTracker';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer;
  onOpen: (id: Explainer['id']) => void;
}

const ROLE_BY_ID: Record<Explainer['id'], string> = {
  buying: 'buy',
  renting: 'rent',
  selling: 'sell',
  hosting: 'host',
};

const ROLE_LABEL: Record<Explainer['id'], string> = {
  buying: 'buying',
  renting: 'renting',
  selling: 'selling',
  hosting: 'hosting',
};

/**
 * Light editorial tile: image on top, warm caption surface below.
 * The poster plays the in-browser explainer; the footer link deep-links to
 * the matching role on /how-it-works so copy stays in one place.
 */
export const VideoTile = ({ explainer, onOpen }: Props) => {
  const reduced = useReducedMotion();
  const role = ROLE_BY_ID[explainer.id];

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
      <motion.div
        whileHover={reduced ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        className="group flex h-full w-full snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_12px_30px_-22px_rgba(24,20,16,0.35)]"
      >
        {/* Poster — plays the explainer */}
        <button
          type="button"
          onClick={handleClick}
          aria-label={`Play the ${ROLE_LABEL[explainer.id]} explainer`}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <img
            src={explainer.heroImage}
            alt=""
            loading="lazy"
            width={640}
            height={480}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            {explainer.tileHeadline}
          </span>
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-[hsl(24_12%_12%)] shadow-sm transition-transform duration-200 group-hover:scale-[1.03]">
            <Play className="h-3 w-3" fill="currentColor" />
            Watch
          </span>
        </button>

        {/* Caption surface */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {explainer.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{explainer.description}</p>
          <Link
            to={`/how-it-works?role=${role}`}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-colors hover:text-primary/80"
          >
            See how {ROLE_LABEL[explainer.id]} works
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </motion.div>
    </ImpressionTracker>
  );
};

export default VideoTile;
