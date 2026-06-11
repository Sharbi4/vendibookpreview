import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Gift, ArrowRight } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

const PRIMARY = '/referrals?utm_source=homepage&utm_medium=referral_card&utm_campaign=referral_program&utm_content=learn_about_referrals';
const SECONDARY = '/referrals?utm_source=homepage&utm_medium=referral_card&utm_campaign=referral_program&utm_content=share_referral';

const ReferralPromoCard = () => {
  const navigate = useNavigate();

  const go = (label: string, dest: string) => {
    trackLeadEvent('referral_card_clicked', { cta_label: label, destination: dest });
    navigate(dest);
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="container max-w-5xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#120a07] via-[#0c0807] to-[#08080a] p-6 sm:p-8 shadow-2xl"
        >
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,81,36,0.18) 0%, transparent 70%)' }}
          />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-5 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Gift className="w-3 h-3" />
                Referral Program
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
                Earn <span className="gradient-text-warm">$500</span> when you refer a buyer
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Know someone looking to buy a food truck or trailer? Refer them to Vendibook and earn when a qualifying purchase closes.
              </p>
              <p className="mt-2 text-[11px] text-foreground/40">
                Referral rewards are subject to eligibility, qualifying transaction requirements, and Vendibook referral terms.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 md:min-w-[200px]">
              <Button
                onClick={() => go('Learn About Referrals', PRIMARY)}
                variant="dark-shine"
                className="rounded-full px-5 gap-2 whitespace-nowrap"
              >
                Learn About Referrals <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => go('Share a Referral', SECONDARY)}
                variant="glass-cta"
                className="rounded-full px-5 whitespace-nowrap"
              >
                Share a Referral
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ReferralPromoCard;
