import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Shield, Sparkles, CheckCircle2, CreditCard, ShieldCheck, Users, Heart, BookOpen, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCityListModuleViewed, trackCityListClicked } from '@/lib/analytics';
import trailerCafecito from '@/assets/trailer-cafecito.jpg';
import { AnimatedSection, AnimatedCard, AnimatedListItem } from '@/components/ui/animated';

const benefits = [
  { icon: ShieldCheck, text: 'Secure platform to sell or rent your assets' },
  { icon: CreditCard, text: 'Accept payments in-person or through our platform' },
  { icon: Shield, text: 'Spam & scam protection built in' },
  { icon: Users, text: 'Made by food truck owners, for food truck owners' },
];

const topCities = [
  { name: 'Houston', slug: 'houston' },
  { name: 'Los Angeles', slug: 'los-angeles' },
  { name: 'Dallas', slug: 'dallas' },
  { name: 'Phoenix', slug: 'phoenix' },
  { name: 'Atlanta', slug: 'atlanta' },
  { name: 'Miami', slug: 'miami' },
];

const SupplySection = () => {
  const navigate = useNavigate();
  const moduleRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  // Track module impression
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          trackCityListModuleViewed();
          hasTrackedView.current = true;
        }
      },
      { threshold: 0.5 }
    );

    if (moduleRef.current) {
      observer.observe(moduleRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCityClick = (city: { name: string; slug: string }) => {
    trackCityListClicked(city.slug);
    navigate(`/${city.slug}/list`);
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-muted/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div>
            <motion.div 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-amber-500/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4 border border-primary/20"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Heart className="h-4 w-4" />
              Built by a food truck owner & chef
            </motion.div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              A safe way to sell or rent your food truck.
            </h2>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 sm:mb-8">
              <motion.img 
                src={trailerCafecito} 
                alt="Coffee food trailer" 
                className="w-full sm:w-24 md:w-32 h-32 sm:h-24 md:h-32 rounded-xl object-cover shadow-lg flex-shrink-0 border-2 border-border"
                loading="lazy"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              />
              <p className="text-base sm:text-lg text-muted-foreground">
                We built VendiBook to support the food truck community. Whether you're selling your truck, renting it out, or looking for a vendor spot—we've got your back.
              </p>
            </div>

            {/* Benefits list */}
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {benefits.map((benefit, index) => (
                <AnimatedListItem key={index} index={index} className="flex items-center gap-3">
                  <motion.div 
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <benefit.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </motion.div>
                  <span className="text-sm sm:text-base text-foreground">{benefit.text}</span>
                </AnimatedListItem>
              ))}
            </ul>

            {/* Primary CTAs - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => navigate('/list')}
                className="gap-2 h-12 text-base w-full sm:w-auto"
              >
                List Your Asset
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => navigate('/how-it-works')}
                className="gap-2 h-12 text-base w-full sm:w-auto"
              >
                <BookOpen className="h-5 w-5" />
                Learn More
              </Button>
            </div>

            {/* City module - compact secondary routing with scroll */}
            <div ref={moduleRef} className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">List in top cities</p>
                <span className="text-xs text-muted-foreground">Early access →</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
                {topCities.map((city) => (
                  <motion.button
                    key={city.slug}
                    onClick={() => handleCityClick(city)}
                    className="flex-shrink-0 px-3 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors snap-start"
                    whileHover={shouldReduceMotion ? {} : { y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {city.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Tools callout */}
          <AnimatedCard className="rounded-2xl border-0 shadow-xl bg-card p-8 overflow-hidden relative group">
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="p-2.5 rounded-xl bg-primary shadow-md"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground">Free AI Tools for Hosts</h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Get an edge with our AI-powered tools—optimize pricing, find permits, and create listings that convert.
            </p>

            <ul className="space-y-3 mb-6">
              {[
                'PricePilot — Data-backed pricing suggestions',
                'PermitPath — Find permits for any city',
                'Listing Studio — Generate pro descriptions',
              ].map((tool, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start gap-2 text-sm text-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  </motion.div>
                  {tool}
                </motion.li>
              ))}
            </ul>

            <Button
              variant="dark-shine"
              onClick={() => navigate('/tools')}
              className="gap-2"
            >
              Explore Host Tools
              <ArrowRight className="h-4 w-4" />
            </Button>
          </AnimatedCard>
        </div>
      </div>
    </section>
  );
};

export default SupplySection;
