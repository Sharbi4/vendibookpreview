import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { trackFinancingApplyClick, trackFinancingBannerImpression } from '@/lib/analytics';

/**
 * Enterprise-grade financing banner for the top of the homepage.
 * Black-glass surface with an Equinox-green aurora wash and a hairline
 * sheen along the top edge. Routes to the /financing page.
 */
const FinancingTopBanner = () => {
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    trackFinancingBannerImpression();
  }, []);

  return (
    <section aria-label="Equipment financing" className="w-full px-3 pt-3 sm:px-4">
      <div className="container mx-auto max-w-7xl">
        <Link
          to="/financing"
          onClick={() => trackFinancingApplyClick('home_banner')}
          className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[hsl(160_30%_4%)] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {/* aurora wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(120% 160% at 0% 0%, rgba(16,185,129,0.35) 0%, rgba(6,78,59,0.25) 38%, rgba(0,0,0,0) 70%), radial-gradient(90% 140% at 100% 100%, rgba(52,211,153,0.18) 0%, rgba(0,0,0,0) 65%)',
            }}
          />
          {/* top sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
          />
          {/* moving shine on hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
          />

          <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:gap-4 sm:px-7 sm:py-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-sm">
                  <ShieldCheck className="h-3 w-3" />
                  Financing
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-[11px] font-medium tracking-tight text-white/70">
                    Vendibook
                  </span>
                  <span className="text-white/25">×</span>
                  <EquinoxFundingLogo className="h-4 w-auto" />
                </span>
              </div>

              <h2 className="mt-2 text-balance text-base font-semibold leading-snug tracking-tight text-white sm:mt-3 sm:text-xl">
                Vendibook &amp; Equinox Funding make it easy to get started.
              </h2>
              <p className="mt-1 hidden text-sm text-white/60 sm:block">
                Financing options for trucks, trailers and equipment — check your options without
                slowing down your purchase.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-emerald-950 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.9)] ring-1 ring-inset ring-white/25 transition-shadow duration-300 group-hover:shadow-[0_14px_36px_-10px_rgba(16,185,129,1)] sm:px-5 sm:py-3 sm:text-sm">
                Apply now for financing
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>

        </Link>
      </div>
    </section>
  );
};

export default FinancingTopBanner;
