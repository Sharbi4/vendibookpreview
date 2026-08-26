import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { X, MapPin } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';
import { RentalAvailabilityPicker } from '@/components/listing/RentalAvailabilityPicker';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types/listing';
import { formatRentalRate, resolveRentalRate, type ListingPriceInput } from '@/lib/listings/rentalPricing';

interface ListingCardOverlayProps {
  open: boolean;
  onClose: () => void;
  listing: Listing;
}

const SALE_STEPS = [
  { n: '01', title: 'Confirm details', desc: 'Price, location, condition, and seller availability.' },
  { n: '02', title: 'Choose your path', desc: 'Pay through Vendibook, ask about financing, or coordinate next steps directly.' },
  { n: '03', title: 'Move forward safely', desc: 'Vendibook keeps your messages, documents, and payment steps organized in one place.' },
];

const ListingCardOverlay = ({ open, onClose, listing }: ListingCardOverlayProps) => {
  const isSale = listing.mode === 'sale';
  const navigate = useNavigate();
  const anyListing = listing as any;

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        trackLeadEvent(
          isSale ? 'overlay_dismissed' : 'availability_overlay_dismissed',
          { listing_id: listing.id, source: 'listing_card_availability_overlay' },
        );
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, listing.id, isSale]);

  const handleBackdropClick = () => {
    trackLeadEvent(
      isSale ? 'overlay_dismissed' : 'availability_overlay_dismissed',
      { listing_id: listing.id, source: 'listing_card_availability_overlay' },
    );
    onClose();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleSalePrimary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackLeadEvent('purchase_request_started', {
      listing_id: listing.id,
      category: listing.category,
      price: listing.price_sale,
    });
    onClose();
    navigate(`/checkout/${listing.id}`);
  };

  // ─── Listing summary chip (rentals) ────────────────────────────────────
  const cover = anyListing.cover_image_url || anyListing.cover_image || (anyListing.images?.[0] ?? null);
  const locationParts = [anyListing.city, anyListing.state].filter(Boolean);
  const location = locationParts.join(', ');
  const overlayRate = !isSale ? resolveRentalRate(anyListing as ListingPriceInput) : null;
  const priceSummary = overlayRate ? formatRentalRate(overlayRate) : '';


  const headline = isSale ? 'Start your purchase' : 'View availability';
  const subhead = isSale
    ? 'Review the next steps before contacting the seller.'
    : 'Choose an available day or booking window before starting your request.';

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black/72 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={headline}
            onClick={stop}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full sm:max-w-[480px] mx-0 sm:mx-4 bg-[#111113] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto',
              'p-[22px] sm:p-7',
            )}
            style={{ borderTopWidth: 2, borderTopColor: '#f97316' }}
          >
            {/* Mobile handle */}
            <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                trackLeadEvent(
                  isSale ? 'overlay_dismissed' : 'availability_overlay_dismissed',
                  { listing_id: listing.id, source: 'listing_card_availability_overlay' },
                );
                onClose();
              }}
              aria-label="Close"
              className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-[22px] font-semibold text-white leading-tight pr-8">{headline}</h2>
            <p className="mt-1.5 text-[13px] text-white/60">{subhead}</p>

            {/* Listing summary row (rentals) */}
            {!isSale && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                {cover ? (
                  <img
                    src={cover}
                    alt={listing.title}
                    className="h-12 w-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-white/5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white truncate">{listing.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
                    {location && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#f97316]">For Rent</span>
                  {priceSummary && (
                    <span className="text-[12px] font-semibold text-white tabular-nums">{priceSummary}</span>
                  )}
                </div>
              </div>
            )}

            <div className="my-5 h-px bg-white/[0.07]" />

            {isSale ? (
              <>
                <div className="space-y-4">
                  {SALE_STEPS.map((step, i) => (
                    <motion.div
                      key={step.n}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.06, duration: 0.25, ease: 'easeOut' }}
                      className="flex gap-3"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#f97316] pt-0.5 w-7 shrink-0">
                        {step.n}
                      </span>
                      <div>
                        <div className="text-[14px] font-semibold text-white leading-snug">{step.title}</div>
                        <div className="mt-0.5 text-[12px] text-white/50 leading-relaxed">{step.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="my-5 h-px bg-white/[0.07]" />

                <button
                  onClick={handleSalePrimary}
                  className="w-full h-12 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[14px] font-semibold transition-all duration-150 hover:scale-[1.01]"
                >
                  Start Purchase Request
                </button>
              </>
            ) : (
              <RentalAvailabilityPicker
                listingId={listing.id}
                listingTitle={listing.title}
                category={listing.category}
                priceHourly={(listing as any).price_hourly}
                priceDaily={listing.price_daily}
                priceWeekly={listing.price_weekly}
                priceMonthly={(listing as any).price_monthly}
                instantBook={Boolean((listing as any).instant_book)}
                totalSlots={Number(anyListing.total_slots) > 0 ? Number(anyListing.total_slots) : 1}
                slotNames={anyListing.slot_names || null}
                availableFrom={anyListing.available_from}
                availableTo={anyListing.available_to}
                source="listing_card_availability_overlay"
                onClose={onClose}
              />
            )}

            {/* Secondary CTA: View Full Listing */}
            <Link
              to={`/listing/${listing.id}`}
              onClick={(e) => {
                e.stopPropagation();
                trackLeadEvent(
                  'listing_overlay_view_full_listing',
                  { listing_id: listing.id, source: 'listing_card_availability_overlay' },
                );
              }}
              className="mt-3 flex items-center justify-center w-full h-12 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white text-[14px] font-semibold transition-colors"
            >
              Open full listing
            </Link>

            <p className="mt-3 text-center text-[11px] text-white/30 leading-relaxed">
              {isSale
                ? 'No commitment. Final terms, availability, and transfer details are confirmed with the seller.'
                : 'No commitment. Your card is authorized at checkout and only charged if the host approves.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
};

export default ListingCardOverlay;
