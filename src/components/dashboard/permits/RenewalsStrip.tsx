import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, ArrowRight } from 'lucide-react';
import type { PermitItem } from '@/lib/permitsApi';
import type { SavedRoadmap } from '@/lib/permitsApi';

interface Row {
  item: PermitItem;
  roadmap: SavedRoadmap;
}

interface Props {
  rows: Row[];
  onOpen: (roadmapId: string) => void;
}

function dayDelta(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function findTitle(roadmap: SavedRoadmap, itemKey: string): string {
  const result = roadmap.result_payload;
  if (!result?.categories) return itemKey;
  for (const c of result.categories) {
    for (const it of c.items) {
      if (`${c.name}::${it.title}` === itemKey) return it.title;
    }
  }
  return itemKey.split('::').pop() || itemKey;
}

export default function RenewalsStrip({ rows, onOpen }: Props) {
  if (!rows.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.06] via-[#141418] to-[#101013] p-5 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/20 flex items-center justify-center shrink-0">
          <CalendarClock className="h-4 w-4 text-white/85" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-1">
            Renewals coming up
          </div>
          <div className="text-white font-semibold text-[15px] leading-snug mb-3">
            {rows.length} permit{rows.length === 1 ? '' : 's'} expiring soon
          </div>

          <ul className="space-y-1.5">
            {rows.slice(0, 5).map(({ item, roadmap }) => {
              const days = item.expires_on ? dayDelta(item.expires_on) : 0;
              const expired = days < 0;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.10] bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {findTitle(roadmap, item.item_key)}
                    </div>
                    <div className="text-[11px] text-white/50 truncate">
                      {roadmap.label || `${roadmap.city || roadmap.state_code}`}
                    </div>
                  </div>
                  <span
                    className={
                      'text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ' +
                      (expired
                        ? 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                        : 'bg-white/[0.10] text-white/85 border-white/25')
                    }
                  >
                    {expired ? `Expired ${Math.abs(days)}d` : `${days}d left`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(roadmap.id)}
                    className="text-white/65 hover:text-white inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-white/[0.06]"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
