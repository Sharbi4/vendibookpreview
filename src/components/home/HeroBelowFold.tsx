import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import { Info, Crown } from 'lucide-react';

const TRUST_BITS = [
  'Secure payments',
  'Owner profiles',
  'Document collection',
  'Booking requests',
  'Serious buyers'];

/**
 * Below-hero section (mobile-focused). Sell-focused soft conversion +
 * compact trust strip + disclaimer.
 */
const HeroBelowFold = () => {
  const handleClick = () => {
    trackLeadEvent('homepage_concierge_click', {
      route: '/',
      source: 'home_below_hero',
      destination: '/sell',
    });
  };

  return (
    <section className="px-5 pt-4 pb-8 bg-background">
      <div className="max-w-xl mx-auto">
        {/* Learn about selling card */}

        <div className="glass-premium rounded-2xl p-5 text-center">
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            Learn about selling on Vendibook{' '}
            <span className="text-[#FF6B00]">(it's free!)</span>
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            See how owners list food trucks, trailers, and concession units — pricing
            guidance, serious buyers, and payouts handled for you.
          </p>
          <Button
            asChild
            size="lg"
            variant="glass-cta"
            className="rounded-full px-6 gap-2 w-full whitespace-nowrap"
            onClick={handleClick}
          >
            <Link to="/sell">Learn About Selling</Link>
          </Button>
        </div>

        {/* Compact quick links */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            How Vendibook Works
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-primary transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Pricing & Pro
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground/80">
          {TRUST_BITS.map((bit, i) => (
            <span key={bit} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-foreground/20">·</span>}
              <span>{bit}</span>
            </span>
          ))}
        </div>

        <p className="mt-2 text-center text-[11px] text-foreground/40 leading-relaxed">
          Free to browse. No commitment. Listings are subject to owner availability, approval,
          verification status, and final terms.
        </p>
      </div>
    </section>
  );
};

export default HeroBelowFold;
