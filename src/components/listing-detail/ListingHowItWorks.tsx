/**
 * ListingHowItWorks
 * -----------------
 * Contextual "What happens next?" guidance for a listing detail page.
 * Renders an inline compact preview + on-demand modal walkthrough,
 * with copy driven entirely by the listing's actual configuration.
 *
 * INFORMATIONAL ONLY — it never mutates listing/transaction state.
 * The final CTA is a scroll-to-widget nudge, not a checkout trigger.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  HandCoins,
  HelpCircle,
  MessageCircle,
  Package,
  ShieldAlert,
  Truck,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ---------- Types & variant logic ----------

type ListingLike = {
  id: string;
  mode: 'rent' | 'sale' | string | null | undefined;
  category?: string | null;
  instant_book?: boolean | null;
  accept_card_payment?: boolean | null;
  accept_cash_payment?: boolean | null;
  fulfillment_type?: string | null;
};

export type WalkthroughVariant =
  | 'sale_card'
  | 'sale_pay_in_person'
  | 'rent_instant'
  | 'rent_request';

type FulfillmentContext = 'pickup' | 'delivery' | 'pickup_or_delivery' | 'on_site_kitchen' | 'on_site_lot';

export interface WalkthroughStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface WalkthroughConfig {
  variant: WalkthroughVariant;
  fulfillment: FulfillmentContext;
  heading: string;
  subhead: string;
  cta: string;
  modalTitle: string;
  inlineSteps: WalkthroughStep[];
  fullSteps: WalkthroughStep[];
  trustPoints: string[];
  finalCtaLabel: string;
  finalCtaTargetId: string;
}

/**
 * Pure resolver — pick the variant + fulfillment context from listing fields.
 * Kept exported so it can be unit-tested independently of React.
 */
export function resolveWalkthrough(listing: ListingLike): WalkthroughConfig {
  const isSale = listing.mode === 'sale';
  const isRental = listing.mode === 'rent';

  const category = (listing.category || '').toLowerCase();
  const onSiteKitchen = category === 'ghost_kitchen';
  const onSiteLot = category === 'vendor_lot' || category === 'vendor_space';
  const fulfillmentType = (listing.fulfillment_type || '').toLowerCase();

  const hasDelivery = fulfillmentType.includes('deliver') || fulfillmentType === 'both';
  const hasPickup = fulfillmentType.includes('pickup') || fulfillmentType === 'both' || fulfillmentType === '';

  const fulfillment: FulfillmentContext = onSiteKitchen
    ? 'on_site_kitchen'
    : onSiteLot
      ? 'on_site_lot'
      : hasDelivery && hasPickup && (fulfillmentType === 'both' || (fulfillmentType.includes('deliver') && fulfillmentType.includes('pickup')))
        ? 'pickup_or_delivery'
        : hasDelivery
          ? 'delivery'
          : 'pickup';

  // Sale variants
  if (isSale) {
    const acceptsCard = listing.accept_card_payment !== false; // default to card if flag absent
    return acceptsCard ? buildSaleCard(fulfillment) : buildSalePayInPerson(fulfillment);
  }

  // Rental variants (default when mode is missing or unusual)
  if (isRental || !isSale) {
    return listing.instant_book
      ? buildRentInstant(fulfillment)
      : buildRentRequest(fulfillment);
  }

  return buildRentRequest(fulfillment);
}

// ---------- Fulfillment copy helpers ----------

function fulfillmentStepForRental(f: FulfillmentContext): WalkthroughStep {
  switch (f) {
    case 'on_site_kitchen':
      return {
        icon: Warehouse,
        title: 'Get access instructions',
        description:
          'The host will send you access details, hours of operation, and any on-site rules for the kitchen or commissary.',
      };
    case 'on_site_lot':
      return {
        icon: Warehouse,
        title: 'Get arrival and setup instructions',
        description:
          'The host will send you arrival times, setup rules, utility hookups if any, and where to park on the lot.',
      };
    case 'delivery':
      return {
        icon: Truck,
        title: 'Coordinate delivery',
        description:
          'Use Messages to confirm the delivery window and drop-off spot. The host will meet you as agreed.',
      };
    case 'pickup_or_delivery':
      return {
        icon: Truck,
        title: 'Choose pickup or delivery',
        description:
          'This host offers both pickup and delivery. Use Messages to pick one, then confirm the time and place. The full pickup address unlocks once the booking is confirmed.',
      };
    case 'pickup':
    default:
      return {
        icon: Package,
        title: 'Coordinate pickup',
        description:
          'The full pickup address unlocks once the booking is confirmed. Message the host to lock in the exact time.',
      };
  }
}

function fulfillmentStepForSale(f: FulfillmentContext): WalkthroughStep {
  if (f === 'delivery') {
    return {
      icon: Truck,
      title: 'Coordinate delivery or freight',
      description:
        'Arrange delivery, local drop-off, or freight in Messages. If freight is offered, it is calculated at $4.50/mile.',
    };
  }
  return {
    icon: Package,
    title: 'Coordinate pickup',
    description:
      'The seller\'s full address unlocks after purchase. Confirm the pickup time in Messages.',
  };
}

// ---------- Variant builders ----------

function buildSaleCard(fulfillment: FulfillmentContext): WalkthroughConfig {
  const inline: WalkthroughStep[] = [
    { icon: MessageCircle, title: 'Review the listing', description: '' },
    { icon: CreditCard, title: 'Pay securely with card', description: '' },
    { icon: Truck, title: 'Coordinate pickup or delivery', description: '' },
    { icon: CheckCircle2, title: 'Confirm the item, seller gets paid', description: '' },
  ];
  const full: WalkthroughStep[] = [
    {
      icon: MessageCircle,
      title: 'Review the listing and contact the seller',
      description:
        'Look at photos, specs, condition notes, and included equipment. Ask the seller about ownership, title, VIN/serial, inspection, and permits before you buy.',
    },
    {
      icon: CreditCard,
      title: 'Start the purchase and pay with card',
      description:
        'Checkout runs through Stripe. Your card is charged when you place the order. Vendibook holds the funds until you confirm the item.',
    },
    fulfillmentStepForSale(fulfillment),
    {
      icon: CheckCircle2,
      title: 'Confirm the item, seller gets paid',
      description:
        'You have a confirmation window to inspect the item. Funds release to the seller 25 days after your confirmation. Something wrong? Open a dispute from your order page.',
    },
  ];
  return {
    variant: 'sale_card',
    fulfillment,
    heading: 'Buying on Vendibook',
    subhead: 'Review the steps before you contact the seller or begin your purchase.',
    cta: 'See the Purchase Steps',
    modalTitle: 'What happens after you buy',
    inlineSteps: inline,
    fullSteps: full,
    trustPoints: [
      'Inspect the item in person where possible',
      'Confirm ownership and title information',
      'Keep transaction messages on Vendibook',
      'Report suspicious behavior to Vendibook',
    ],
    finalCtaLabel: 'Continue to purchase',
    finalCtaTargetId: 'booking-widget',
  };
}

function buildSalePayInPerson(fulfillment: FulfillmentContext): WalkthroughConfig {
  const inline: WalkthroughStep[] = [
    { icon: MessageCircle, title: 'Review and contact the seller', description: '' },
    { icon: ClipboardCheck, title: 'Create your Vendibook purchase', description: '' },
    { icon: HandCoins, title: 'Pay the seller directly', description: '' },
    { icon: CheckCircle2, title: 'Confirm payment and item receipt', description: '' },
  ];
  const full: WalkthroughStep[] = [
    {
      icon: MessageCircle,
      title: 'Contact the seller',
      description:
        'Introduce yourself and lock in a meeting time and place. Vendibook Messages keeps the conversation on-record.',
    },
    {
      icon: ClipboardCheck,
      title: 'Create your Vendibook purchase',
      description:
        'Start the purchase from the listing page so both you and the seller have a shared record of the transaction.',
    },
    {
      icon: HandCoins,
      title: 'Meet, inspect, and pay directly',
      description:
        'You pay the seller in person — cash, check, or whatever you both agree on. Vendibook does not process the payment and does not take a fee on Pay-in-Person sales.',
    },
    {
      icon: CheckCircle2,
      title: 'Confirm payment and item receipt',
      description:
        'Both sides confirm the sale in the app so the listing closes and reviews unlock. Meet in a safe public spot and verify the item before handing over money.',
    },
  ];
  return {
    variant: 'sale_pay_in_person',
    fulfillment,
    heading: 'Paying the Seller in Person',
    subhead: 'Vendibook tracks the transaction, but payment is completed directly with the seller.',
    cta: 'See How Pay in Person Works',
    modalTitle: 'How Pay-in-Person purchases work',
    inlineSteps: inline,
    fullSteps: full,
    trustPoints: [
      'Meet in a safe, public spot — bring someone with you',
      'Inspect the item thoroughly before paying',
      'Confirm ownership and title before money changes hands',
      'Keep the conversation in Vendibook Messages',
    ],
    finalCtaLabel: 'Contact the seller',
    finalCtaTargetId: 'booking-widget',
  };
}

function buildRentInstant(fulfillment: FulfillmentContext): WalkthroughConfig {
  const fulfillmentStep = fulfillmentStepForRental(fulfillment);
  const inline: WalkthroughStep[] = [
    { icon: ClipboardCheck, title: 'Choose available dates', description: '' },
    { icon: CreditCard, title: 'Review the total and pay', description: '' },
    { icon: CheckCircle2, title: 'Booking confirmed instantly', description: '' },
    { icon: fulfillmentStep.icon, title: fulfillmentStep.title, description: '' },
  ];
  const full: WalkthroughStep[] = [
    {
      icon: ClipboardCheck,
      title: 'Pick your dates or hours',
      description:
        'Availability is live. If the calendar shows it open, you can book it. Review the full price breakdown — rate, service fee, and total — before you confirm.',
    },
    {
      icon: CreditCard,
      title: 'Pay and confirm instantly',
      description:
        'Your card is charged immediately. The booking is confirmed the moment payment clears — no host approval wait.',
    },
    fulfillmentStep,
    {
      icon: CheckCircle2,
      title: 'Use, return, and review',
      description:
        'Return on schedule. The host is paid 24 hours after your rental starts. Leave a review to help the next renter.',
    },
  ];
  return {
    variant: 'rent_instant',
    fulfillment,
    heading: 'Book This Listing Instantly',
    subhead: 'Review the steps, dates, payment timing, and what happens after booking.',
    cta: 'See the Booking Steps',
    modalTitle: 'How Instant Book works',
    inlineSteps: inline,
    fullSteps: full,
    trustPoints: [
      'Review all rental terms before you confirm',
      'Confirm any documents the host requires',
      'Document condition before use',
      'Report problems through the booking page',
    ],
    finalCtaLabel: 'Book available dates',
    finalCtaTargetId: 'booking-widget',
  };
}

function buildRentRequest(fulfillment: FulfillmentContext): WalkthroughConfig {
  const fulfillmentStep = fulfillmentStepForRental(fulfillment);
  const inline: WalkthroughStep[] = [
    { icon: ClipboardCheck, title: 'Choose your dates', description: '' },
    { icon: MessageCircle, title: 'Send the host a request', description: '' },
    { icon: CreditCard, title: 'Pay after approval', description: '' },
    { icon: fulfillmentStep.icon, title: fulfillmentStep.title, description: '' },
  ];
  const full: WalkthroughStep[] = [
    {
      icon: ClipboardCheck,
      title: 'Pick your dates or hours',
      description:
        'Choose the days (or hours, if the host offers hourly) you need. You will see the full price breakdown — rate, service fee, and total — before you send anything.',
    },
    {
      icon: MessageCircle,
      title: 'Send the request',
      description:
        'Your card is authorized, not charged. The host has 24 hours to accept, decline, or counter. If declined or expired, the hold releases with no charge.',
    },
    {
      icon: FileText,
      title: 'Complete required information',
      description:
        'Some hosts ask for business info, ID, food-handler docs, insurance, or intended menu/use. Only the requirements that apply to this listing will appear.',
    },
    {
      icon: CreditCard,
      title: 'Host accepts, payment runs',
      description:
        'Once accepted, your card is charged and the pickup address unlocks.',
    },
    fulfillmentStep,
    {
      icon: CheckCircle2,
      title: 'Use, return, and review',
      description:
        'Return on schedule. The host is paid 24 hours after your rental starts. Leave a review to help the next renter.',
    },
  ];
  return {
    variant: 'rent_request',
    fulfillment,
    heading: 'Requesting This Listing',
    subhead: 'The host will review your request before the booking is confirmed.',
    cta: 'See What Happens Next',
    modalTitle: 'What happens after you request',
    inlineSteps: inline,
    fullSteps: full,
    trustPoints: [
      'Review all rental terms before you request',
      'Have any required documents ready',
      'Document condition at pickup and return',
      'Report problems through the booking page',
    ],
    finalCtaLabel: 'Request to book',
    finalCtaTargetId: 'booking-widget',
  };
}

// ---------- Analytics (guarded, non-blocking) ----------

type EventName =
  | 'guidance_prompt_viewed'
  | 'guidance_auto_opened_first_visit'
  | 'purchase_steps_opened'
  | 'rental_steps_opened'
  | 'pay_in_person_steps_opened'
  | 'walkthrough_closed'
  | 'final_cta_clicked'
  | 'report_issue_opened_from_guidance';


function trackWalkthrough(event: EventName, variant: WalkthroughVariant, listingId: string) {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, {
        event_category: 'Listing Guidance',
        variant,
        listing_id: listingId,
      });
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[ListingHowItWorks]', event, { variant, listingId });
    }
  } catch {
    // swallow — analytics must never break UX
  }
}

// ---------- Component ----------

interface Props {
  listing: ListingLike;
  isOwner?: boolean;
  className?: string;
}

const DISMISS_KEY_PREFIX = 'vb_howitworks_seen_';
const GLOBAL_SEEN_KEY = 'vb_howitworks_seen_global';

const ListingHowItWorks = ({ listing, isOwner, className }: Props) => {
  const config = useMemo(() => resolveWalkthrough(listing), [listing]);
  const [open, setOpen] = useState(false);

  // Fire an impression exactly once per listing view, and auto-open the
  // walkthrough on the visitor's FIRST listing detail view (global, device-scoped).
  useEffect(() => {
    if (isOwner) return;
    trackWalkthrough('guidance_prompt_viewed', config.variant, listing.id);
    try {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${listing.id}`, '1');
      const seenGlobal = localStorage.getItem(GLOBAL_SEEN_KEY);
      if (!seenGlobal) {
        localStorage.setItem(GLOBAL_SEEN_KEY, new Date().toISOString());
        trackWalkthrough('guidance_auto_opened_first_visit', config.variant, listing.id);
        // Defer slightly so the page has a chance to paint before the modal appears.
        const t = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);


  // Owners don't get walkthrough prompts on their own listings
  if (isOwner) return null;

  const openEvent: EventName =
    config.variant === 'sale_card'
      ? 'purchase_steps_opened'
      : config.variant === 'sale_pay_in_person'
        ? 'pay_in_person_steps_opened'
        : 'rental_steps_opened';

  const handleOpen = () => {
    trackWalkthrough(openEvent, config.variant, listing.id);
    setOpen(true);
  };

  const handleClose = (next: boolean) => {
    if (!next) trackWalkthrough('walkthrough_closed', config.variant, listing.id);
    setOpen(next);
  };

  const handleFinalCta = () => {
    trackWalkthrough('final_cta_clicked', config.variant, listing.id);
    setOpen(false);
    // Scroll the primary booking/inquiry widget into view — never triggers a transaction.
    // Falls back to the mobile sticky CTA / top of page when the desktop widget is hidden.
    if (typeof document !== 'undefined') {
      const primary = document.getElementById(config.finalCtaTargetId);
      const desktopVisible =
        primary && primary.getClientRects && primary.getClientRects().length > 0;
      const target = desktopVisible
        ? primary!
        : document.getElementById('mobile-sticky-cta') ||
          document.getElementById('howitworks-mobile-anchor') ||
          primary;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleReportIssue = () => {
    trackWalkthrough('report_issue_opened_from_guidance', config.variant, listing.id);
  };

  return (
    <>
      {/* Inline prompt (never competes with the primary CTA) */}
      <section
        aria-labelledby={`howitworks-heading-${listing.id}`}
        className={cn(
          'rounded-2xl border border-border bg-card/70 p-4 sm:p-5 shadow-sm',
          className,
        )}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3
              id={`howitworks-heading-${listing.id}`}
              className="text-base font-semibold text-foreground"
            >
              {config.heading}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{config.subhead}</p>
          </div>
        </div>

        <ol className="space-y-1.5 mb-4" aria-label="Quick preview of the steps">
          {config.inlineSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                >
                  {i + 1}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate">{step.title}</span>
              </li>
            );
          })}
        </ol>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          onClick={handleOpen}
          aria-haspopup="dialog"
        >
          {config.cta}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </section>

      {/* Detailed walkthrough */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-lg max-h-[85vh] overflow-y-auto motion-reduce:transition-none motion-reduce:animate-none"
          aria-describedby={`howitworks-desc-${listing.id}`}
        >
          <DialogHeader>
            <DialogTitle>{config.modalTitle}</DialogTitle>
            <DialogDescription id={`howitworks-desc-${listing.id}`}>
              {config.subhead}
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-2 space-y-4" aria-label="Full step-by-step guide">
            {config.fullSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        Step {i + 1}
                      </Badge>
                      <p className="font-medium text-foreground">{step.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 rounded-xl bg-muted/60 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">
              A few smart steps before you commit
            </p>
            <ul className="space-y-1.5">
              {config.trustPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center gap-3 text-sm">
              <Link
                to="/help"
                className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                FAQ
              </Link>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <Link
                to={`/feedback?listing_id=${listing.id}&source=howitworks`}
                onClick={handleReportIssue}
                className="text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1"
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Report an issue
              </Link>
            </div>
            <Button type="button" onClick={handleFinalCta} className="rounded-xl">
              {config.finalCtaLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListingHowItWorks;
