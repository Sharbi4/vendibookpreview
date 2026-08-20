import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { trackFinancingApplyClick, trackFinancingBannerImpression } from '@/lib/analytics';
import vendibookWordmark from '@/assets/vendibook-wordmark-light.png';

/**
 * Financing partnership surface at the top of the homepage.
 *
 * Premium charcoal card with a hairline border and a single emerald accent
 * used only as a financing/status signal — not as a second brand color.
 * Vendibook × Equinox Funding lockup is large enough to read on both marks.
 */
const FinancingTopBanner = () => {
  const seen = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    trackFinancingBannerImpression();
  }, []);

  return (
    <section aria-label="Equipment financing" className="w-full px-3 pt-3 sm:px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/financing"
            onClick={() => trackFinancingApplyClick('home_banner')}
            className="group relative block overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent shadow-[0_1px_0_0_hsl(0_0%_100%/0.05)_inset,0_28px_70px_-40px_hsl(0_0%_0%/0.9)] transition-colors duration-500 hover:border-emerald-300/25"
          >
            {/* emerald status wash, kept subtle */}
            <span
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
            />

            <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7 md:flex-row md:items-center md:justify-between md:gap-10">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <img
                    src={vendibookWordmark}
                    alt="Vendibook"
                    width={1000}
                    height={293}
                    className="h-8 w-auto sm:h-10"
                  />
                  <span aria-hidden className="text-xl font-light text-white/20">
                    ×
                  </span>
                  <EquinoxFundingLogo className="h-8 w-auto sm:h-10" />
                </div>

                <h2 className="text-balance text-base font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
                  Financing for food trucks, trailers, and equipment.
                </h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                  Buyer financing is offered through third-party partners. Vendibook is not the
                  lender — approval, rates, and terms are determined by the provider.
                </p>
              </div>

              <div className="flex shrink-0 items-center">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition-colors duration-300 group-hover:bg-emerald-400/15">
                  Explore financing
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FinancingTopBanner;
