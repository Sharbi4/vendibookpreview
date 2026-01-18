import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Sparkles, CheckCircle2, CreditCard, ShieldCheck, Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCityListModuleViewed, trackCityListClicked } from '@/lib/analytics';

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
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
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
            <p className="text-lg text-muted-foreground mb-8">
              Now, accept payments in person or through our secure platform for protection.
            </p>

            {/* Benefits list */}
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <benefit.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-foreground">{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* Primary CTA */}
            <Button
              variant="gradient-premium"
              size="lg"
              onClick={() => navigate('/host')}
              className="gap-2 mb-6"
            >
              List Your Asset
              <ArrowRight className="h-5 w-5" />
            </Button>

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
          <div className="relative overflow-hidden bg-card rounded-2xl p-8 border-2 border-primary/30 shadow-lg bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
            
            <div className="relative flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-amber-500 shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Free AI Tools for Hosts</h3>
            </div>
            
            <p className="relative text-muted-foreground mb-6">
              Get an edge with our AI-powered tools—optimize pricing, find permits, and create listings that convert.
            </p>

            <ul className="relative space-y-3 mb-6">
              {[
                'PricePilot — Data-backed pricing suggestions',
                'PermitPath — Find permits for any city',
                'Listing Studio — Generate pro descriptions',
              ].map((tool, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {tool}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              onClick={() => navigate('/tools')}
              className="relative gap-2 border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-amber-500/10"
            >
              Explore Host Tools
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupplySection;
