import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ExternalLink, CheckCircle2, Circle, ChevronDown,
  Download, DollarSign, Clock, Sparkles, X, Mail, BadgeCheck, CalendarClock,
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
  state: 'bg-white/[0.08] text-white/80 border-white/20',
  county: 'bg-white/[0.06] text-white/70 border-white/15',
  city: 'bg-white/[0.06] text-white/70 border-white/15',
  federal: 'bg-white/[0.08] text-white/80 border-white/20',
};

type Filter = 'all' | 'remaining' | 'commonly_missed';

interface Props {
  result: DashboardResult;
  /** Read-only mode: hide save/share affordances when viewing somebody else's shared roadmap. */
  readOnly?: boolean;
  /** When provided, renders inside the expanded panel of each requirement card. */
  renderItemExtra?: (node: RoadmapNode) => React.ReactNode;
  /** When provided, replaces the inline sign-in nudge with a primary "Save to my dashboard" button. */
  onSaveToDashboard?: () => void | Promise<void>;
  /** When set, shows a "Saved · View in dashboard →" link instead of the save button. */
  savedRoadmapId?: string | null;
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
  const [owned, setOwned] = useState<Record<string, { expires?: string }>>({});
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 1) localStorage load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(JSON.parse(raw));
      const rawOwn = localStorage.getItem(`${storageKey}::owned`);
      if (rawOwn) setOwned(JSON.parse(rawOwn));
    } catch { /* ignore */ }
  }, [storageKey]);

  // Persist owned to localStorage only (no schema change needed)
  useEffect(() => {
    try { localStorage.setItem(`${storageKey}::owned`, JSON.stringify(owned)); } catch { /* ignore */ }
  }, [owned, storageKey]);

  const toggleOwned = useCallback((id: string) => {
    setOwned((p) => {
      const next = { ...p };
      if (next[id]) delete next[id];
      else next[id] = {};
      return next;
    });
    // marking "I have it" also counts as done
    setCompleted((prev) => ({ ...prev, [id]: !owned[id] ? true : prev[id] }));
  }, [owned]);

  const setOwnedExpiration = useCallback((id: string, expires: string) => {
    setOwned((p) => ({ ...p, [id]: { ...(p[id] || {}), expires: expires || undefined } }));
  }, []);

  // 2) remote load (signed-in users override local with remote)
  useEffect(() => {
    if (!user || readOnly) { setLoadedRemote(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('permit_progress')
          .select('completed, owned')
          .eq('user_id', user.id)
          .eq('roadmap_key', storageKey)
          .maybeSingle();
        if (!cancelled && data) {
          if (data.completed && typeof data.completed === 'object') {
            setCompleted(data.completed as Record<string, boolean>);
          }
          if (data.owned && typeof data.owned === 'object') {
            setOwned(data.owned as Record<string, { expires?: string }>);
          }
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
          owned,
        }, { onConflict: 'user_id,roadmap_key' })
        .then(() => { /* silent */ }, () => { /* silent */ });
    }, 600);
    return () => clearTimeout(t);
  }, [completed, owned, storageKey, user, readOnly, loadedRemote, result]);

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

  // Stats for top tiles
  const now = Date.now();
  const expiringSoonCount = Object.values(owned).filter((o) => {
    if (!o.expires) return false;
    const t = new Date(o.expires).getTime();
    if (isNaN(t)) return false;
    const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  }).length;
  const renewalNeededCount = Object.values(owned).filter((o) => {
    if (!o.expires) return false;
    const t = new Date(o.expires).getTime();
    if (isNaN(t)) return false;
    return t < now;
  }).length;

  // Recent activity: latest completed/owned
  const recentNodes = roadmap.nodes.filter((n) => n.done || owned[n.id]).slice(0, 4);

  return (
    <div className="mt-8 space-y-6">
      {/* Header row — title + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] text-white/55 uppercase tracking-[0.18em] font-semibold mb-1">
            {user && !readOnly ? 'Welcome back' : 'Your roadmap'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Permits &amp; Licenses</h2>
          <p className="text-sm text-white/60 mt-1">
            Track, manage, and maintain your compliance{result.businessType ? ` — ${result.businessType}` : ''} · {locationLabel}
          </p>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <Button onClick={handleEmailMe} size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 h-9">
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {!readOnly && (
            <Button onClick={handleShare} size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 h-9">
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleDownload} size="sm" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9">
            <Download className="h-4 w-4 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* 4 stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total Permits" value={String(roadmap.total)} sub="Active" tone="silver" />
        <StatTile label="Expiring Soon" value={String(expiringSoonCount)} sub="Next 60 days" tone="amber" />
        <StatTile label="Completed" value={String(roadmap.done)} sub="This year" tone="emerald" />
        <StatTile label="Renewal" value={String(renewalNeededCount)} sub={renewalNeededCount > 0 ? 'Action required' : 'All current'} tone="red" />
      </div>

      {!user && !readOnly && <SignInToSavePrompt />}

      {/* 100% celebration */}
      <AnimatePresence>
        {isComplete && (
          <RoadmapSuccess
            location={locationLabel}
            totalCost={result.estimated_total_cost?.display || ''}
          />
        )}
      </AnimatePresence>

      {/* Two-column layout: permits left, sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT: permits */}
        <div className="space-y-6 min-w-0">
          {/* Recent law alert */}
          <AnimatePresence>
            {result.recent_law_alert && !alertDismissed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border-2 border-amber-500/25 bg-amber-500/[0.06] p-4 sm:p-5 flex gap-3"
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

          {/* Reasoning panels */}
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

          {/* Categories */}
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
                  className="rounded-2xl border-2 border-white/15 bg-[#101013] overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-[#101013] border-b-2 border-white/15">
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
                        owned={!!owned[node.id]}
                        expiresOn={owned[node.id]?.expires}
                        onToggleOwned={() => toggleOwned(node.id)}
                        onSetExpires={(d) => setOwnedExpiration(node.id, d)}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>
        </div>

        {/* RIGHT: sticky sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Overall compliance ring */}
          <div className="rounded-2xl border-2 border-white/15 bg-[#101013] p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-4">Overall Compliance</div>
            <div className="flex flex-col items-center">
              <BigComplianceRing pct={roadmap.pct} />
              <p className="text-xs text-white/55 mt-3 text-center leading-relaxed">
                {isComplete
                  ? "You're fully compliant — nice work."
                  : roadmap.pct >= 50
                  ? "You're being great — keep it up"
                  : "Let's build your compliance momentum."}
              </p>
            </div>
          </div>

          {/* Cost overview */}
          <div className="rounded-2xl border-2 border-white/15 bg-[#101013] p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-3">Cost Overview</div>
            <div className="text-2xl font-bold text-white">{result.estimated_total_cost?.display || '—'}</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Remaining</span>
                <span className="text-white font-semibold">{remainingCost}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Time left</span>
                <span className="text-white font-semibold">{remainingWeeks}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Complete</span>
                <span className="text-white font-semibold">{roadmap.done}/{roadmap.total}</span>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border-2 border-white/15 bg-[#101013] p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-3">Recent Activity</div>
            {recentNodes.length === 0 ? (
              <p className="text-xs text-white/45 italic">Mark a permit done or "I have this" to track activity here.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentNodes.map((n) => {
                  const isOwned = !!owned[n.id];
                  return (
                    <li key={n.id} className="flex items-start gap-2.5">
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-1.5 shrink-0',
                        isOwned ? 'bg-white/80' : 'bg-white/45',
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{n.title}</div>
                        <div className="text-[11px] text-white/50">
                          {isOwned ? 'Marked as held' : 'Marked complete'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>


      {/* Verify note */}
      {result.verify_note && (
        <p className="text-xs text-white/45 italic text-center max-w-2xl mx-auto">
          {result.verify_note}
        </p>
      )}

      {/* Sources */}
      {result.sources && result.sources.length > 0 && (
        <div className="rounded-2xl border-2 border-white/10 bg-[#0d0d10] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Sources</h3>
          <ul className="space-y-1.5">
            {result.sources.map((s) => (
              <li key={s.index} className="text-sm">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white inline-flex items-center gap-1">
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
function ProgressRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const isComplete = total > 0 && done === total;
  const label = isComplete ? 'Done' : 'Complete';
  return (
    <div className="flex items-center gap-2 shrink-0" aria-label={`${pct}% complete, ${done} of ${total}`}>
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
          <motion.circle
            cx="24" cy="24" r={r}
            stroke="#FF5124"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[12px] font-bold text-white">{pct}%</span>
          <span className="text-[8px] uppercase tracking-wider text-white/55 font-semibold mt-0.5">{label}</span>
        </div>
      </div>
      <div className="hidden md:flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-white/55 font-medium">Progress</span>
        <span className="text-sm font-semibold text-white">{done} of {total}</span>
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
  owned: boolean;
  expiresOn?: string;
  onToggleOwned: () => void;
  onSetExpires: (date: string) => void;
}

function RoadmapItem({ node, expanded, onToggleExpand, onToggleDone, onCalendar, readOnly, state, owned, expiresOn, onToggleOwned, onSetExpires }: ItemProps) {
  const isNext = node.status === 'next';
  const isDone = node.status === 'done';
  // "locked" no longer hides info — it's a soft sequence hint.
  const isSequenceHint = node.status === 'locked';

  // Commissary action: deep-link to kitchen search
  const showCommissaryAction = node.key === 'commissary' && !isDone && !readOnly;

  // Expiration status
  const expiryInfo = (() => {
    if (!owned || !expiresOn) return null;
    const d = new Date(expiresOn);
    if (isNaN(d.getTime())) return null;
    const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const fmt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (days < 0) return { label: `Expired ${fmt}`, tone: 'red' as const };
    if (days <= 30) return { label: `Expires ${fmt} (${days}d)`, tone: 'amber' as const };
    return { label: `Valid through ${fmt}`, tone: 'emerald' as const };
  })();

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border-[1.5px] transition-all',
        owned && 'border-white/30 bg-white/[0.05]',
        !owned && isDone && 'border-white/20 bg-white/[0.04]',
        !owned && isNext && 'border-white/35 bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_24px_-12px_rgba(0,0,0,0.6)]',
        !owned && !isDone && !isNext && 'border-white/[0.14] bg-[#16161a] hover:border-white/30 hover:bg-[#1a1a1f]',
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
              <Circle className={cn('h-5 w-5', isNext ? 'text-white/85' : 'text-white/30 hover:text-white/60')} />
            )}
          </button>

          <button
            onClick={onToggleExpand}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isNext && (
                <Badge className="text-[10px] uppercase tracking-[0.14em] bg-white/[0.12] text-white border border-white/25 hover:bg-white/[0.12]">
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
              {node.commonly_missed && !isDone && !owned && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-300 border-amber-500/30">
                  Often missed
                </Badge>
              )}
              {owned && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border-emerald-500/40 inline-flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> I have this
                </Badge>
              )}
              {expiryInfo && (
                <Badge variant="outline" className={cn(
                  'text-[10px] uppercase tracking-wider inline-flex items-center gap-1',
                  expiryInfo.tone === 'red' && 'bg-red-500/15 text-red-300 border-red-500/40',
                  expiryInfo.tone === 'amber' && 'bg-amber-500/15 text-amber-300 border-amber-500/40',
                  expiryInfo.tone === 'emerald' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                )}>
                  <CalendarClock className="h-3 w-3" /> {expiryInfo.label}
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

                <div className="flex flex-wrap gap-2 items-center">
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
                      onClick={onToggleOwned}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors',
                        owned
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20'
                          : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/85',
                      )}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {owned ? "I have this — clear" : "I already have this"}
                    </button>
                  )}
                  {!readOnly && owned && (
                    <label className="inline-flex items-center gap-2 text-xs text-white/70 bg-white/[0.04] border border-white/15 rounded-lg px-2.5 py-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-white/55" />
                      <span>Expires</span>
                      <input
                        type="date"
                        value={expiresOn || ''}
                        onChange={(e) => onSetExpires(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none [color-scheme:dark] min-w-[130px]"
                      />
                    </label>
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
// ---------- SignInToSavePrompt ----------
function SignInToSavePrompt() {
  const [loading, setLoading] = useState<'google' | null>(null);
  const redirectPath = '/tools/permitpath';

  const handleGoogle = async () => {
    try {
      setLoading('google');
      sessionStorage.setItem('postAuthRedirect', redirectPath);
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error('Could not start Google sign-in. Try the email option.');
        setLoading(null);
      }
    } catch {
      toast.error('Sign-in unavailable right now.');
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.06] via-[#141418] to-[#101013] p-4 sm:p-5 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white/85" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-[15px] sm:text-base leading-tight">
              Save your progress
            </div>
            <p className="text-sm text-white/65 mt-0.5 leading-snug">
              Sign in to keep your roadmap, expiration dates, and renewal alerts across devices.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button
            onClick={handleGoogle}
            disabled={loading === 'google'}
            size="sm"
            variant="outline"
            className="bg-white text-[#1a1a1f] hover:bg-white/90 border-transparent h-10 px-4 font-semibold"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            {loading === 'google' ? 'Opening…' : 'Continue with Google'}
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-10 px-4 font-semibold"
          >
            <Link to={`/auth?redirect=${encodeURIComponent(redirectPath)}`}>
              Sign in with email <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- StatTile ----------
function StatTile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'orange' | 'amber' | 'emerald' | 'red' | 'silver' }) {
  const toneMap = {
    orange: { ring: 'border-[#FF5124]/30', dot: 'bg-[#FF5124]', text: 'text-[#FF8a5b]' },
    amber: { ring: 'border-white/15', dot: 'bg-white/60', text: 'text-white/70' },
    emerald: { ring: 'border-white/15', dot: 'bg-white/60', text: 'text-white/70' },
    red: { ring: 'border-white/15', dot: 'bg-white/60', text: 'text-white/70' },
    silver: { ring: 'border-white/15', dot: 'bg-white/70', text: 'text-white/75' },
  }[tone];
  return (
    <div className={cn('relative rounded-2xl border-2 bg-[#101013] p-4 sm:p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] overflow-hidden', toneMap.ring)}>
      <div className={cn('absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-30', toneMap.dot)} />
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/55 font-semibold">{label}</div>
      <div className="text-3xl sm:text-4xl font-bold text-white mt-1.5 leading-none">{value}</div>
      <div className={cn('mt-2 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5', toneMap.text)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', toneMap.dot)} />
        {sub}
      </div>
    </div>
  );
}

// ---------- BigComplianceRing ----------
function BigComplianceRing({ pct }: { pct: number }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  // Animate a single motion value; derive both ring offset and the displayed number from it.
  const progress = useMotionValue(0);
  const offset = useTransform(progress, (v) => c - (v / 100) * c);
  const displayPct = useTransform(progress, (v) => Math.round(v));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const controls = animate(progress, clamped, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1], // springy ease-out
    });
    const unsub = displayPct.on('change', (v) => setShown(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [clamped, progress, displayPct]);

  const isComplete = clamped >= 100;

  return (
    <div className="relative h-44 w-44">
      {/* Soft pulsing glow that strengthens with progress */}
      <motion.div
        aria-hidden
        className="absolute inset-2 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(255,81,36,0.45), transparent 70%)' }}
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg className="relative h-44 w-44 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <motion.circle
          cx="80" cy="80" r={r}
          stroke="url(#bigRingGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset, filter: 'drop-shadow(0 0 8px rgba(255,81,36,0.55))' }}
        />
        <defs>
          <linearGradient id="bigRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFB07A" />
            <stop offset="60%" stopColor="#FF7A45" />
            <stop offset="100%" stopColor="#FF5124" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <motion.span
          key={isComplete ? 'done' : 'progress'}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-4xl font-bold text-white tabular-nums"
        >
          {shown}%
        </motion.span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/55 font-semibold mt-2">
          {isComplete ? 'Complete' : 'On Track'}
        </span>
      </div>
    </div>
  );
}

// ---------- StatChip ----------
function StatChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border-2 border-white/15">
      <Icon className="h-4 w-4 text-white/75 shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-white/55 font-medium">{label}</span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
    </div>
  );
}
