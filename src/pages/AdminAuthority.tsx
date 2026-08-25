import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ExternalLink, Target, TrendingUp, Ban, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import {
  BACKLINK_OPPORTUNITIES, AUTHORITY_BASELINE, AUTHORITY_TARGETS, EXCLUDED_DOMAINS,
  type OpportunityPriority, type BacklinkOpportunity,
} from '@/data/backlinkOpportunities';
import { cn } from '@/lib/utils';

const PRIORITY_ORDER: OpportunityPriority[] = ['high', 'medium', 'stretch'];

const PRIORITY_LABEL: Record<OpportunityPriority, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  stretch: 'Stretch targets',
};

const PRIORITY_STYLE: Record<OpportunityPriority, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  stretch: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
};

const OpportunityRow = ({ o }: { o: BacklinkOpportunity }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
      <div>
        <p className="font-semibold text-foreground">{o.name}</p>
        {o.domain.includes('?') ? (
          <p className="text-xs text-muted-foreground italic">Category target — map specific organizations during outreach prep</p>
        ) : (
          <a
            href={`https://${o.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cta-primary hover:underline inline-flex items-center gap-1"
          >
            {o.domain} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground">{o.type}</span>
        <span className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground capitalize">
          {o.difficulty} difficulty
        </span>
        <span className="rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground">
          {o.status.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
    {o.competitorLinked && (
      <p className="text-xs text-muted-foreground mb-2">
        Currently links: <span className="font-medium text-foreground">{o.competitorLinked}</span>
      </p>
    )}
    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{o.angle}</p>
    <p className="text-xs text-muted-foreground">
      Pitch asset: <span className="text-foreground font-medium">{o.pitchAsset}</span>
      {' · '}Destination: <span className="text-foreground font-mono">{o.destination}</span>
    </p>
  </div>
);

const AdminAuthority = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | 'all'>('all');

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('is_admin', { user_id: user!.id });
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) navigate('/');
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  const grouped = useMemo(() => {
    const list = priorityFilter === 'all'
      ? BACKLINK_OPPORTUNITIES
      : BACKLINK_OPPORTUNITIES.filter((o) => o.priority === priorityFilter);
    return PRIORITY_ORDER
      .map((p) => ({ priority: p, items: list.filter((o) => o.priority === p) }))
      .filter((g) => g.items.length > 0);
  }, [priorityFilter]);

  if (authLoading || roleLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verifying admin access…</p>
      </div>
    );
  }

  const counts = {
    high: BACKLINK_OPPORTUNITIES.filter((o) => o.priority === 'high').length,
    medium: BACKLINK_OPPORTUNITIES.filter((o) => o.priority === 'medium').length,
    stretch: BACKLINK_OPPORTUNITIES.filter((o) => o.priority === 'stretch').length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Authority & Backlinks (Admin) | Vendibook" description="Internal SEO authority dashboard." noIndex />
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          Phase 7 — Authority &amp; Backlink Pipeline
        </h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Curated, legitimate link opportunities only. No PBNs, no paid links, no disavow —
          authority is earned through industry relevance, partner relationships, and original data.
        </p>

        {/* Baseline */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 inline-flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cta-primary" /> Baseline (Semrush, {AUTHORITY_BASELINE.measuredAt})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Authority Score', value: `${AUTHORITY_BASELINE.authorityScore}/100` },
              { label: 'Referring domains', value: String(AUTHORITY_BASELINE.referringDomains) },
              { label: 'Relevant domains', value: String(AUTHORITY_BASELINE.relevantReferringDomains) },
              { label: 'Suspicious domains', value: String(AUTHORITY_BASELINE.suspiciousReferringDomains) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {AUTHORITY_BASELINE.notes.map((n) => (
              <li key={n} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {n}
              </li>
            ))}
          </ul>
        </section>

        {/* Targets & KPIs */}
        <section className="mb-10 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3 inline-flex items-center gap-2">
              <Target className="h-4 w-4 text-cta-primary" /> Quality targets
            </h3>
            <p className="text-sm text-muted-foreground mb-2">Milestone 1: {AUTHORITY_TARGETS.milestone1}.</p>
            <p className="text-sm text-muted-foreground">Milestone 2: {AUTHORITY_TARGETS.milestone2}.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3 inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-cta-primary" /> Monthly KPIs
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {AUTHORITY_TARGETS.kpis.map((k) => <li key={k}>· {k}</li>)}
            </ul>
          </div>
        </section>

        {/* Opportunities */}
        <section className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-foreground">
              Opportunity database ({BACKLINK_OPPORTUNITIES.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {(['all', ...PRIORITY_ORDER] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    priorityFilter === p
                      ? 'border-cta-primary bg-cta-primary text-white'
                      : 'border-border/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p === 'all' ? `All (${BACKLINK_OPPORTUNITIES.length})` : `${PRIORITY_LABEL[p]} (${counts[p]})`}
                </button>
              ))}
            </div>
          </div>
          {grouped.map((g) => (
            <div key={g.priority} className="mb-6">
              <p className={cn(
                'inline-block rounded-full border px-3 py-1 text-xs font-semibold mb-3',
                PRIORITY_STYLE[g.priority],
              )}>
                {PRIORITY_LABEL[g.priority]}
              </p>
              <div className="space-y-3">
                {g.items.map((o) => <OpportunityRow key={o.domain} o={o} />)}
              </div>
            </div>
          ))}
        </section>

        {/* Excluded */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 inline-flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" /> Permanently excluded ({EXCLUDED_DOMAINS.length})
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {EXCLUDED_DOMAINS.map((d) => (
                <li key={d.domain} className="text-sm text-muted-foreground">
                  <span className="font-mono text-foreground">{d.domain}</span> — {d.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAuthority;
