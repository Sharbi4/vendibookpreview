import { Link } from 'react-router-dom';
import { Calendar, DollarSign, ArrowRight, Building2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PathCardProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  href: string;
  ctaText: string;
  variant: 'rent' | 'sell';
}

const PathCard = ({ title, subtitle, description, features, icon: Icon, href, ctaText, variant }: PathCardProps) => (
  <Link to={href} className="block h-full">
    <Card className="border border-border shadow-md hover:shadow-lg transition-all group cursor-pointer h-full bg-card">
      <CardContent className="p-6 md:p-8 flex flex-col h-full">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-lg ${
          variant === 'rent' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-emerald-500 text-white'
        }`}>
          <Icon className="h-7 w-7" />
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>

        {/* Description */}
        <p className="text-muted-foreground mb-6 flex-1">{description}</p>

        {/* Features List */}
        <ul className="space-y-2.5 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2.5 text-sm text-foreground">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                variant === 'rent' ? 'bg-primary/10' : 'bg-emerald-500/10'
              }`}>
                <Check className={`h-3 w-3 ${variant === 'rent' ? 'text-primary' : 'text-emerald-600'}`} />
              </div>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button 
          variant={variant === 'rent' ? 'dark-shine' : 'default'} 
          className={`w-full ${variant === 'sell' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
        >
          {ctaText}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  </Link>
);

const HostOnboardingWizard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="border border-border shadow-md bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <Building2 className="h-4 w-4" />
            Set up your Vendor Profile
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Welcome to the professional side of Vendibook.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Choose how you want to operate. You can always add more listing types later.
          </p>
        </CardContent>
      </Card>

      {/* Two-Path Selection - Corporate Style */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <PathCard
          title="Rental Fleet"
          subtitle="Generate recurring revenue"
          description="Manage reservations for food trucks, trailers, or commercial kitchens. Set your own rates and availability."
          features={[
            'Recurring revenue tools',
            'Availability calendar',
            'Automated contracts',
          ]}
          icon={Calendar}
          href="/list?mode=rent"
          ctaText="Start Rental Business"
          variant="rent"
        />
        <PathCard
          title="Asset Sales"
          subtitle="Sell to verified buyers"
          description="List your equipment for sale to thousands of verified buyers. Get fair market value with secure payments."
          features={[
            'Escrow payment protection',
            'Verified buyer network',
            'Nationwide freight options',
          ]}
          icon={DollarSign}
          href="/list?mode=sale"
          ctaText="List Item for Sale"
          variant="sell"
        />
      </div>
    </div>
  );
};

export default HostOnboardingWizard;
