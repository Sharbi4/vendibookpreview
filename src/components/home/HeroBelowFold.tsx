import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
 * Below-hero section (mobile-focused). Hosts the concierge prompt that used
 * to live in the hero, plus a compact trust strip + disclaimer.
 */
const HeroBelowFold = () => {
  const [conciergeOpen, setConciergeOpen] = useState(false);

  const handleConcierge = () => {
    trackLeadEvent('homepage_concierge_click', { route: '/', source: 'home_below_hero' });
    setConciergeOpen(true);
  };

  return (
    <section className="md:hidden px-5 pt-4 pb-8 bg-background">
      <div className="max-w-xl mx-auto">
        {/* Concierge card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            Not sure what you need yet?
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Tell Vendibook what you’re looking for and we’ll help point you toward the right
            trucks, trailers, or next steps.
          </p>
          <Button
            onClick={handleConcierge}
            size="lg"
            variant="glass-cta"
            className="rounded-full px-6 gap-2 w-full whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Tell Vendibook What You Need
          </Button>
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

      <TellVendibookModal
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        sourcePage="home_below_hero"
      />
    </section>
  );
};

export default HeroBelowFold;
