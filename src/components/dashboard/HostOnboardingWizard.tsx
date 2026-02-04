import { Link } from 'react-router-dom';
import { Calendar, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PathCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  ctaText: string;
  variant: 'rent' | 'sell';
}

const PathCard = ({ title, description, icon: Icon, href, ctaText, variant }: PathCardProps) => (
  <Link to={href} className="block h-full">
    <Card className="border-0 shadow-xl hover:shadow-2xl transition-all group cursor-pointer h-full">
      <CardContent className="p-6 md:p-8 flex flex-col h-full">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-lg ${
          variant === 'rent' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-emerald-500 text-white'
        }`}>
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 flex-1">{description}</p>
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
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <Sparkles className="h-4 w-4" />
            Welcome
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            What would you like to list?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You're all set up. Choose how you want to start earning with your food truck, trailer, or kitchen.
          </p>
        </CardContent>
      </Card>

      {/* Two-Path Selection */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <PathCard
          title="Rent Out an Asset"
          description="Generate recurring income by renting your truck, trailer, or kitchen to other vendors. Set your own rates and availability."
          icon={Calendar}
          href="/list?mode=rent"
          ctaText="Start Listing"
          variant="rent"
        />
        <PathCard
          title="Sell an Asset"
          description="List your equipment for sale to thousands of verified buyers. Get fair market value and sell on your timeline."
          icon={DollarSign}
          href="/list?mode=sale"
          ctaText="Sell Now"
          variant="sell"
        />
      </div>
    </div>
  );
};

export default HostOnboardingWizard;
