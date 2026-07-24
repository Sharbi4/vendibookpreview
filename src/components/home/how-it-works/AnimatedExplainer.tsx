import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Captions } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { cn } from '@/lib/utils';

interface Props {
  explainer: Explainer;
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  storageKey?: string;
}

/**
 * Frame-driven scene runner. Advances through explainer.scenes over their
 * combined duration, exposes play/pause/scrub, and emits progress milestones.
 */
export const AnimatedExplainer = ({ explainer, onProgress, onEnded, storageKey }: Props) => {
  const prefersReduced = useReducedMotion();
  const totalMs = useMemo(
    () => explainer.scenes.reduce((s, sc) => s + sc.durationMs, 0),
    [explainer.scenes],
  );

  const [elapsedMs, setElapsedMs] = useState(() => {
    if (!storageKey) return 0;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n < totalMs - 500 ? n : 0;
  });
  const [playing, setPlaying] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const milestoneRef = useRef<Set<number>>(new Set());

  // playback loop
  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      return;
    }
    const tick = (t: number) => {
      if (lastTickRef.current == null) lastTickRef.current = t;
      const delta = t - lastTickRef.current;
      lastTickRef.current = t;
      setElapsedMs((prev) => {
        const next = Math.min(prev + delta, totalMs);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, totalMs]);

  // progress milestones + persistence
  useEffect(() => {
    const pct = totalMs > 0 ? elapsedMs / totalMs : 0;
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(Math.floor(elapsedMs)));
    }
    [0.25, 0.5, 0.75, 1].forEach((m) => {
      if (pct >= m && !milestoneRef.current.has(m)) {
        milestoneRef.current.add(m);
        onProgress?.(m);
        if (m === 1) {
          setPlaying(false);
          onEnded?.();
        }
      }
    });
  }, [elapsedMs, totalMs, onProgress, onEnded, storageKey]);

  // determine current scene
  let acc = 0;
  let sceneIndex = 0;
  for (let i = 0; i < explainer.scenes.length; i++) {
    if (elapsedMs < acc + explainer.scenes[i].durationMs) {
      sceneIndex = i;
      break;
    }
    acc += explainer.scenes[i].durationMs;
    sceneIndex = i;
  }
  const Scene = explainer.scenes[sceneIndex].Component;
  const progressPct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  const jumpToScene = (i: number) => {
    let ms = 0;
    for (let j = 0; j < i; j++) ms += explainer.scenes[j].durationMs;
    setElapsedMs(ms);
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => ms / totalMs >= m),
    );
  };

  const scrub = (pct: number) => {
    const ms = pct * totalMs;
    setElapsedMs(ms);
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => pct >= m),
    );
  };

  // Keyboard: Space play/pause, arrows scene nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        jumpToScene(Math.min(sceneIndex + 1, explainer.scenes.length - 1));
      } else if (e.code === 'ArrowLeft') {
        jumpToScene(Math.max(sceneIndex - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sceneIndex, explainer.scenes.length]);

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      {/* Stage */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneIndex}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Scene />
          </motion.div>
        </AnimatePresence>
        {!captionsOn && (
          <style>{`.explainer-captions { display: none; }`}</style>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3 border-t border-border bg-card px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => jumpToScene(Math.max(sceneIndex - 1, 0))}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Previous scene"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => jumpToScene(Math.min(sceneIndex + 1, explainer.scenes.length - 1))}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Next scene"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          role="slider"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPct)}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            scrub(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-muted"
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {formatTime(elapsedMs)} / {formatTime(totalMs)}
        </span>

        <button
          type="button"
          onClick={() => setCaptionsOn((v) => !v)}
          className={cn(
            'flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition-colors',
            captionsOn
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={captionsOn}
          aria-label="Toggle captions"
        >
          <Captions className="h-3.5 w-3.5" />
          CC
        </button>
      </div>
    </div>
  );
};

const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

export default AnimatedExplainer;
