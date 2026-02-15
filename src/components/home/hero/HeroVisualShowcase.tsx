import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import HeroSearchInput from './HeroSearchInput';
import HeroTrustSignals from './HeroTrustSignals';
import HeroVendiButton from './HeroVendiButton';
import { useHeroSearch } from './useHeroSearch';

/**
 * Variant C: Visual Showcase
 * Full-bleed photo background with overlaid search. Immersive and aspirational.
 * Uses a placeholder gradient until real photos are provided.
 */
const HeroVisualShowcase = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background image placeholder — replace with real photo */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Accent glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.08] rounded-full blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="container relative z-10 max-w-4xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            The #1 marketplace for mobile food vendors
          </motion.div>

          {/* Hero headline — bold, aspirational */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Your next kitchen
            <br />
            <span className="gradient-text-warm">starts here.</span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Browse verified food trucks, trailers, and commercial kitchens. Book instantly or list your own — in minutes.
          </motion.p>

          {/* Search overlaid on the visual */}
          <motion.div
            className="max-w-xl mx-auto mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <HeroSearchInput {...search} />
            <HeroVendiButton />
          </motion.div>

          {/* Dual action */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/search?mode=rent')}
              className="rounded-full px-8 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2"
            >
              Explore Listings
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/list')}
              className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20"
            >
              List for Free
            </Button>
          </motion.div>

          <HeroTrustSignals />
        </div>
      </div>
    </section>
  );
};

export default HeroVisualShowcase;
