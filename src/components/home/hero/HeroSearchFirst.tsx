import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import vendibookLogo from '@/assets/vendibook-logo.png';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import HeroTrustSignals from './HeroTrustSignals';
import HeroVendiButton from './HeroVendiButton';
import { useHeroSearch } from './useHeroSearch';
import { trackLeadEvent } from '@/lib/leadTracking';

const CATEGORIES = [
  { label: 'Food trucks', mode: 'rent', cat: 'food_truck' },
  { label: 'Trailers', mode: 'sale', cat: 'food_trailer' },
  { label: 'Kitchens', mode: 'rent', cat: 'ghost_kitchen' },
  { label: 'Spaces', mode: 'rent', cat: 'vendor_space' },
];

const HeroSearchFirst = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-3xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center space-y-0">
          {/* Logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-20 w-auto mx-auto mb-8"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,81,36,0.2))' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Headline */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Find it. Book it. <span className="gradient-text-warm">Go.</span>
          </motion.h1>

          {/* Removed subheader text */}

          {/* Search + Vendi — tight block */}
          <motion.div
            className="max-w-xl mx-auto space-y-3 mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <HeroSearchInput {...search} />
            <HeroVendiButton />
          </motion.div>

          {/* Category pills — compact row */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {CATEGORIES.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  trackLeadEvent('search_performed', {
                    query: '',
                    category: item.cat,
                    intent: item.mode,
                    source: 'home_hero_category_pill',
                  });
                  navigate(`/search?mode=${item.mode}&category=${item.cat}`);
                }}
                className="px-3 py-1.5 rounded-full text-[11px] border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/[0.03] transition-all"
              >
                {item.label}
              </button>
            ))}
          </motion.div>

          {/* Trust strip — subtle footer */}
          <HeroTrustSignals />
        </div>
      </div>
    </section>
  );
};

export default HeroSearchFirst;
