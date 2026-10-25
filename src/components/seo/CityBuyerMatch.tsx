import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { trackBuyerSeoCta } from '@/lib/buyerSeoTracking';

/** Owner-facing secondary CTA; local inventory remains the primary purpose of city pages. */
export default function CityBuyerMatch({ city, tracking }: { city: string; tracking?: { landingPage: string; category: string } }) {
  return <section aria-label={`BuyerMatch for sellers and hosts in ${city}`} className="my-10 rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 sm:p-9">
    <div className="flex flex-wrap items-center gap-3">
      <img src="/brand/vendibook-logo-email.png" alt="Vendibook" className="h-7 w-auto" loading="lazy" />
      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">PRO · BuyerMatch AI</span>
    </div>
    <h2 className="mt-5 text-2xl font-semibold tracking-tight">Find your next buyer or renter in {city}.</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">Have a food truck, trailer or kitchen to list? Pro includes BuyerMatch AI for eligible sale and rental listings. Our team researches relevant demand, reviews outreach and tracks real responses, guided by your location, equipment and target budget.</p>
    <Link to="/pricing#buyermatch-overview" onClick={() => { if (tracking) trackBuyerSeoCta({...tracking,ctaId:'city_buyermatch',ctaLocation:'owner_matching',destination:'/pricing#buyermatch-overview'}); }} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ff5124] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(255,81,36,.6)] hover:bg-[#e8461c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">Explore BuyerMatch AI<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    <p className="mt-3 text-xs leading-5 text-stone-500">Campaign review and capacity apply. Matches, sales and bookings are not guaranteed.</p>
  </section>;
}
