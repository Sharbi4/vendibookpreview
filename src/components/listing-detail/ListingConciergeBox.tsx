import { useState } from 'react';
import { CalendarCheck, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TellVendibookModal, type LeadCategory } from '@/components/lead/TellVendibookModal';
import { trackLeadEvent } from '@/lib/leadTracking';
import type { ListingCategory } from '@/types/listing';

interface ListingConciergeBoxProps {
  listingId: string;
  listingTitle: string;
  city?: string;
  category?: ListingCategory;
  isOwner?: boolean;
}

const toLeadCategory = (c?: ListingCategory): LeadCategory | undefined => {
  if (!c) return undefined;
  const s = String(c);
  if (s === 'food_truck') return 'food_truck';
  if (s === 'food_trailer') return 'food_trailer';
  if (s === 'ghost_kitchen' || s.includes('kitchen')) return 'commercial_kitchen';
  if (s === 'vendor_lot' || s === 'vendor_space') return 'vendor_space';
  return undefined;
};

/**
 * Above-the-fold soft-conversion box on listing pages.
 * Offers low-friction "Check Availability" + "Ask Vendibook for Help" actions.
 */
export const ListingConciergeBox = ({
  listingId,
  listingTitle,
  city,
  category,
  isOwner,
}: ListingConciergeBoxProps) => {
  const [leadOpen, setLeadOpen] = useState(false);

  if (isOwner) return null;

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101013] to-[#0a0a0c] p-5 sm:p-6"
        style={{
          boxShadow:
            '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
        }}
      >
        {/* Decorative warm glow */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,81,36,0.10), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        <div className="relative flex items-start gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/90 mb-1">
              Vendibook Concierge
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              Want help with this listing?
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Vendibook can help confirm availability, answer basic questions, and coordinate
              next steps with the host.
            </p>
          </div>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="dark-shine"
            size="lg"
            className="flex-1 gap-2 rounded-full"
            onClick={() => {
              trackLeadEvent('check_availability_click', {
                listing_id: listingId,
                city,
                category,
                source: 'listing_concierge_box',
              });
              setLeadOpen(true);
            }}
          >
            <CalendarCheck className="w-4 h-4" />
            Check Availability
          </Button>
          <Button
            variant="glass-cta"
            size="lg"
            className="flex-1 gap-2 rounded-full"
            onClick={() => setLeadOpen(true)}
          >
            <Sparkles className="w-4 h-4" />
            Ask Vendibook for Help
          </Button>
        </div>

        <div className="relative flex items-center gap-1.5 text-[11px] text-foreground/55 mt-3">
          <ShieldCheck className="w-3 h-3" />
          Replies within 1 business hour · No commitment
        </div>
      </div>

      <TellVendibookModal
        open={leadOpen}
        onOpenChange={setLeadOpen}
        defaultIntent="rent"
        defaultCategory={toLeadCategory(category)}
        defaultCity={city}
        listingId={listingId}
        sourcePage={`listing:${listingTitle}`}
      />
    </>
  );
};

export default ListingConciergeBox;
