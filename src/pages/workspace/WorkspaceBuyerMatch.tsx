import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Copy, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import BuyerMatchPreview from '@/components/monetization/BuyerMatchPreview';
import BuyerMatchInsights from '@/components/monetization/BuyerMatchInsights';
import BuyerMatchListings from '@/components/monetization/BuyerMatchListings';
import BuyerMatchRecommendations from '@/components/monetization/BuyerMatchRecommendations';
import { bm, place, shortDate, usd } from '@/components/monetization/buyerMatchUi';
import { buyerMatchAction, useBuyerMatch } from '@/hooks/useBuyerMatch';
import {
  listingRecommendations, CAMPAIGN_STATUS, EVENT_LABELS,
  type BuyerMatchCampaign, type BuyerMatchLink, type BuyerMatchListing, type BuyerMatchReport, type CampaignEvent,
} from '@/lib/monetization/buyerMatchIntelligence';

type Act = (name: string, payload: Record<string, unknown>) => void;
interface Engagement { visits?: number; unique_sessions?: number; daily?: { day: string; visits: number }[] }

export default function WorkspaceBuyerMatch() {
  const query = useBuyerMatch(); const client = useQueryClient(); const [params, setParams] = useSearchParams();
  const [listing, setListing] = useState(''); const [geography, setGeography] = useState(''); const [criteria, setCriteria] = useState('');
  const action = useMutation({ mutationFn: ({ name, payload }: { name: string; payload: Record<string, unknown> }) => buyerMatchAction(name, payload), onSuccess: () => client.invalidateQueries({ queryKey: ['buyermatch'] }) });
  const act: Act = (name, payload) => action.mutate({ name, payload });
  const data = query.data; const campaigns = data?.campaigns ?? [];
  const entitled = !!data?.config.entitled;
  const selected = campaigns.find(c => c.id === params.get('campaign')) ?? campaigns[0];
  const eligible = (data?.listings ?? []).filter(l => !campaigns.some(c => c.listing_id === l.id));
  const selectedListing = data?.listings.find(l => l.id === listing);
  const [activate, setActivate] = useState(params.get('activate') === '1');
  const showForm = entitled && (activate || !campaigns.length) && !!data?.listings.length;
  const start = (id: string) => {
    setListing(id); setActivate(true);
    requestAnimationFrame(() => document.getElementById('activation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return <WorkspaceShell><div className={bm.page}>
    <header className="pb-10">
      <div className="max-w-3xl">
        <p className={bm.eyebrow}>BuyerMatch · Vendibook Pro</p>
        <h1 className={bm.h1 + ' mt-4'}>Find the buyer for the truck you&rsquo;re selling.</h1>
        <p className={bm.lead + ' mt-5'}>Our team looks for people shopping for a truck, trailer or cart like yours, contacts them only with documented permission, and logs every step here. Replies come to your Vendibook messages.</p>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/dashboard/buyermatch/membership" className={bm.quiet}>Manage membership</Link>
        {entitled && !!eligible.length && <button type="button" className={bm.primary} onClick={() => setActivate(!activate)}>Start a buyer search</button>}
      </div>
    </header>

    {query.isLoading ? <p role="status" className={bm.body + ' flex items-center gap-2'}><Loader2 className="h-4 w-4 animate-spin"/>Loading your listings and searches…</p> : query.error ?
      <section role="alert" className={bm.card + ' p-6 sm:p-8'}><p className="text-[16px] font-semibold">BuyerMatch could not be loaded.</p><p className={bm.body + ' mt-1'}>Your membership and listings are unchanged.</p><button type="button" className={bm.quiet + ' mt-5'} onClick={() => query.refetch()}>Retry</button></section> : data && <div className="space-y-14">
      {action.error && <p role="alert" className="text-[14px] text-[#B42318]">{action.error.message}</p>}

      {!entitled && <>
        <BuyerMatchPreview listing={data.listings.find(l => l.cover_image_url) ?? data.listings[0]}/>
        {(!!campaigns.length || !!data.reports.length) && <p className={bm.body}>Your past reports and buyer messages stay available here. Starting a new search needs current Pro access.</p>}
      </>}

      {entitled && !data.config.fulfillment_enabled && <section className="border-l-2 border-[#FF5124] pl-5">
        <h2 className="text-[16px] font-semibold">Searches haven&rsquo;t started yet.</h2>
        <p className={bm.body + ' mt-1 max-w-2xl'}>You can send listings for review now. Research and outreach begin only after our team approves a listing and confirms the search is running. Nothing is sent to buyers before then.</p>
      </section>}
      {entitled && !data.config.submissions_enabled && <p className={bm.body}>New buyer searches are paused right now. Existing searches and reports are unchanged.</p>}

      {showForm && <section id="activation" aria-labelledby="bm-start" className={bm.card + ' scroll-mt-24 p-6 sm:p-10'}>
        <h2 id="bm-start" className={bm.h2}>Start a buyer search</h2>
        <p className={bm.body + ' mt-2 max-w-2xl'}>Up to {data.config.max_campaigns} open searches. Sending a listing for review doesn&rsquo;t reserve it or contact anyone.</p>
        {!eligible.length ? <p className={bm.body + ' mt-6'}>Every published sale listing already has a search.</p> :
        <form className="mt-8 grid gap-6 lg:grid-cols-2" onSubmit={e => { e.preventDefault(); act('submit', { listing_id: listing, geography, buyer_criteria: criteria }); }}>
          <div className="space-y-6">
            <label className="block text-[14px] font-semibold">Sale listing<select required value={listing} onChange={e => setListing(e.target.value)} className={bm.field}><option value="">Choose a listing</option>{eligible.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
            <label className="block text-[14px] font-semibold">Where should we look? <span className="font-normal text-[#8A847B]">Optional</span><input className={bm.field} maxLength={500} value={geography} onChange={e => setGeography(e.target.value)} placeholder="Arizona and Southern California, or nationwide"/></label>
            <label className="block text-[14px] font-semibold">Who is the right buyer? <span className="font-normal text-[#8A847B]">Optional</span><textarea className={bm.field + ' min-h-[112px]'} maxLength={2000} value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="First-time owner with about $40k, needs a commissary-ready trailer with a hood system"/></label>
            <button type="submit" disabled={!listing || action.isPending || !data.config.submissions_enabled} className={bm.primary}>{action.isPending ? 'Sending…' : 'Send for review'}</button>
          </div>
          {selectedListing ? <ListingCard listing={selectedListing}/> : <div className="hidden rounded-[16px] border border-dashed border-[#E2DBD0] lg:grid lg:place-items-center"><p className={bm.note}>Choose a listing to see what our team will review.</p></div>}
        </form>}
      </section>}

      {!!campaigns.length && <section aria-labelledby="bm-searches">
        <h2 id="bm-searches" className={bm.h2}>Your buyer searches</h2>
        <div className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="tablist" aria-label="Choose a search">
          {campaigns.length > 1 && <button type="button" role="tab" aria-selected={params.get('campaign') === 'all'} onClick={() => setParams({ campaign: 'all' })} className={'shrink-0 snap-start rounded-full px-4 py-2 text-[14px] font-semibold ' + (params.get('campaign') === 'all' ? 'bg-[#1C1B1A] text-white' : 'bg-white text-[#1C1B1A] shadow-[0_1px_2px_rgba(28,27,26,0.06)]')}>All listings</button>}
          {campaigns.map(c => {
            const on = params.get('campaign') !== 'all' && selected?.id === c.id;
            return <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => setParams({ campaign: c.id })} className={'flex shrink-0 snap-start items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-left ' + (on ? 'bg-[#1C1B1A] text-white' : 'bg-white text-[#1C1B1A] shadow-[0_1px_2px_rgba(28,27,26,0.06)]')}>
              {c.listing_snapshot.cover_image_url ? <img src={c.listing_snapshot.cover_image_url} alt="" className="h-9 w-9 rounded-full object-cover"/> : <span className="h-9 w-9 rounded-full bg-[#F3EEE7]"/>}
              <span className="max-w-[220px]"><span className="block truncate text-[14px] font-semibold">{c.listing_snapshot.title}</span><span className={'block text-[12px] ' + (on ? 'text-white/65' : 'text-[#8A847B]')}>{CAMPAIGN_STATUS[c.status] ?? c.status}</span></span>
            </button>;
          })}
        </div>
        <div className="mt-8">
          {params.get('campaign') === 'all' && campaigns.length > 1
            ? <section className="space-y-6"><p className={bm.body}>Verified activity across {campaigns.length} searches.</p><BuyerMatchInsights events={data.events ?? []}/></section>
            : selected && <CampaignDashboard key={selected.id} campaign={selected} live={data.listings.find(l => l.id === selected.listing_id)} events={(data.events ?? []).filter(e => e.campaign_id === selected.id)} links={(data.links ?? []).filter(k => k.campaign_id === selected.id)} reports={data.reports.filter(r => r.campaign_id === selected.id)} entitled={entitled} busy={action.isPending} act={act}/>}
        </div>
      </section>}

      {entitled && !campaigns.length && !data.listings.length && <p className={bm.body}>No searches yet. Nothing has been researched or sent for you.</p>}

      <BuyerMatchListings listings={data.listings} campaigns={campaigns} entitled={entitled && data.config.submissions_enabled} onStart={start}/>
    </div>}
  </div></WorkspaceShell>;
}

function ListingCard({ listing: l }: { listing: BuyerMatchListing }) {
  const photos = Array.isArray(l.image_urls) ? l.image_urls.length : 0;
  return <div className="overflow-hidden rounded-[16px] bg-[#F6F2EC]">
    {l.cover_image_url && <img src={l.cover_image_url} alt={l.title} className="aspect-[16/10] w-full object-cover"/>}
    <div className="p-5">
      <h3 className="text-[17px] font-semibold">{l.title}</h3>
      <p className={bm.body + ' mt-1'}>{[usd(l.price_sale) ?? 'No asking price', place(l), `${photos} photo${photos === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
      {l.description && <p className={bm.body + ' mt-3 line-clamp-2'}>{l.description}</p>}
      <Link to={'/listing/' + l.id} className={bm.link + ' mt-4 inline-flex items-center gap-1'}>Check photos and details<ArrowUpRight className="h-3.5 w-3.5"/></Link>
    </div>
  </div>;
}

const STATUS_LINE: Record<string, string> = {
  pending_activation: 'Waiting for team review. No research or outreach has started.',
  approved: 'Approved. Results appear once an operator confirms the search is running.',
  researching: 'Searching now. Only verified steps are counted below.',
  paused: 'Paused. Your reports and buyer messages stay available.',
  rejected: 'Not accepted for a search. Your listing is unchanged.',
  completed: 'Search closed. Your history stays here.',
};

function Stages({ c }: { c: BuyerMatchCampaign }) {
  const reviewed = ['approved', 'researching', 'completed'].includes(c.status) || !!c.activated_at;
  const searched = c.status === 'researching' || c.status === 'completed' || !!c.activated_at;
  const steps: [string, boolean, boolean][] = [
    ['Submitted', true, false],
    ['Team review', reviewed, c.status === 'pending_activation'],
    ['Searching', searched, c.status === 'approved' || c.status === 'researching'],
    ['Closed', c.status === 'completed', false],
  ];
  return <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Search progress">
    {steps.map(([label, done, current]) => <li key={label}>
      <span className={'block h-1 rounded-full ' + (current ? 'bg-[#FF5124]' : done ? 'bg-[#1C1B1A]' : 'bg-[#E9E3DA]')}/>
      <span className={'mt-2 block text-[12px] ' + (current ? 'font-semibold text-[#FF5124]' : done ? 'text-[#1C1B1A]' : 'text-[#A8A198]')}>{label}</span>
    </li>)}
  </ol>;
}

function CampaignDashboard({ campaign: c, live, events, links, reports, entitled, busy, act }: {
  campaign: BuyerMatchCampaign; live?: BuyerMatchListing; events: CampaignEvent[]; links: BuyerMatchLink[]; reports: BuyerMatchReport[];
  entitled: boolean; busy: boolean; act: Act;
}) {
  // Prefer the live listing (what buyers see today); fall back to the snapshot taken at submission.
  const listing: BuyerMatchListing = { ...c.listing_snapshot, ...(live ?? {}), id: c.listing_id };
  const notes = listingRecommendations(listing as unknown as Record<string, unknown>);
  const engagement = useQuery<Engagement>({ queryKey: ['buyermatch-engagement', c.id], queryFn: () => buyerMatchAction('engagement', { campaign_id: c.id }), refetchInterval: 60000 });
  const [copied, setCopied] = useState('');
  const feedback = events.filter(e => e.feedback && e.verification_status === 'verified');
  const daily = engagement.data?.daily?.slice(-14) ?? [];
  const peak = Math.max(1, ...daily.map(d => d.visits));
  const linkUrl = (k: BuyerMatchLink) => `${window.location.origin}/listing/${k.listing_id}?ref=bm_${k.token}`;

  return <article className="space-y-14">
    <section className={bm.card + ' grid overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]'}>
      <div className="relative min-h-[220px] bg-[#F3EEE7]">{listing.cover_image_url ? <img src={listing.cover_image_url} alt={listing.title} className="absolute inset-0 h-full w-full object-cover"/> : <span className="absolute inset-0 grid place-items-center text-[13px] text-[#8A847B]">No cover photo yet</span>}</div>
      <div className="p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className={bm.chip}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FF5124]"/>{CAMPAIGN_STATUS[c.status] ?? c.status}</span><Link to={'/listing/' + c.listing_id} className={bm.link + ' inline-flex items-center gap-1'}>View listing<ArrowUpRight className="h-3.5 w-3.5"/></Link></div>
        <h3 className="mt-5 font-display text-[26px] leading-tight sm:text-[30px]">{listing.title}</h3>
        <p className={bm.body + ' mt-1'}>{[usd(listing.price_sale), place(listing), 'sent ' + shortDate(c.created_at)].filter(Boolean).join(' · ')}</p>
        <p className="mt-5 text-[15px] leading-7">{STATUS_LINE[c.status] ?? 'Your history stays here.'}</p>
        <Stages c={c}/>
        {(c.geography || c.buyer_criteria) && <dl className="mt-6 space-y-2 border-t border-[#ECE6DD] pt-5 text-[14px]">
          {c.geography && <div className="flex gap-3"><dt className="w-24 shrink-0 text-[#8A847B]">Looking in</dt><dd>{c.geography}</dd></div>}
          {c.buyer_criteria && <div className="flex gap-3"><dt className="w-24 shrink-0 text-[#8A847B]">Right buyer</dt><dd className="min-w-0">{c.buyer_criteria}</dd></div>}
        </dl>}
      </div>
    </section>

    <BuyerMatchInsights events={events} sessions={engagement.data?.unique_sessions}/>

    <div className="grid gap-12 lg:grid-cols-2">
      <section>
        <h3 className={bm.h3}>Activity</h3>
        <ol className="mt-5 space-y-5 border-l border-[#E2DBD0] pl-5">
          {events.map(e => <li key={e.id} className="relative"><span aria-hidden className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-[#FF5124]"/><p className={bm.note}>{shortDate(e.occurred_at)} · {e.source}{e.verification_status !== 'verified' ? ' · not yet verified' : ''}</p><p className="mt-0.5 text-[14px] font-semibold">{EVENT_LABELS[e.event_type] ?? e.event_type}</p>{e.outcome && <p className={bm.body}>{e.outcome}</p>}{e.next_step && <p className="mt-1 text-[13px] text-[#1C1B1A]"><span className="font-semibold text-[#FF5124]">Next:</span> {e.next_step}</p>}</li>)}
          <li className="relative"><span aria-hidden className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-[#1C1B1A]"/><p className={bm.note}>{shortDate(c.created_at)}</p><p className="mt-0.5 text-[14px] font-semibold">Listing sent for review</p></li>
        </ol>
        {!events.length && <p className={bm.body + ' mt-4'}>No research or outreach logged yet.</p>}
      </section>
      <section>
        <h3 className={bm.h3}>Before buyers see it</h3>
        <p className={bm.note + ' mt-1'}>Checked against your listing as it is now, not buyer feedback.</p>
        {notes.length ? <ul className="mt-5 space-y-3">{notes.map(n => <li key={n} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-[14px] leading-6"><span aria-hidden className="mt-[11px] h-px w-3 bg-[#FF5124]"/>{n}</li>)}</ul>
          : <p className={bm.body + ' mt-5'}>Photos, description, included equipment and asking price are all filled in.</p>}
        <Link to={'/dashboard/listings/' + c.listing_id + '/edit'} className={bm.quiet + ' mt-6'}>Edit listing</Link>
      </section>
    </div>

    <section className="border-t border-[#ECE6DD] pt-8">
      <h3 className={bm.h3}>Tracked links</h3>
      <p className={bm.note + ' mt-1'}>Links our team shares with approved buyers. Visits are counted per consented browser session, not per confirmed buyer.</p>
      {engagement.error ? <p role="alert" className={bm.body + ' mt-3'}>Link visits are unavailable right now. Search activity is unaffected.</p> : <>
        <div className="mt-5 flex flex-wrap gap-x-12 gap-y-4">
          <div><p className={bm.numSm}>{engagement.data?.unique_sessions ?? '—'}</p><p className={bm.label}>Browser sessions</p></div>
          <div><p className={bm.numSm}>{engagement.data?.visits ?? '—'}</p><p className={bm.label}>Visit days</p></div>
        </div>
        {!!daily.length && <div className="mt-6 flex h-14 max-w-md items-end gap-1" aria-label="Visits per day, last 14 days">{daily.map(d => <div key={d.day} title={`${d.day}: ${d.visits} visits`} className="flex-1 rounded-t-sm bg-[#D9D1C5]" style={{ height: `${Math.max(6, (d.visits / peak) * 100)}%` }}/>)}</div>}
      </>}
      {!links.length ? <p className={bm.body + ' mt-5'}>Links appear after outreach for this listing is approved.</p> : <ul className="mt-5 space-y-2">{links.map(k => <li key={k.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,27,26,0.05)]"><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">{k.source} · {shortDate(k.created_at)}</p><p className="mt-0.5 break-all text-[12px] text-[#8A847B]">{linkUrl(k)}</p></div><button type="button" aria-label="Copy tracking link" className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#F3EEE7]" onClick={async () => { try { await navigator.clipboard.writeText(linkUrl(k)); setCopied(k.id); } catch { setCopied('failed'); } }}><Copy className="h-4 w-4"/></button></li>)}</ul>}
      {copied && <p role="status" className={bm.note + ' mt-2'}>{copied === 'failed' ? 'Could not copy. Select the link to copy it manually.' : 'Link copied.'}</p>}
    </section>

    {!!feedback.length && <section className="border-t border-[#ECE6DD] pt-8"><h3 className={bm.h3}>What buyers told us</h3><dl className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">{([['interested', 'Interested'], ['needs_financing', 'Needs financing'], ['price_concern', 'Price concern'], ['not_interested', 'Not interested']] as const).map(([f, label]) => <div key={f} className="flex flex-col-reverse"><dt className={bm.label}>{label}</dt><dd className={bm.numSm}>{feedback.filter(e => e.feedback === f).length}</dd></div>)}</dl></section>}

    {!!reports.length && <section className="border-t border-[#ECE6DD] pt-8"><h3 className={bm.h3}>Reviewed reports</h3>{reports.map(r => <div key={r.id} className="mt-4"><p className={bm.note}>{shortDate(r.published_at)}</p><p className="mt-1 text-[15px] leading-7">{r.summary}</p></div>)}</section>}

    {entitled && <BuyerMatchRecommendations campaignId={c.id}/>}

    <div className="flex flex-wrap gap-3 border-t border-[#ECE6DD] pt-8">
      <Link to="/dashboard/messages" className={bm.primary}>Open buyer conversations</Link>
      {!['completed', 'rejected'].includes(c.status) && <button type="button" className={bm.quiet} disabled={busy || (c.status === 'paused' && !entitled)} onClick={() => act(c.status === 'paused' ? 'resume' : 'pause', { campaign_id: c.id })}>{c.status === 'paused' ? 'Send for review again' : 'Pause search'}</button>}
    </div>
  </article>;
}
