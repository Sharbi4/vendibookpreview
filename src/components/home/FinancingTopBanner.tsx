import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { trackFinancingApplyClick, trackFinancingBannerImpression } from '@/lib/analytics';
import vendibookLogo from '@/assets/vendibook-logo.png';

/**
 * Financing partner lockup at the top of the homepage.
 *
 * Contained editorial card — deep muted green, hairline border, large and
 * legible Vendibook × Equinox Funding lockup. No glow, no ad-banner energy.
 * Routes to the existing /financing page.
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
          className="group relative block overflow-hidden rounded-2xl border border-emerald-200/15 bg-[hsl(158_26%_9%)] transition-colors duration-300 hover:border-emerald-200/30"
        >
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:px-7 sm:py-6 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              {/* Partner lockup — deliberately large enough to read */}
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <img
                  src={vendibookLogo}
                  alt="Vendibook"
                  width={160}
                  height={32}
                  className="h-7 w-auto sm:h-8"
                />
                <span aria-hidden className="text-lg font-light text-white/25">
                  ×
                </span>
                <EquinoxFundingLogo className="h-7 w-auto sm:h-9" />
              </div>

              <h2 className="text-balance text-base font-semibold leading-snug tracking-tight text-white sm:text-xl">
                Financing for food trucks, trailers, and equipment.
              </h2>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/60 sm:text-sm">
                Eligible buyers can explore third-party financing options through Vendibook.
                Approval, rates, and terms are determined by the provider — Vendibook is not the
                lender.
              </p>
            </div>

            <div className="flex shrink-0 items-center">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/90 px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors duration-300 group-hover:bg-emerald-400">
                Explore financing
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
