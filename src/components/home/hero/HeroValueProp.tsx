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
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      <HeroBackground />

      <div className="container relative z-10 max-w-4xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center space-y-0">
          {/* Logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-44 sm:h-56 w-auto mx-auto mb-6"
            style={{ filter: 'drop-shadow(0 0 40px rgba(255,81,36,0.25))' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Headline */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-4"
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

          {/* Sub */}
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground/60 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Food trucks, trailers, shared kitchens, and vendor spaces — verified assets, instant booking, flexible payments.
          </motion.p>

          {/* Search + Vendi — unified block */}
          <motion.div
            className="max-w-xl mx-auto space-y-3 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <HeroSearchInput {...search} />
            <HeroVendiButton />
          </motion.div>

          {/* Single CTA */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/search')}
              className="rounded-full px-8 border-border/50 hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2 transition-all"
            >
              Browse Listings
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
