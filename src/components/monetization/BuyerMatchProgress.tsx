import { useEffect, useState } from 'react';
import { Clock3, Check, ArrowUpRight } from 'lucide-react';
import type { BuyerMatchProgressUpdate, BuyerMatchStatusReport } from '@/lib/monetization/buyerMatchIntelligence';
import { bm } from './buyerMatchUi';

const STEPS: Record<string, [string, string]> = {
  priority: ['Priority placement in our work queue', 'Your listing is prioritized for the next matching and follow-up reviews.'],
  community_access: ['Local community access', 'Arranging access to relevant food-business communities. Membership approval is confirmed before posting.'],
  audience: ['Buyer and renter targeting', 'Refining relevant audiences, including food entrepreneurs, caterers, home cooks and cottage-food operators, for your listing.'],
  financing: ['Financing guidance prepared', 'Preparing qualified-buyer financing information. Eligibility and approval depend on the lender.'],
  local_promotion: ['Local promotion planning', 'Preparing location-focused social promotion for the area around your listing.'],
  review: ['Next progress review', 'Checking access approvals and confirmed activity before the next report.'],
};
const STATUS: Record<string, string> = { planned: 'Planned', in_progress: 'In progress', complete: 'Prepared' };
export function progressTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
export default function BuyerMatchProgress({ update }: { update: BuyerMatchProgressUpdate }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(timer); },[]);
  const overdue = !!update.next_update_at && Date.parse(update.next_update_at)<=now;
  const dayOne = update.report?.report_kind === 'day_one';
  return <section aria-labelledby="bm-progress-title" className="overflow-hidden rounded-[24px] border border-[#E2DBD0] bg-white shadow-[0_12px_40px_rgba(28,27,26,0.04)]">
    <div className="bg-[#20201F] px-6 py-7 text-white sm:px-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFAD91]">{dayOne ? 'Your campaign · Day 1' : 'Your team at work'}</p>
      <h3 id="bm-progress-title" className="mt-3 font-display text-[26px] leading-tight sm:text-[32px]">{dayOne ? 'Your promotion is underway.' : 'The latest on your matching search.'}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">{dayOne ? 'Your team has launched community promotion and completed targeted prospect research. Here’s your first-day progress, with more placements awaiting approval.' : 'Team-reported progress. Confirmed outreach, replies and qualified inquiries are counted separately below.'}</p>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 text-xs leading-6">
        <p><span className="block text-white/60">Last team update</span><time dateTime={update.created_at}>{progressTimestamp(update.created_at)}</time></p>
        {update.next_update_at ? <p><span className="block text-white/60">Next update expected</span><time dateTime={update.next_update_at}>{progressTimestamp(update.next_update_at)}</time>{overdue && <span className="block text-[#FFC5B0]">Awaiting the next team report</span>}</p> : <p><span className="block text-white/60">Next update</span>After the next campaign review</p>}
      </div>
    </div>
    {update.report ? <StatusReport report={update.report}/> : <ul className="grid gap-x-10 px-6 py-3 sm:px-9 lg:grid-cols-2">
      {Object.entries(STEPS).filter(([key])=>update.steps[key]).map(([key,[title,detail]])=>{
        const status=update.steps[key];const Icon=status==='complete'?Check:status==='in_progress'?ArrowUpRight:Clock3;
        return <li key={key} className="flex min-w-0 gap-3 border-b border-[#F0ECE6] py-5 last:border-0">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1EB] text-[#D9441C]"><Icon className="h-4 w-4" aria-hidden/></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h4 className="text-sm font-semibold">{title}</h4><span className="text-[11px] font-medium text-[#A33E22]">{STATUS[status] ?? 'Pending review'}</span></div><p className={bm.body+' mt-1'}>{detail}</p></div>
        </li>;
      })}
    </ul>}
    <p className="px-6 pb-6 pt-3 text-xs leading-5 text-[#746E66] sm:px-9">Group names, prospect identities and contact details stay private. Updates appear here after team review; expected times are estimates.</p>
  </section>;
}

function StatusReport({ report: r }: { report: BuyerMatchStatusReport }) {
  const dayOne = r.report_kind === 'day_one';
  const through = r.campaign_through && new Intl.DateTimeFormat(undefined, {month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(r.campaign_through+'T12:00:00Z'));
  return <div className="space-y-7 px-6 py-7 sm:px-9">
    {dayOne && <section aria-label="Day one highlights" className="rounded-2xl bg-[#FFF3ED] p-5 sm:p-6"><h4 className="text-lg font-semibold">Building visibility for your listing</h4>
      <p className={bm.body+' mt-2'}>{r.posts_live+r.posts_pending+r.posts_review} community placements submitted, with {r.posts_live} already live and additional placements working through approval. Your Marketplace listing is submitted and awaiting Facebook review.</p>
      <p className={bm.body+' mt-3'}>Approximately {r.discovery_runs_approx} targeted research rounds explored potential demand across social channels and web search.</p>
      {through && <p className="mt-4 text-sm font-semibold text-[#A33E22]">Campaign scheduled through {through}</p>}
    </section>}
    <div><p className={bm.eyebrow}>{dayOne ? 'Day 1 activity report' : 'Latest reporting period'}</p><p className={bm.body+' mt-2'}><time dateTime={r.period_start}>{progressTimestamp(r.period_start)}</time> – <time dateTime={r.period_end}>{progressTimestamp(r.period_end)}</time></p>
      <p className={bm.note+' mt-2'}>Activity reported by your campaign team. Placements, prospects and customer responses are tracked separately.</p></div>
    <section aria-label="Reported placements"><h4 className="text-sm font-semibold">Your promotion at a glance</h4>
      <p className={bm.note+' mt-1'}>Last detailed placement breakdown: <time dateTime={r.placements_as_of}>{progressTimestamp(r.placements_as_of)}</time>. Pending placements are not live.</p>
      <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">{([
        [r.posts_live,'Group posts reported live'],[r.posts_pending,'Awaiting group approval'],[r.posts_review,'Participation review'],[r.marketplace_pending,'Marketplace listings in review'],
      ] as const).map(([count,label])=><div key={label}><dt className={bm.note}>{label}</dt><dd className="mt-2 text-3xl font-medium tabular-nums">{count}</dd></div>)}</dl>
    </section>
    <section className="border-t border-[#ECE6DD] pt-6" aria-label="Reported matching activity"><h4 className="text-sm font-semibold">Matching and follow-up</h4>
      <ul className={bm.body+' mt-3 space-y-2'}>
        <li>{r.prospects_under_review} potential prospect{r.prospects_under_review===1?'':'s'} under review. Potential prospects are tracked separately from confirmed interest and qualified matches.</li>
        <li>{r.drafts_pending} additional placement draft{r.drafts_pending===1?' is':'s are'} ready for team approval. These have not been posted yet.</li>
        {r.new_draft_prepared && <li>A fresh placement draft was prepared during this reporting period.</li>}
        {r.discovery_paused && <li>Next focus: review pending placements and watch for responses. New prospect discovery is currently paused while the team evaluates fresh approaches.</li>}
        {r.follow_up_held && <li>Follow-up timing is being respected. Existing contacts remain on hold to avoid repeat outreach.</li>}
      </ul>
      <p className="mt-4 rounded-xl bg-[#F7F4EE] px-4 py-3 text-sm leading-6">{dayOne ? 'Day 1 results' : 'This period'}: {r.new_prospects} new prospects · {r.new_replies} replies · {r.new_conversions} confirmed conversions reported.</p>
    </section>
  </div>;
}
