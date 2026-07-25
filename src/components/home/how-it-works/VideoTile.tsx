import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { CaptionCard } from './CaptionCard';
import { useInViewAutoplay } from './useInViewAutoplay';
import { ImpressionTracker } from '@/components/analytics/ImpressionTracker';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer;
  onOpen: (id: Explainer['id']) => void;
}

/**
 * Homepage tile — muted looping caption preview on top of the hero image.
 * Advances captions only while in view. Reduced-motion users see the poster
 * with the first caption; tapping opens the full modal explainer.
 */
export const VideoTile = ({ explainer, onOpen }: Props) => {
  const reduced = useReducedMotion();
  const { ref, inView } = useInViewAutoplay<HTMLButtonElement>(0.4);
  const captions = useMemo(() => explainer.scenes.map((s) => s.caption), [explainer.scenes]);
  const perMs = explainer.scenes[0]?.durationMs ?? 6000;

  const [captionIndex, setCaptionIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced || !inView || captions.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % captions.length);
    }, perMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [inView, reduced, captions.length, perMs]);

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
        ref={ref}
        type="button"
        onClick={handleClick}
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="group relative flex w-full snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-md transition-shadow duration-300 hover:border-foreground/40 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Play video: ${explainer.title}`}
      >
        {/* Poster stage — always painted, no black flash */}
        <div className="relative aspect-video w-full overflow-hidden bg-foreground">
          <img
            src={explainer.heroImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

          {/* Play badge */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-background/70">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Duration badge */}
          <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            {explainer.durationSeconds}s
          </div>
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            {explainer.tileHeadline}
          </div>

          {/* Caption cycler */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
            <CaptionCard caption={captions[captionIndex] ?? ''} size="tile" />
          </div>

          {/* Scene pips (visual rhythm indicator) */}
          {!reduced && captions.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1.5">
              {captions.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1 rounded-full transition-all duration-300 ' +
                    (i === captionIndex ? 'w-6 bg-white' : 'w-3 bg-white/40')
                  }
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="text-base font-semibold leading-tight text-foreground sm:text-lg">
            {explainer.title}
          </div>
          <p className="text-sm text-muted-foreground">{explainer.description}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            See how it works
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </motion.button>
    </ImpressionTracker>
  );
};

export default VideoTile;
