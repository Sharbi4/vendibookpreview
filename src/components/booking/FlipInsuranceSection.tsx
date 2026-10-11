import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { FLIP_INSURANCE as flip } from '@/lib/flipInsurance';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

export default function FlipInsuranceSection({ source, owner = false }: { source: string; owner?: boolean }) {
  if (!flip.enabled) return null;
  return <section className="mx-auto my-12 w-[calc(100%-36px)] max-w-6xl rounded-3xl border border-[#dfd4c7] bg-[#faf7f2] p-6 text-[#29241f] md:my-16 md:p-10" aria-label="Insurance through FLIP">
    <div className="grid items-center gap-8 md:grid-cols-[1fr_240px]">
      <div>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-[#914722]"><ShieldCheck className="h-4 w-4" />Insurance through our partner</p>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{owner ? 'A clearer plan for your rental business.' : 'Insurance for the road ahead.'}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#65584d]">{owner
          ? 'Set clear insurance requirements for renters and ask FLIP about options for your own food-business operation. A renter’s policy does not automatically cover the owner, vehicle, or equipment.'
          : 'Renting a food truck or trailer? Explore food-business insurance through Vendibook’s partnership with FLIP. Apply and purchase directly through FLIP, then provide any documents your host requires.'}</p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <a href={owner ? flip.ownerUrl : flip.partnerUrl} target="_blank" rel="noopener noreferrer sponsored"
            onClick={() => {
              try {
                if (!hasAnalyticsConsent()) return;
                (window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer?.push({ event: 'flip_insurance_cta_clicked', source });
              } catch { /* Referral remains usable without analytics. */ }
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#ff7337] to-[#ec4b13] px-5 py-3 text-sm font-bold text-[#22140b] shadow-[0_8px_25px_#ed581435] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#914722]">
            {owner ? 'Explore owner insurance options' : 'Get insurance through FLIP'}<ArrowUpRight className="h-4 w-4" />
          </a>
          <Link to="/insurance" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#713c21] underline underline-offset-4">How insurance works<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      <div className="rounded-2xl border border-[#dfd4c7] bg-white p-6"><img src={flip.logoUrl} alt="FLIP — Food Liability Insurance Program" width="300" height="130" loading="lazy" className="mx-auto h-auto w-full max-w-[200px]" /><p className="mt-4 text-center text-xs leading-5 text-[#65584d]">Purchase and policy issuance handled directly through FLIP.</p></div>
    </div>
    <p className="mt-7 border-t border-[#dfd4c7] pt-5 text-xs leading-6 text-[#746354]">Insurance is subject to eligibility, policy terms, conditions, limits, and exclusions. Vendibook is not the insurer. Coverage is not automatically included with a booking.</p>
  </section>;
}
