import { motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';

interface Props {
  location: string;
}

export default function ResultsSkeleton({ location }: Props) {
  return (
    <div className="mt-8 space-y-6">
      {/* Sticky-like summary skeleton */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FF5124]/15 border border-[#FF5124]/30 flex items-center justify-center">
            <Search className="h-5 w-5 text-[#FF5124] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5124]" />
              Researching {location} requirements…
            </div>
            <div className="mt-1 h-4 w-3/4 rounded bg-white/10 overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FF5124]/40 to-transparent"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
              />
            </div>
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
