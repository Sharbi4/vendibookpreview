import { useEffect, useState } from 'react';
import { Clock3, Check, ArrowUpRight } from 'lucide-react';
import type { BuyerMatchProgressUpdate } from '@/lib/monetization/buyerMatchIntelligence';
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
  const overdue = Date.parse(update.next_update_at)<=now;
  return <section aria-labelledby="bm-progress-title" className="overflow-hidden rounded-[24px] border border-[#E2DBD0] bg-white shadow-[0_12px_40px_rgba(28,27,26,0.04)]">
    <div className="bg-[#20201F] px-6 py-7 text-white sm:px-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFAD91]">Your team at work</p>
      <h3 id="bm-progress-title" className="mt-3 font-display text-[26px] leading-tight sm:text-[32px]">The latest on your matching search.</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Team-reported progress. Confirmed outreach, replies and qualified inquiries are counted separately below.</p>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 text-xs leading-6">
        <p><span className="block text-white/60">Last team update</span><time dateTime={update.created_at}>{progressTimestamp(update.created_at)}</time></p>
        <p><span className="block text-white/60">Next update expected</span><time dateTime={update.next_update_at}>{progressTimestamp(update.next_update_at)}</time>{overdue && <span className="block text-[#FFC5B0]">Awaiting the next team report</span>}</p>
      </div>
    </div>
    <ul className="grid gap-x-10 px-6 py-3 sm:px-9 lg:grid-cols-2">
      {Object.entries(STEPS).filter(([key])=>update.steps[key]).map(([key,[title,detail]])=>{
        const status=update.steps[key];const Icon=status==='complete'?Check:status==='in_progress'?ArrowUpRight:Clock3;
        return <li key={key} className="flex min-w-0 gap-3 border-b border-[#F0ECE6] py-5 last:border-0">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1EB] text-[#D9441C]"><Icon className="h-4 w-4" aria-hidden/></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h4 className="text-sm font-semibold">{title}</h4><span className="text-[11px] font-medium text-[#A33E22]">{STATUS[status] ?? 'Pending review'}</span></div><p className={bm.body+' mt-1'}>{detail}</p></div>
        </li>;
      })}
    </ul>
    <p className="px-6 pb-6 pt-3 text-xs leading-5 text-[#746E66] sm:px-9">Group names, prospect identities and contact details stay private. Updates appear here after team review; expected times are estimates.</p>
  </section>;
}
