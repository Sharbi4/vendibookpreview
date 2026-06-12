import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Homepage "Have a food truck to sell?" block. Crawlable text + internal
 * links into the seller funnel. Lives between hero and listings.
 */
const SellerHomeBlock = () => (
  <section className="container py-10 md:py-14">
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-background p-8 md:p-12">
      <div className="absolute inset-0 pointer-events-none opacity-50 [background:radial-gradient(40%_60%_at_90%_0%,hsl(var(--primary)/0.10),transparent_70%)]" />
      <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <DollarSign className="h-3.5 w-3.5 text-primary" /> For owners
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Have a food truck or trailer to sell?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            List it free on Vendibook and reach buyers, renters, and food entrepreneurs actively
            shopping for mobile kitchens. Accept offers, message buyers, and use optional secure
            transaction tools when you're ready to close.
          </p>
        </div>
        <div className="flex flex-wrap md:justify-end gap-3">
          <Button asChild size="lg" variant="dark-shine">
            <Link to="/sell-food-truck">
              List Your Food Truck Free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-foreground/30 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground">
            <Link to="/how-it-works-seller">Learn How Selling Works</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default SellerHomeBlock;
