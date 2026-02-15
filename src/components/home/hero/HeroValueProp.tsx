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

const HeroValueProp = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92svh] sm:min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-4xl mx-auto px-5 pt-10 pb-6 sm:py-20 md:py-28">
        <div className="text-center flex flex-col items-center gap-0">
          {/* Logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-36 sm:h-44 md:h-52 lg:h-64 w-auto mb-4 sm:mb-6"
            style={{ filter: 'drop-shadow(0 0 40px rgba(255,81,36,0.25))' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Headline */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            The marketplace for
            <br />
            <span className="relative inline-block">
              <span className="gradient-text-warm">food business.</span>
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
            </span>
          </motion.h1>

          {/* Search + Vendi — unified block */}
          <motion.div
            className="w-full max-w-xl space-y-3 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <HeroSearchInput {...search} />
            <HeroVendiButton />
          </motion.div>

          {/* Single CTA */}
          <motion.div
            className="mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/list')}
              className="rounded-full px-8 border-border/50 hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2 transition-all text-sm sm:text-base"
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

export default HeroValueProp;
