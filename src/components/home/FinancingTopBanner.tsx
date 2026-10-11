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
    <section aria-label="Equipment financing" className="w-full px-3 pt-6 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/financing"
            onClick={() => trackFinancingApplyClick('home_banner')}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 transition-colors duration-300 hover:border-emerald-300/25 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
          >
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <img
                  src={vendibookWordmark}
                  alt="Vendibook"
                  width={1000}
                  height={293}
                  className="h-6 w-auto sm:h-7"
                />
                <span aria-hidden className="text-lg font-light text-white/20">
                  ×
                </span>
                <EquinoxFundingLogo className="h-6 w-auto sm:h-7" />
              </div>
              <p className="text-[13px] font-medium leading-snug text-foreground sm:text-sm">
                Financing for food trucks, trailers, and equipment.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Offered through third-party partners — Vendibook is not the lender.
              </p>
            </div>

            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[13px] font-semibold text-emerald-200 transition-colors duration-300 group-hover:bg-emerald-400/15 sm:self-auto">
              Explore financing
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};


export default FinancingTopBanner;
