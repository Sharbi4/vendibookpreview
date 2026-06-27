import { motion } from 'framer-motion';
import { Zap, AlertTriangle, Lightbulb, Clock } from 'lucide-react';
import PremiumIcon from './PremiumIcon';

export interface CriticalPath {
  weeks_to_open?: string;
  bottleneck?: string;
  rationale?: string;
}
export interface RiskItem { title: string; why: string; }
export interface InsightItem { title: string; detail: string; }

interface Props {
  critical_path?: CriticalPath | null;
  risks?: RiskItem[];
  insights?: InsightItem[];
}

export default function ReasoningPanels({ critical_path, risks, insights }: Props) {
  const hasCP = critical_path && (critical_path.weeks_to_open || critical_path.bottleneck);
  const hasRisks = risks && risks.length > 0;
  const hasInsights = insights && insights.length > 0;
  if (!hasCP && !hasRisks && !hasInsights) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3 items-stretch">
      {hasCP && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#FF5124]/30 bg-gradient-to-br from-[#FF5124]/10 via-[#0d0d10] to-[#0d0d10] p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#FF5124]/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <PremiumIcon icon={Zap} accent="orange" size="md" hover="pop" pulse />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[#FF7A52] font-semibold mb-1">Critical path</div>
              <div className="font-bold text-white text-lg leading-tight mb-1">
                Open in ~{critical_path!.weeks_to_open || '—'}
              </div>
              {critical_path!.bottleneck && (
                <div className="text-sm text-white/75 mb-1">
                  <span className="text-white/45">Long pole:</span>{' '}
                  <span className="font-medium text-white">{critical_path!.bottleneck}</span>
                </div>
              )}
              {critical_path!.rationale && (
                <p className="text-xs text-white/55 leading-relaxed mt-1.5">{critical_path!.rationale}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {hasRisks && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-[#0d0d10] to-[#0d0d10] p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3 mb-3">
            <PremiumIcon icon={AlertTriangle} accent="rose" size="md" hover="tick" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-rose-300 font-semibold mb-1">Watch out</div>
              <div className="font-bold text-white">Your top risks</div>
            </div>
          </div>
          <ul className="relative space-y-2.5">
            {risks!.slice(0, 3).map((r, i) => (
              <li key={i} className="text-sm">
                <div className="font-semibold text-white">{r.title}</div>
                <div className="text-white/65 text-xs mt-0.5 leading-relaxed">{r.why}</div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {hasInsights && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[#0d0d10] to-[#0d0d10] p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3 mb-3">
            <PremiumIcon icon={Lightbulb} accent="emerald" size="md" hover="bounce" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-1">Money / time saver</div>
              <div className="font-bold text-white">Worth considering</div>
            </div>
          </div>
          <ul className="relative space-y-2.5">
            {insights!.slice(0, 3).map((it, i) => (
              <li key={i} className="text-sm">
                <div className="font-semibold text-white">{it.title}</div>
                <div className="text-white/65 text-xs mt-0.5 leading-relaxed">{it.detail}</div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
