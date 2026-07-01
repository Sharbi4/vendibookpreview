import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Images, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaItem = { type: 'image' | 'video'; url: string };

interface Props {
  items: MediaItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onOpenLightbox: (i: number) => void;
  title: string;
  totalMedia: number;
  hasMultipleMedia: boolean;
}

/**
 * Native scroll-snap carousel for mobile.
 * Uses the browser's own touch handling — smooth, no re-mount thrash,
 * no framer-motion x-animation per swipe.
 */
export const MobileSnapCarousel = ({
  items,
  index,
  onIndexChange,
  onOpenLightbox,
  title,
  totalMedia,
  hasMultipleMedia,
}: Props) => {
  const railRef = useRef<HTMLDivElement>(null);
  const suppressScrollSync = useRef(false);

  // Sync programmatic index changes (arrow / dot clicks) → scroll position
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    suppressScrollSync.current = true;
    el.scrollTo({ left: target, behavior: 'smooth' });
    const t = setTimeout(() => (suppressScrollSync.current = false), 320);
    return () => clearTimeout(t);
  }, [index]);

  // Sync user swipes → index (debounced via rAF)
  const onScroll = () => {
    if (suppressScrollSync.current) return;
    const el = railRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < items.length) onIndexChange(i);
  };

  const go = (dir: -1 | 1) => {
    const next = (index + dir + items.length) % items.length;
    onIndexChange(next);
  };

  return (
    <div className="md:hidden relative aspect-[4/3] select-none">
      <div
        ref={railRef}
        onScroll={onScroll}
        className="snap-rail scrollbar-hide flex h-full w-full overflow-x-auto overflow-y-hidden gpu-layer"
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpenLightbox(i)}
            className="relative shrink-0 w-full h-full block no-tap-highlight"
            aria-label={`Open photo ${i + 1} of ${items.length}`}
          >
            {item.type === 'video' ? (
              <>
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-foreground fill-foreground ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={item.url}
                alt={title}
                className="w-full h-full object-cover"
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
          </button>
        ))}
      </div>

      {/* Prev / Next — big tap area, small visual */}
      {hasMultipleMedia && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-0 top-0 bottom-0 z-10 w-14 flex items-center justify-start pl-2 no-tap-highlight"
          >
            <span className="w-9 h-9 rounded-full bg-black/45 flex items-center justify-center text-white shadow-md">
              <ChevronLeft className="w-5 h-5" />
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next photo"
            className="absolute right-0 top-0 bottom-0 z-10 w-14 flex items-center justify-end pr-2 no-tap-highlight"
          >
            <span className="w-9 h-9 rounded-full bg-black/45 flex items-center justify-center text-white shadow-md">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        </>
      )}

      {/* Dots */}
      {hasMultipleMedia && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none">
          {items.map((_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full transition-all duration-200',
                i === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/55'
              )}
            />
          ))}
        </div>
      )}

      {/* Photo count */}
      {hasMultipleMedia && (
        <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 z-10">
          {items[index]?.type === 'video' ? (
            <Video className="w-3.5 h-3.5" />
          ) : (
            <Images className="w-3.5 h-3.5" />
          )}
          {index + 1} / {totalMedia}
        </div>
      )}
    </div>
  );
};

export default MobileSnapCarousel;
