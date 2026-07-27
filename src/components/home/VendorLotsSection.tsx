import { MapPin, DollarSign, Users, ArrowRight, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const benefits = [
  {
    icon: DollarSign,
    title: "Earn Passive Income",
    description: "Turn your unused space into a revenue stream. Hosts earn an average of $1,500/month per spot."
  },
  {
    icon: Users,
    title: "Support Local Entrepreneurs",
    description: "Help food truck operators and mobile businesses find the perfect location to serve their customers."
  },
  {
    icon: Building2,
    title: "Flexible Terms",
    description: "Daily, weekly, or monthly rentals. You set the availability and pricing that works for you."
  }
];

const features = [
  "Verified vendors with insurance documentation",
  "Secure payments held in payment protection",
  "Easy scheduling and calendar management",
  "24/7 customer support",
  "No upfront costs—list for free"
];

const VendorLotsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-accent/10 via-background to-foreground/3 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-foreground rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
            <MapPin className="h-4 w-4" />
            Vendor Space Owners
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Got a Space? List It.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Own a parking lot, vacant space, or commercial property? Help food trucks, trailers, 
            and mobile businesses find their next spot—and earn money doing it.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Benefits Cards */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="relative overflow-hidden flex gap-4 p-6 bg-card rounded-xl border-2 border-border hover:border-foreground/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-3 bg-foreground rounded-xl h-fit flex-shrink-0 shadow-md">
                  <benefit.icon className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: CTA Card */}
          <div className="relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 border-2 border-border shadow-xl">
            {/* Animated background */}
            <div className="absolute inset-0 bg-foreground/[0.02] animate-pulse" />
            
            <h3 className="relative text-2xl font-bold text-foreground mb-4">
              Start Hosting Today
            </h3>
            <p className="relative text-muted-foreground mb-6">
              Join hundreds of lot owners who are already earning with VendiBook. 
              Listing is free—you only pay a small commission when you get booked.
            </p>

            <ul className="relative space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="relative space-y-4">
              <Button 
                variant="gradient-premium" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/list')}
              >
                List Your Space
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full border-border hover:border-foreground/30 hover:bg-foreground/5"
                onClick={() => navigate('/vendor-spaces')}
              >
                Browse Vendor Spaces
              </Button>
            </div>

            <p className="relative text-xs text-muted-foreground text-center mt-6">
              No credit card required. Get started in under 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorLotsSection;
