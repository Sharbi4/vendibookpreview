import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

const REFERRAL_ROUTE =
  '/referral?utm_source=homepage&utm_medium=referral_card&utm_campaign=referral_program&utm_content=learn_about_referrals';

/**
 * Calm editorial referral band. Deliberately quieter than the marketplace
 * actions above it — one refined action, compact eligibility note.
 */
const ReferralPromoCard = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const go = () => {
    trackLeadEvent('referral_card_clicked', {
      cta_label: 'Learn about referrals',
      destination: REFERRAL_ROUTE,
    });
    navigate(REFERRAL_ROUTE);
  };

  return (
    <section className="py-8 sm:py-12">
      <div className="container mx-auto max-w-5xl px-5">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5 sm:px-7 sm:py-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                Referral program
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
                Earn <span className="text-primary">$500</span> when you refer a buyer
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                Refer someone shopping for a food truck or trailer and earn when a qualifying
                purchase closes. Subject to eligibility, qualifying transaction requirements, and
                Vendibook referral terms.
              </p>
            </div>

            <Button
              onClick={go}
              variant="outline"
              className="h-11 shrink-0 gap-2 rounded-2xl border-border/60 bg-transparent px-6 text-sm font-semibold text-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Learn about referrals
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ReferralPromoCard;
