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
import { useEffect, useMemo, useRef, useState } from 'react';
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
  mode: 'rent' | 'sale' | 'both' | string | null | undefined;
  category?: string | null;
  instant_book?: boolean | null;
  accept_card_payment?: boolean | null;
  accept_cash_payment?: boolean | null;
  fulfillment_type?: string | null;
  price_sale?: number | null;
  price_hourly?: number | null;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
};

export type WalkthroughVariant =
  | 'sale_card'
  | 'sale_pay_in_person'
  | 'rent_instant'
  | 'rent_request'
  | 'sale_and_rent';

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
  /**
   * When present, this listing supports two transaction paths (buy AND rent).
   * The component renders a branch selector; each branch reuses the standard
   * modal walkthrough for the picked path.
   */
  branches?: {
    sale: WalkthroughConfig;
    rent: WalkthroughConfig;
  };
}

/**
 * Pure resolver — pick the variant + fulfillment context from listing fields.
 * Kept exported so it can be unit-tested independently of React.
 */
export function resolveWalkthrough(listing: ListingLike): WalkthroughConfig {
  const modeRaw = (listing.mode || '').toString().toLowerCase();
  const hasSalePrice = (listing.price_sale ?? 0) > 0;
  const hasRentalPrice =
    (listing.price_hourly ?? 0) > 0 ||
    (listing.price_daily ?? 0) > 0 ||
    (listing.price_weekly ?? 0) > 0 ||
    (listing.price_monthly ?? 0) > 0;

  // A listing is dual-mode when mode === 'both' OR both a sale price and a
  // rental price are set (regardless of the stored mode enum).
  const isDual = modeRaw === 'both' || (hasSalePrice && hasRentalPrice);
  const isSale = !isDual && (modeRaw === 'sale' || (hasSalePrice && !hasRentalPrice));
  const isRental = !isDual && !isSale;

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

  // Dual-mode: build a wrapper config with both branches available.
  if (isDual) {
    const acceptsCard = listing.accept_card_payment !== false;
    const saleBranch = acceptsCard ? buildSaleCard(fulfillment) : buildSalePayInPerson(fulfillment);
    const rentBranch = listing.instant_book
      ? buildRentInstant(fulfillment)
      : buildRentRequest(fulfillment);

    return buildSaleAndRent(fulfillment, saleBranch, rentBranch);
  }

  // Sale variants
  if (isSale) {
    const acceptsCard = listing.accept_card_payment !== false; // default to card if flag absent
    return acceptsCard ? buildSaleCard(fulfillment) : buildSalePayInPerson(fulfillment);
  }

  // Rental variants (default when mode is missing or unusual)
  if (isRental) {
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
  if (f === 'pickup_or_delivery') {
    return {
      icon: Truck,
      title: 'Choose pickup, delivery, or freight',
      description:
        'This seller offers both pickup and delivery. Confirm which you want in Messages. Freight, when offered, is calculated at $4.50/mile. The seller\'s full address unlocks after purchase.',
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

function buildSaleAndRent(
  fulfillment: FulfillmentContext,
  sale: WalkthroughConfig,
  rent: WalkthroughConfig,
): WalkthroughConfig {
  // Combined inline preview — first step from each branch, plus a shared close.
  const inline: WalkthroughStep[] = [
    { icon: HelpCircle, title: 'Pick buy or rent', description: '' },
    { icon: CreditCard, title: 'Buy: pay & coordinate handoff', description: '' },
    { icon: ClipboardCheck, title: 'Rent: book dates & confirm', description: '' },
    { icon: CheckCircle2, title: 'Complete the transaction on Vendibook', description: '' },
  ];
  // Full steps are only shown if the user opens the wrapper modal directly
  // without picking a branch — they get an overview of both paths.
  const full: WalkthroughStep[] = [
    {
      icon: HelpCircle,
      title: 'Choose how you want to use this listing',
      description:
        'This host offers this listing for BOTH purchase and rental. Pick the path that fits your plan — you can always come back and pick the other later.',
    },
    {
      icon: CreditCard,
      title: 'Buying: own it outright',
      description: sale.subhead,
    },
    {
      icon: ClipboardCheck,
      title: 'Renting: book it for a period',
      description: rent.subhead,
    },
    {
      icon: CheckCircle2,
      title: 'Vendibook protects the transaction either way',
      description:
        'Payments, messaging, disputes, and reviews all run through Vendibook whether you buy or rent.',
    },
  ];
  return {
    variant: 'sale_and_rent',
    fulfillment,
    heading: 'How This Listing Works',
    subhead:
      'This listing is available to buy OR rent. Pick the option that fits your plan to see the exact steps.',
    cta: 'See Your Options',
    modalTitle: 'Buy or rent this listing',
    inlineSteps: inline,
    fullSteps: full,
    trustPoints: [
      'Buy or rent — the same Vendibook protections apply',
      'Messages, payments, and disputes stay on-platform',
      'Owner and title info is verified for purchases',
      'Rentals include damage and cancellation protection',
    ],
    finalCtaLabel: 'Continue',
    finalCtaTargetId: 'booking-widget',
    branches: { sale, rent },
  };
}



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
  | 'guidance_opened_via_deeplink'
  | 'purchase_steps_opened'
  | 'rental_steps_opened'
  | 'pay_in_person_steps_opened'
  | 'walkthrough_closed'
  | 'final_cta_clicked'
  | 'report_issue_opened_from_guidance'
  | 'dual_mode_branch_selected';


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

/**
 * Parse the current URL for a walkthrough deep link.
 * Supported forms (all case-insensitive):
 *   ?walkthrough=buy     → open modal, preselect buy branch on dual listings
 *   ?walkthrough=rent    → open modal, preselect rent branch on dual listings
 *   ?walkthrough=open    → just open the modal (no branch preselect)
 *   #howitworks          → alias for ?walkthrough=open
 *   #howitworks=buy      → alias for ?walkthrough=buy
 *   #howitworks=rent     → alias for ?walkthrough=rent
 * The branch alias `sale` is accepted as a synonym for `buy`.
 */
function parseWalkthroughDeepLink(): { open: boolean; branch: 'sale' | 'rent' | null } {
  if (typeof window === 'undefined') return { open: false, branch: null };
  const url = new URL(window.location.href);
  const raw =
    (url.searchParams.get('walkthrough') || '').toLowerCase() ||
    (url.hash.startsWith('#howitworks')
      ? url.hash.replace(/^#howitworks=?/, '').toLowerCase() || 'open'
      : '');
  if (!raw) return { open: false, branch: null };
  if (raw === 'buy' || raw === 'sale') return { open: true, branch: 'sale' };
  if (raw === 'rent') return { open: true, branch: 'rent' };
  return { open: true, branch: null };
}

const ListingHowItWorks = ({ listing, isOwner, className }: Props) => {
  const rootConfig = useMemo(() => resolveWalkthrough(listing), [listing]);
  const isDual = !!rootConfig.branches;
  // For dual-mode listings, this tracks which branch the user picked.
  // null = show the wrapper (branch selector) inside the modal.
  const [pickedBranch, setPickedBranch] = useState<'sale' | 'rent' | null>(null);
  const config: WalkthroughConfig = isDual && pickedBranch
    ? rootConfig.branches![pickedBranch]
    : rootConfig;
  const [open, setOpen] = useState(false);
  // Live region text announced to screen-reader users when the branch changes.
  const [srAnnouncement, setSrAnnouncement] = useState('');
  // Refs to the two branch selector buttons so we can implement roving
  // arrow-key navigation and auto-focus the first option when the selector
  // becomes visible.
  const branchBtnRefs = useRef<Record<'sale' | 'rent', HTMLButtonElement | null>>({
    sale: null,
    rent: null,
  });
  const backBtnRef = useRef<HTMLButtonElement | null>(null);
  const finalCtaRef = useRef<HTMLButtonElement | null>(null);
  // Ref on the outer inline section. The page mounts this component twice
  // (mobile-only wrapper and desktop-only wrapper); only the visible copy
  // should auto-open the modal, otherwise the deep-link path stacks two
  // dialogs.
  const rootRef = useRef<HTMLElement | null>(null);
  const isVisibleInstance = () =>
    typeof window !== 'undefined' &&
    rootRef.current !== null &&
    rootRef.current.offsetParent !== null;

  // Fire an impression exactly once per listing view, and auto-open the
  // walkthrough on the visitor's FIRST listing detail view (global, device-scoped).
  // A deep link (?walkthrough=…) always wins and overrides the first-visit gate.
  useEffect(() => {
    if (isOwner) return;
    // Only the visible instance fires impressions + auto-opens.
    if (!isVisibleInstance()) return;
    trackWalkthrough('guidance_prompt_viewed', rootConfig.variant, listing.id);


    const deepLink = parseWalkthroughDeepLink();
    if (deepLink.open) {
      // Preselect a branch only if the listing actually supports it.
      const branch = deepLink.branch && isDual ? deepLink.branch : null;
      if (branch) setPickedBranch(branch);
      trackWalkthrough(
        'guidance_opened_via_deeplink',
        branch ? rootConfig.branches![branch].variant : rootConfig.variant,
        listing.id,
      );
      // Open on the next tick so the initial paint isn't blocked.
      const t = window.setTimeout(() => {
        setOpen(true);
        // Nudge the correct primary widget into view behind the modal so the
        // scroll is already staged when the user closes / clicks the final CTA.
        const targetId = branch
          ? rootConfig.branches![branch].finalCtaTargetId
          : rootConfig.finalCtaTargetId;
        try {
          const el = document.getElementById(targetId);
          const visible = el && el.getClientRects && el.getClientRects().length > 0;
          const target = visible
            ? el!
            : document.getElementById('mobile-sticky-cta') ||
              document.getElementById('howitworks-mobile-anchor') ||
              el;
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch { /* ignore */ }
      }, 60);
      // Also mark first-visit as seen so we don't double-open later.
      try { localStorage.setItem(GLOBAL_SEEN_KEY, new Date().toISOString()); } catch { /* ignore */ }
      try { localStorage.setItem(`${DISMISS_KEY_PREFIX}${listing.id}`, '1'); } catch { /* ignore */ }
      return () => window.clearTimeout(t);
    }

    try {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${listing.id}`, '1');
      const seenGlobal = localStorage.getItem(GLOBAL_SEEN_KEY);
      if (!seenGlobal) {
        localStorage.setItem(GLOBAL_SEEN_KEY, new Date().toISOString());
        trackWalkthrough('guidance_auto_opened_first_visit', rootConfig.variant, listing.id);
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
        : config.variant === 'sale_and_rent'
          ? 'guidance_prompt_viewed'
          : 'rental_steps_opened';

  const handleOpen = () => {
    trackWalkthrough(openEvent, config.variant, listing.id);
    setOpen(true);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      trackWalkthrough('walkthrough_closed', config.variant, listing.id);
      // Reset branch pick when the modal fully closes so the selector is
      // shown again the next time the user opens it.
      setPickedBranch(null);
    }
    setOpen(next);
  };

  const handleBranchPick = (branch: 'sale' | 'rent') => {
    setPickedBranch(branch);
    const target = rootConfig.branches![branch];
    trackWalkthrough('dual_mode_branch_selected', target.variant, listing.id);
    trackWalkthrough(
      branch === 'sale'
        ? target.variant === 'sale_pay_in_person'
          ? 'pay_in_person_steps_opened'
          : 'purchase_steps_opened'
        : 'rental_steps_opened',
      target.variant,
      listing.id,
    );
    setSrAnnouncement(
      branch === 'sale'
        ? 'Buy path selected. Showing purchase steps. Press the Continue button to jump to the buy widget, or use the Back button to change your choice.'
        : 'Rent path selected. Showing rental steps. Press the Continue button to jump to the booking widget, or use the Back button to change your choice.',
    );
    if (!open) setOpen(true);
    // Move keyboard focus onto the Back button so users can immediately
    // reverse the choice or Tab forward through the newly revealed steps.
    window.setTimeout(() => {
      backBtnRef.current?.focus();
    }, 30);
  };

  // Arrow-key navigation between the two branch buttons (a11y: matches the
  // WAI-ARIA "grouped buttons" pattern — Left/Up moves to the previous
  // option, Right/Down to the next, Home/End jump to the ends).
  const handleBranchKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: 'sale' | 'rent',
  ) => {
    const order: Array<'sale' | 'rent'> = ['sale', 'rent'];
    const idx = order.indexOf(current);
    let nextIdx: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (idx + 1) % order.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (idx - 1 + order.length) % order.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = order.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (nextIdx !== null) {
      branchBtnRefs.current[order[nextIdx]]?.focus();
    }
  };

  const handleBackToSelector = () => {
    setPickedBranch(null);
    setSrAnnouncement('Returned to the buy or rent selector. Use the arrow keys to move between choices.');
    // Focus the first branch button so keyboard users can reselect immediately.
    window.setTimeout(() => {
      branchBtnRefs.current.sale?.focus();
    }, 30);
  };

  const handleFinalCta = () => {
    trackWalkthrough('final_cta_clicked', config.variant, listing.id);
    setOpen(false);
    setPickedBranch(null);
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
        ref={rootRef}
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

          {isDual && !pickedBranch && (
            <div
              role="group"
              aria-labelledby={`howitworks-branch-label-${listing.id}`}
              aria-describedby={`howitworks-branch-hint-${listing.id}`}
              className="mt-2"
            >
              <h4
                id={`howitworks-branch-label-${listing.id}`}
                className="text-sm font-semibold text-foreground mb-1"
              >
                Choose your path
              </h4>
              <p
                id={`howitworks-branch-hint-${listing.id}`}
                className="text-xs text-muted-foreground mb-3"
              >
                Use the Left and Right arrow keys to move between choices, then press Enter to select.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  ref={(el) => { branchBtnRefs.current.sale = el; }}
                  type="button"
                  onClick={() => handleBranchPick('sale')}
                  onKeyDown={(e) => handleBranchKeyDown(e, 'sale')}
                  aria-label="Buy this listing. Own it outright. See the purchase steps and protections."
                  className="text-left rounded-xl border border-border bg-card/70 hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background p-4 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="font-semibold text-foreground">Buy this listing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Own it outright. See the purchase steps and protections.
                  </p>
                </button>
                <button
                  ref={(el) => { branchBtnRefs.current.rent = el; }}
                  type="button"
                  onClick={() => handleBranchPick('rent')}
                  onKeyDown={(e) => handleBranchKeyDown(e, 'rent')}
                  aria-label="Rent this listing. Book it for a period. See how availability, deposits, and returns work."
                  className="text-left rounded-xl border border-border bg-card/70 hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background p-4 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="font-semibold text-foreground">Rent this listing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Book it for a period. See how availability, deposits, and returns work.
                  </p>
                </button>
              </div>
            </div>
          )}

          {isDual && pickedBranch && (
            <button
              ref={backBtnRef}
              type="button"
              onClick={handleBackToSelector}
              aria-label="Back to the buy or rent selector"
              className="mt-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-start rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              ← Back to buy or rent
            </button>
          )}


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
            <Button
              ref={finalCtaRef}
              type="button"
              onClick={handleFinalCta}
              className="rounded-xl"
              aria-label={
                isDual && pickedBranch === 'sale'
                  ? `${config.finalCtaLabel} to the buy widget`
                  : isDual && pickedBranch === 'rent'
                    ? `${config.finalCtaLabel} to the booking widget`
                    : config.finalCtaLabel
              }
            >
              {config.finalCtaLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </DialogFooter>

          {/* Polite live region: announces branch changes to screen readers
              without stealing focus. Kept inside the dialog so Radix mounts
              and unmounts it in step with the modal lifecycle. */}
          <div role="status" aria-live="polite" className="sr-only">
            {srAnnouncement}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
    </>
  );
};

export default ListingHowItWorks;
