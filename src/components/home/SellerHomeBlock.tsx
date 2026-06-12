import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Homepage "Rent out your mobile kitchen" block. Crawlable text + internal
 * links into the host/rental funnel. Lives below the listing rows.
 */
const SellerHomeBlock = () => (
  <section className="container py-10 md:py-14">
    <div className="glass-premium relative overflow-hidden rounded-3xl p-8 md:p-12">
      <div className="absolute inset-0 pointer-events-none opacity-50 [background:radial-gradient(40%_60%_at_90%_0%,hsl(var(--primary)/0.10),transparent_70%)]" />
      <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Not selling? Earn by renting out your mobile kitchen.
          </h2>
          <p className="text-muted-foreground max-w-xl">
            We handle the bookings, payments, and document review. 
            You decide who steps into your kitchen. Turn downtime into income 
            without the headache of managing it all yourself.
          </p>
        </div>
        <div className="flex flex-wrap md:justify-end gap-3">
          <Button asChild size="lg" variant="dark-shine">
            <Link to="/become-a-host">
              List Your Kitchen for Rent <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-foreground/30 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground">
            <Link to="/how-it-works-host">See How Hosting Works</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default SellerHomeBlock;
