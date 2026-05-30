import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import { TellVendibookModal } from '@/components/lead/TellVendibookModal';
import { trackLeadEvent } from '@/lib/leadTracking';
import vendibookLogo from '@/assets/vendibook-logo.png';

const TRUST_BITS = [
  'Secure payments',
  'Owner profiles',
  'Document collection',
  'Booking requests',
  'Concierge help',
];

const HeroFocused = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();
  const [conciergeOpen, setConciergeOpen] = useState(false);

  const handlePrimary = () => {
    trackLeadEvent('homepage_primary_cta_click', { route: '/', source: 'home_hero' });
    setConciergeOpen(true);
  };

  const handleBrowse = () => {
    trackLeadEvent('homepage_browse_click', { route: '/', source: 'home_hero' });
    navigate('/search?category=food_truck%2Cfood_trailer');
  };

  const handleHostList = () => {
    trackLeadEvent('homepage_host_list_click', { route: '/', source: 'home_hero_host_link' });
    navigate('/list');
  };

  return (
    <section className="relative flex items-center justify-center overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-3xl mx-auto px-5 py-10 sm:py-14 md:py-20">
        <div className="text-center">
          {/* Compact wordmark */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-9 sm:h-10 w-auto mx-auto mb-5 sm:mb-6 opacity-90"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.4 }}
          />

          {/* Eyebrow */}
          <motion.div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <span className="w-1 h-1 rounded-full bg-primary" />
            Food trucks and trailers, easier to find and list
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-[28px] leading-[1.1] sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Find, rent, buy, or sell{' '}
            <span className="gradient-text-warm">food trucks and food trailers</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Vendibook helps food entrepreneurs find available trucks and trailers, compare real
            listings, check availability, and get help with next steps before they commit.
          </motion.p>

          {/* Search */}
          <motion.div
            className="max-w-xl mx-auto mb-5 sm:mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <HeroSearchInput {...search} />
          </motion.div>

          {/* Primary CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Button
              onClick={handlePrimary}
              size="lg"
              variant="dark-shine"
              className="rounded-full px-6 gap-2 flex-1 sm:flex-none whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Tell Vendibook What You Need
            </Button>
            <Button
              onClick={handleBrowse}
              size="lg"
              variant="glass-cta"
              className="rounded-full px-6 gap-2 flex-1 sm:flex-none whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Browse Trucks &amp; Trailers
            </Button>
          </motion.div>

          {/* Host nudge */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <button
              type="button"
              onClick={handleHostList}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              Have a truck or trailer?{' '}
              <span className="underline underline-offset-2 text-foreground/80">List it free.</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          {/* Fine print */}
          <motion.p
            className="mt-4 max-w-xl mx-auto text-[11px] sm:text-xs text-foreground/40 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Free to browse. No commitment. Listings are subject to owner availability, approval,
            verification status, and final terms.
          </motion.p>

          {/* Trust strip */}
          <motion.div
            className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] sm:text-xs text-muted-foreground/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            {TRUST_BITS.map((bit, i) => (
              <span key={bit} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-foreground/20">·</span>}
                <span>{bit}</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      <TellVendibookModal
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        sourcePage="home_hero"
      />
    </section>
  );
};

export default HeroFocused;
