import { useMemo, useState } from 'react';
import { EVENT_LABELS, type CampaignEvent } from '@/lib/monetization/buyerMatchIntelligence';
import { bm, shortDate } from './buyerMatchUi';

const PERIODS = [{ v: '7', l: 'Last 7 days' }, { v: '30', l: 'Last 30 days' }, { v: '90', l: 'Last 90 days' }, { v: 'all', l: 'All time' }];
/** The search, step by step. Each count is verified buyermatch_events of these types. */
const STEPS: [string, string[], string][] = [
  ['Prospects found', ['buyer_opportunity_identified'], 'Public posts from people looking to buy or rent equipment or space like yours'],
  ['Awaiting approval', ['outreach_proposed', 'outreach_approved'], 'Messages drafted, not sent'],
  ['Contacted', ['outreach_sent'], 'Messages actually sent'],
  ['Replied', ['buyer_response_received'], 'Buyers and renters who wrote back'],
  ['Qualified', ['inquiry_qualified'], 'Replies our team verified as a real inquiry'],
];

/** Verified-only campaign numbers. Every number opens the records behind it. */
export default function BuyerMatchInsights({ events, sessions }: { events: CampaignEvent[]; sessions?: number }) {
  const [period, setPeriod] = useState('30');
  const [open, setOpen] = useState<string | null>(null);
  const verified = useMemo(() => [...new Map(events.map(e => [e.id, e])).values()].filter(e => e.verification_status === 'verified'), [events]);
  const scoped = useMemo(() => {
    if (period === 'all') return verified;
    const since = Date.now() - Number(period) * 864e5;
    return verified.filter(e => new Date(e.occurred_at).getTime() >= since);
  }, [verified, period]);
  const pick = (types: string[]) => scoped.filter(e => types.includes(e.event_type));
  const last = verified.reduce<string | null>((m, e) => (!m || e.occurred_at > m ? e.occurred_at : m), null);
  const sources = useMemo(() => {
    const map = new Map<string, CampaignEvent[]>();
    scoped.forEach(e => map.set(e.source, [...(map.get(e.source) ?? []), e]));
    return [...map.entries()];
  }, [scoped]);
  const asks = pick(['buyer_opportunity_identified']).filter(e => e.outcome);
  const sourceOpen = open?.startsWith('src:') ? scoped.filter(e => e.source === open.slice(4)) : null;
  const list = sourceOpen ?? pick(STEPS.find(s => s[0] === open)?.[1] ?? []);

  if (!verified.length) {
    return <section aria-label="Verified search results" className="py-2">
      <p className={bm.eyebrow}>Results</p>
      <p className={bm.lead + ' mt-3 max-w-2xl'}>No verified activity yet. When our team logs a buyer it found or a message it sent, it appears here with the source and the date. We never fill this in with estimates.</p>
      {sessions ? <p className={bm.body + ' mt-3'}>{sessions} browser session{sessions === 1 ? '' : 's'} opened your tracked links. Those are visits, not confirmed buyers.</p> : null}
    </section>;
  }

  return <div className="space-y-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-3 text-[13px] text-[#5E5953]">Showing
        <select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-full border border-[#E2DBD0] bg-white px-3 py-1.5 text-[16px] text-[#1C1B1A] sm:text-[14px]">{PERIODS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}</select>
      </label>
      <p className={bm.note}>Last verified activity {last ? shortDate(last) : 'none yet'}</p>
    </div>

    <section aria-label="Verified search results">
      <ol className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map(([label, types, hint], i) => {
          const n = pick(types).length;
          return <li key={label} className={i > 0 ? 'lg:border-l lg:border-[#ECE6DD] lg:pl-6' : ''}>
            <button type="button" onClick={() => setOpen(open === label ? null : label)} aria-expanded={open === label} className="group w-full text-left">
              <span className={bm.num + ' block' + (i === 0 && n > 0 ? ' text-[#FF5124]' : '')}>{n}</span>
              <span className="mt-3 block text-[14px] font-semibold group-hover:underline group-hover:decoration-[#FF5124] group-hover:underline-offset-4">{label}</span>
              <span className={bm.note + ' mt-1 block'}>{hint}</span>
            </button>
          </li>;
        })}
      </ol>
      <p className={bm.note + ' mt-6'}>
        {new Set(pick(['platform_researched']).map(e => e.source)).size} sources searched · {pick(['delivery_confirmed']).length} deliveries confirmed · {sessions ?? '—'} tracked-link sessions (visits, not confirmed buyers)
      </p>
    </section>

    {open && <section aria-label="Records behind this number" className={bm.card + ' p-5 sm:p-6'}>
      <div className="flex items-center justify-between gap-3"><h4 className={bm.h3}>{sourceOpen ? open.slice(4) : open}</h4><button type="button" className={bm.link} onClick={() => setOpen(null)}>Close</button></div>
      {!list.length ? <p className={bm.body + ' mt-3'}>No verified records in this period.</p> :
        <ul className="mt-3 divide-y divide-[#ECE6DD]">{list.map(e => <li key={e.id} className="py-3"><p className={bm.note}>{shortDate(e.occurred_at)} · {e.source}</p><p className="mt-0.5 text-[14px] font-semibold">{EVENT_LABELS[e.event_type] ?? e.event_type}</p>{e.outcome && <p className={bm.body}>{e.outcome}</p>}</li>)}</ul>}
    </section>}

    <section>
      <h3 className={bm.h3}>What buyers asked for</h3>
      {!asks.length ? <p className={bm.body + ' mt-2'}>No buyer requests logged in this period. Real requests from permitted sources show up here; we don&rsquo;t write example posts.</p> :
        <ul className="mt-4 grid gap-4 md:grid-cols-2">{asks.map(e => <li key={e.id} className="border-l-2 border-[#FF5124] pl-4"><p className="text-[15px] leading-7">{e.outcome}</p><p className={bm.note + ' mt-1'}>{e.source} · {shortDate(e.occurred_at)}</p></li>)}</ul>}
    </section>

    <section>
      <h3 className={bm.h3}>Where we looked</h3>
      <p className={bm.note + ' mt-1'}>Sources with verified activity. Searching a site isn&rsquo;t the same as posting or messaging there.</p>
      {!sources.length ? <p className={bm.body + ' mt-3'}>No sources logged in this period.</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-[14px]"><thead><tr className="text-left text-[12px] text-[#8A847B]"><th className="py-2 font-medium">Source</th><th className="font-medium">Searched</th><th className="font-medium">Found</th><th className="font-medium">Contacted</th><th className="font-medium">Replied</th><th className="font-medium">Last activity</th></tr></thead>
          <tbody>{sources.map(([src, ev]) => {
            const c = (t: string) => ev.filter(e => e.event_type === t).length;
            const l = ev.reduce((m, e) => (e.occurred_at > m ? e.occurred_at : m), '');
            return <tr key={src} className="border-t border-[#ECE6DD]"><td className="py-3"><button type="button" className="font-semibold underline decoration-[#E2DBD0] underline-offset-4 hover:decoration-[#FF5124]" onClick={() => setOpen('src:' + src)}>{src}</button></td><td>{c('platform_researched') ? 'Yes' : '—'}</td><td className="tabular-nums">{c('buyer_opportunity_identified')}</td><td className="tabular-nums">{c('outreach_sent')}</td><td className="tabular-nums">{c('buyer_response_received')}</td><td className="text-[12px] text-[#8A847B]">{shortDate(l)}</td></tr>;
          })}</tbody></table></div>}
    </section>
  </div>;
}
