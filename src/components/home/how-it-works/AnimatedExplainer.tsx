import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Captions, Volume2, VolumeX } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { cn } from '@/lib/utils';
import { createAmbientBed, type AmbientBed } from './audio/ambientBed';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  explainer: Explainer;
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  onSceneChange?: (info: { index: number; previousIndex: number | null; total: number }) => void;
  onWatched?: (ms: number) => void;
  storageKey?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

// Simple in-memory cache so switching modals doesn't re-synthesize the same
// narration. Blob URLs are safe to reuse across component mounts within a
// page session.
const narrationCache = new Map<string, Promise<string>>();

const fetchNarration = (transcript: string): Promise<string> => {
  const key = transcript.trim();
  const existing = narrationCache.get(key);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/explainer-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ text: key }),
    });
    if (!res.ok) throw new Error(`tts_failed_${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  })();
  narrationCache.set(key, p);
  // On failure, purge so we can retry later.
  p.catch(() => narrationCache.delete(key));
  return p;
};

export const AnimatedExplainer = ({ explainer, onProgress, onEnded, onSceneChange, onWatched, storageKey }: Props) => {
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
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const raw = window.localStorage.getItem('vb:explainer:volume');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 1;
  });
  const [voiceReady, setVoiceReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const milestoneRef = useRef<Set<number>>(new Set());
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<AmbientBed | null>(null);
  const watchedMsRef = useRef<number>(0);
  const lastSceneRef = useRef<number>(-1);
  const onWatchedRef = useRef(onWatched);
  useEffect(() => { onWatchedRef.current = onWatched; }, [onWatched]);

  // Report accumulated watch duration on unmount.
  useEffect(() => {
    return () => {
      const ms = Math.round(watchedMsRef.current);
      if (ms > 250) onWatchedRef.current?.(ms);
    };
  }, []);

  // Prefetch narration on mount so the first play doesn't stall on the network.
  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    (async () => {
      try {
        const url = await fetchNarration(explainer.transcript);
        if (cancelled) return;
        localUrl = url;
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = muted ? 0 : volume;
        narrationRef.current = audio;
        setVoiceReady(true);
      } catch (err) {
        // 402 = workspace out of AI credits; expected & non-fatal (scenes play silently).
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('tts_failed_402')) {
          console.warn('[explainer] narration unavailable:', err);
        }
      }
    })();
    return () => {
      cancelled = true;
      const a = narrationRef.current;
      narrationRef.current = null;
      if (a) {
        try { a.pause(); } catch { /* ignore */ }
        a.src = '';
      }
      // Don't revoke the cached blob URL — it lives in the module cache so
      // re-opens are instant. Browser will GC it on unload.
      void localUrl;
    };
  }, [explainer.transcript]);

  // Ambient bed lifecycle — only created once narration is ready so it
  // never plays as a standalone hum when TTS is unavailable.
  useEffect(() => {
    if (!voiceReady) return;
    const bed = createAmbientBed(0.04);
    ambientRef.current = bed;
    return () => {
      bed.stop();
      ambientRef.current = null;
    };
  }, [voiceReady]);

  // Apply volume + mute to narration & ambient in real time.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('vb:explainer:volume', String(volume));
    }
    const a = narrationRef.current;
    const effective = muted ? 0 : volume;
    if (a) a.volume = effective;
    ambientRef.current?.setVolume(effective * 0.35); // ambient sits under narration
  }, [volume, muted, voiceReady]);

  // Sync playback state → audio + ambient bed
  useEffect(() => {
    const audio = narrationRef.current;
    const bed = ambientRef.current;
    if (playing) {
      bed?.start().catch(() => { /* autoplay policy — user will click again */ });
      bed?.setMuted(muted);
      if (audio && !muted) {
        // Align audio time to the current elapsed position.
        try {
          if (Math.abs(audio.currentTime * 1000 - elapsedMs) > 400) {
            audio.currentTime = Math.min(elapsedMs / 1000, (audio.duration || elapsedMs / 1000));
          }
        } catch { /* ignore */ }
        audio.play().catch(() => { /* blocked until gesture */ });
      } else if (audio) {
        audio.pause();
      }
    } else {
      audio?.pause();
      bed?.setMuted(true);
    }
    // Only fire when play/mute changes — elapsed sync during a scrub is handled
    // in scrub()/jumpToScene() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, muted, voiceReady]);

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
      watchedMsRef.current += delta;
      setElapsedMs((prev) => Math.min(prev + delta, totalMs));
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
          const a = narrationRef.current;
          if (a) { try { a.pause(); } catch { /* ignore */ } }
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
  const caption = explainer.scenes[sceneIndex].caption;
  const progressPct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  // Fire scene view/completion events when the active scene changes.
  useEffect(() => {
    const prev = lastSceneRef.current;
    if (prev === sceneIndex) return;
    lastSceneRef.current = sceneIndex;
    onSceneChange?.({ index: sceneIndex, previousIndex: prev >= 0 ? prev : null, total: explainer.scenes.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, explainer.scenes.length]);


  const seekAudio = (ms: number) => {
    const a = narrationRef.current;
    if (!a) return;
    try {
      const target = Math.min(ms / 1000, a.duration || ms / 1000);
      if (Number.isFinite(target)) a.currentTime = Math.max(0, target);
    } catch { /* ignore */ }
  };

  // Cumulative start offset (ms) for each scene, plus its percent along the
  // total timeline — used by the chapter chips and progress-bar ticks.
  const chapterOffsets = useMemo(() => {
    const arr: Array<{ startMs: number; percent: number }> = [];
    let acc2 = 0;
    for (const sc of explainer.scenes) {
      arr.push({ startMs: acc2, percent: totalMs > 0 ? (acc2 / totalMs) * 100 : 0 });
      acc2 += sc.durationMs;
    }
    return arr;
  }, [explainer.scenes, totalMs]);

  const jumpToScene = (i: number) => {
    let ms = 0;
    for (let j = 0; j < i; j++) ms += explainer.scenes[j].durationMs;
    setElapsedMs(ms);
    seekAudio(ms);
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => ms / totalMs >= m),
    );
  };

  const jumpToChapter = (i: number, source: 'chip' | 'tick') => {
    jumpToScene(i);
    setPlaying(true);
    trackLeadEvent('homepage_video_chapter_clicked', {
      video_type: explainer.id,
      scene_index: i,
      scene_count: explainer.scenes.length,
      chapter_label: explainer.scenes[i]?.chapterLabel,
      source,
    });
  };

  const scrub = (pct: number) => {
    const ms = pct * totalMs;
    setElapsedMs(ms);
    seekAudio(ms);
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => pct >= m),
    );
  };

  // Keyboard shortcuts:
  //   Space / K       play-pause
  //   ArrowLeft/Right prev / next scene (PageUp / PageDown mirror)
  //   Home / End      first / last scene
  //   1-9             jump to chapter N
  //   M               mute voiceover
  //   C               toggle captions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key;
      if (e.code === 'Space' || k === 'k' || k === 'K') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (k === 'ArrowRight' || k === 'PageDown') {
        e.preventDefault();
        jumpToScene(Math.min(sceneIndex + 1, explainer.scenes.length - 1));
      } else if (k === 'ArrowLeft' || k === 'PageUp') {
        e.preventDefault();
        jumpToScene(Math.max(sceneIndex - 1, 0));
      } else if (k === 'Home') {
        e.preventDefault();
        jumpToScene(0);
      } else if (k === 'End') {
        e.preventDefault();
        jumpToScene(explainer.scenes.length - 1);
      } else if (/^[1-9]$/.test(k)) {
        const idx = Number(k) - 1;
        if (idx < explainer.scenes.length) {
          e.preventDefault();
          jumpToChapter(idx, 'chip');
        }
      } else if (k === 'm' || k === 'M') {
        setMuted((m) => !m);
      } else if (k === 'c' || k === 'C') {
        setCaptionsOn((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, explainer.scenes.length]);

  return (
    <div
      className="relative flex h-full w-full flex-col bg-background"
      role="region"
      aria-label={`${explainer.title} explainer video`}
      aria-keyshortcuts="Space K ArrowLeft ArrowRight Home End 1 2 3 4 5 6 7 8 9 M C"
    >
      <p className="sr-only">
        Keyboard shortcuts: Space or K to play or pause, Left and Right arrows to change scene,
        Home and End to jump to start or end, number keys 1 through {Math.min(9, explainer.scenes.length)} to jump to a chapter,
        M to mute the voiceover, C to toggle captions.
      </p>
      {/* Cinematic stage */}
      <div className="relative aspect-video w-full overflow-hidden bg-foreground">
        {/* backdrop: hero photo, softly blurred & darkened for depth */}
        <motion.img
          src={explainer.heroImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          style={{ filter: 'blur(14px) saturate(1.15)' }}
          initial={{ scale: 1.06 }}
          animate={prefersReduced ? undefined : { scale: [1.06, 1.12, 1.06] }}
          transition={prefersReduced ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/40" />

        {/* animated scene */}
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneIndex}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Scene />
          </motion.div>
        </AnimatePresence>

        {/* Caption bar — always mounted so screen readers hear each scene.
            Visually hidden when the user turns captions off. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-5',
            !captionsOn && 'sr-only',
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {caption && (
            <motion.div
              key={`cap-${sceneIndex}`}
              initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
              className="max-w-2xl rounded-lg bg-black/75 px-3 py-1.5 text-center text-sm font-medium leading-snug text-white shadow-lg backdrop-blur sm:px-4 sm:py-2 sm:text-base"
            >
              {caption}
            </motion.div>
          )}
        </div>


        {/* Scene counter */}
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {sceneIndex + 1} / {explainer.scenes.length}
        </div>
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
          aria-valuetext={`${formatTime(elapsedMs)} of ${formatTime(totalMs)}`}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            scrub(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          onKeyDown={(e) => {
            const pct = progressPct / 100;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              // Handled globally as scene nav; swallow here so the slider
              // doesn't double-jump when it holds focus.
              return;
            }
            if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); scrub(0); }
            else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); scrub(1); }
            else if (e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); scrub(Math.max(0, pct - 0.1)); }
            else if (e.key === 'PageDown') { e.preventDefault(); e.stopPropagation(); scrub(Math.min(1, pct + 0.1)); }
          }}
          className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${progressPct}%` }}
          />
          {/* Chapter tick marks — skip the first one at 0% */}
          {chapterOffsets.slice(1).map((c, i) => (
            <button
              key={`tick-${i + 1}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                jumpToChapter(i + 1, 'tick');
              }}
              aria-label={`Jump to chapter ${i + 2}: ${explainer.scenes[i + 1]?.chapterLabel ?? ''}`}
              title={explainer.scenes[i + 1]?.chapterLabel}
              className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-background/90 ring-1 ring-foreground/30 transition-colors hover:bg-primary"
              style={{ left: `${c.percent}%` }}
            />
          ))}
        </div>

        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {formatTime(elapsedMs)} / {formatTime(totalMs)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
              muted
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary bg-primary/10 text-primary',
            )}
            aria-pressed={!muted}
            aria-label={muted ? 'Unmute voiceover' : 'Mute voiceover'}
            title={muted ? 'Unmute voiceover' : 'Mute voiceover'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (v > 0 && muted) setMuted(false);
              if (v === 0 && !muted) setMuted(true);
            }}
            aria-label="Voiceover volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
            title={`Volume ${Math.round((muted ? 0 : volume) * 100)}%`}
            className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-muted accent-primary sm:block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

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

      {/* Chapter chips — clickable jump list */}
      <nav
        aria-label="Chapters"
        className="flex gap-2 overflow-x-auto border-t border-border bg-card/60 px-3 py-2 sm:px-4"
      >
        {explainer.scenes.map((sc, i) => {
          const active = i === sceneIndex;
          return (
            <button
              key={`chapter-${i}`}
              type="button"
              onClick={() => jumpToChapter(i, 'chip')}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:text-xs',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground',
                )}
              >
                {i + 1}
              </span>
              <span className="whitespace-nowrap">{sc.chapterLabel}</span>
            </button>
          );
        })}
      </nav>
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
