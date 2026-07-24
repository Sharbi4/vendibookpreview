import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Captions, Volume2, VolumeX } from 'lucide-react';
import type { Explainer } from './data/explainers';
import { cn } from '@/lib/utils';

interface Props {
  explainer: Explainer;
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  storageKey?: string;
}

/**
 * Prefer a warm, natural English voice from the browser's synthesizer.
 * Falls back to whatever's available.
 */
const pickVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  const preferred = [
    /Samantha/i, /Ava/i, /Serena/i, /Karen/i,          // Apple natural voices
    /Google US English/i, /Google UK English Female/i,  // Chrome
    /Microsoft Aria/i, /Microsoft Jenny/i,              // Edge neural
    /Natural/i, /Neural/i,
  ];
  for (const rx of preferred) {
    const hit = pool.find((v) => rx.test(v.name));
    if (hit) return hit;
  }
  return pool[0];
};

/**
 * Frame-driven scene runner. Advances through explainer.scenes over their
 * combined duration, speaks each caption via Web Speech, exposes play/pause/
 * scrub/mute, and emits progress milestones.
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
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const milestoneRef = useRef<Set<number>>(new Set());
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const spokenSceneRef = useRef<number>(-1);

  // Prime speech voices (async in some browsers)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  // playback loop
  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    const tick = (t: number) => {
      if (lastTickRef.current == null) lastTickRef.current = t;
      const delta = t - lastTickRef.current;
      lastTickRef.current = t;
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
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
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

  // Speak the current scene's caption when the scene changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (muted || !playing) return;
    if (spokenSceneRef.current === sceneIndex) return;
    spokenSceneRef.current = sceneIndex;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(caption);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.98;
      u.pitch = 1.02;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unsupported — captions still show */
    }
  }, [sceneIndex, caption, muted, playing]);

  // Cancel speech on unmount / mute
  useEffect(() => {
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      spokenSceneRef.current = -1;
    }
  }, [muted]);

  const jumpToScene = (i: number) => {
    let ms = 0;
    for (let j = 0; j < i; j++) ms += explainer.scenes[j].durationMs;
    setElapsedMs(ms);
    spokenSceneRef.current = -1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => ms / totalMs >= m),
    );
  };

  const scrub = (pct: number) => {
    const ms = pct * totalMs;
    setElapsedMs(ms);
    spokenSceneRef.current = -1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    milestoneRef.current = new Set(
      [0.25, 0.5, 0.75, 1].filter((m) => pct >= m),
    );
  };

  // Keyboard: Space play/pause, arrows scene nav, M mute
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
      } else if (e.key?.toLowerCase() === 'm') {
        setMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sceneIndex, explainer.scenes.length]);

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
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

        {/* Caption bar */}
        {captionsOn && caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-5">
            <motion.div
              key={`cap-${sceneIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="max-w-2xl rounded-lg bg-black/75 px-3 py-1.5 text-center text-sm font-medium leading-snug text-white shadow-lg backdrop-blur sm:px-4 sm:py-2 sm:text-base"
            >
              {caption}
            </motion.div>
          </div>
        )}

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
