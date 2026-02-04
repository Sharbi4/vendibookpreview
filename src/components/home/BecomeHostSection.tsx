import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import supplyImage from '@/assets/supply-food-truck.jpg';

const BecomeHostSection = () => {
  return (
    <section className="py-16 md:py-24 bg-foreground text-background">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="order-2 lg:order-1">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary rounded-full mb-6">
              Become a Host
            </span>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Your idle truck is{' '}
              <span className="text-primary">losing you money.</span>
            </h2>
            
            <p className="text-lg text-background/70 mb-8 max-w-lg">
              Join thousands of owners earning $2,500+/mo by renting their assets on Vendibook. We handle the payments, contracts, and insurance verification.
            </p>

            {/* Benefits List */}
            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <span className="text-background/80">Earn up to $3,000/month per asset</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="text-background/80">$1M liability protection included</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <span className="text-background/80">List in under 10 minutes</span>
              </div>
            </div>

            <Button 
              asChild 
              size="lg" 
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Link to="/list">
                List Your Asset
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2 relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={supplyImage}
                alt="Food truck owner"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating earnings card */}
            <div className="absolute -bottom-4 -left-4 md:bottom-6 md:-left-6 bg-background text-foreground p-4 rounded-xl shadow-xl">
              <p className="text-xs text-muted-foreground mb-1">Average monthly earnings</p>
              <p className="text-2xl font-bold text-primary">$2,847</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BecomeHostSection;
