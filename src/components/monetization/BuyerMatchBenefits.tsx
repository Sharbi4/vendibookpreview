import { Link } from 'react-router-dom';
import { BUYERMATCH_BENEFITS, BUYERMATCH_DISCLOSURE } from '@/lib/monetization/buyerMatch';

/** Pricing-page explainer for BuyerMatch. Typographic, one accent, no icon badges. */
export default function BuyerMatchBenefits() {
  return <section className="rounded-[28px] bg-[#1C1B1A] p-7 text-[#FAF8F5] sm:p-12">
    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">BuyerMatch · included with Vendibook Pro</p>
    <h2 className="mt-4 max-w-3xl font-display text-[30px] font-normal leading-[1.1] tracking-[-0.02em] sm:text-[42px]">Your next buyer or renter. Let’s find the right fit.</h2>
    <p className="mt-5 max-w-2xl text-[16px] leading-7 text-white/70">Selling equipment or renting out a truck, trailer or kitchen? BuyerMatch AI is included with Pro for sellers and hosts. Submit your listing for review. Our team researches relevant demand, carries out approved outreach and reports verified activity in your dashboard.</p>
    <ol className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">{BUYERMATCH_BENEFITS.map((b, i) => <li key={b.title} className="border-t border-white/15 pt-5">
      <p className="font-display text-[18px] text-[#FF5124]">{String(i + 1).padStart(2, '0')}</p>
      <h3 className="mt-2 text-[16px] font-semibold">{b.title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-white/65">{b.body}</p>
    </li>)}</ol>
    <div className="mt-10 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-[12px] leading-5 text-white/50">{BUYERMATCH_DISCLOSURE}</p>
      <Link to="/dashboard/buyermatch" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#FF5124] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#E8461C]">See BuyerMatch</Link>
    </div>
  </section>;
}
