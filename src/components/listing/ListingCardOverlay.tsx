import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { trackLeadEvent } from '@/lib/leadTracking';
import TellVendibookModal from '@/components/lead/TellVendibookModal';
import type { Listing } from '@/types/listing';


interface ListingCardOverlayProps {
  open: boolean;
  onClose: () => void;
  listing: Listing;
}

const SALE_STEPS = [
  {
    n: '01',
    title: 'Confirm details',
    desc: 'Price, location, condition, and seller availability.',
  },
  {
    n: '02',
    title: 'Choose your path',
    desc: 'Pay through Vendibook, ask about financing, or coordinate next steps directly.',
  },
  {
    n: '03',
    title: 'Move forward safely',
    desc: 'Vendibook keeps your messages, documents, and payment steps organized in one place.',
  },
];

const RENT_STEPS = [
  {
    n: '01',
    title: 'Pick your dates',
    desc: 'Choose your rental window or tell us your general timeline.',
  },
  {
    n: '02',
    title: 'Confirm with the owner',
    desc: 'Vendibook helps confirm availability, pricing, deposits, and requirements.',
  },
  {
    n: '03',
    title: 'Request to book',
    desc: 'Move forward when the details look right for you.',
  },
];

const ListingCardOverlay = ({ open, onClose, listing }: ListingCardOverlayProps) => {
  const isSale = listing.mode === 'sale';
  const [leadOpen, setLeadOpen] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        trackLeadEvent('overlay_dismissed' as any, {
          listing_id: listing.id,
          overlay_type: isSale ? 'sale' : 'rent',
        });
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, listing.id, isSale]);

  const headline = isSale ? 'Start your purchase' : 'Check availability';
  const subhead = isSale
    ? 'Review the next steps before contacting the seller.'
    : 'Tell us when and where you need it before starting a booking request.';
  const steps = isSale ? SALE_STEPS : RENT_STEPS;
  const primaryLabel = isSale ? 'Start Purchase Request' : 'Request Dates';
  const finePrint = isSale
    ? 'No commitment. Final terms, availability, and transfer details are confirmed with the seller.'
    : 'No commitment. Dates, deposits, and final terms are confirmed before any payment is taken.';

  const handlePrimary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackLeadEvent(
      isSale ? ('purchase_request_started' as any) : ('rental_dates_request_started' as any),
      {
        listing_id: listing.id,
        category: listing.category,
        price: isSale ? listing.price_sale : listing.price_daily,
      },
    );
    setLeadOpen(true);
  };

  const handleBackdropClick = () => {
    trackLeadEvent('overlay_dismissed' as any, {
      listing_id: listing.id,
      overlay_type: isSale ? 'sale' : 'rent',
    });
    onClose();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={headline}
            onClick={stop}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[440px] mx-0 sm:mx-4 bg-[#111113] border border-white/10 rounded-t-2xl sm:rounded-2xl p-7 shadow-2xl"
            style={{ borderTopWidth: 2, borderTopColor: '#f97316' }}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />

            <h2 className="text-[22px] font-semibold text-white leading-tight">
              {headline}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#9ca3af]">{subhead}</p>

            <div className="my-5 h-px bg-white/[0.07]" />

            <div className="space-y-4">
              {steps.map((step, i) => (
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
                    <div className="text-[14px] font-semibold text-white leading-snug">
                      {step.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#6b7280] leading-relaxed">
                      {step.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="my-5 h-px bg-white/[0.07]" />

            <button
              onClick={handlePrimary}
              className="w-full h-12 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[14px] font-semibold transition-all duration-150 hover:scale-[1.01]"
            >
              {primaryLabel}
            </button>

            <Link
              to={`/listing/${listing.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-2.5 flex items-center justify-center w-full h-11 rounded-xl border border-white/15 hover:border-white/30 text-white text-[14px] font-medium transition-colors duration-150"
            >
              View Full Listing
            </Link>

            <p className="mt-3 text-center text-[11px] text-[#4b5563] leading-relaxed">
              {finePrint}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {typeof document !== 'undefined' && createPortal(overlay, document.body)}
      <TellVendibookModal
        open={leadOpen}
        onOpenChange={(o) => {
          setLeadOpen(o);
          if (!o) onClose();
        }}
        defaultIntent={isSale ? 'buy' : 'rent'}
        defaultCategory={
          listing.category === 'food_truck' || listing.category === 'food_trailer'
            ? listing.category
            : undefined
        }
        listingId={listing.id}
        sourcePage="listing_card_overlay"
      />
    </>
  );
};

export default ListingCardOverlay;
