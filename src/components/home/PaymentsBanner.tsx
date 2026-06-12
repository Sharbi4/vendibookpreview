import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AffirmWordmark, AfterpayWordmark } from '@/components/home/hero/panels/BrandWordmarks';

const PaymentsBanner = () => {
  return (
    <section className="py-8 border-y border-border/30 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.015] to-transparent pointer-events-none" />
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            <span className="font-medium text-foreground">Buy now, pay later</span> — finance your food truck or trailer with
          </p>
          <div className="flex items-center gap-6 rounded-full bg-white/95 px-5 py-2.5 shadow-sm ring-1 ring-border/40">
            <AffirmWordmark className="h-5 w-auto opacity-90" />
            <span className="h-5 w-px bg-neutral-300" />
            <AfterpayWordmark className="h-4 w-auto opacity-90" />
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
