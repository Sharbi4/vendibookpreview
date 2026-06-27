import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedRoadmap, PermitItem } from '@/lib/permitsApi';

interface Props {
  roadmap: SavedRoadmap;
  items: PermitItem[];
  totalRequirements: number;
  requiredCount?: number;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (label: string) => Promise<void> | void;
}

function MiniRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} stroke="rgba(255,255,255,0.10)" strokeWidth="5" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke="url(#miniRingGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,81,36,0.45))' }}
        />
        <defs>
          <linearGradient id="miniRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFB07A" />
            <stop offset="100%" stopColor="#FF5124" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white tabular-nums">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

export default function PermitRoadmapCard({
  roadmap,
  items,
  totalRequirements,
  requiredCount,
  onOpen,
  onDelete,
  onRename,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const approved = items.filter((i) => i.status === 'approved').length;
  const denom = requiredCount && requiredCount > 0 ? requiredCount : totalRequirements;
  const pct = denom > 0 ? (approved / denom) * 100 : 0;

  const now = Date.now();
  const renewalsDue = items.filter((i) => {
    if (!i.expires_on) return false;
    const t = new Date(i.expires_on).getTime();
    if (isNaN(t)) return false;
    const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24));
    return days <= 60;
  }).length;

  const location = roadmap.city
    ? `${roadmap.city}, ${roadmap.state_code}`
    : roadmap.state_code;

  const displayLabel = roadmap.label || location;

  const startRename = () => {
    setRenameValue(displayLabel);
    setIsRenaming(true);
  };

  const submitRename = async () => {
    const v = renameValue.trim();
    if (!v || v === displayLabel) {
      setIsRenaming(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(v);
      setIsRenaming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.14] bg-gradient-to-b from-white/[0.06] via-[#141418] to-[#101013] p-5 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)] flex flex-col"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      <div className="flex items-start gap-4">
        <MiniRing pct={pct} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-1 inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Saved roadmap
          </div>
          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                autoFocus
                maxLength={120}
                disabled={saving}
                className="flex-1 min-w-0 bg-white/[0.06] border border-white/20 rounded px-2 py-1 text-[15px] font-semibold text-white outline-none focus:border-[#FF5124]/60"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => void submitRename()}
                disabled={saving}
                className="text-white/80 hover:text-white p-1 rounded"
                aria-label="Save name"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                disabled={saving}
                className="text-white/55 hover:text-white p-1 rounded"
                aria-label="Cancel rename"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startRename}
              className="text-left group/name w-full"
              title="Click to rename"
            >
              <div className="font-semibold text-white text-[16px] leading-snug truncate inline-flex items-center gap-1.5">
                {displayLabel}
                <Pencil className="h-3 w-3 text-white/30 group-hover/name:text-white/70 transition-colors" />
              </div>
            </button>
          )}
          {roadmap.business_type && (
            <div className="text-sm text-white/65 capitalize truncate mt-0.5">
              {roadmap.business_type.replace(/_/g, ' ')}
            </div>
          )}
        </div>
        {!isRenaming && (
          <button
            type="button"
            onClick={onDelete}
            className="text-white/35 hover:text-white p-1.5 rounded-md hover:bg-white/[0.06]"
            aria-label="Delete saved roadmap"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/[0.10] bg-white/[0.03] py-2">
          <div className="text-sm font-semibold text-white">{approved}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/45">Approved</div>
        </div>
        <div className="rounded-lg border border-[#FF5124]/30 bg-[#FF5124]/[0.06] py-2">
          <div className="text-sm font-semibold text-white">
            {requiredCount ?? totalRequirements}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#FF5124]">Required</div>
        </div>
        <div
          className={
            'rounded-lg border py-2 ' +
            (renewalsDue
              ? 'border-white/25 bg-white/[0.08]'
              : 'border-white/[0.10] bg-white/[0.03]')
          }
        >
          <div className="text-sm font-semibold text-white">{renewalsDue}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/45">Renewals</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-white/45">
          Updated {new Date(roadmap.updated_at).toLocaleDateString()}
        </div>
        <Button
          onClick={onOpen}
          size="sm"
          className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-8 px-3 font-semibold"
        >
          Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
