import { motion } from 'framer-motion';
import { Zap, AlertTriangle, Lightbulb } from 'lucide-react';
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

// Shared premium silver/white/grey card surface.
const cardBase =
  'rounded-2xl border border-white/[0.14] bg-gradient-to-b from-white/[0.06] via-[#141418] to-[#101013] ' +
  'p-6 relative overflow-hidden h-full flex flex-col shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)]';

// Subtle metallic top sheen
const sheen = (
  <div
    aria-hidden
    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
  />
);

const labelClass =
  'text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-1.5';

export default function ReasoningPanels({ critical_path, risks, insights }: Props) {
  const hasCP = critical_path && (critical_path.weeks_to_open || critical_path.bottleneck);
  const hasRisks = risks && risks.length > 0;
  const hasInsights = insights && insights.length > 0;
  if (!hasCP && !hasRisks && !hasInsights) return null;

  return (
    <div
      className="grid gap-4 items-stretch"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
    >
      {hasCP && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardBase}
        >
          {sheen}
          <div className="relative flex items-start gap-3">
            <PremiumIcon icon={Zap} accent="silver" size="md" hover="pop" />
            <div className="flex-1 min-w-0">
              <div className={labelClass}>Critical path</div>
              <div className="font-semibold text-white text-[17px] leading-snug mb-1.5 break-words">
                Open in ~{critical_path!.weeks_to_open || '—'}
              </div>
              {critical_path!.bottleneck && (
                <div className="text-sm text-white/75 mb-1.5 leading-relaxed break-words">
                  <span className="text-white/45">Long pole:</span>{' '}
                  <span className="font-medium text-white">{critical_path!.bottleneck}</span>
                </div>
              )}
              {critical_path!.rationale && (
                <p className="text-[13px] text-white/60 leading-relaxed mt-2 break-words">
                  {critical_path!.rationale}
                </p>
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
          className={cardBase}
        >
          {sheen}
          <div className="relative flex items-start gap-3 mb-3">
            <PremiumIcon icon={AlertTriangle} accent="silver" size="md" hover="tick" />
            <div className="min-w-0">
              <div className={labelClass}>Watch out</div>
              <div className="font-semibold text-white text-[17px] leading-snug break-words">
                Your top risks
              </div>
            </div>
          </div>
          <ul className="relative space-y-3">
            {risks!.slice(0, 3).map((r, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-white leading-snug break-words">{r.title}</div>
                <div className="text-white/60 text-[13px] mt-1 leading-relaxed break-words">{r.why}</div>
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
          className={cardBase}
        >
          {sheen}
          <div className="relative flex items-start gap-3 mb-3">
            <PremiumIcon icon={Lightbulb} accent="silver" size="md" hover="bounce" />
            <div className="min-w-0">
              <div className={labelClass}>Money / time saver</div>
              <div className="font-semibold text-white text-[17px] leading-snug break-words">
                Worth considering
              </div>
            </div>
          </div>
          <ul className="relative space-y-3">
            {insights!.slice(0, 3).map((it, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-white leading-snug break-words">{it.title}</div>
                <div className="text-white/60 text-[13px] mt-1 leading-relaxed break-words">{it.detail}</div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
