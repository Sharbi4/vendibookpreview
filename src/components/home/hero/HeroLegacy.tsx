import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import vendibookLogo from '@/assets/vendibook-logo.png';

/**
 * Legacy "Find, rent, buy, or sell" hero — restored from the June 10 layout.
 * Single panel (no rotation), search-first, paired with the two stacked CTAs.
 */
const HeroLegacy = () => {
  const search = useHeroSearch();

  return (
    <section className="relative overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-3xl mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="text-center">
          {/* Vendibook logo with pulsating spotlight */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex justify-center mb-8"
          >
            {/* Outer ambient spotlight glow */}
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: '140%',
                height: '220%',
                background:
                  'radial-gradient(ellipse at center, rgba(255,107,0,0.45) 0%, rgba(255,138,0,0.22) 25%, rgba(255,150,0,0.08) 50%, transparent 72%)',
                filter: 'blur(40px)',
              }}
              animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Inner concentrated hot spot */}
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: '85%',
                height: '120%',
                background:
                  'radial-gradient(ellipse at center, rgba(255,180,80,0.55) 0%, rgba(255,107,0,0.28) 40%, transparent 75%)',
                filter: 'blur(28px)',
              }}
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <img
              src={vendibookLogo}
              alt="Vendibook"
              className="relative h-48 sm:h-64 md:h-80 w-auto"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.05] mb-5"
          >
            Find, rent, buy, or sell{' '}
            <span className="bg-gradient-to-r from-[#FF4500] via-[#FF5A1F] to-[#FF6A2C] bg-clip-text text-transparent">
              food trucks and food trailers
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
          >
            Search detailed food truck and trailer listings, compare options, and connect with
            owners through a more structured marketplace.
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="max-w-xl mx-auto mb-4"
          >
            <HeroSearchInput {...search} />
          </motion.div>

          {/* List-it-free link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <Link
              to="/host"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Have a truck or trailer?{' '}
              <span className="underline underline-offset-4 text-foreground font-medium">List it free.</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Stacked CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-md mx-auto space-y-3"
          >
            <Button asChild size="lg" variant="glass-cta" className="w-full h-12 text-base font-semibold">
              <Link to="/auth?mode=signup">
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up Free
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full h-12 text-base font-semibold border-border/60 bg-transparent text-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <Link to="/search">
                <SearchIcon className="h-4 w-4 mr-2" />
                Browse Trucks & Trailers
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroLegacy;
