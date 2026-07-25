import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { CaptionCard } from './CaptionCard';
import { useExplainerNarration } from './useExplainerNarration';
import { cn } from '@/lib/utils';

interface Props {
  explainer: Explainer;
  /** If true, immediately fetch narration + auto-play on mount. */
  autoPlay?: boolean;
  onEnded?: () => void;
  onSceneChange?: (info: { index: number; previousIndex: number | null; total: number }) => void;
  onProgress?: (percent: number) => void;
  onError?: (message: string) => void;
  /** Fired every time playback starts (initial + resume). */
  onPlay?: () => void;
  /** Fired once per mount when the viewer has watched at least 3 seconds. */
  onView?: () => void;
}

/**
 * Homepage explainer player. AUDIO IS THE MASTER CLOCK. Scenes advance
 * from `audio.currentTime`, so sync is guaranteed — pausing, seeking or
 * ending the audio moves/stops the animation with it. There is no RAF
 * timer competing with playback.
 *
 * Reduced-motion users still hear the narration but see a poster + the
 * static caption for the active scene (no scene animation).
 */
export const AnimatedExplainer = ({
  explainer,
  autoPlay = true,
  onEnded,
  onSceneChange,
  onProgress,
  onError,
  onPlay,
  onView,
}: Props) => {
  const reduced = useReducedMotion();
  const scenes = explainer.scenes;
  const total = scenes.length;
  const totalWeight = useMemo(
    () => scenes.reduce((s, sc) => s + (sc.weight ?? 1), 0),
    [scenes],
  );

  const { audioUrl, loading, error, fetchUrl } = useExplainerNarration(explainer);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [duration, setDuration] = useState<number>(explainer.durationSeconds);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [starting, setStarting] = useState(false);

  const prevSceneRef = useRef<number | null>(null);
  const milestoneRef = useRef<Set<number>>(new Set());
  const viewFiredRef = useRef(false);

  // Kick off audio fetch immediately on mount when autoPlay is on.
  useEffect(() => {
    if (!autoPlay) return;
    let cancelled = false;
    (async () => {
      try {
        setStarting(true);
        await fetchUrl();
      } catch (e) {
        if (!cancelled) onError?.(e instanceof Error ? e.message : 'Narration failed');
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  // Wire audio element listeners.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    const onLoaded = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    const onTime = () => setCurrentTime(a.currentTime);
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
    };
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      setEnded(true);
      onEnded?.();
    };
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    // Attempt autoplay once metadata is ready.
    if (autoPlay) {
      const tryPlay = () => {
        a.play().catch(() => {
          // Autoplay blocked — user will press play.
          setPlaying(false);
        });
      };
      if (a.readyState >= 1) tryPlay();
      else a.addEventListener('loadedmetadata', tryPlay, { once: true });
    }
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
    };
  }, [audioUrl, autoPlay, onEnded]);

  // Compute active scene from audio time via weighted ranges.
  const sceneIndex = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    let acc = 0;
    for (let i = 0; i < scenes.length; i++) {
      const w = scenes[i].weight ?? 1;
      const start = acc / totalWeight;
      const end = (acc + w) / totalWeight;
      const t = currentTime / duration;
      if (t >= start && t < end) return i;
      acc += w;
    }
    return scenes.length - 1;
  }, [currentTime, duration, scenes, totalWeight]);

  // Fire scene-change and progress-milestone callbacks.
  useEffect(() => {
    if (prevSceneRef.current === sceneIndex) return;
    onSceneChange?.({ index: sceneIndex, previousIndex: prevSceneRef.current, total });
    prevSceneRef.current = sceneIndex;
  }, [sceneIndex, total, onSceneChange]);

  useEffect(() => {
    if (!duration) return;
    const pct = currentTime / duration;
    for (const m of [0.25, 0.5, 0.75, 1]) {
      if (!milestoneRef.current.has(m) && pct >= m) {
        milestoneRef.current.add(m);
        onProgress?.(m);
      }
    }
  }, [currentTime, duration, onProgress]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  const handlePlayPause = useCallback(async () => {
    const a = audioRef.current;
    if (!a) {
      try {
        await fetchUrl();
      } catch {
        return;
      }
      return;
    }
    if (ended) {
      a.currentTime = 0;
      milestoneRef.current.clear();
      setEnded(false);
      await a.play().catch(() => {});
      return;
    }
    if (a.paused) await a.play().catch(() => {});
    else a.pause();
  }, [ended, fetchUrl]);

  const handleMute = useCallback(() => {
    const a = audioRef.current;
    setMuted((m) => {
      const next = !m;
      if (a) a.muted = next;
      return next;
    });
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current;
      if (!a || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      a.currentTime = pct * duration;
      milestoneRef.current.clear();
    },
    [duration],
  );

  const Current = scenes[sceneIndex]?.Component;
  const caption = scenes[sceneIndex]?.caption ?? '';
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // Reduced-motion: audio + poster + static caption. No scene animation.
  if (reduced) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-foreground">
        <img
          src={explainer.heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="relative z-10 flex h-full w-full flex-col justify-end gap-2 p-6">
          <CaptionCard caption={caption} size="modal" />
        </div>
        {audioUrl ? (
          <audio ref={audioRef} src={audioUrl} preload="auto" />
        ) : null}
        <PlayerControls
          playing={playing}
          muted={muted}
          starting={starting || loading}
          progressPct={progressPct}
          onPlayPause={handlePlayPause}
          onMute={handleMute}
          onSeek={handleSeek}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-foreground',
        // Hide SceneShell's built-in caption bar — CaptionCard is the only
        // caption we render.
        '[&_[data-scene-caption]]:hidden',
      )}
    >
      <img
        src={explainer.heroImage}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />

      {Current ? <Current /> : null}

      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      ) : null}

      {/* Caption overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-40 px-5 pb-4 pt-14 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-xl bg-black/55 px-5 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
          <CaptionCard caption={caption} size="modal" />
        </div>
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

      <PlayerControls
        playing={playing}
        muted={muted}
        starting={starting || loading}
        progressPct={progressPct}
        onPlayPause={handlePlayPause}
        onMute={handleMute}
        onSeek={handleSeek}
      />

      {error ? (
        <div className="absolute inset-x-0 top-8 z-50 mx-auto w-fit rounded-md bg-black/75 px-3 py-1 text-xs text-white">
          Narration unavailable — {error}
        </div>
      ) : null}
    </div>
  );
};

interface CtrlProps {
  playing: boolean;
  muted: boolean;
  starting: boolean;
  progressPct: number;
  onPlayPause: () => void;
  onMute: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const PlayerControls = ({
  playing,
  muted,
  starting,
  progressPct,
  onPlayPause,
  onMute,
  onSeek,
}: CtrlProps) => (
  <div className="absolute inset-x-0 bottom-0 z-50 flex items-center gap-3 bg-gradient-to-t from-black/90 to-transparent px-4 py-3">
    <button
      type="button"
      onClick={onPlayPause}
      aria-label={playing ? 'Pause' : 'Play'}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105"
    >
      {starting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4 translate-x-[1px]" />
      )}
    </button>

    <div
      role="slider"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPct)}
      tabIndex={0}
      onClick={onSeek}
      className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-150"
        style={{ width: `${progressPct}%` }}
      />
    </div>

    <button
      type="button"
      onClick={onMute}
      aria-label={muted ? 'Unmute' : 'Mute'}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  </div>
);

export default AnimatedExplainer;
