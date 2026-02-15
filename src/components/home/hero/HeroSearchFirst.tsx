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

/**
 * Variant A: Search-First
 * Minimal headline, giant search bar front and center. Maximum conversion focus.
 */
const HeroSearchFirst = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-3xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center">
          {/* Compact logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-20 w-auto mx-auto mb-10"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,81,36,0.2))' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Single-line headline */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Find it. Book it. <span className="gradient-text-warm">Go.</span>
          </motion.h1>

          <motion.p
            className="text-base text-muted-foreground max-w-lg mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Search food trucks, trailers, kitchens, and vendor spaces across the country.
          </motion.p>

          {/* Giant search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <HeroSearchInput {...search} className="max-w-xl mx-auto" />
            <HeroVendiButton />
          </motion.div>

          {/* Quick links */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-2 mt-8 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { label: 'Rent a food truck', mode: 'rent', cat: 'food_truck' },
              { label: 'Buy a trailer', mode: 'sale', cat: 'food_trailer' },
              { label: 'Shared kitchens', mode: 'rent', cat: 'ghost_kitchen' },
              { label: 'Vendor spaces', mode: 'rent', cat: 'vendor_space' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(`/search?mode=${item.mode}&category=${item.cat}`)}
                className="px-4 py-2 rounded-full text-xs border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground bg-card/30 hover:bg-card/60 transition-all"
              >
                {item.label}
              </button>
            ))}
          </motion.div>

          <HeroTrustSignals />
        </div>
      </div>
    </section>
  );
};

export default HeroSearchFirst;
