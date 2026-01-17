import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, Calendar, Shield, Sparkles, CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  { icon: Calendar, text: 'Set your own availability & pricing' },
  { icon: Shield, text: 'Verified listings get more bookings' },
  { icon: CreditCard, text: 'Instant payouts via Stripe Connect' },
  { icon: DollarSign, text: 'No upfront fees—only pay when you earn' },
];

const SupplySection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Earn with your truck, trailer, or equipment
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Turn idle assets into income. List your food truck, trailer, ghost kitchen, or vendor lot and reach thousands of entrepreneurs.
            </p>

            {/* Benefits list */}
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              variant="gradient-premium"
              size="lg"
              onClick={() => navigate('/host')}
              className="gap-2"
            >
              List Your Asset
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: AI Tools callout */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
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
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {tool}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              onClick={() => navigate('/tools')}
              className="gap-2"
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
