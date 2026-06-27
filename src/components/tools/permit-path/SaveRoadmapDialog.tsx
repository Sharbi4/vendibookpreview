import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw, Plus, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedRoadmap } from '@/lib/permitsApi';

interface Props {
  open: boolean;
  matches: SavedRoadmap[];
  defaultLabel: string;
  busy?: boolean;
  onRefresh: (roadmap: SavedRoadmap) => void;
  onSaveNew: (label: string) => void;
  onClose: () => void;
}

/**
 * Shown when a user tries to save a PermitPath result and we already have one
 * or more saved roadmaps that look like the same place / business.
 *
 *  - Refresh: keep that saved roadmap's progress, numbers, and uploads;
 *    swap in the new requirements; archive anything that's no longer required.
 *  - Save new: create a fresh roadmap side-by-side. Optionally rename it.
 */
export default function SaveRoadmapDialog({
  open,
  matches,
  defaultLabel,
  busy,
  onRefresh,
  onSaveNew,
  onClose,
}: Props) {
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    if (open) setLabel(defaultLabel);
  }, [open, defaultLabel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-white/15 bg-gradient-to-b from-[#161618] via-[#111114] to-[#0d0d10] shadow-[0_24px_72px_-24px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="p-5 sm:p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-1">
                    Looks familiar
                  </div>
                  <h3 className="text-white font-semibold text-lg leading-tight">
                    You already saved a roadmap for this area
                  </h3>
                  <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
                    Refresh an existing one to update its requirements (keeping your status,
                    permit numbers, and uploads), or save this as a separate roadmap.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="text-white/50 hover:text-white p-1 -m-1 disabled:opacity-40"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-2">
                  Refresh an existing roadmap
                </div>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onRefresh(m)}
                      className={cn(
                        'w-full text-left rounded-xl border border-white/12 bg-white/[0.03]',
                        'hover:bg-white/[0.06] hover:border-white/20 transition px-4 py-3',
                        'flex items-center justify-between gap-3 disabled:opacity-50',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {m.label || 'Untitled roadmap'}
                        </div>
                        <div className="text-[11px] text-white/55 mt-0.5 inline-flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {[m.city, m.state_code].filter(Boolean).join(', ')}
                          {m.business_type ? ` · ${m.business_type.replace(/_/g, ' ')}` : ''}
                          <span className="text-white/30 mx-1">·</span>
                          Updated {new Date(m.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-white/80 px-2.5 py-1 rounded-full border border-white/20 bg-white/[0.05]">
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/45 mt-2 leading-relaxed">
                  Refreshing keeps every permit number, status, expiration date, and uploaded
                  document. Requirements that no longer apply are moved to "No longer required"
                  — never deleted.
                </p>
              </div>

              <div className="h-px bg-white/8" />

              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-2">
                  Or save as a new roadmap
                </div>
                <label className="block">
                  <span className="text-[11px] text-white/55 mb-1.5 block">Label</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={120}
                    className="w-full bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/35 focus:bg-white/[0.06]"
                    placeholder="e.g. Phoenix · 2nd truck"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !label.trim()}
                onClick={() => onSaveNew(label.trim())}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#FF5124] hover:bg-[#FF5124]/90 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Save as new
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
