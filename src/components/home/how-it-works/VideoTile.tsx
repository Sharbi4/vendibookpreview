import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Vendi } from './Vendi';
import type { Explainer } from './data/explainers';
import { ImpressionTracker } from '@/components/analytics/ImpressionTracker';

interface Props {
  explainer: Explainer;
  onOpen: (id: Explainer['id']) => void;
}

export const VideoTile = ({ explainer, onOpen }: Props) => {
  const prefersReduced = useReducedMotion();

  return (
    <ImpressionTracker
      eventName="homepage_video_tile_viewed"
      payload={{ video_type: explainer.id }}
      dedupKey={`video-tile-${explainer.id}`}
    >
      <motion.button
        type="button"
        onClick={() => onOpen(explainer.id)}
        whileHover={prefersReduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="group relative flex w-full snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-md transition-shadow duration-300 hover:border-foreground/40 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Play video: ${explainer.title}`}
      >
        {/* Cinematic thumbnail stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-foreground">
          {/* hero image */}
          <motion.img
            src={explainer.heroImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.02 }}
            whileHover={prefersReduced ? undefined : { scale: 1.08 }}
            transition={{ duration: 6, ease: 'easeOut' }}
          />

          {/* cinematic gradient wash */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />

          {/* floating mascot */}
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Vendi accessory={explainer.accessory} size={128} />
          </div>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-background/70"
              animate={prefersReduced ? undefined : { scale: [1, 1.08, 1] }}
              transition={prefersReduced ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
            </motion.div>
          </div>

          {/* Duration badge */}
          <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            ≈{explainer.durationSeconds}s
          </div>
          {/* Headline overlay */}
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            {explainer.tileHeadline}
          </div>

          {/* Bottom title strip */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="text-base font-semibold leading-tight text-white drop-shadow-lg sm:text-lg">
              {explainer.title}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-sm text-muted-foreground">{explainer.description}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Watch with voiceover
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </motion.button>
    </ImpressionTracker>
  );
};

export default VideoTile;
