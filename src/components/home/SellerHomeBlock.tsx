import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Homepage "Rent out your mobile kitchen" block. Crawlable text + internal
 * links into the host/rental funnel. Lives below the listing rows.
 * Light cream card for contrast against the dark editorial page.
 */
const SellerHomeBlock = () => (
  <section className="container py-12 md:py-16">
    <div className="sale-light rounded-3xl bg-background p-8 md:p-12 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]">
      <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-center">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            For owners
          </p>
          <h2 className="text-2xl md:text-[34px] font-semibold tracking-tight text-foreground leading-[1.15]">
            Not selling? Rent out your mobile kitchen.
          </h2>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            Bookings, documents, and messaging in one place. You choose who cooks
            in your kitchen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Button asChild size="lg" variant="cta" className="rounded-2xl">
            <Link to="/become-a-host">
              List your kitchen <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-2xl border-border bg-transparent text-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <Link to="/how-it-works-host">How hosting works</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default SellerHomeBlock;
