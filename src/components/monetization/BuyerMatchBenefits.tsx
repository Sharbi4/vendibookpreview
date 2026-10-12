import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BUYERMATCH_BENEFITS, BUYERMATCH_DISCLOSURE } from '@/lib/monetization/buyerMatch';
export default function BuyerMatchBenefits() {
  return <section className="rounded-[28px] border border-stone-200 bg-[#fffdf9] p-7 text-stone-900 sm:p-10">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-orange-700">Introducing BuyerMatch AI</p>
    <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">We don’t just promote your listing. We actively search for your next buyer.</h2>
    <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">With Vendibook Pro, your eligible listings can receive priority buyer discovery and AI-assisted marketing. Follow relevant buying opportunities and reviewed campaign activity from your dashboard.</p>
    <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">{BUYERMATCH_BENEFITS.map(b=><div key={b.title} className="border-t border-stone-200 pt-5"><h3 className="font-semibold">{b.title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{b.body}</p></div>)}</div>
    <p className="mt-7 text-xs leading-5 text-stone-500">{BUYERMATCH_DISCLOSURE}</p>
    <Link to="/dashboard/buyermatch" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(234,88,12,.55)]">Explore BuyerMatch<ArrowUpRight className="h-4 w-4"/></Link>
  </section>;
}
