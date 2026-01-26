import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Sparkles, CheckCircle2, CreditCard, ShieldCheck, Users, Heart, BookOpen } from 'lucide-react';
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
];

const SupplySection = () => {
  const navigate = useNavigate();
  const moduleRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

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
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Heart className="h-4 w-4" />
              Built by a food truck owner & chef
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              A safe way to sell or rent your food truck.
            </h2>
            <div className="flex items-start gap-4 mb-8">
              <img 
                src={trailerCafecito} 
                alt="Coffee food trailer" 
                className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover shadow-lg flex-shrink-0 border-2 border-border"
              />
              <p className="text-lg text-muted-foreground">
                We built VendiBook to support the food truck community. Whether you're selling your truck, renting it out, or looking for a vendor spot—we've got your back.
              </p>
            </div>

            {/* Benefits list */}
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <AnimatedListItem key={index} index={index} className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <benefit.icon className="h-5 w-5 text-primary-foreground" />
                  </motion.div>
                  <span className="text-foreground">{benefit.text}</span>
                </AnimatedListItem>
              ))}
            </ul>

            {/* Primary CTAs */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => navigate('/list')}
                className="gap-2"
              >
                List Your Asset
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => navigate('/how-it-works')}
                className="gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Learn More
              </Button>
            </div>

            {/* City module - compact secondary routing */}
            <div ref={moduleRef} className="pt-4 border-t border-border/50">
              <p className="text-sm font-medium text-foreground mb-2">List in top cities</p>
              <p className="text-xs text-muted-foreground mb-3">
                Get early visibility in these launch markets.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {topCities.map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => handleCityClick(city)}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
                  >
                    {city.name}
                  </button>
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
