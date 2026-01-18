import { Shield, Lock, Users, Rocket, Heart, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const values = [
  {
    icon: Users,
    title: "Community",
    description: "We believe in the power of local entrepreneurs supporting each other. Every transaction strengthens our shared ecosystem."
  },
  {
    icon: Rocket,
    title: "Growth",
    description: "Your success is our mission. We provide the tools, resources, and connections you need to scale your business."
  },
  {
    icon: Heart,
    title: "Entrepreneurship",
    description: "This isn't the gig economy—this is the Entrepreneurship Empowerment Economy. We're here to help you build something that's truly yours."
  }
];

const securityFeatures = [
  "Secure escrow holds funds until booking completion",
  "Verified hosts and verified equipment",
  "Document verification for every transaction",
  "24/7 dispute resolution support",
  "Instant payouts to connected accounts"
];

const PaymentsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Shield className="h-4 w-4" />
            Secure Transactions
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Payments You Can Trust
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We ensure your equipment is in the best hands. Every transaction is protected, 
            every payment is secured, and every entrepreneur is empowered.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left: Payment Security */}
          <div className="relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
            
            <div className="relative flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">How Transactions Work</h3>
            </div>
            
            <p className="relative text-muted-foreground mb-8 leading-relaxed">
              When you book on VendiBook, your payment is held securely in escrow. 
              Funds are only released to the host after your booking is complete—giving 
              both parties complete peace of mind.
            </p>

            <ul className="relative space-y-4">
              {securityFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="relative mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-4">
                <img 
                  src="/stripe-badge.png" 
                  alt="Powered by Stripe" 
                  className="h-8 opacity-70"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  Payments processed securely by Stripe
                </span>
              </div>
            </div>
          </div>

          {/* Right: Values */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-8">Our Values</h3>
            <div className="space-y-6">
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="relative overflow-hidden flex gap-4 p-6 rounded-xl bg-card border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5"
                >
                  <div className="p-3 bg-gradient-to-br from-primary to-amber-500 rounded-xl h-fit shadow-md">
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg mb-2">{value.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 border border-primary/20">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Not the Gig Economy. The Empowerment Economy.
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            We're building a community where entrepreneurs own their success. Join thousands 
            of food truck operators, caterers, and culinary innovators who are growing their 
            businesses on their own terms.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              variant="gradient-premium" 
              size="lg" 
              onClick={() => navigate('/search')}
              className="px-8"
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/how-it-works')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentsSection;
