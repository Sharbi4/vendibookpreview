import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, CheckCircle2, Circle, ChevronDown,
  Download, MapPin, DollarSign, Clock, Sparkles, X, Mail,
  Share2, CalendarPlus, Lightbulb, Building2, Filter, Check, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  downloadPermitChecklistPdf,
  type PermitChecklistData,
} from '@/lib/generatePermitChecklistPdf';
import {
  buildRoadmap, buildIcs, downloadIcs, buildMailto,
  type RoadmapNode,
} from '@/lib/permitRoadmap';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import RoadmapSuccess from './RoadmapSuccess';
import ReasoningPanels, { type CriticalPath, type RiskItem, type InsightItem } from './ReasoningPanels';
import PremiumIcon from './PremiumIcon';
import { categoryVisual } from './categoryVisuals';

export interface DashboardResult {
  location: { city?: string; state: string; stateAbbreviation?: string; business_type?: string };
  businessType?: string;
  overview?: string;
  recent_law_alert?: string | null;
  estimated_total_cost?: { low?: number; high?: number; display?: string };
  estimated_setup_weeks?: { low?: number; high?: number; display?: string };
  critical_path?: CriticalPath | null;
  risks?: RiskItem[];
  insights?: InsightItem[];
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
      pro_tip?: string;
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

type Filter = 'all' | 'remaining' | 'commonly_missed';

interface Props {
  result: DashboardResult;
  /** Read-only mode: hide save/share affordances when viewing somebody else's shared roadmap. */
  readOnly?: boolean;
}

export default function ResultsDashboard({ result, readOnly = false }: Props) {
  const { user } = useAuth();

  const storageKey = useMemo(
    () =>
      `permitpath:${result.location.state}|${result.location.city || ''}|${
        result.businessType || result.location.business_type || ''
      }`,
    [result],
  );

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 1) localStorage load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  // 2) remote load (signed-in users override local with remote)
  useEffect(() => {
    if (!user || readOnly) { setLoadedRemote(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('permit_progress')
          .select('completed')
          .eq('user_id', user.id)
          .eq('roadmap_key', storageKey)
          .maybeSingle();
        if (!cancelled && data?.completed && typeof data.completed === 'object') {
          setCompleted(data.completed as Record<string, boolean>);
        }
      } catch { /* table may not exist yet */ }
      if (!cancelled) setLoadedRemote(true);
    })();
    return () => { cancelled = true; };
  }, [user, storageKey, readOnly]);

  // 3) save: localStorage always, remote when signed-in (debounced)
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch { /* ignore */ }
    if (!user || readOnly || !loadedRemote) return;
    const t = setTimeout(() => {
      (supabase as any)
        .from('permit_progress')
        .upsert({
          user_id: user.id,
          roadmap_key: storageKey,
          state_code: result.location.state,
          city: result.location.city || null,
          business_type: result.businessType || result.location.business_type || null,
          completed,
        }, { onConflict: 'user_id,roadmap_key' })
        .then(() => { /* silent */ }, () => { /* silent */ });
    }, 600);
    return () => clearTimeout(t);
  }, [completed, storageKey, user, readOnly, loadedRemote, result]);

  const roadmap = useMemo(() => buildRoadmap(result, completed), [result, completed]);
  const isComplete = roadmap.total > 0 && roadmap.done === roadmap.total;

  // Auto-expand the "next" item
  useEffect(() => {
    if (roadmap.next_step_id) {
      setExpanded((p) => ({ ...p, [roadmap.next_step_id!]: p[roadmap.next_step_id!] ?? true }));
    }
  }, [roadmap.next_step_id]);

  const toggle = useCallback((node: RoadmapNode) => {
    // Info is never locked — users can check anything in any order.
    setCompleted((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
  }, []);

  const markAllInCategory = useCallback((catName: string) => {
    const nodesInCat = roadmap.nodes.filter((n) => n.category === catName);
    setCompleted((prev) => {
      const next = { ...prev };
      const allDone = nodesInCat.every((n) => prev[n.id]);
      for (const n of nodesInCat) next[n.id] = !allDone;
      return next;
    });
  }, [roadmap.nodes]);

  // ---------- Actions ----------
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

  const handleEmailMe = () => {
    window.location.href = buildMailto(result, roadmap);
  };

  const handleShare = async () => {
    const params = new URLSearchParams({
      state: result.location.state,
      ...(result.location.city ? { city: result.location.city } : {}),
      businessType: result.businessType || result.location.business_type || 'food_truck',
      shared: '1',
    });
    const url = `${window.location.origin}/tools/permitpath?${params.toString()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My PermitPath roadmap', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Roadmap link copied to clipboard');
      }
    } catch { /* user cancelled */ }
  };

  const handleCalendarReminder = (node: RoadmapNode) => {
    const ics = buildIcs({
      title: `PermitPath: ${node.title}`,
      description: `${node.why_it_matters}\n\nIssuer: ${node.issuer}\nCost: ${node.cost_estimate}\nTimeline: ${node.timeline_estimate}${node.pro_tip ? `\n\nPro tip: ${node.pro_tip}` : ''}`,
      url: node.official_url,
      daysFromNow: 3,
    });
    const safe = node.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    downloadIcs(`permitpath-${safe}.ics`, ics);
    toast.success('Reminder downloaded — add it to your calendar');
  };

  // ---------- Display values ----------
  const locationLabel = result.location.city
    ? `${result.location.city}, ${result.location.state}`
    : result.location.state;

  const remainingCost =
    roadmap.remaining_cost_high > 0
      ? `$${roadmap.remaining_cost_low.toLocaleString()}–$${roadmap.remaining_cost_high.toLocaleString()}`
      : '—';
  const remainingWeeks =
    roadmap.remaining_weeks_high > 0
      ? `${roadmap.remaining_weeks_low}–${roadmap.remaining_weeks_high} wks`
      : '—';

  // Filter nodes
  const visibleNodes = roadmap.nodes.filter((n) => {
    if (filter === 'remaining') return !n.done;
    if (filter === 'commonly_missed') return n.commonly_missed;
    return true;
  });

  // Group by category, then sort by OPERATING PRIORITY (what gates legal service first;
  // routine business registration always last). Dependency logic still drives "next step".
  const CATEGORY_PRIORITY: Record<string, number> = {
    'Health Permits': 10,
    'Mobile Vendor License': 20,
    'Local & City-Specific': 30,
    'Commissary / Base of Operations': 40,
    'Fire & Equipment': 50,
    'Food Safety Certifications': 60,
    'Insurance': 70,
    'Business Registration': 99,
  };
  const catScore = (name: string) => CATEGORY_PRIORITY[name] ?? 80;

  const groupedMap = new Map<string, RoadmapNode[]>();
  for (const n of visibleNodes) {
    const arr = groupedMap.get(n.category) || [];
    arr.push(n);
    groupedMap.set(n.category, arr);
  }
  const grouped: Array<{ name: string; nodes: RoadmapNode[] }> = Array.from(groupedMap.entries())
    .map(([name, nodes]) => ({ name, nodes }))
    .sort((a, b) => catScore(a.name) - catScore(b.name));

  return (
    <div className="mt-8 space-y-8">
      {/* Sticky summary bar — high contrast */}
      <div className="sticky top-16 z-20 -mx-2 sm:mx-0">
        <div className="rounded-2xl border border-white/20 bg-[#0a0a0d]/95 backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-white/70 uppercase tracking-wider font-medium">
                  {user && !readOnly ? 'Welcome back — your roadmap' : 'Your roadmap'}
                </div>
                <div className="font-bold text-white text-lg leading-tight break-words">
                  {locationLabel}
                </div>
                {result.businessType && (
                  <div className="text-xs text-white/65 mt-0.5">{result.businessType}</div>
                )}
              </div>
            </div>
            <ProgressRing pct={roadmap.pct} />
            <div className="flex flex-wrap gap-2">
              <StatChip icon={Check} label="Done" value={`${roadmap.done}/${roadmap.total}`} />
              <StatChip icon={DollarSign} label="Cost left" value={remainingCost} />
              <StatChip icon={Clock} label="Time" value={remainingWeeks} />
            </div>
            <div className="flex gap-1.5">
              {!readOnly && (
                <Button onClick={handleEmailMe} size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-9">
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              {!readOnly && (
                <Button onClick={handleShare} size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-9">
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleDownload} size="sm" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9">
                <Download className="h-4 w-4 mr-1.5" /> PDF
              </Button>
            </div>
          </div>

          {!user && !readOnly && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
              <span className="text-white/70">Save your progress and pick up where you left off:</span>
              <Link to="/auth?redirect=/tools/permitpath" className="text-white hover:underline font-medium inline-flex items-center gap-1">
                Save to my account <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 100% celebration */}
      <AnimatePresence>
        {isComplete && (
          <RoadmapSuccess
            location={locationLabel}
            totalCost={result.estimated_total_cost?.display || ''}
          />
        )}
      </AnimatePresence>

      {/* Recent law alert */}
      <AnimatePresence>
        {result.recent_law_alert && !alertDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:p-5 flex gap-3"
          >
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white mb-1">Recent law change worth knowing</div>
              <p className="text-sm text-white/75 leading-relaxed">{result.recent_law_alert}</p>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="text-white/40 hover:text-white/80 shrink-0" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reasoning panels: critical path, risks, money-saver insights */}
      <ReasoningPanels
        critical_path={result.critical_path}
        risks={result.risks}
        insights={result.insights}
      />

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-white/40" />
        {([
          ['all', `All (${roadmap.total})`],
          ['remaining', `Remaining (${roadmap.total - roadmap.done})`],
          ['commonly_missed', `Commonly missed (${roadmap.nodes.filter((n) => n.commonly_missed).length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k as Filter)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              filter === k
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-white/5 border-white/10 text-white/65 hover:text-white hover:border-white/20',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categories — ordered by operating priority */}
      <div className="space-y-6">
        {grouped.map((cat, idx) => {
          const catDone = cat.nodes.filter((n) => n.done).length;
          const catTotal = cat.nodes.length;
          const allMarked = catTotal > 0 && cat.nodes.every((n) => n.done);
          return (
            <motion.section
              key={`${cat.name}-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-white/15 bg-[#101013] overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
            >
              {/* Sticky category header — anchor as you scroll */}
              <div className="sticky top-[88px] z-10 flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-[#101013]/95 backdrop-blur-md border-b border-white/15">
                {(() => {
                  const cv = categoryVisual(cat.name);
                  return <PremiumIcon icon={cv.icon} accent={cv.accent} size="sm" hover="lift" />;
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-base">{cat.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/85">
                      {catDone}/{catTotal}
                    </span>
                  </div>
                </div>
                {!readOnly && catTotal > 0 && (
                  <button
                    onClick={() => markAllInCategory(cat.name)}
                    className="text-xs font-medium text-white/75 hover:text-white px-2.5 py-1 rounded-md border border-white/10 hover:border-white/25 hover:bg-white/5"
                  >
                    {allMarked ? 'Uncheck all' : 'Mark all'}
                  </button>
                )}
              </div>

              <div className="px-3 sm:px-4 py-4 space-y-3">
                {cat.nodes.map((node) => (
                  <RoadmapItem
                    key={node.id}
                    node={node}
                    expanded={!!expanded[node.id]}
                    onToggleExpand={() => setExpanded((p) => ({ ...p, [node.id]: !p[node.id] }))}
                    onToggleDone={() => toggle(node)}
                    onCalendar={() => handleCalendarReminder(node)}
                    readOnly={readOnly}
                    state={result.location.state}
                  />
                ))}
              </div>
            </motion.section>
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
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-[#FF5124] inline-flex items-center gap-1">
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

// ---------- ProgressRing ----------
function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" fill="none" />
        <motion.circle
          cx="20" cy="20" r={r}
          stroke="#FF5124"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
        {pct}%
      </div>
    </div>
  );
}

// ---------- RoadmapItem ----------
interface ItemProps {
  node: RoadmapNode;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onCalendar: () => void;
  readOnly: boolean;
  state: string;
}

function RoadmapItem({ node, expanded, onToggleExpand, onToggleDone, onCalendar, readOnly, state }: ItemProps) {
  const isNext = node.status === 'next';
  const isDone = node.status === 'done';
  // "locked" no longer hides info — it's a soft sequence hint.
  const isSequenceHint = node.status === 'locked';

  // Commissary action: deep-link to kitchen search
  const showCommissaryAction = node.key === 'commissary' && !isDone && !readOnly;

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border-[1.5px] transition-all',
        isDone && 'border-white/20 bg-white/[0.05]',
        isNext && 'border-[#FF5124]/60 bg-[#FF5124]/[0.06] shadow-[0_0_0_1px_rgba(255,81,36,0.35),0_8px_24px_-12px_rgba(255,81,36,0.4)]',
        !isDone && !isNext && 'border-white/[0.14] bg-[#16161a] hover:border-white/30 hover:bg-[#1a1a1f]',
      )}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleDone}
            className="mt-0.5 shrink-0"
            aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
            disabled={readOnly}
          >
            {isDone ? (
              <CheckCircle2 className="h-5 w-5 text-white/80" />
            ) : (
              <Circle className={cn('h-5 w-5', isNext ? 'text-[#FF5124]' : 'text-white/30 hover:text-white/60')} />
            )}
          </button>

          <button
            onClick={onToggleExpand}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isNext && (
                <Badge className="text-[10px] uppercase tracking-wider bg-[#FF5124] text-white border-transparent hover:bg-[#FF5124]">
                  Start here
                </Badge>
              )}
              {isSequenceHint && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-white/5 text-white/55 border-white/10">
                  Do after earlier steps
                </Badge>
              )}
              <h4 className={cn('font-semibold text-white', isDone && 'line-through opacity-60')}>
                {node.title}
              </h4>
              {node.level && (
                <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider border', levelStyles[node.level] || 'bg-white/5 text-white/60 border-white/10')}>
                  {node.level}
                </Badge>
              )}
              {node.commonly_missed && !isDone && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-300 border-amber-500/30">
                  Often missed
                </Badge>
              )}
            </div>

            <p className="text-sm text-white/65 mb-1.5">{node.why_it_matters}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
              <span><span className="text-white/40">By</span> {node.issuer}</span>
              {node.cost_estimate && <span><span className="text-white/40">Cost</span> {node.cost_estimate}</span>}
              {node.timeline_estimate && <span><span className="text-white/40">Time</span> {node.timeline_estimate}</span>}
            </div>
          </button>

          <ChevronDown className={cn('h-4 w-4 text-white/30 transition-transform shrink-0 mt-1', expanded && 'rotate-180')} />
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pl-8 space-y-3">
                {isSequenceHint && node.unlock_reason && (
                  <p className="text-xs text-white/55 italic">{node.unlock_reason}</p>
                )}

                {node.pro_tip && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex gap-2.5">
                    <Lightbulb className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/55 font-semibold mb-0.5">Operator tip</div>
                      <p className="text-sm text-white/80 leading-relaxed">{node.pro_tip}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {node.official_url && (
                    <a
                      href={node.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg"
                    >
                      Apply on official site <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {!readOnly && (
                    <button
                      onClick={onCalendar}
                      className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Set a reminder
                    </button>
                  )}
                  {showCommissaryAction && (
                    <Link
                      to={`/search?type=kitchen&state=${state}`}
                      className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg"
                    >
                      <Building2 className="h-3.5 w-3.5" /> Find a commissary near you
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------- StatChip ----------
function StatChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15">
      <Icon className="h-4 w-4 text-white/75 shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-white/55 font-medium">{label}</span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
    </div>
  );
}
