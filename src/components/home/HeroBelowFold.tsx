import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TellVendibookModal } from '@/components/lead/TellVendibookModal';
import { trackLeadEvent } from '@/lib/leadTracking';

const TRUST_BITS = [
  'Secure payments',
  'Owner profiles',
  'Document collection',
  'Booking requests',
  'Concierge help',
];

/**
 * Mobile-only secondary actions + trust strip that used to live in the hero.
 * Hidden on md+ where the hero itself still shows these.
 */
const HeroBelowFold = () => {
  const navigate = useNavigate();
  const [conciergeOpen, setConciergeOpen] = useState(false);

  const handlePrimary = () => {
    trackLeadEvent('homepage_primary_cta_click', { route: '/', source: 'home_below_hero' });
    setConciergeOpen(true);
  };

  const handleBrowse = () => {
    trackLeadEvent('homepage_browse_click', { route: '/', source: 'home_below_hero' });
    navigate('/search?category=food_truck%2Cfood_trailer');
  };

  return (
    <section className="md:hidden px-5 pt-2 pb-8 bg-background">
      <div className="max-w-xl mx-auto flex flex-col gap-3">
        <Button
          onClick={handlePrimary}
          size="lg"
          variant="dark-shine"
          className="rounded-full px-6 gap-2 w-full whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          Tell Vendibook What You Need
        </Button>
        <Button
          onClick={handleBrowse}
          size="lg"
          variant="glass-cta"
          className="rounded-full px-6 gap-2 w-full whitespace-nowrap"
        >
          <Search className="w-4 h-4" />
          Browse Trucks &amp; Trailers
        </Button>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground/80">
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

      <TellVendibookModal
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        sourcePage="home_below_hero"
      />
    </section>
  );
};

export default HeroBelowFold;
