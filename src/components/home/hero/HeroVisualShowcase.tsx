import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import HeroSearchInput from './HeroSearchInput';
import HeroTrustSignals from './HeroTrustSignals';
import HeroVendiButton from './HeroVendiButton';
import { useHeroSearch } from './useHeroSearch';

const HeroVisualShowcase = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-foreground/5" />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-foreground/[0.04] rounded-full blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="container relative z-10 max-w-4xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center space-y-0">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-white/[0.03] text-[11px] text-muted-foreground/60 mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-pulse" />
            The #1 marketplace for mobile food vendors
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Your next kitchen
            <br />
            <span className="gradient-text-warm">starts here.</span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground/60 max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Browse verified food trucks, trailers, and commercial kitchens. Book instantly or list your own — in minutes.
          </motion.p>

          {/* Search + Vendi */}
          <motion.div
            className="max-w-xl mx-auto space-y-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <HeroSearchInput {...search} />
            <HeroVendiButton />
          </motion.div>

          {/* Single CTA */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/list')}
              className="rounded-full px-8 border-border/50 hover:border-foreground/30 hover:bg-foreground/5 text-foreground gap-2"
            >
              Create a Free Listing
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Trust strip */}
          <HeroTrustSignals />
        </div>
      </div>
    </section>
  );
};

export default HeroVisualShowcase;
