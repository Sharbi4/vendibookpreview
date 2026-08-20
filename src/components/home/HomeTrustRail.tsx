import { motion, useReducedMotion } from 'framer-motion';
import { TrustStrip } from '@/components/brand/TrustStrip';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';

/**
 * Single consolidated trust / payments rail for the homepage.
 * Factual only — describes what is actually implemented: PayPal-processed
 * online checkout, optional Plaid identity verification, and pay-in-person
 * where the seller supports it. No escrow, guarantee, or protection claims.
 */
const HomeTrustRail = () => {
  const verifiedSellerEnabled = usePublicFeatureFlag('verified_seller_enabled');
  const reduced = useReducedMotion();

  return (
    <section className="pb-10 pt-2 sm:pb-14" aria-label="Payments and verification">
      <div className="container mx-auto max-w-6xl px-5 sm:px-6">
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45"
        >
          Payments &amp; verification
        </motion.p>
        <TrustStrip showPlaid={verifiedSellerEnabled} />
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Online checkout is processed by PayPal. Identity verification through Plaid is optional.
          Pay in person is supported where the seller offers it.
        </p>
      </div>
    </section>
  );
};

export default HomeTrustRail;
