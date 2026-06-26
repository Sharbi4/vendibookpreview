import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, Clock } from 'lucide-react';

interface Props {
  location: string;
}

const STAGES = [
  'Looking up jurisdictions…',
  'Pulling official agency requirements…',
  'Cross-checking health & fire codes…',
  'Sequencing your roadmap…',
  'Estimating costs and timelines…',
  'Almost done — finalizing your checklist…',
];

const ETA_SECONDS = 35;

export default function ResultsSkeleton({ location }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const idx = Math.min(STAGES.length - 1, Math.floor(elapsed / 6));
    setStageIdx(idx);
  }, [elapsed]);

  const remaining = Math.max(0, ETA_SECONDS - elapsed);
  const pct = Math.min(95, Math.round((elapsed / ETA_SECONDS) * 100));

  return (
    <div className="mt-8 space-y-6">
      {/* Status panel with ETA + progress */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Search className="h-5 w-5 text-white/70 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
                Researching {location}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <Clock className="h-3 w-3" />
                {remaining > 0 ? `~${remaining}s remaining` : 'Wrapping up…'}
              </div>
            </div>
            <p className="mt-1 text-xs text-white/55">{STAGES[stageIdx]}</p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-white/30"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              Typical lookup takes 20–40 seconds. Hang tight — we're checking live agency sources so your checklist is accurate.
            </p>
          </div>
        </div>
      </div>

      {/* Category card skeletons */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0d10] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-3 w-24 rounded bg-white/5" />
            </div>
          </div>
          <div className="space-y-3">
            {[0, 1].map((j) => (
              <div key={j} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="h-4 w-2/3 rounded bg-white/10 mb-2 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: (i + j) * 0.15, ease: 'linear' }}
                  />
                </div>
                <div className="h-3 w-full rounded bg-white/5 mb-1.5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
