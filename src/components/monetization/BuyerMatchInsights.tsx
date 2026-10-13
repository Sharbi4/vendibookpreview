import { useMemo, useState } from 'react';
import { EVENT_LABELS, type CampaignEvent } from '@/lib/monetization/buyerMatchIntelligence';

const PERIODS = [{ v: '7', l: 'Last 7 days' }, { v: '30', l: 'Last 30 days' }, { v: '90', l: 'Last 90 days' }, { v: 'all', l: 'All time' }];
const PIPELINE: [string, string[]][] = [
  ['Identified', ['buyer_opportunity_identified']], ['Outreach pending', ['outreach_proposed', 'outreach_approved']],
  ['Contacted', ['outreach_sent', 'delivery_confirmed']], ['Engaged', ['buyer_response_received']], ['Qualified', ['inquiry_qualified']],
];
const METRICS: [string, string[], boolean?][] = [
  ['Platforms researched', ['platform_researched'], true], ['Buyer opportunities identified', ['buyer_opportunity_identified']],
  ['Outreach attempts completed', ['outreach_sent']], ['Confirmed deliveries', ['delivery_confirmed']],
  ['Replies received', ['buyer_response_received']], ['Qualified inquiries', ['inquiry_qualified']],
];
const date = (v: string) => new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Verified-only metrics, platform activity and pipeline. Every number opens the events behind it. */
export default function BuyerMatchInsights({ events, sessions }: { events: CampaignEvent[]; sessions?: number }) {
  const [period, setPeriod] = useState('30');
  const [open, setOpen] = useState<string | null>(null);
  const scoped = useMemo(() => {
    const verified = [...new Map(events.map(e => [e.id, e])).values()].filter(e => e.verification_status === 'verified');
    if (period === 'all') return verified;
    const since = Date.now() - Number(period) * 864e5;
    return verified.filter(e => new Date(e.occurred_at).getTime() >= since);
  }, [events, period]);
  const pick = (types: string[]) => scoped.filter(e => types.includes(e.event_type));
  const last = scoped.reduce<string | null>((m, e) => (!m || e.occurred_at > m ? e.occurred_at : m), null);
  const platforms = useMemo(() => {
    const map = new Map<string, CampaignEvent[]>();
    scoped.forEach(e => map.set(e.source, [...(map.get(e.source) ?? []), e]));
    return [...map.entries()];
  }, [scoped]);
  const openEvents = open ? (METRICS.find(m => m[0] === open)?.[1] ?? PIPELINE.find(p => p[0] === open)?.[1] ?? []) : [];
  const platformOpen = open?.startsWith('src:') ? scoped.filter(e => e.source === open.slice(4)) : null;
  const list = platformOpen ?? pick(openEvents);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm">Reporting period
        <select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-md border border-border bg-card px-2 py-1 text-base sm:text-sm">{PERIODS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}</select>
      </label>
      <p className="text-xs text-muted-foreground">Last verified activity: {last ? date(last) : 'none yet'}</p>
    </div>
    <section aria-label="Verified campaign metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {METRICS.map(([label, types, uniq]) => {
        const items = pick(types); const n = uniq ? new Set(items.map(e => e.source)).size : items.length;
        return <button key={label} type="button" onClick={() => setOpen(open === label ? null : label)} aria-expanded={open === label}
          className={'rounded-lg border bg-card p-4 text-left transition hover:border-primary ' + (open === label ? 'border-primary' : 'border-border')}>
          <p className="text-3xl font-semibold">{n}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></button>;
      })}
      <div className="rounded-lg border border-border bg-card p-4"><p className="text-3xl font-semibold">{sessions ?? '—'}</p><p className="mt-1 text-xs text-muted-foreground">Campaign link sessions (not confirmed buyers)</p></div>
    </section>
    {open && <section aria-label="Activity behind this number" className="rounded-lg border border-border bg-card p-4">
      <div className="flex justify-between"><h4 className="text-sm font-semibold">{platformOpen ? open.slice(4) : open}</h4><button type="button" className="text-xs text-primary" onClick={() => setOpen(null)}>Close</button></div>
      {!list.length ? <p className="mt-3 text-sm text-muted-foreground">No verified activity in this period.</p> :
        <ul className="mt-3 divide-y divide-border">{list.map(e => <li key={e.id} className="py-2 text-sm"><span className="text-xs text-muted-foreground">{date(e.occurred_at)} · {e.source}</span><p className="font-medium">{EVENT_LABELS[e.event_type] ?? e.event_type}</p>{e.outcome && <p className="text-muted-foreground">{e.outcome}</p>}</li>)}</ul>}
    </section>}
    <section><h3 className="text-base font-semibold">Platform activity</h3>
      <p className="mt-1 text-xs text-muted-foreground">Only sources with logged, verified activity. Researching a platform is not the same as posting or messaging there.</p>
      {!platforms.length ? <p className="mt-3 text-sm text-muted-foreground">No platform activity recorded in this period.</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Source</th><th>Researched</th><th>Opportunities</th><th>Outreach</th><th>Replies</th><th>Last activity</th></tr></thead>
          <tbody>{platforms.map(([src, ev]) => { const c = (t: string) => ev.filter(e => e.event_type === t).length; const l = ev.reduce((m, e) => e.occurred_at > m ? e.occurred_at : m, '');
            return <tr key={src} className="border-t border-border"><td className="py-2"><button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpen('src:' + src)}>{src}</button></td><td>{c('platform_researched') ? 'Yes' : '—'}</td><td>{c('buyer_opportunity_identified')}</td><td>{c('outreach_sent')}</td><td>{c('buyer_response_received')}</td><td className="text-xs">{date(l)}</td></tr>; })}</tbody></table></div>}
    </section>
    <section><h3 className="text-base font-semibold">Opportunity pipeline</h3>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{PIPELINE.map(([label, types]) => <li key={label}><button type="button" onClick={() => setOpen(label)} className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary"><p className="text-xl font-semibold">{pick(types).length}</p><p className="text-xs text-muted-foreground">{label}</p></button></li>)}</ol>
      <p className="mt-2 text-xs text-muted-foreground">Inquiries and completed sales appear in your messages and sales once a buyer acts.</p>
    </section>
    <section><h3 className="text-base font-semibold">What buyers are looking for</h3>
      {!pick(['buyer_opportunity_identified']).some(e => e.outcome) ? <p className="mt-2 text-sm text-muted-foreground">No buyer requests have been recorded yet. Real requests from permitted sources will appear here once our team logs them — we never invent buyer posts.</p> :
        <ul className="mt-3 space-y-2">{pick(['buyer_opportunity_identified']).filter(e => e.outcome).map(e => <li key={e.id} className="rounded-lg border border-border bg-card p-3 text-sm"><p>{e.outcome}</p><p className="mt-1 text-xs text-muted-foreground">{e.source} · {date(e.occurred_at)}</p></li>)}</ul>}
    </section>
  </div>;
}
