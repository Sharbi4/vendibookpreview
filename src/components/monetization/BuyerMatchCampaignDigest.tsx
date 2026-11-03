import type { BuyerMatchCampaignDigest as Digest } from '@/lib/monetization/buyerMatchIntelligence';
import { bm } from './buyerMatchUi';

const profiles: Record<Digest['prospects'][number]['profile'], [string, string]> = {
  full_kitchen: ['Fully equipped kitchen buyer', 'Seeking a fully equipped food truck or trailer, new or used, and inviting sellers to get in touch. Equipment fit is in final review.'],
  direct_outreach: ['Listing shared directly', 'Your listing, financing options and shipping option have been shared. Follow-up will build on this introduction.'],
  payment_terms: ['Payment-flexible buyer · Texas', 'Looking for a food truck with payments spread over several months. The team is reviewing financing fit.'],
  restaurant_transition: ['Restaurant-to-food-truck transition · Texas', 'An experienced restaurant operator is preparing to move into a food truck after a rent increase. Purchasing capacity is being reviewed.'],
  equipped_value: ['Equipped food truck buyer', 'Seeking a fully equipped food truck at a reasonable price. The team is reviewing fit and budget.'],
  catering_launch: ['Catering business expansion', 'A catering business owner is looking for a food truck ready for immediate use.'],
  financing_paperwork: ['Financing-focused buyer', 'Seeking a food truck with financing options and complete paperwork. Location is being confirmed.'],
  colorado_buyer: ['Colorado buyer', 'A Colorado-based prospect is being monitored for the next matching opportunity.'],
  staffing_before_purchase: ['Operator preparing a team', 'A prospect recruiting cooks ahead of a planned purchase is being monitored.'],
};
const channels = {facebook:'Vendibook Facebook Page', threads:'Threads', instagram:'Instagram', food_truck_group:'Colorado food truck group', buy_sell_group:'Buy and sell group'};
const stages = {final_review:'Final fit review',awaiting_reply:'Outreach completed · awaiting reply',qualification:'Fit review',monitoring:'Monitoring'};
const equipment = {full_kitchen:'Fully equipped kitchen',cummins_under_1000_hours_with_records:'New Cummins engine · under 1,000 hours · maintenance records',new_tires:'New tires',westinghouse_generator:'Westinghouse generator'};
const day = (value: string) => new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
// The owner reports in Phoenix time; preserve that reference for campaign milestones.
const moment = (value: string) => new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Phoenix',timeZoneName:'short'}).format(new Date(value));

export default function BuyerMatchCampaignDigest({ digest: d, listingVerifiedAt }: { digest: Digest; listingVerifiedAt?: string }) {
  return <div className="space-y-8 px-6 py-7 sm:px-9">
    <div><p className={bm.eyebrow}>BuyerMatch progress report · {day(d.report_date)}</p><p className={bm.note+' mt-2'}>Campaign started {day(d.campaign_start)} · Team-reported activity</p></div>
    <section aria-label="Campaign highlights" className="rounded-2xl bg-[#FFF3ED] p-5 sm:p-6">
      <h4 className="text-xl font-semibold">Your opportunity pipeline is taking shape.</h4>
      <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">{([[d.prospects.length,'Prospects identified'],[d.direct_outreach_total,'Direct outreach completed'],[d.searches_24h,'Targeted searches · last 24 hours']] as const).map(([count,label])=><div key={label}><dt className={bm.note}>{label}</dt><dd className="mt-2 text-3xl font-medium tabular-nums">{count}</dd></div>)}</dl>
      <p className={bm.body+' mt-5'}>Your team is researching equipment fit, budget, financing readiness, location and timing, with national matching supported by financing and freight options.</p>
    </section>
    <section aria-label="Promotion log"><h4 className="text-lg font-semibold">Getting your listing in front of the market</h4><ol className="mt-5 space-y-4">{d.promotions.map((p,index)=><li key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#ECE6DD] p-4"><div><p className="text-sm font-semibold">{channels[p.channel]}</p><p className={bm.note+' mt-1'}><time dateTime={p.time_utc ?? p.date}>{p.time_utc ? moment(p.time_utc) : day(p.date)}</time>{p.group_members != null && ` · ${p.group_members.toLocaleString()} group members`}</p></div><span className={'rounded-full px-3 py-1 text-xs font-medium '+(p.status==='published'?'bg-[#EEF5EB] text-[#416136]':'bg-[#FFF3ED] text-[#A33E22]')}>{p.status==='published'?'Published':'Awaiting admin approval'}</span></li>)}</ol><p className={bm.note+' mt-3'}>Group membership describes the community size; views and reach are measured separately.</p></section>
    <section aria-label="Prospect profiles"><h4 className="text-lg font-semibold">Meet your prospect pipeline</h4><p className={bm.body+' mt-2'}>A closer look at the opportunities your team is working.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{d.prospects.map((p,index)=><article key={p.profile} className="rounded-2xl border border-[#E2DBD0] p-5"><div className="flex items-center justify-between gap-3"><span className={bm.eyebrow}>Prospect {index+1}</span>{p.score != null && <span className="text-sm font-semibold tabular-nums text-[#A33E22]">Fit score {p.score}/100</span>}</div><h5 className="mt-3 text-base font-semibold">{profiles[p.profile][0]}</h5><p className={bm.body+' mt-2'}>{profiles[p.profile][1]}</p><p className="mt-4 text-xs font-semibold text-[#746E66]">{stages[p.status]}</p>{p.posted_on && <p className={bm.note+' mt-1'}>Buyer request: <time dateTime={p.posted_on}>{day(p.posted_on)}</time></p>}{p.contacted_at && <p className={bm.note+' mt-1'}>Contacted: <time dateTime={p.contacted_at}>{moment(p.contacted_at)}</time></p>}</article>)}</div></section>
    {!!d.equipment_highlights?.length && <section><h4 className="text-lg font-semibold">The strengths behind your outreach</h4><p className={bm.body+' mt-2'}>Your team highlights these seller-listed features alongside financing options for qualified buyers and nationwide freight coordination.</p><ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{d.equipment_highlights.map(key=><li key={key} className="rounded-xl bg-[#F7F4EE] p-4">{equipment[key]}</li>)}</ul></section>}
    <section className="rounded-2xl bg-[#F7F4EE] p-5 sm:p-6"><h4 className="text-lg font-semibold">What happens next</h4><p className={bm.body+' mt-2'}>Daily buyer research continues, with further placements planned beneath relevant buyer-request posts. Your team will follow up on the completed introduction and review the remaining prospects for fit before arranging introductions.</p>{listingVerifiedAt && <p className={bm.note+' mt-4'}>Listing last reported live: <time dateTime={listingVerifiedAt}>{moment(listingVerifiedAt)}</time>.</p>}</section>
  </div>;
}
