import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { CaptionCard } from './CaptionCard';
import { useInViewAutoplay } from './useInViewAutoplay';
import { cn } from '@/lib/utils';

interface Props {
  explainer: Explainer;
  /** Loop back to scene 0 after the last scene finishes (tile preview mode). */
  loop?: boolean;
  /** Show Play / Pause / Restart controls (modal only). */
  showControls?: boolean;
  /** Only advance the clock when the wrapper is in the viewport. */
  respectInView?: boolean;
  onEnded?: () => void;
  onSceneChange?: (info: { index: number; previousIndex: number | null; total: number }) => void;
  onProgress?: (percent: number) => void;
  onWatched?: (ms: number) => void;
}

/**
 * Lean muted-loop explainer. Single scene clock — no audio, no TTS, no
 * ambient bed, no user-gesture requirement. Captions carry the message and
 * cannot drift because they read straight from the scene index.
 *
 * `prefers-reduced-motion` users get the poster + a static caption stack
 * instead of any motion.
 */
export const AnimatedExplainer = ({
  explainer,
  loop = false,
  showControls = false,
  respectInView = true,
  onEnded,
  onSceneChange,
  onProgress,
  onWatched,
}: Props) => {
  const reduced = useReducedMotion();
  const scenes = explainer.scenes;
  const total = scenes.length;
  const totalMs = useMemo(() => scenes.reduce((s, sc) => s + sc.durationMs, 0), [scenes]);

  const { ref: inViewRef, inView } = useInViewAutoplay<HTMLDivElement>(0.35);
  const [playing, setPlaying] = useState(true);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [ended, setEnded] = useState(false);

  const lastTickRef = useRef<number | null>(null);
  const elapsedInSceneRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const watchedMsRef = useRef(0);
  const prevSceneRef = useRef<number | null>(null);
  const milestoneRef = useRef<Set<number>>(new Set());

  const onSceneChangeRef = useRef(onSceneChange);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onSceneChangeRef.current = onSceneChange; }, [onSceneChange]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Fire scene-change events.
  useEffect(() => {
    onSceneChangeRef.current?.({
      index: sceneIndex,
      previousIndex: prevSceneRef.current,
      total,
    });
    prevSceneRef.current = sceneIndex;
  }, [sceneIndex, total]);

  // Report accumulated watched duration on unmount.
  useEffect(() => {
    return () => {
      const ms = Math.round(watchedMsRef.current);
      if (ms > 250) onWatched?.(ms);
    };
    // onWatched intentionally omitted — capture-on-unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Static/reduced-motion path — no clock at all.
  useEffect(() => {
    if (!reduced) return;
    onEndedRef.current?.();
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const shouldRun = playing && !ended && (!respectInView || inView);
    if (!shouldRun) {
      lastTickRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (t: number) => {
      const last = lastTickRef.current ?? t;
      const dt = Math.max(0, Math.min(64, t - last));
      lastTickRef.current = t;
      elapsedInSceneRef.current += dt;
      watchedMsRef.current += dt;

      const dur = scenes[sceneIndex]?.durationMs ?? 6000;

      // Progress milestones (25/50/75/100) across the full run.
      if (totalMs > 0 && onProgressRef.current) {
        const totalElapsed =
          scenes.slice(0, sceneIndex).reduce((s, sc) => s + sc.durationMs, 0) +
          elapsedInSceneRef.current;
        for (const m of [0.25, 0.5, 0.75, 1]) {
          if (!milestoneRef.current.has(m) && totalElapsed / totalMs >= m) {
            milestoneRef.current.add(m);
            onProgressRef.current(m);
          }
        }
      }

      if (elapsedInSceneRef.current >= dur) {
        elapsedInSceneRef.current = 0;
        const next = sceneIndex + 1;
        if (next >= total) {
          if (loop) {
            setSceneIndex(0);
            milestoneRef.current.clear();
          } else {
            setEnded(true);
            setPlaying(false);
            onEndedRef.current?.();
            return;
          }
        } else {
          setSceneIndex(next);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = null;
    };
  }, [playing, ended, inView, respectInView, reduced, sceneIndex, scenes, total, totalMs, loop]);

  const handlePlayPause = () => {
    if (ended) {
      setEnded(false);
      setSceneIndex(0);
      elapsedInSceneRef.current = 0;
      milestoneRef.current.clear();
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const handleRestart = () => {
    setEnded(false);
    setSceneIndex(0);
    elapsedInSceneRef.current = 0;
    milestoneRef.current.clear();
    setPlaying(true);
  };

  const Current = scenes[sceneIndex]?.Component;
  const caption = scenes[sceneIndex]?.caption ?? '';

  // Reduced motion → poster + static caption stack.
  if (reduced) {
    return (
      <div ref={inViewRef} className="relative h-full w-full overflow-hidden bg-foreground">
        <img
          src={explainer.heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="relative z-10 flex h-full w-full flex-col justify-end gap-2 p-6">
          {scenes.map((s, i) => (
            <p
              key={i}
              className="font-display text-lg font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-xl"
            >
              {s.caption}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={inViewRef}
      className={cn(
        'relative h-full w-full overflow-hidden bg-foreground',
        // Scoped rule: hide the SceneShell's built-in caption bar so our
        // CaptionCard is the only text on screen (single source of truth).
        '[&_[data-scene-caption]]:hidden',
      )}
    >
      {/* Poster — painted immediately to avoid a black flash before first frame. */}
      <img
        src={explainer.heroImage}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />

      {Current ? <Current /> : null}

      {/* Caption overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-5 pt-14 sm:px-8 sm:pb-7">
        <CaptionCard caption={caption} size={showControls ? 'modal' : 'tile'} />
      </div>

      {/* Scene pips */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center gap-1.5">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i === sceneIndex ? 'w-6 bg-white' : 'w-3 bg-white/40',
            )}
          />
        ))}
      </div>

      {/* Controls (modal only) */}
      {showControls ? (
        <div className="absolute right-3 top-3 z-50 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayPause}
            aria-label={playing ? 'Pause' : 'Play'}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            aria-label="Restart"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default AnimatedExplainer;
