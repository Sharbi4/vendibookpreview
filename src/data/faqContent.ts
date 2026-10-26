/**
 * Vendibook FAQ content — canonical source for /faq (and its FAQPage JSON-LD).
 *
 * Source of truth: the owner's "Vendibook AI Support Agent Master Guide v5.0"
 * (2026-10-14, docs/support/vendibook-ai-support-master-guide-v5.txt),
 * Section 17 customer FAQ bank, plus later owner overrides. Every Section 17
 * topic has an entry here whose answer keeps the guide's meaning and
 * qualifiers.
 *
 * Rules enforced here:
 *  - Fees match FEE_CONFIG (supabase/functions/_shared/feeConfig.ts):
 *      new eligible online equipment sales: 8.7% seller commission, $0 buyer
 *        platform fee, for Free and Pro sellers alike (Pro does NOT lower the
 *        sale commission); older committed orders keep their snapshotted terms;
 *      rentals: 12.9% host commission + 12.9% renter service fee; active Pro
 *        hosts pay the same 12.9% host commission per
 *        completed transaction;
 *      Build Studio: planned 6.5% manufacturer fee under separate terms.
 *  - Pay in person / cash sales are RETIRED (owner override 2026-10-15). Never
 *    describe in-person settlement or a $0 in-person commission.
 *  - Plans: Free (two active listings unless grandfathered; drafts free) and
 *    Vendibook Pro (monetization_products.vendibook_pro). Retired Starter /
 *    Growth / Operator / Weekly Pass tiers and the retired Listing Concierge
 *    must never appear. Catalog prices use {{price:slug}} tokens.
 *  - Payment rails: equipment sales / invoices use the PayPal-supported
 *    checkout or invoice flow; rentals use Square card checkout (never PayPal
 *    for rentals). No Stripe / Affirm / Klarna / Afterpay language.
 *  - Vendibook is not an escrow service, bank, lender or insurer. Never say
 *    funds are held, and never promise a refund / auto-complete window
 *    ("7 days") or a deposit-return date.
 *  - Payouts (owner override 2026-10-15, wins over the guide): every
 *    payout / get-paid answer, sales and rentals, says "We pay out within 24
 *    hours after the rental or sale is complete and confirmed — signatures
 *    and the other handoff steps done."
 *  - Mission (owner 2026-10-15): Vendibook is here to support the food truck
 *    community — helping operators buy, sell and rent equipment and grow.
 *  - Invoice-first checkout is described as "where enabled"; Request to buy
 *    does not mean accepted, invoiced or paid. Video does not replace an
 *    in-person inspection. Financing is third-party (Vendibook is not the
 *    lender).
 *  - The paid Identity Verified badge is optional and never required to
 *    publish; contact / purchase actions may need separate phone or ID checks.
 *  - Support: (866) 690-6227 · support@vendibook.com · Mon–Fri 9 a.m.–5 p.m.
 *    Arizona time.
 *  - Anything not shipped is marked "coming soon"; answers link to real routes.
 */

import { PRICING_FAQ } from "./pricingFaq";

export interface FaqAction {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
  actions?: FaqAction[];
  related?: string[];
  /** Marks an answer as forthcoming rather than shipped. */
  comingSoon?: boolean;
}

export interface FaqCategory {
  id: string;
  title: string;
  blurb?: string;
  entries: FaqEntry[];
}

// -------- Reusable action shortcuts --------
const A = {
  createListing: { label: "Create a listing", href: "/list", requiresAuth: true },
  myListings: { label: "My listings", href: "/dashboard/listings", requiresAuth: true },
  viewTransactions: { label: "View transactions", href: "/dashboard/activity", requiresAuth: true },
  dashboard: { label: "Open dashboard", href: "/dashboard", requiresAuth: true },
  verify: { label: "Verify identity", href: "/verify-identity", requiresAuth: true },
  notifPrefs: { label: "Notification preferences", href: "/notification-preferences", requiresAuth: true },
  contactSupport: { label: "Contact support", href: "/contact" },
  helpCenter: { label: "Help Center", href: "/help" },
  browseRentals: { label: "Browse rentals", href: "/search?mode=rent" },
  browseSales: { label: "Browse for sale", href: "/search?mode=sale" },
  permitPath: { label: "Open PermitPath", href: "/tools/permitpath" },
  messages: { label: "Open messages", href: "/dashboard/messages", requiresAuth: true },
  account: { label: "Account settings", href: "/dashboard/account", requiresAuth: true },
  paymentSetup: { label: "Payment setup", href: "/dashboard/payments/setup", requiresAuth: true },
  pricing: { label: "See plans", href: "/pricing" },
  subscription: { label: "Manage subscription", href: "/account/subscription", requiresAuth: true },
  buyerMatch: { label: "Open BuyerMatch", href: "/dashboard/buyermatch", requiresAuth: true },
  tools: { label: "Open Premium Tools", href: "/dashboard/tools", requiresAuth: true },
  referrals: { label: "Refer & earn", href: "/refer", requiresAuth: true },
  purchases: { label: "My purchases", href: "/purchases", requiresAuth: true },
  financing: { label: "Explore financing", href: "/financing" },
  buildStudio: { label: "Open Build Studio", href: "/build-studio" },
  atlas: { label: "Try Atlas", href: "/atlas" },
  refundPolicy: { label: "Refund policy", href: "/legal/refund-policy" },
  subTerms: { label: "Subscription terms", href: "/legal/subscription-terms" },
  terms: { label: "Terms of service", href: "/legal/terms" },
} satisfies Record<string, FaqAction>;

const PRICING_CATEGORY: FaqCategory = {
  id: "pricing-fees",
  title: "Pricing, fees & financing",
  blurb:
    "Free to list. New eligible online equipment sales carry an 8.7% seller commission for Free and Pro sellers, with no buyer platform fee. Rentals have separate host and renter fees.",
  // Namespaced: several pricing FAQ ids (e.g. "payout-timing") also exist as
  // full entries in the selling category. Prefixing keeps entry ids unique.
  entries: PRICING_FAQ.map((e) => ({
    id: `pricing-${e.id}`,
    question: e.question,
    answer: e.answer,
    keywords: ["fees", "pricing", "commission", "cost", "paypal", "square", "financing"],
    actions: e.cta ? [{ label: e.cta.label, href: e.cta.href }] : undefined,
  })),
};

export const faqCategories: FaqCategory[] = [
  PRICING_CATEGORY,
  // ── 1. Getting started ─────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "Vendibook is here to support the food truck community. Learn what Vendibook is, how accounts work, verification checks, and how to reach support.",
    entries: [
      {
        id: "what-is-vendibook",
        question: "What is Vendibook?",
        answer:
          "Vendibook is a marketplace for finding, buying, selling and renting mobile-food equipment and spaces, including food trucks, food trailers, carts, commercial kitchens and vendor lots. We're here to support the food truck community — helping operators buy, sell and rent equipment and grow their businesses.",
        keywords: ["about", "marketplace", "platform"],
        actions: [A.browseRentals, A.browseSales],
      },
      {
        id: "create-account",
        question: "How do I create an account?",
        answer:
          "Click Sign up and register with email + password or Google. Email signups send a verification link; Google signups activate immediately. One account works for buying, renting, selling, and hosting.",
        actions: [{ label: "Sign up", href: "/auth?mode=signup" }],
      },
      {
        id: "buyer-vs-seller-modes",
        question: "Do I need separate accounts to buy and to sell or host?",
        answer:
          "No. A single account can act in multiple roles — browse, book, buy, sell, and host. Your dashboard shows Buying and Hosting workspaces side by side; use the persona switch in the sidebar to jump between them.",
        actions: [A.dashboard],
      },
      {
        id: "identity-verification",
        question: "Do I have to verify my identity before publishing?",
        answer:
          "No. The optional paid Identity Verified badge is not required to publish a listing. Specific contact, purchase or payment actions — such as starting a conversation, making an offer or requesting a purchase — may require other identity or phone checks.",
        keywords: ["kyc", "identity", "verification", "badge", "verified", "phone"],
        actions: [A.verify],
      },
      {
        id: "verification-fails",
        question: "My identity check failed — what now?",
        answer:
          "You'll see the reason on the verification page and can retry with a clearer document. Publishing listings and replying to buyers about your own listings aren't blocked by a failed check, but actions that require a phone or identity check (like starting new contact or a purchase) stay unavailable until it passes. If a retry still fails, email support@vendibook.com — never send ID images, passwords or one-time codes in chat.",
        actions: [A.verify, A.contactSupport],
      },
      {
        id: "coverage",
        question: "Where is Vendibook available?",
        answer:
          "Anywhere in the United States. Listing density, pickup, delivery and freight options vary by market and by listing — the search page shows what's live near you today.",
      },
      {
        id: "contact-support",
        question: "How do I contact support?",
        answer:
          "Use the Help Center or contact support@vendibook.com. You can also call (866) 690-6227, Monday–Friday, 9:00 a.m.–5:00 p.m. Arizona time. For an order, listing or subscription issue, include its ID or link, the exact error text and the time it happened.",
        keywords: ["help", "phone", "email", "hours"],
        actions: [
          A.helpCenter,
          A.contactSupport,
          { label: "Call support", href: "tel:+18666906227" },
          { label: "Email support", href: "mailto:support@vendibook.com" },
        ],
      },
    ],
  },

  // ── 2. Buying ──────────────────────────────────────────────────
  {
    id: "buying",
    title: "Buying",
    blurb: "Offers, Request to buy, invoices, payment, delivery, receipt and what to do if something's wrong.",
    entries: [
      {
        id: "how-buying-works",
        question: "How do I buy a food truck or trailer?",
        answer:
          "Find a listing, review the equipment and seller disclosures, then message the seller or start an available purchase request. Where invoice-first checkout is enabled, the seller approves terms before an itemized invoice is issued. Follow the payment, agreement and handoff steps shown in your transaction.",
        keywords: ["buy", "purchase", "how it works"],
        actions: [A.browseSales],
      },
      {
        id: "make-offer",
        question: "Can I make an offer?",
        answer:
          "Eligible listings allow offers. Sellers can accept, decline or counter. The final accepted terms must be confirmed in the official order before payment.",
        keywords: ["offer", "negotiate", "counter"],
      },
      {
        id: "request-to-buy",
        question: "What is Request to buy?",
        answer:
          "It sends a request for the seller to review. Submitting the request does not by itself mean the seller has accepted, an invoice exists, or a payment has been made.",
        keywords: ["request to buy", "purchase request"],
      },
      {
        id: "why-invoice",
        question: "Why is there an invoice after seller approval?",
        answer:
          "An itemized invoice makes the agreed equipment price and any separately disclosed tax or shipping clear before you authorize payment. Invoice availability and payment options depend on the transaction flow enabled for your purchase.",
        keywords: ["invoice", "approval"],
      },
      {
        id: "invoice-reserved",
        question: "Does an invoice mean the equipment is reserved?",
        answer:
          "Not necessarily. A reservation or commitment only applies once Vendibook has recorded the required status for your purchase. Check the listing and invoice status in your transaction.",
        keywords: ["invoice", "reserved", "hold"],
      },
      {
        id: "invoice-contents",
        question: "What information should be on my invoice?",
        answer:
          "At minimum, review the seller and equipment, the agreed equipment amount, delivery or freight, any applicable tax, the final total, the payment deadline and the agreed terms. Ask for a correction before paying if anything is inaccurate.",
        keywords: ["invoice", "tax", "freight", "total"],
      },
      {
        id: "pro-forma-invoice",
        question: "What is a pro forma invoice?",
        answer:
          "A pro forma is a purchase summary often used for financing applications. It is not a payable invoice and is not proof of an approved sale or a paid transaction.",
        keywords: ["pro forma", "financing", "invoice"],
        actions: [A.financing],
      },
      {
        id: "invoice-expired",
        question: "What happens if an invoice expires or changes?",
        answer:
          "Don't pay an outdated or unrelated link. Request a reviewed replacement or updated terms through Vendibook.",
        keywords: ["invoice", "expired", "changed"],
        actions: [A.contactSupport],
      },
      {
        id: "message-seller",
        question: "How do I message the seller?",
        answer:
          "Open the listing and click Message. Keep conversations in Vendibook so there's a record if anything goes wrong. Photos, PDFs, and DOCX up to 10MB attach directly. Starting a new conversation may require a verified phone and identity check.",
        actions: [A.messages],
      },
      {
        id: "payment-methods",
        question: "Can I pay with a card?",
        answer:
          "Eligible equipment sales use Vendibook's PayPal-powered checkout or invoice flow; rentals use Square card checkout. The payment options available to you are shown on the actual payment screen. Vendibook never asks for your full card number in chat or messages.",
        keywords: ["card", "payment methods", "paypal", "square"],
      },
      {
        id: "pay-in-person-cash",
        question: "Can I pay in person or with cash?",
        answer:
          "No. Vendibook no longer supports pay-in-person or cash sales. Purchases go through Vendibook's checkout or invoice so the transaction is documented; off-platform payments don't receive Vendibook checkout protections.",
        keywords: ["cash", "in person", "pay in person", "offline"],
      },
      {
        id: "payment-protection",
        question: "Does Vendibook hold payments in escrow?",
        answer:
          "No. Vendibook is not an escrow service. Payments are processed by the approved provider for your transaction — PayPal-powered checkout for equipment sales, Square card checkout for rentals. We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done.",
        keywords: ["escrow", "payment protection", "hold", "safe"],
      },
      {
        id: "charged-no-order",
        question: "What happens if my card was charged but no order exists?",
        answer:
          "Don't try paying again. Contact support immediately with your payment reference so the transaction can be reconciled.",
        keywords: ["charged", "double charge", "missing order", "payment failed"],
        actions: [A.contactSupport],
      },
      {
        id: "financing",
        question: "Can I finance a food truck or trailer?",
        answer:
          "Eligible equipment listings may offer third-party financing referrals — currently led by Equinox Funding. Vendibook is not the lender and does not decide approval, rates, payments or funding dates. You can download a pro forma purchase summary from an eligible listing to submit with your application; it is not a payable invoice.",
        keywords: ["financing", "monthly", "loan", "equinox", "equipment financing"],
        actions: [A.financing],
      },
      {
        id: "buy-out-of-state",
        question: "Can I buy from a seller in another state?",
        answer:
          "Yes, depending on the listing's pickup, seller delivery or eligible freight arrangements. Confirm availability, cost and timing for your destination before paying.",
        keywords: ["out of state", "another state", "long distance"],
      },
      {
        id: "video-walkthrough",
        question: "Can I request a video walkthrough?",
        answer:
          "Ask the seller for an available live video walkthrough to view the equipment and discuss condition or missing details. A video walkthrough does not replace an in-person inspection.",
        keywords: ["video", "walkthrough", "inspection"],
        actions: [A.messages],
      },
      {
        id: "delivery-options",
        question: "Does Vendibook offer nationwide freight?",
        answer:
          "Some eligible listings offer Vendibook Freight or another shipping option, and others are pickup or seller delivery only. Nationwide delivery is not guaranteed for every listing or route — check the specific listing and the quote for your destination before you commit.",
        keywords: ["freight", "shipping", "delivery", "nationwide"],
      },
      {
        id: "track-shipment",
        question: "Can I track a shipped food trailer?",
        answer:
          "Eligible deliveries may show shipping milestones and GPS updates when a seller or driver has opted into current location sharing. An older location update is shown as the last recorded position, not as live tracking.",
        keywords: ["track", "tracking", "gps", "shipment"],
        actions: [A.viewTransactions],
      },
      {
        id: "pickup-yourself",
        question: "Can I pick the equipment up myself?",
        answer:
          "Where offered, you can coordinate pickup with the seller. Confirm the location, date, transport capacity, loading, title, keys and included accessories beforehand.",
        keywords: ["pickup", "pick up", "tow"],
      },
      {
        id: "confirm-delivery",
        question: "When should I confirm receipt?",
        answer:
          "Only after you have physically received and inspected the equipment, reviewed the title/ownership documents and checked the agreed included items. If something is wrong, report it before confirming.",
        keywords: ["confirm receipt", "delivery", "inspection"],
        actions: [A.viewTransactions],
      },
      {
        id: "bills-of-sale",
        question: "Do I need to sign an agreement?",
        answer:
          "Your specific purchase or rental may require a digital agreement and consents, sent for e-signature in your transaction where enabled. Review and sign your actual document, and don't assume an unsigned document is complete.",
        keywords: ["agreement", "bill of sale", "e-sign", "contract"],
        actions: [A.viewTransactions],
      },
      {
        id: "never-arrives",
        question: "What if the truck never arrives?",
        answer:
          "Don't confirm receipt. Open your transaction, report the problem, keep the seller communications and shipping evidence, and contact Vendibook support immediately.",
        keywords: ["not delivered", "never arrived", "missing"],
        actions: [A.viewTransactions, A.contactSupport],
      },
      {
        id: "something-wrong",
        question: "What if the equipment is materially different from the listing?",
        answer:
          "Document the differences with photos or video and use the transaction's Report an issue or refund request option. A review is required; refunds are not automatic.",
        keywords: ["not as described", "different", "problem", "issue"],
        actions: [A.viewTransactions, A.contactSupport],
      },
      {
        id: "refund-window",
        question: "Can I request a refund on a food truck purchase?",
        answer:
          "Yes, you can request a review where the applicable order terms and law allow. The result depends on the transaction facts, buyer and seller obligations, payment-processor status and the approved policy. There is no universal automatic return window.",
        keywords: ["refund", "return", "cancel purchase"],
        actions: [A.refundPolicy],
      },
      {
        id: "refund-timing",
        question: "How long do refunds take?",
        answer:
          "Refund approval and the time for money to return to your payment method vary with the payment processor, payment method, any dispute and the order status. Support can share your verified refund status and the provider's stated estimate.",
        keywords: ["refund", "how long", "timing"],
        actions: [A.contactSupport],
      },
      {
        id: "off-platform-warning",
        question: "What if a seller pressures me to pay outside Vendibook?",
        answer:
          "Don't send additional money under pressure. Keep communications documented in Vendibook and report suspicious activity. Off-platform payments don't receive Vendibook checkout protections — and requests for wire, crypto, gift cards or Zelle are common scam signs.",
        keywords: ["off platform", "wire", "zelle", "scam", "pressure"],
        actions: [A.contactSupport],
      },
    ],
  },

  // ── 3. Renting ─────────────────────────────────────────────────
  {
    id: "renting",
    title: "Renting",
    blurb: "Booking trucks, kitchens, and vendor spaces — Square checkout, agreements, deposits, cancellations.",
    entries: [
      {
        id: "how-renting-works",
        question: "How does renting work?",
        answer:
          "Choose your dates (or a time slot on hourly listings) and submit a booking request, or use Instant Book where the host offers it. Rental checkout runs on Square: you review the booking, complete the details and agreements, then pay by card. The quote shows the rental subtotal, the renter service fee and any disclosed deposit, tax or delivery. You may also need to upload documents the host requires (such as license or insurance).",
        actions: [A.browseRentals],
      },
      {
        id: "request-vs-instant",
        question: "What's the difference between request-to-book and Instant Book?",
        answer:
          "Request-to-book: you submit dates and the host approves before final payment. Instant Book: you can book and pay right away, as long as the listing's availability and booking conditions are met. Hosts choose per listing.",
      },
      {
        id: "rental-payment-square",
        question: "How do I pay for a rental?",
        answer:
          "Rentals are paid by card through Square checkout — not PayPal. A booking counts as paid only once Square confirms the payment; if a payment fails, don't submit a second one until you've checked the booking status.",
        keywords: ["square", "rental payment", "card"],
        actions: [A.viewTransactions],
      },
      {
        id: "rental-agreements",
        question: "Do I sign a rental agreement?",
        answer:
          "Where enabled, each rental includes an agreement you e-sign covering dates and times, price, deposit, condition, cleaning, insurance or documentation, included equipment, access and return terms. Review the actual document before you sign.",
      },
      {
        id: "deposits",
        question: "Will I get my rental deposit back?",
        answer:
          "A refundable security deposit is handled according to your rental agreement and the verified return and condition record. Damage or other documented charges may apply, so there's no guaranteed refund amount or date. Deposits are paid by card through Square, and any refund goes back to that card on Square's timeline.",
        keywords: ["deposit", "security deposit", "refund"],
      },
      {
        id: "cancellation-policies",
        question: "What are rental cancellation rules?",
        answer:
          "Each rental is governed by the cancellation terms shown on the listing and your signed rental agreement. Review the policy before paying by card through Square, and check the booking's actual cancellation and refund calculation before you confirm a cancellation.",
        keywords: ["cancel", "cancellation", "rental refund"],
        actions: [A.refundPolicy],
      },
      {
        id: "extend-rental",
        question: "Can I extend a rental?",
        answer:
          "Open the booking and request an extension. If the host approves the new end date, the additional charges are shown before you pay by card through Square.",
      },
      {
        id: "damage-return",
        question: "What if the asset is damaged or returned late?",
        answer:
          "Take time-stamped photos at pickup and return. Damage claims, late returns and deposit deductions follow the listing's policy and your signed rental agreement, and a claim must be documented and reviewed — a request from either side is not automatic approval.",
      },
    ],
  },

  // ── 4. Selling ─────────────────────────────────────────────────
  {
    id: "selling",
    title: "Selling",
    blurb: "Publishing for free, listing limits, photos, fees, seller payment setup, payouts and refunds.",
    entries: [
      {
        id: "list-for-free",
        question: "Is it free to list on Vendibook?",
        answer:
          "Creating and publishing a basic listing is free, subject to the listing limit on your account. Paid promotion and Pro membership are optional.",
        actions: [A.createListing],
      },
      {
        id: "listing-limits",
        question: "How many listings can I publish for free?",
        answer:
          "The standard Free account supports two active listings. Founding-member accounts may have grandfathered unlimited listings. Drafts do not count. Vendibook Pro ({{price:vendibook_pro}}) includes unlimited eligible active listings.",
        actions: [A.pricing],
        keywords: ["limit", "cap", "how many", "founding"],
      },
      {
        id: "listing-drafts",
        question: "Can I save a listing as a draft?",
        answer:
          "Yes. Drafts save without a payment. Complete the missing required fields before publishing.",
        keywords: ["draft", "save"],
        actions: [A.myListings],
      },
      {
        id: "listing-photos",
        question: "What pictures should I upload?",
        answer:
          "Include at least three clear photos — ten or more is better. We recommend all sides of the unit, the kitchen, major equipment, service windows, tires/hitch and any known defects. A video can help but is optional.",
        keywords: ["photos", "pictures", "images", "video"],
        actions: [A.createListing],
      },
      {
        id: "good-listing",
        question: "What makes a great listing?",
        answer:
          "Clear photos of every side, the serving window, cooking line, refrigeration, hood/fire suppression, sinks, generator, tires/hitch and any defects. A descriptive title, plus a description that covers dimensions, kitchen equipment, condition, title/lien status, what's included and excluded, and pickup or delivery terms. Fast replies to messages. Not sure what to charge? PricePilot suggests a price from comparable listings — a suggestion, not a certified appraisal or a promise of sale.",
        actions: [{ label: "Try PricePilot", href: "/tools/pricepilot" }],
      },
      {
        id: "listing-not-in-search",
        question: "Why is my listing not showing up in search?",
        answer:
          "Check the listing's published and moderation status, your category and location filters, and allow for indexing delay. If the listing is public but still missing, contact support with the listing link.",
        keywords: ["search", "not showing", "missing listing", "visibility"],
        actions: [A.myListings, A.contactSupport],
      },
      {
        id: "sale-and-rent",
        question: "Can I list a truck for sale and rent?",
        answer:
          "Some assets can have linked sale and rental listings where supported. Manage availability carefully — a linked rental may be paused when the same asset is sold.",
        keywords: ["rent while you sell", "sale and rent", "linked listing"],
        actions: [A.myListings],
      },
      {
        id: "offers-negotiation",
        question: "How do offers and counteroffers work?",
        answer:
          "Buyers can send an offer or a Request to buy on eligible listings. You can accept, decline or counter. Accepted terms must be confirmed in the official order — where invoice-first checkout is enabled, your approval leads to an itemized invoice for the buyer to review and pay. A declined offer does not create a sale.",
      },
      {
        id: "seller-fees",
        question: "What are the seller fees?",
        answer:
          "For new eligible online equipment sales, the Vendibook seller fee is 8.7% of the agreed equipment amount, for Free and Pro sellers alike, and buyers pay no Vendibook platform fee. Confirm the exact fee in your transaction quote; older committed orders keep their agreed terms. Rentals are priced separately: a 12.9% host commission plus a 12.9% renter service fee on both Free and Pro.",
        keywords: ["fee", "commission", "8.7%", "sale fee"],
        actions: [A.pricing],
      },
      {
        id: "paypal-to-publish",
        question: "Do I have to connect PayPal to publish a listing?",
        answer:
          "No. Publishing and seller payment setup are separate. A specific online transaction path may require an approved connected seller account.",
        keywords: ["paypal", "connect", "publish"],
        actions: [A.paymentSetup],
      },
      {
        id: "paypal-connection-incomplete",
        question: "What if PayPal says my seller connection is incomplete?",
        answer:
          "Return to your payment setup page and review the status or required action. If you see an error, send support the exact error text and timestamp — never your password or PayPal credentials.",
        keywords: ["paypal", "action required", "seller connection", "onboarding"],
        actions: [A.paymentSetup, A.contactSupport],
      },
      {
        id: "payout-timing",
        question: "When do I get paid?",
        answer:
          "We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done. That applies to sales and rentals alike. Your transaction shows which steps are still open and its payout status, and support can check it with you.",
        keywords: ["payout", "get paid", "when"],
        actions: [A.viewTransactions],
      },
      {
        id: "payout-setup",
        question: "How do I set up how I get paid?",
        answer:
          "Payment setup is never required to publish — only to get paid on an online transaction. From Payment setup, sellers can connect PayPal for eligible online sales and rental hosts can connect Square. Where Vendibook records a payable for you instead, it is paid to the payout details saved under Account → Payments & payouts. We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done.",
        actions: [A.paymentSetup, A.account],
      },
      {
        id: "partial-refund",
        question: "Can a seller issue a partial refund?",
        answer:
          "Some eligible PayPal sale orders support approved partial refunds. Any refund must be confirmed by the payment provider and reflected in the transaction records.",
        keywords: ["partial refund", "refund", "seller"],
        actions: [A.viewTransactions],
      },
      {
        id: "bills-of-sale-seller",
        question: "Do I need to provide a bill of sale?",
        answer:
          "Where enabled, Vendibook prepares the sale agreement and bill of sale for e-signature by both parties. Upload the title and any registration documents to the transaction when asked, and check that every required signature is complete before treating the paperwork as finished.",
      },
      {
        id: "handoff",
        question: "What is digital handoff signoff?",
        answer:
          "Buyer and seller each record the relevant handoff or receipt confirmation in the transaction, creating a clearer documented record of delivery or pickup. For pickup, agree the time, place, loading/towing, keys and title in messages; for shipped equipment, the transaction shows delivery milestones. The buyer confirms receipt only after inspecting the equipment; your seller confirmation is separate.",
        keywords: ["handoff", "signoff", "pickup", "confirmation"],
        actions: [A.viewTransactions],
      },
    ],
  },

  // ── 5. Hosting (kitchens, commissaries, vendor spaces) ─────────
  {
    id: "hosting",
    title: "Hosting kitchens & spaces",
    blurb: "Listing a commercial kitchen, commissary, vendor spot or truck for rent.",
    entries: [
      {
        id: "list-kitchen",
        question: "How do I list a commercial kitchen or vendor space?",
        answer:
          "From your dashboard, tap Create listing and pick Commercial kitchen, Commissary, or Vendor space. The wizard collects rates, equipment, permit compatibility, availability, and photos. Publishing is free — you only pay the host commission on completed bookings.",
        actions: [A.createListing],
      },
      {
        id: "kitchen-availability",
        question: "How do I set availability?",
        answer:
          "Kitchens use hourly slots with recurring weekly rules (e.g. every Tuesday 6a–12p) plus one-off blocked dates. Vendor spaces support hourly, daily, weekly, and monthly rentals. Every listing type has a calendar you manage from the dashboard — keep it current to avoid conflicts.",
      },
      {
        id: "approve-bookings",
        question: "How do I approve booking requests?",
        answer:
          "Requests appear as in-app and email notifications and on your Hosting dashboard. Approve or decline promptly — the renter pays after you approve. Turn on Instant Book to let eligible renters book without waiting for approval.",
        actions: [A.dashboard],
      },
      {
        id: "host-square",
        question: "How do renters pay me, and do I need Square?",
        answer:
          "Rental card payments run on Square, never PayPal. You can connect your own Square account in Payment setup where available, so connected payments reach your Square account. If you haven't connected one, Vendibook collects the card payment through Square and records a host payable. We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done. If the Square connection fails or loops, note the exact screen and time and contact support.",
        keywords: ["square", "host payout", "connect square"],
        actions: [A.paymentSetup],
      },
      {
        id: "host-fees",
        question: "What does hosting cost?",
        answer:
          "Standard rentals have a 12.9% host commission and a separate 12.9% renter service fee. Pro does not discount these commissions. Checkout displays the actual calculation and any other applicable charges.",
        keywords: ["rental fee", "host fee", "renter fee", "commission"],
        actions: [A.pricing],
      },
      {
        id: "kitchen-permits",
        question: "How do I show which permits my kitchen supports?",
        answer:
          "The wizard has a permits section where you list the health department jurisdictions and permit types your kitchen is licensed for (MFF, catering, retail food, etc.). Renters can filter by permit compatibility. Not sure what to list? Use PermitPath.",
        actions: [A.permitPath],
      },
    ],
  },

  // ── 6. Memberships & billing ───────────────────────────────────
  {
    id: "memberships-billing",
    title: "Memberships & billing",
    blurb: "Free, Vendibook Pro, BuyerMatch AI, renewals, cancellations and refunds.",
    entries: [
      {
        id: "tiers-overview",
        question: "What plans are available?",
        answer:
          "Two: Free (two active listings unless grandfathered, drafts free, core buying, selling and renting) and Vendibook Pro at {{price:vendibook_pro}} (unlimited eligible active listings, one Featured Boost credit each billing period, Premium Tools and analytics including PricePilot, PermitPath Plus, priority visibility and support, eligible BuyerMatch AI buyer and renter matching support). PermitPath Plus is also available on its own for {{price:permit_path_plus_monthly}}. See the full comparison on the pricing page.",
        actions: [A.pricing],
      },
      {
        id: "pro-cost",
        question: "What does Vendibook Pro cost?",
        answer:
          "Vendibook Pro is {{price:vendibook_pro}} as a recurring membership. Confirm your renewal details and consent on the subscription screen.",
        keywords: ["pro", "price", "cost", "membership"],
        actions: [A.pricing],
      },
      {
        id: "pro-benefits",
        question: "What does Pro include?",
        answer:
          "Pro includes unlimited eligible active listings, a monthly Featured Boost credit, Premium Tools, applicable analytics, PermitPath Plus, priority visibility and support, and eligible BuyerMatch AI buyer and renter matching support. Pro does not discount commissions. Campaign timing and results vary; buyers or sales are not guaranteed.",
        keywords: ["pro", "membership", "benefits", "BuyerMatch", "boost credit"],
        actions: [A.pricing, A.subscription],
      },
      {
        id: "buyermatch-what",
        question: "What is BuyerMatch AI?",
        answer:
          "BuyerMatch AI helps research relevant buyer and renter demand and, where activated, supports reviewed outreach for eligible sale and rental listings based on equipment type, budget, location and documented purchase or rental interest.",
        keywords: ["buyermatch", "buyer match", "leads", "outreach"],
        actions: [A.buyerMatch],
      },
      {
        id: "buyermatch-guarantee",
        question: "Does BuyerMatch guarantee I will get a buyer?",
        answer:
          "No. BuyerMatch does not guarantee matches, replies, leads, sales or time to sell. Activity depends on listing eligibility, campaign activation, capacity and actual demand.",
        keywords: ["buyermatch", "guarantee", "leads"],
      },
      {
        id: "buyermatch-dashboard",
        question: "What does the BuyerMatch dashboard show?",
        answer:
          "Where available, it shows campaign activation state, genuine research, verified outreach attempts, replies, qualified conversations and attributed listing activity. It never shows invented leads or messages.",
        keywords: ["buyermatch", "dashboard", "report"],
        actions: [A.buyerMatch],
      },
      {
        id: "buyermatch-awaiting-activation",
        question: "Why does my BuyerMatch dashboard say Awaiting Activation?",
        answer:
          "Your Pro membership may be active before an individual campaign starts. Awaiting Activation means no campaign activity has run yet. Contact support if the status seems inconsistent with your membership.",
        keywords: ["buyermatch", "awaiting activation", "pending"],
        actions: [A.buyerMatch, A.contactSupport],
      },
      {
        id: "buyermatch-channels",
        question: "Which platforms does BuyerMatch use?",
        answer:
          "Supported channels can include approved public research, outreach and referral sources. A channel only counts as used when actual authorized activity is recorded; private third-party messages are not automatically accessible.",
        keywords: ["buyermatch", "channels", "platforms", "sources"],
      },
      {
        id: "included-boost-credit",
        question: "Can I use my included Featured Boost immediately?",
        answer:
          "An active Pro member can redeem one included Featured Boost credit per billing period on an eligible published listing. Credits do not roll over, transfer or convert to cash.",
        keywords: ["boost credit", "featured boost", "pro"],
        actions: [A.myListings],
      },
      {
        id: "upgrade-downgrade",
        question: "How do I upgrade or downgrade my plan?",
        answer:
          "Open Account → Subscription. Vendibook Pro is active once the billing provider confirms your payment — not just from a button click. Cancelling stops future renewals, and access continues through the period you already paid for.",
        actions: [A.subscription],
      },
      {
        id: "cancel-subscription",
        question: "Can I cancel Pro anytime?",
        answer:
          "You can cancel through Account → Subscription. Generally, future renewal stops and access continues through the paid period, subject to your billing provider and plan terms.",
        keywords: ["cancel", "pro", "subscription"],
        actions: [A.subscription, A.subTerms],
      },
      {
        id: "auto-renew",
        question: "Do subscriptions auto-renew?",
        answer:
          "Yes. Vendibook Pro and PermitPath Plus are recurring monthly memberships that renew until you cancel, and checkout asks for your explicit renewal consent. Cancelling stops the next renewal; it doesn't refund the current period.",
        actions: [A.subTerms],
      },
      {
        id: "refund-policy",
        question: "Can I get a refund of my Pro subscription?",
        answer:
          "Subscription charges are generally nonrefundable unless an approved exception applies. Cancelling a membership does not automatically refund the current paid period. One-time add-ons such as Featured Boost follow the refund terms shown for that product at purchase.",
        keywords: ["refund", "subscription", "pro"],
        actions: [A.refundPolicy, A.contactSupport],
      },
      {
        id: "receipts-invoices",
        question: "Where do I get receipts and invoices?",
        answer:
          "Every payment sends a receipt email, and your Vendibook receipts are stored under Account → Payments & payouts. Membership charges also appear with the billing provider you subscribed through (for example, PayPal).",
        actions: [A.account],
      },
      {
        id: "payment-method-update",
        question: "How do I update the card for my membership?",
        answer:
          "It depends on the billing provider for your membership. PayPal memberships are updated in your PayPal account (Automatic Payments). Check Account → Subscription to see how yours is billed. Vendibook never asks for your full card number in chat.",
        actions: [A.subscription],
      },
      {
        id: "sub-payment-failed",
        question: "My subscription payment failed — what happens?",
        answer:
          "Your billing provider may retry the payment, and you'll get an email asking you to update your payment method. If the payment isn't completed, Pro access ends and you drop to Free — nothing on your account is deleted, and you can subscribe again anytime. Contact support if you were charged but don't see Pro access.",
        actions: [A.subscription, A.contactSupport],
      },
    ],
  },

  // ── 7. Tools & add-ons ─────────────────────────────────────────
  {
    id: "tools-addons",
    title: "Tools, add-ons & services",
    blurb: "PermitPath, Premium Tools, Featured Boost, Build Studio, Atlas and one-time services.",
    entries: [
      {
        id: "permit-path",
        question: "What is PermitPath?",
        answer:
          "PermitPath is our guided compliance tool. Enter your location and business type and it generates a roadmap of the health, business, and vending permits you need — requirements, the agencies involved, official links, estimated costs and timelines, and a basic checklist. Generating and viewing a basic roadmap is free for every account. Founding members keep full Plus access free as thanks for early support.",
        actions: [A.permitPath],
      },
      {
        id: "permit-path-plus",
        question: "What does PermitPath Plus add?",
        answer:
          "Plus is the save-and-track layer: save and manage multiple roadmaps, track progress and completion, store permit numbers, details and notes, record expiration dates, watch what's expiring on the renewal dashboard, refresh saved requirements, and export. It does not send automated regulation alerts or renewal reminders. Included with Vendibook Pro. Standalone PermitPath Plus is {{price:permit_path_plus_monthly}}, and founding-member accounts keep it free.",
        actions: [A.permitPath, A.pricing],
      },
      {
        id: "pricepilot",
        question: "What is PricePilot?",
        answer:
          "PricePilot analyzes comparable listings in your market and suggests a competitive sale or rental price. Its suggestions are not certified appraisals or promises of sale. Included with Vendibook Pro.",
        actions: [{ label: "See PricePilot", href: "/plans/tools/pricepilot" }],
      },
      {
        id: "featured-boost",
        question: "What is Featured Boost?",
        answer:
          "Featured Boost ({{price:boost-featured-30}}, 30 days) gives one eligible listing a Featured badge and priority placement for 30 days. Featured slots rotate so no one listing dominates every page load. It's a one-time purchase that does not auto-renew, and it's nonrefundable once active. Vendibook Pro includes one Featured Boost credit each billing period; unused credits don't roll over.",
        actions: [{ label: "Buy Featured Boost", href: "/pricing?product=featured-boost", requiresAuth: true }],
      },
      {
        id: "pro-listing-upgrade",
        question: "What is the Pro Listing upgrade?",
        answer:
          "Pro Listing is a one-time listing-level upgrade ({{price:pro_listing_30}}, 30 days) that gives a single listing enhanced presentation and visibility for the duration of the run. It is bought per listing and does not auto-renew. It is separate from a Vendibook Pro membership.",
        actions: [A.pricing],
      },
      {
        id: "listing-rewrite",
        question: "What is AI Listing Rewrite?",
        answer:
          "AI Listing Rewrite ({{price:listing_rewrite}} per listing, one time) improves the title, description, and spec copy on a listing. It is a copy improvement only — pricing, photos, and availability stay yours to manage.",
        actions: [A.tools],
      },
      {
        id: "addon-differences",
        question: "What's the difference between Featured Boost, Pro Listing, and Vendibook Pro?",
        answer:
          "Featured Boost buys featured visibility for one listing for 30 days. Pro Listing is an enhanced-presentation upgrade for one listing for 30 days. Vendibook Pro is an account-level monthly membership: unlimited eligible listings, eligible BuyerMatch AI support (activation required), Premium Tools, PermitPath Plus, a Featured Boost credit each billing period. Pro does not change the 8.7% equipment-sale commission.",
        actions: [A.pricing],
      },
      {
        id: "build-studio",
        question: "What is Build Studio?",
        answer:
          "Build Studio is Vendibook's developing guided custom truck and trailer configuration and manufacturer-matching program. You configure a concept and request a quote; manufacturer approval and the final quotation determine what can actually be built.",
        keywords: ["build studio", "custom build", "manufacturer", "custom truck"],
        actions: [A.buildStudio],
      },
      {
        id: "build-studio-fee",
        question: "How much does Build Studio cost manufacturers?",
        answer:
          "The planned fee for qualifying Build Studio manufacturer transactions is 6.5% under separate commercial terms. A buyer's final quote and any review deposit must be disclosed before acceptance.",
        keywords: ["build studio", "manufacturer fee", "6.5%"],
        actions: [A.buildStudio],
      },
      {
        id: "atlas-assistant",
        question: "Can I use Atlas to find equipment?",
        answer:
          "Where enabled, Atlas is Vendibook's voice-led shopping assistant. It can help research real listings and navigate pages, but you must personally approve offers, purchase requests, payments and signatures. Atlas can message a seller for you while you're signed in only after you approve the exact message.",
        keywords: ["atlas", "voice", "assistant", "ai"],
        actions: [A.atlas],
      },
      {
        id: "notarization",
        question: "Do you offer notarization?",
        answer:
          "Coming soon. In-app remote online notarization for bills of sale and title transfers is on the roadmap. State availability will vary at launch. Until then, check your state's title-transfer requirements.",
        comingSoon: true,
      },
      {
        id: "tool-access",
        question: "Where do I access the tools I've unlocked?",
        answer:
          "Dashboard → Premium Tools. Every unlocked tool is one tap away; locked ones show a preview + price so you know what's available.",
        actions: [A.tools],
      },
    ],
  },

  // ── 8. Trust & safety ──────────────────────────────────────────
  {
    id: "trust-safety",
    title: "Trust & safety",
    blurb: "Identity badges, scams, reporting, disputes, and what documentation does and doesn't prove.",
    entries: [
      {
        id: "verified-badges",
        question: "What is the Identity Verified badge?",
        answer:
          "It is an optional identity-check badge, currently listed at $19.99 subject to active product terms. It does not guarantee the equipment's condition, title or seller honesty. Not every member has it, so its absence doesn't mean someone is unsafe.",
        keywords: ["verified", "badge", "identity", "plaid"],
        actions: [A.verify],
      },
      {
        id: "handoff-guarantee",
        question: "Does a video or signed handoff guarantee the equipment is problem-free?",
        answer:
          "No. They help document what was shown and acknowledged, but they don't guarantee mechanical condition or remove all legal rights and responsibilities. Inspect the equipment and title yourself.",
        keywords: ["guarantee", "video", "handoff", "condition"],
      },
      {
        id: "avoid-scams",
        question: "How do I avoid scams?",
        answer:
          "Keep messaging and payment in Vendibook. Never send wire, crypto, gift cards, or Zelle, and never share passwords, one-time codes or full card or bank numbers. Be suspicious of prices far below market, pressure to send money before viewing, or brand-new accounts with no history. If someone insists you go outside Vendibook, stop and report them.",
      },
      {
        id: "report",
        question: "How do I report a listing or user?",
        answer:
          "On any listing or profile, tap the menu (⋯) → Report. In a conversation, tap the menu → Report or Block. Reports go to our moderation team. You can also email support@vendibook.com with the URL and screenshots.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
      {
        id: "disputes",
        question: "How does the dispute process work?",
        answer:
          "First, try to resolve it directly in Vendibook messages. If that stalls, use Report an issue or the refund request option on the transaction and upload photos, documents and messages. Vendibook reviews the transaction facts, the signed terms and the payment-provider status; outcomes are not automatic, and any refund must be confirmed by the payment provider. Don't confirm receipt while an issue is open.",
        actions: [A.viewTransactions, A.contactSupport],
      },
      {
        id: "fee-transparency",
        question: "What are Vendibook's fees, exactly?",
        answer:
          "New eligible online equipment sales: 8.7% seller commission for Free and Pro sellers, $0 buyer platform fee. Rentals: 12.9% host commission + 12.9% renter service fee; the same fees apply on Free and Pro. Build Studio: a planned 6.5% manufacturer fee under separate terms. Subscriptions and one-time upgrades are separate — see the pricing page. Your transaction screen shows the actual charges.",
        actions: [A.pricing],
      },
      {
        id: "insurance",
        question: "Do you provide insurance?",
        answer:
          "Vendibook is not an insurance provider. For rentals, hosts can require renters to show proof of insurance (commercial auto, general liability), and renters can ask hosts to disclose coverage on the asset. Always confirm insurance requirements in the listing and rental agreement before booking.",
      },
    ],
  },

  // ── 9. Account ─────────────────────────────────────────────────
  {
    id: "account",
    title: "Account",
    blurb: "Updating your info, privacy, payout details, notifications, and closing your account.",
    entries: [
      {
        id: "update-info",
        question: "How do I update my info?",
        answer:
          "Open Account. Personal info (name, phone, city), public profile (display name, bio, avatar), password, and notification preferences all live here in one place.",
        actions: [A.account],
      },
      {
        id: "privacy-toggles",
        question: "What are the privacy toggles on my profile?",
        answer:
          "Under Account → Privacy you can control what's shown on your public storefront: display name vs business name, city (or hide it), review history, response time, and listing count. Contact fields (email, phone, exact address) are always private — buyers/renters only reach you through the app.",
        actions: [A.account],
      },
      {
        id: "public-profile",
        question: "What is my public storefront?",
        answer:
          "Every user has a public profile at /u/your-handle showing any badges you've earned, active listings, reviews, and the fields you've made public. Share the link; it's your storefront across the internet.",
      },
      {
        id: "update-bank",
        question: "How do I update my payout account?",
        answer:
          "Account → Payments & payouts lets you update the payout details Vendibook uses when it pays a recorded seller or host payable, and see your payout history. PayPal and Square connections are managed from Payment setup. Bank details are stored encrypted and only used to send your payout.",
        actions: [A.account, A.paymentSetup],
      },
      {
        id: "update-card",
        question: "How do I update my card on file?",
        answer:
          "Vendibook doesn't store your card for purchases — you enter it at checkout (PayPal-powered for equipment sales, Square for rentals). Membership billing is updated with your billing provider; see Account → Subscription.",
        actions: [A.subscription],
      },
      {
        id: "notification-prefs",
        question: "How do I change notification settings?",
        answer:
          "Account → Notifications. Choose per-channel (email, in-app, SMS) for messages, offers, bookings, payouts, refunds, and marketing. Critical transactional notifications (payment, dispute, delivery) can't be turned off entirely — they're required to keep transactions safe.",
        actions: [A.notifPrefs],
      },
      {
        id: "delete-account",
        question: "How do I delete my account?",
        answer:
          "Email support@vendibook.com from the address on file. Open bookings, sales, and payouts must be completed or cancelled first. Listings are unpublished, personal data is anonymized where legally possible, and transaction records are retained for tax and legal compliance.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
    ],
  },

  // ── 10. Referrals ──────────────────────────────────────────────
  {
    id: "referrals",
    title: "Refer & earn",
    blurb: "How our referral program rewards you for growing the community.",
    entries: [
      {
        id: "how-refer",
        question: "How does Refer & Earn work?",
        answer:
          "Grab your personal link from the Refer tab in your dashboard and share it. When someone signs up through your link and completes their first paid transaction, you both earn a reward. You can share by email, text, social, or QR — every share is trackable in your dashboard.",
        actions: [A.referrals],
      },
      {
        id: "referral-payout",
        question: "When do referral rewards pay out?",
        answer:
          "Rewards clear after the referred user's first transaction fully completes. Full terms and current reward amounts are on the referrals page.",
        actions: [A.referrals],
      },
      {
        id: "referral-limits",
        question: "Is there a limit on how many people I can refer?",
        answer:
          "No cap. We do watch for abusive patterns (fake accounts, self-referrals, coordinated fraud) — legit referrals from real people are always welcome.",
      },
    ],
  },
];

/**
 * Product slugs referenced with a `{{price:slug}}` token inside answers.
 * The renderer swaps them for the live catalog price so Help/FAQ copy can
 * never drift from what checkout actually charges.
 */
export const PRICE_TOKEN_PATTERN = /\{\{price:([a-z0-9_-]+)\}\}/g;

/** Replace every `{{price:slug}}` token using a slug → label lookup. */
export const resolvePriceTokens = (
  text: string,
  priceFor: (slug: string) => string | undefined,
): string =>
  text.replace(PRICE_TOKEN_PATTERN, (match, slug) => priceFor(slug) ?? match);

/** Flat list of every entry (useful for search + related). */
export const allFaqEntries = faqCategories.flatMap((c) => c.entries);

/** Look up a category by id. */
export const findFaqCategory = (id: string): FaqCategory | undefined =>
  faqCategories.find((c) => c.id === id);

/** Look up an entry by id across all categories. */
export const findFaqEntry = (id: string): FaqEntry | undefined =>
  allFaqEntries.find((e) => e.id === id);
