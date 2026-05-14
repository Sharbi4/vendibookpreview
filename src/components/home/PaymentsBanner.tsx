import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import affirmLogo from '@/assets/affirm-logo.png';
import afterpayLogo from '@/assets/afterpay-logo.png';

const PaymentsBanner = () => {
  return (
    <section className="py-8 border-y border-border/50">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            <span className="font-medium text-foreground">Buy now, pay later</span> — finance your food truck or trailer with
          </p>
          <div className="flex items-center gap-6">
            <img 
              src={affirmLogo} 
              alt="Affirm" 
              width={1286}
              height={513}
              className="h-6 w-auto object-contain invert brightness-0 dark:invert dark:brightness-100 opacity-60 hover:opacity-90 transition-opacity" 
            />
            <img 
              src={afterpayLogo} 
              alt="Afterpay" 
              width={1920}
              height={668}
              className="h-5 w-auto object-contain invert brightness-0 dark:invert dark:brightness-100 opacity-60 hover:opacity-90 transition-opacity" 
            />
          </div>
          <Link 
            to="/payments" 
            className="text-sm text-foreground/60 hover:text-foreground font-medium flex items-center gap-1 transition-colors"
          >
            Learn more about financing
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PaymentsBanner;
