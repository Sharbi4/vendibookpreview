import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ExternalLink, CheckCircle2, Circle, ChevronDown,
  Download, MapPin, DollarSign, Clock, Sparkles, Building, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  downloadPermitChecklistPdf,
  type PermitChecklistData,
} from '@/lib/generatePermitChecklistPdf';

export interface DashboardResult {
  location: { city?: string; state: string; stateAbbreviation?: string; business_type?: string };
  businessType?: string;
  overview?: string;
  recent_law_alert?: string | null;
  estimated_total_cost?: { low?: number; high?: number; display?: string };
  estimated_setup_weeks?: { low?: number; high?: number; display?: string };
  categories: Array<{
    name: string;
    items: Array<{
      title: string;
      issuer: string;
      level: 'state' | 'county' | 'city' | 'federal' | string;
      cost_estimate: string;
      timeline_estimate: string;
      official_url: string;
      why_it_matters: string;
      commonly_missed?: boolean;
    }>;
  }>;
  sources?: Array<{ index: number; title: string; url: string; agency?: string }>;
  verify_note?: string;
}

const levelStyles: Record<string, string> = {
  state: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  county: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  city: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  federal: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

interface Props {
  result: DashboardResult;
}

export default function ResultsDashboard({ result }: Props) {
  const storageKey = useMemo(
    () =>
      `permitpath:${result.location.state}|${result.location.city || ''}|${
        result.businessType || result.location.business_type || ''
      }`,
    [result],
  );

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    (result.categories || []).forEach((c, i) => { map[c.name] = i < 2; });
    return map;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch { /* ignore */ }
  }, [storageKey, completed]);

  const allItems = useMemo(
    () => (result.categories || []).flatMap((c) => c.items.map((i) => ({ cat: c.name, ...i }))),
    [result],
  );
  const totalCount = allItems.length;
  const doneCount = allItems.filter((i) => completed[`${i.cat}::${i.title}`]).length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const dontSkip = allItems.filter((i) => i.commonly_missed).slice(0, 5);

  const toggle = (catName: string, title: string) => {
    const key = `${catName}::${title}`;
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownload = () => {
    const data: PermitChecklistData = {
      location: result.location,
      businessType: result.businessType,
      recent_law_alert: result.recent_law_alert,
      estimated_total_cost: result.estimated_total_cost,
      estimated_setup_weeks: result.estimated_setup_weeks,
      categories: result.categories,
      verify_note: result.verify_note,
      completed,
    };
    const loc = `${result.location.city || result.location.state}`.toLowerCase().replace(/\s+/g, '-');
    downloadPermitChecklistPdf(data, `permitpath-${loc}.pdf`);
  };

  const costDisplay =
    result.estimated_total_cost?.display ||
    (result.estimated_total_cost?.low != null && result.estimated_total_cost?.high != null
      ? `$${result.estimated_total_cost.low.toLocaleString()}–$${result.estimated_total_cost.high.toLocaleString()}`
      : '—');
  const weeksDisplay =
    result.estimated_setup_weeks?.display ||
    (result.estimated_setup_weeks?.low != null && result.estimated_setup_weeks?.high != null
      ? `${result.estimated_setup_weeks.low}–${result.estimated_setup_weeks.high} weeks`
      : '—');

  return (
    <div className="mt-8 space-y-6">
      {/* Sticky summary */}
      <div className="sticky top-16 z-20 -mx-2 sm:mx-0">
        <div className="rounded-2xl border border-white/10 bg-[#08080a]/90 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[#FF5124]/15 border border-[#FF5124]/30 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-[#FF5124]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white/60">Your checklist</div>
                <div className="font-semibold text-white truncate">
                  {result.location.city ? `${result.location.city}, ` : ''}{result.location.state}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-white/80">
                <DollarSign className="h-4 w-4 text-[#FF5124]" /> {costDisplay}
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <Clock className="h-4 w-4 text-[#FF5124]" /> {weeksDisplay}
              </div>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white font-medium"
            >
              <Download className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-xs text-white/60 shrink-0">
              {doneCount} of {totalCount} complete
            </div>
            <Progress value={pct} className="h-1.5 bg-white/10" />
            <div className="text-xs font-semibold text-[#FF5124] shrink-0">{pct}%</div>
          </div>
        </div>
      </div>

      {/* Recent law alert */}
      <AnimatePresence>
        {result.recent_law_alert && !alertDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-[#FF5124]/30 bg-[#FF5124]/10 p-4 sm:p-5 flex gap-3"
          >
            <div className="h-9 w-9 rounded-lg bg-[#FF5124]/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#FF5124]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white mb-1">Recent law change worth knowing</div>
              <p className="text-sm text-white/75 leading-relaxed">{result.recent_law_alert}</p>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="text-white/40 hover:text-white/80 shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Don't skip */}
      {dontSkip.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
              Don't skip these
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {dontSkip.map((i) => (
              <div key={i.title} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span><span className="font-medium text-white">{i.title}</span> <span className="text-white/50">— {i.issuer}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {(result.categories || []).map((cat, idx) => {
          const catDone = cat.items.filter((i) => completed[`${cat.name}::${i.title}`]).length;
          const isOpen = openCats[cat.name];
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/10 bg-[#0d0d10] overflow-hidden"
            >
              <button
                onClick={() => setOpenCats((p) => ({ ...p, [cat.name]: !p[cat.name] }))}
                className="w-full flex items-center gap-3 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-[#FF5124]/10 border border-[#FF5124]/20 flex items-center justify-center shrink-0">
                  <Building className="h-4 w-4 text-[#FF5124]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-white">{cat.name}</div>
                  <div className="text-xs text-white/50">
                    {catDone} of {cat.items.length} complete
                  </div>
                </div>
                <ChevronDown
                  className={cn('h-5 w-5 text-white/40 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 space-y-2 border-t border-white/5">
                      {cat.items.map((item) => {
                        const key = `${cat.name}::${item.title}`;
                        const done = !!completed[key];
                        return (
                          <div
                            key={item.title}
                            className={cn(
                              'rounded-xl border p-4 transition-colors',
                              done
                                ? 'border-[#FF5124]/20 bg-[#FF5124]/5'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggle(cat.name, item.title)}
                                className="mt-0.5 shrink-0"
                                aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {done ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#FF5124]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-white/30 hover:text-white/60" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className={cn('font-semibold text-white', done && 'line-through opacity-60')}>
                                    {item.title}
                                  </h4>
                                  {item.level && (
                                    <Badge
                                      variant="outline"
                                      className={cn('text-[10px] uppercase tracking-wider border', levelStyles[item.level] || 'bg-white/5 text-white/60 border-white/10')}
                                    >
                                      {item.level}
                                    </Badge>
                                  )}
                                  {item.commonly_missed && (
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-300 border-amber-500/30">
                                      Often missed
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-white/65 mb-2">{item.why_it_matters}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                                  <span><span className="text-white/40">Issued by</span> {item.issuer}</span>
                                  {item.cost_estimate && (
                                    <span><span className="text-white/40">Cost</span> {item.cost_estimate}</span>
                                  )}
                                  {item.timeline_estimate && (
                                    <span><span className="text-white/40">Timeline</span> {item.timeline_estimate}</span>
                                  )}
                                </div>
                                {item.official_url && (
                                  <a
                                    href={item.official_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#FF5124] hover:text-[#FF5124]/80"
                                  >
                                    Apply on official site <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Verify note */}
      {result.verify_note && (
        <p className="text-xs text-white/45 italic text-center max-w-2xl mx-auto">
          {result.verify_note}
        </p>
      )}

      {/* Sources */}
      {result.sources && result.sources.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Sources</h3>
          <ul className="space-y-1.5">
            {result.sources.map((s) => (
              <li key={s.index} className="text-sm">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FF5124] inline-flex items-center gap-1"
                >
                  <span className="text-white/40">[{s.index}]</span> {s.title}
                  {s.agency && <span className="text-white/40">— {s.agency}</span>}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
