import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import affirmLogo from '@/assets/affirm-logo.png';
import afterpayLogo from '@/assets/afterpay-logo.jpg';

const PaymentsBanner = () => {
  return (
    <section className="py-10 bg-gradient-to-r from-muted/50 via-primary/5 to-muted/50 border-y border-border/50 relative overflow-hidden">
      {/* Subtle decorative element */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" aria-hidden="true" />
      
      <div className="container relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <div className="text-center md:text-left">
            <p className="text-lg md:text-xl font-bold text-foreground mb-1">
              Now accepting flexible payments
            </p>
            <p className="text-sm text-muted-foreground">
              Let buyers pay over time — you get paid upfront
            </p>
          </div>
          <div className="flex items-center gap-8">
            <img 
              src={affirmLogo} 
              alt="Affirm" 
              width={80}
              height={28}
              className="h-7 md:h-9 w-auto object-contain dark:invert opacity-90 hover:opacity-100 transition-opacity" 
            />
            <img 
              src={afterpayLogo} 
              alt="Afterpay" 
              width={70}
              height={24}
              className="h-6 md:h-7 w-auto object-contain dark:invert opacity-90 hover:opacity-100 transition-opacity" 
            />
          </div>
          <Button variant="dark-shine" size="sm" className="gap-2 px-6" asChild>
            <Link to="/payments">
              Learn more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PaymentsBanner;
