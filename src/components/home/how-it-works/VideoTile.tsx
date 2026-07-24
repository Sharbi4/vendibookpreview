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
        whileHover={prefersReduced ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="group relative flex w-full snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow duration-200 hover:border-foreground/30 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Play video: ${explainer.title}`}
      >
        {/* Thumbnail stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-muted/60 via-background to-muted/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <Vendi accessory={explainer.accessory} size={140} still />
          </div>
          {/* subtle grid */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
            <defs>
              <pattern id={`grid-${explainer.id}`} width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${explainer.id})`} />
          </svg>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background/60"
              animate={prefersReduced ? undefined : { scale: [1, 1.06, 1] }}
              transition={prefersReduced ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </motion.div>
          </div>

          {/* Duration badge */}
          <div className="absolute right-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur">
            ≈{explainer.durationSeconds}s
          </div>
          {/* Headline overlay */}
          <div className="absolute left-3 top-3 rounded-md bg-foreground/85 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-background">
            {explainer.tileHeadline}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="text-base font-semibold text-foreground">{explainer.title}</div>
          <p className="text-sm text-muted-foreground">{explainer.description}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Watch video
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </motion.button>
    </ImpressionTracker>
  );
};

export default VideoTile;
