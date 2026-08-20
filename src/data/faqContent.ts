/**
 * Vendibook FAQ content — canonical source for /faq.
 *
 * Rules enforced here:
 *  - Every fee, tier price, and window matches the live config.
 *    Commission: 12.9% (src/lib/commissions.ts); Vendibook Pro seller/host
 *      side 10.9%, savings capped at $500 per completed transaction
 *      (src/lib/fees/proFee.ts).
 *    Plans: Free / Vendibook Pro $79/mo (monetization_products.vendibook_pro).
 *      Retired Starter / Growth / Operator / Weekly Pass tiers must never appear.
 *    Payout: Vendibook reviews and issues payouts after the transaction
 *      completes. Never describe general payouts as automatic, instant, or
 *      24-hour. The only 24-hour claim allowed is for a successfully completed
 *      FINANCED purchase (released within 24h after delivery + confirmation).
 *    Support: (725) 755-9598 · support@vendibook.com · Mon–Fri 9a–5p AZ.
 *  - Never say "escrow" — say "payment protection" or "funds are held".
 *  - Payments run on PayPal. No Stripe / Affirm / Klarna / Afterpay language.
 *  - Identity verification is optional; never imply everyone is verified.
 *  - Anything not shipped is marked "coming soon".
 *  - Answers link to real routes; long legalese defers to policy pages.
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
  viewTransactions: { label: "View transactions", href: "/transactions", requiresAuth: true },
  dashboard: { label: "Open dashboard", href: "/dashboard", requiresAuth: true },
  verify: { label: "Verify identity", href: "/verify-identity", requiresAuth: true },
  notifPrefs: { label: "Notification preferences", href: "/notification-preferences", requiresAuth: true },
  contactSupport: { label: "Contact support", href: "/contact" },
  browseRentals: { label: "Browse rentals", href: "/search?mode=rent" },
  browseSales: { label: "Browse for sale", href: "/search?mode=sale" },
  permitPath: { label: "Open PermitPath", href: "/tools/permitpath" },
  messages: { label: "Open messages", href: "/messages", requiresAuth: true },
  account: { label: "Account settings", href: "/account", requiresAuth: true },
  pricing: { label: "See plans", href: "/pricing" },
  subscription: { label: "Manage subscription", href: "/account/subscription", requiresAuth: true },
  tools: { label: "Open Premium Tools", href: "/dashboard/tools", requiresAuth: true },
  referrals: { label: "Refer & earn", href: "/refer", requiresAuth: true },
  purchases: { label: "My purchases", href: "/purchases", requiresAuth: true },
  refundPolicy: { label: "Refund policy", href: "/legal/refund-policy" },
  subTerms: { label: "Subscription terms", href: "/legal/subscription-terms" },
  terms: { label: "Terms of service", href: "/legal/terms" },
} satisfies Record<string, FaqAction>;

const PRICING_CATEGORY: FaqCategory = {
  id: "pricing-fees",
  title: "Pricing, fees & financing",
  blurb:
    "Free to list. 12.9% only when a transaction runs through Vendibook — and $0 when a sale is paid in person.",
  // Namespaced: several pricing FAQ ids (e.g. "payout-timing") also exist as
  // full entries in the selling category. Prefixing keeps entry ids unique.
  entries: PRICING_FAQ.map((e) => ({
    id: `pricing-${e.id}`,
    question: e.question,
    answer: e.answer,
    keywords: ["fees", "pricing", "commission", "cost", "paypal", "financing"],
    actions: e.cta ? [{ label: e.cta.label, href: e.cta.href }] : undefined,
  })),
};

export const faqCategories: FaqCategory[] = [
  PRICING_CATEGORY,
  // ── 1. Getting started ─────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "What Vendibook is, how accounts work, and what identity verification unlocks.",
    entries: [
      {
        id: "what-is-vendibook",
        question: "What is Vendibook?",
        answer:
          "Vendibook is the verified marketplace for mobile food and beverage businesses. Buy or sell food trucks and trailers, rent trucks, kitchens, commissaries and vendor spaces, and run the entire deal — messaging, payments, e-signed agreements, deposits, payouts — in one place.",
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
          "No. Every account can browse, book, sell, and host. Your dashboard shows Buying and Hosting workspaces side by side — use the persona switch in the sidebar to jump between them. You never need a second account.",
        actions: [A.dashboard],
      },
      {
        id: "identity-verification",
        question: "What is identity verification and who needs it?",
        answer:
          "Identity verification is an optional paid add-on ($19.99, one time) powered by Plaid. It is never required to buy, sell, rent, publish a listing, or get paid. What it does is put the Identity Verified badge on your profile and listings — sellers who carry it typically get more replies and faster offers because buyers know a real person is behind the truck.",
        keywords: ["kyc", "identity", "verification", "badge", "verified"],
        actions: [A.verify],
      },
      {
        id: "verification-fails",
        question: "My identity check failed — what now?",
        answer:
          "You'll see the exact reason on the verification page and can retry with a clearer document. Nothing on your account is blocked in the meantime — verification is optional, so you can keep listing, selling, and getting paid. If a retry still fails, email support@vendibook.com and we'll review manually.",
        actions: [A.verify, A.contactSupport],
      },
      {
        id: "coverage",
        question: "Where is Vendibook available?",
        answer:
          "Anywhere in the United States. Listing density, freight, and inspection partners vary by market — the search page shows what's live near you today.",
      },
      {
        id: "contact-support",
        question: "How do I contact support?",
        answer:
          "Call (725) 755-9598, email support@vendibook.com, or open the Contact page. Live support is Monday–Friday, 9am–5pm Arizona time (Arizona doesn't observe DST). Off-hours messages get a reply the next business day.",
        actions: [
          A.contactSupport,
          { label: "Call support", href: "tel:+17257559598" },
          { label: "Email support", href: "mailto:support@vendibook.com" },
        ],
      },
    ],
  },

  // ── 2. Buying ──────────────────────────────────────────────────
  {
    id: "buying",
    title: "Buying",
    blurb: "Making offers, paying, financing, delivery, and what to do if something's wrong.",
    entries: [
      {
        id: "how-buying-works",
        question: "How does buying work start to finish?",
        answer:
          "Browse listings, message the seller with any questions, and either buy at the asking price or make an offer. When the seller accepts, you either pay in person (if the seller offers it) or check out online through PayPal — card, bank, or PayPal balance. Funds are held rather than sent straight to the seller until you confirm you received exactly what was listed. If you never confirm, we auto-complete 7 days after delivery. Vendibook then reviews and issues the seller's payout. You get a bill of sale, e-signed by both sides, in your dashboard.",
        actions: [A.browseSales],
      },
      {
        id: "make-offer",
        question: "How do I make an offer?",
        answer:
          "On any for-sale listing, click Make an offer, enter your amount, and add an optional note. Sellers can accept, decline, or counter. Offers expire after 48 hours if the seller doesn't respond.",
      },
      {
        id: "message-seller",
        question: "How do I message the seller?",
        answer:
          "Open the listing and click Message. All conversations stay in Vendibook so we have a record if there's ever a dispute. Photos, PDFs, and DOCX up to 10MB attach directly.",
        actions: [A.messages],
      },
      {
        id: "payment-methods",
        question: "What payment methods do you accept?",
        answer:
          "Vendibook checkout runs on PayPal Business: pay with your PayPal balance, a linked bank account, or any major debit/credit card through PayPal — no PayPal account required to use a card. Buyer financing through our financing partner is available on eligible for-sale listings, and Pay in Person is available when the seller has enabled it. Vendibook never sees or stores your card number.",
      },
      {
        id: "financing",
        question: "Can I finance a food truck or trailer instead of paying cash?",
        answer:
          "Yes. Buyer financing is available on eligible published for-sale listings through the third-party financing partner Vendibook surfaces — currently Equinox Funding. You apply directly from the listing and can download a Pro Forma Invoice (with the VIN/serial) to submit with the application. The seller does not manage your application or make the lending decision. Vendibook is not a lender: we do not approve applicants, set rates or terms, or guarantee funding or timing. See /financing for the current provider details.",
        keywords: ["financing", "monthly", "loan", "equinox", "equipment financing"],
        actions: [{ label: "Explore financing", href: "/financing" }],
      },
      {
        id: "payment-protection",
        question: "How does payment protection work?",
        answer:
          "When you pay through Vendibook, your money is held by our payment processor, PayPal — not sent to the seller yet. The seller only gets paid after you confirm you received exactly what was listed. If you never confirm, we auto-complete 7 days after delivery. Vendibook reviews the transaction and then issues the seller's payout, so raise any issue before you confirm receipt.",
        keywords: ["payment protection", "protection", "hold", "safe"],
      },
      {
        id: "delivery-options",
        question: "How does delivery, pickup, or freight work?",
        answer:
          "It depends on what the seller offers. Common options are local pickup by you, seller-arranged delivery when the seller offers it, freight you arrange yourself, or Vendibook-coordinated freight where it is available. Where the delivery checker is enabled on a listing, it returns an estimate for your address before you commit — not every listing has nationwide delivery or a guaranteed quote. The buyer is generally responsible for delivery cost.",
      },
      {
        id: "confirm-delivery",
        question: "When and how do I confirm delivery?",
        answer:
          "After the truck arrives and you've done a full walkaround with the title and keys in hand, open the transaction and tap Confirm receipt. This completes the sale and starts Vendibook's payout review. Don't confirm until documents and any promised extras are physically with you — confirmation cannot be reversed once the payout is released.",
        actions: [A.viewTransactions],
      },
      {
        id: "something-wrong",
        question: "What if something is wrong when it arrives?",
        answer:
          "Don't confirm receipt. Open the transaction and click Request refund or Report an issue. Upload photos, the bill of sale, and any messages. Our team mediates within 1 business day. If we can't resolve it with the seller directly, we open a formal dispute and can refund from the funds we're holding.",
        actions: [A.viewTransactions, A.contactSupport],
      },
      {
        id: "refund-window",
        question: "How long do I have to request a refund?",
        answer:
          "Up to 7 days after delivery, at which point the sale auto-completes. Once you confirm receipt, the payout moves into release, so open any dispute before confirming. The listing's cancellation policy governs pre-delivery cancellations — you'll see the exact refund amount before you confirm any cancellation.",
        actions: [A.refundPolicy],
      },
      {
        id: "bills-of-sale",
        question: "Do I get a bill of sale?",
        answer:
          "Yes. Every completed sale generates a bill of sale, e-signed by both buyer and seller inside Vendibook. E-signature is included free — no DocuSign account or upsell. Download the signed PDF from your transaction page anytime.",
        actions: [A.viewTransactions],
      },
      {
        id: "off-platform-warning",
        question: "Can I pay the seller outside Vendibook?",
        answer:
          "You can, but you lose every protection: no payment hold, no dispute mediation, no refund coverage, no bill of sale, no verified-user backstop. Sellers who push you to pay by wire, crypto, gift card, or Zelle are almost always fraud. Report them and don't send money.",
      },
    ],
  },

  // ── 3. Renting ─────────────────────────────────────────────────
  {
    id: "renting",
    title: "Renting",
    blurb: "Booking trucks, kitchens, and vendor spaces — agreements, deposits, cancellations.",
    entries: [
      {
        id: "how-renting-works",
        question: "How does renting work?",
        answer:
          "Pick your dates on the listing calendar (or slot for hourly listings), submit a booking request, and pay when the host approves. Instant Book listings skip approval — payment confirms immediately. You'll e-sign the rental agreement, upload any required documents (license, insurance, permits), confirm pickup in the app, and confirm return at the end.",
        actions: [A.browseRentals],
      },
      {
        id: "request-vs-instant",
        question: "What's the difference between request-to-book and Instant Book?",
        answer:
          "Request-to-book: you submit dates, the host reviews and approves (or declines) within 24 hours, then you're charged. Instant Book: you're charged immediately — no host approval needed. Hosts choose per listing.",
      },
      {
        id: "rental-agreements",
        question: "Do I sign a rental agreement?",
        answer:
          "Yes. Every rental generates an agreement covering dates, price, deposit, mileage/hour limits, insurance requirements, and the host's own terms. Both parties e-sign inside Vendibook — free, legally binding, no third-party account needed.",
      },
      {
        id: "deposits",
        question: "How do deposits work?",
        answer:
          "The deposit is a real charge (not just a hold) collected alongside your rental payment. It's refunded to your card within 5–10 business days after you return the asset and the host closes out with no deductions. Hosts can only deduct with an itemized claim + evidence, filed within 48 hours of return. You get 48 hours to accept or dispute the claim — we mediate if you disagree.",
      },
      {
        id: "cancellation-policies",
        question: "What are cancellation policies?",
        answer:
          "Each listing displays its policy (Flexible / Moderate / Strict) before you book. You see the exact refund amount for your specific dates before confirming any cancellation. If the host cancels, you're refunded in full automatically — including all fees.",
      },
      {
        id: "extend-rental",
        question: "Can I extend a rental?",
        answer:
          "Yes. Open the transaction and Request extension. The host approves the new end date and additional charges are billed to your original payment method.",
      },
      {
        id: "damage-return",
        question: "What if the asset is damaged or returned late?",
        answer:
          "Document with photos and timestamps at pickup and return. Hosts have 48 hours after return to file a claim with evidence. You have 48 hours to accept or dispute. If disputed, our team reviews photos, messages, and the signed agreement, then decides — funds only come out of the deposit with our approval.",
      },
    ],
  },

  // ── 4. Selling ─────────────────────────────────────────────────
  {
    id: "selling",
    title: "Selling",
    blurb: "Publishing for free, listing limits, offers, fees, payouts, and bills of sale.",
    entries: [
      {
        id: "list-for-free",
        question: "Is it free to list on Vendibook?",
        answer:
          "Yes. Creating an account and publishing a standard listing are free, subject to the active-listing limit on your plan. Identity verification is not required to publish. You only pay when a sale or booking completes on-platform (12.9% seller/host commission, 10.9% with active Vendibook Pro) or when you buy an optional upgrade like Featured Boost.",
        actions: [A.createListing],
      },
      {
        id: "listing-limits",
        question: "How many listings can I have?",
        answer:
          "Free: 2 active listings. Vendibook Pro ({{price:vendibook_pro}}): unlimited. Founding-member accounts keep unlimited listings on the Free plan as thanks for early support.",
        actions: [A.pricing],
        keywords: ["limit", "cap", "how many", "founding"],
      },
      {
        id: "good-listing",
        question: "What makes a great listing?",
        answer:
          "Ten or more sharp daylight photos including the interior, equipment, and exterior from all angles. A clear title that includes year/make/model. A description that covers equipment, condition, service history, and what's included. Accurate specs (year, mileage, dimensions, generator hours, permits). Firm pricing. Fast replies to messages. Vendibook Pro members can auto-generate a polished description via Listing Studio.",
        actions: [{ label: "Try Listing Studio", href: "/tools/listing-studio" }],
      },
      {
        id: "offers-negotiation",
        question: "How do offers and counteroffers work?",
        answer:
          "Buyers can send an offer with an optional message. You can Accept, Decline, or Counter. Counteroffers are single-use — the buyer has 48 hours to accept, decline, or send a new offer. Accepting creates the transaction immediately.",
      },
      {
        id: "seller-fees",
        question: "What are the seller fees?",
        answer:
          "12.9% platform commission on sales paid through Vendibook checkout. Buyers pay $0 in platform fees. Pay-in-Person equipment sales are 100% free (no commission, no fee) since we're not processing payment. Rentals: 12.9% host commission + 12.9% renter service fee. Active Vendibook Pro members pay 10.9% on the seller/host side, with savings capped at $500 per completed transaction.",
        actions: [A.pricing],
      },
      {
        id: "payout-timing",
        question: "When do I get paid?",
        answer:
          "Vendibook reviews and issues your payout after the transaction completes — for a sale that means after delivery or handoff is confirmed (or 7 days after delivery if the buyer never confirms), and for a rental after the booking has started and completed as agreed. Payouts are not automatic or instant. Payouts are sent to the destination you have on file: PayPal, Venmo, Cash App, or bank transfer. One exception: on a successfully completed financed purchase, seller payment is released within 24 hours after successful delivery and confirmation.",
      },
      {
        id: "payout-setup",
        question: "How do I get paid — how do I connect my bank?",
        answer:
          "After you publish, save your payout details from your dashboard or Account → Payments & payouts. Choose PayPal, Venmo, Cash App, or bank transfer. Payout details are never required to publish — only to get paid. Vendibook reviews and releases seller payouts manually.",
        actions: [A.account],
      },
      {
        id: "bills-of-sale-seller",
        question: "Do I need to provide a bill of sale?",
        answer:
          "Vendibook generates the bill of sale automatically for every completed sale, pre-filled with the price, both parties' info, and asset details. You just e-sign in the app. Upload the vehicle title and any registration documents to the transaction page after payment — they're shared privately with the buyer.",
      },
      {
        id: "handoff",
        question: "How does the handoff work?",
        answer:
          "For pickup: coordinate a meet time in messages, hand over keys and title, and both parties tap Confirm handoff. For freight (yours or Vendibook-facilitated): schedule the carrier after payment clears, upload the shipping BOL to the transaction, and confirm dispatch. In every case, the buyer confirms receipt in the app when it arrives — that's what starts your payout clock.",
      },
    ],
  },

  // ── 5. Hosting (kitchens, commissaries, vendor spaces) ─────────
  {
    id: "hosting",
    title: "Hosting kitchens & spaces",
    blurb: "Listing a commercial kitchen, commissary, or vendor spot for rental.",
    entries: [
      {
        id: "list-kitchen",
        question: "How do I list a commercial kitchen or vendor space?",
        answer:
          "From your dashboard, tap Create listing and pick Commercial kitchen, Commissary, or Vendor space. The wizard collects hourly and daily rates, equipment, permit compatibility, availability, and photos. Publishing is free — you only pay commission on completed bookings.",
        actions: [A.createListing],
      },
      {
        id: "kitchen-availability",
        question: "How do I set availability?",
        answer:
          "Kitchens use hourly slots with recurring weekly rules (e.g. every Tuesday 6a–12p) plus one-off blocked dates. Vendor spaces support hourly, daily, weekly, and monthly rentals. Every listing type has a calendar you manage from the dashboard.",
      },
      {
        id: "approve-bookings",
        question: "How do I approve booking requests?",
        answer:
          "Requests appear as in-app + email notifications and on your Hosting dashboard. Approve or decline within 24 hours. Turn on Instant Book to skip approval — a good move once your listing has reviews.",
        actions: [A.dashboard],
      },
      {
        id: "host-fees",
        question: "What does hosting cost?",
        answer:
          "Publishing is free. When a booking pays, Vendibook takes 12.9% commission from your payout and adds a separate 12.9% service fee to the renter's total. Vendibook Pro members pay a reduced 10.9% commission on their side (up to $500 saved per transaction) — see the pricing page.",
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
    blurb: "Free, Vendibook Pro, billing, renewals, and cancellations.",
    entries: [
      {
        id: "tiers-overview",
        question: "What plans are available?",
        answer:
          "Two: Free (2 active listings, core buying, selling and renting) and Vendibook Pro at {{price:vendibook_pro}} (unlimited listings, the Premium Tools bundle including PricePilot / Listing Studio / Marketing Studio, PermitPath Plus, advanced seller analytics, one Featured Boost credit each paid billing period, and a reduced 10.9% seller/host fee capped at $500 saved per completed transaction). PermitPath Plus is also available on its own for {{price:permit_path_plus_monthly}}. See the full comparison on the pricing page.",
        actions: [A.pricing],
      },
      {
        id: "pro-benefits",
        question: "What exactly do I get with Vendibook Pro?",
        answer:
          "Vendibook Pro is {{price:vendibook_pro}}, billed monthly in advance, cancel anytime. It includes: a reduced 10.9% seller/host transaction fee instead of 12.9% (savings capped at $500 per completed transaction); one Featured Boost credit each paid billing period (unused credits do not roll over, and an activated boost finishes its 30-day run even if Pro later ends); unlimited active listings; the Premium Tools bundle and advanced seller analytics; and PermitPath Plus included. Cancelling stops the next renewal and your benefits stay active through the period you already paid for — there is no prorated refund simply for cancelling early.",
        keywords: ["pro", "membership", "benefits", "10.9", "boost credit"],
        actions: [A.pricing, A.subscription],
      },
      {
        id: "upgrade-downgrade",
        question: "How do I upgrade or downgrade my plan?",
        answer:
          "Open Account → Membership. Starting Vendibook Pro takes effect immediately; cancelling takes effect at the end of your current billing period so you don't lose anything you've paid for.",
        actions: [A.subscription],
      },
      {
        id: "cancel-subscription",
        question: "How do I cancel my subscription?",
        answer:
          "Cancel anytime online from Account → Membership — no phone call, no email required. Cancellation is scheduled for the end of your current billing period; you keep full access until that date, then drop to Free. Auto-renewal stops immediately.",
        actions: [A.subscription, A.subTerms],
      },
      {
        id: "auto-renew",
        question: "Do subscriptions auto-renew?",
        answer:
          "Yes. Vendibook Pro and PermitPath Plus are billed monthly in advance and renew each month at the price you signed up at. We email a receipt with every renewal. Cancel anytime online — cancellation stops the next renewal and your benefits stay active through the period you already paid for. There is no prorated refund simply for cancelling early.",
        actions: [A.subTerms],
      },
      {
        id: "refund-policy",
        question: "What's the refund policy on subscriptions?",
        answer:
          "Monthly subscription fees are non-refundable, but you can cancel anytime to stop future charges and you keep access through the period you already paid for. We refund one-time upgrade purchases (Featured Boost, Pro Listing, tools) if the feature never delivered — email support with your receipt.",
        actions: [A.refundPolicy, A.contactSupport],
      },
      {
        id: "receipts-invoices",
        question: "Where do I get receipts and invoices?",
        answer:
          "Every payment sends a receipt email. Subscription charges also appear in your PayPal account activity, and every Vendibook receipt is stored under Account → Payments & payouts.",
        actions: [A.account],
      },
      {
        id: "payment-method-update",
        question: "How do I update my card?",
        answer:
          "Payment methods for Vendibook memberships are managed inside your PayPal account. Vendibook never sees or stores your card details.",
        actions: [A.account],
      },
      {
        id: "sub-payment-failed",
        question: "My subscription payment failed — what happens?",
        answer:
          "PayPal retries a failed subscription payment automatically for up to a week. You'll get an email with a link to fix the payment method. During retry, you keep full access. If every retry fails, access pauses and you drop to Free — nothing on your account is deleted; upgrade again anytime to restore everything.",
      },
    ],
  },

  // ── 7. Tools & add-ons ─────────────────────────────────────────
  {
    id: "tools-addons",
    title: "Tools & add-ons",
    blurb: "PermitPath, Premium Tools, Featured Boost, and one-time services.",
    entries: [
      {
        id: "permit-path",
        question: "What is PermitPath?",
        answer:
          "PermitPath is our guided compliance tool. Enter your location and business type and it generates a roadmap of the health, business, and vending permits you need — requirements, the agencies involved, official links, estimated costs and timelines, and a basic checklist. Generating and viewing a roadmap is free for every account. Founding members keep full Plus access free as thanks for early support.",
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
          "PricePilot analyzes comparable listings in your market and recommends a competitive sale or rental price. Included with Vendibook Pro.",
        actions: [{ label: "See PricePilot", href: "/plans/tools/pricepilot" }],
      },
      {
        id: "listing-studio",
        question: "What is Listing Studio?",
        answer:
          "Listing Studio uses AI to rewrite your listing — title, description, and highlights — for higher conversion. Generates in seconds, editable to your voice. Included with Vendibook Pro.",
        actions: [{ label: "See Listing Studio", href: "/plans/tools/listing-studio" }],
      },
      {
        id: "marketing-studio",
        question: "What is Marketing Studio?",
        answer:
          "Marketing Studio generates ad copy, social captions, and email blurbs for your listing — sized for Instagram, Facebook, and Google. Included with Vendibook Pro.",
        actions: [{ label: "See Marketing Studio", href: "/plans/tools/marketing-studio" }],
      },
      {
        id: "market-radar",
        question: "What is Market Radar?",
        answer:
          "Market Radar tracks demand, supply, and average pricing by city and category so you know where to buy, sell, or expand. Included with Vendibook Pro.",
        actions: [{ label: "See Market Radar", href: "/plans/tools/market-radar" }],
      },
      {
        id: "concept-lab",
        question: "What is Concept Lab?",
        answer:
          "Concept Lab helps you validate a food concept — menu ideas, pricing, target market, break-even math — before you buy a truck. Included with Vendibook Pro.",
        actions: [{ label: "See Concept Lab", href: "/plans/tools/concept-lab" }],
      },
      {
        id: "buildkit",
        question: "What is BuildKit?",
        answer:
          "BuildKit is the Vendibook Pro planner for building or converting your own truck: layout templates, equipment lists, generator sizing, budget calculator, and vendor referrals.",
        actions: [{ label: "See BuildKit", href: "/plans/tools/buildkit" }],
      },
      {
        id: "featured-boost",
        question: "What is Featured Boost?",
        answer:
          "Featured Boost pins your listing to the top of relevant search and category pages for 30 days, adds a Featured badge, and shows on the home page's featured strip. Featured slots rotate so no one listing dominates every page load. It's a one-time purchase and does not auto-renew. Vendibook Pro includes one Featured Boost credit each paid billing period; unused credits don't roll over, and a boost you've already activated finishes its 30-day run even if Pro later ends.",
        actions: [{ label: "Buy Featured Boost", href: "/pricing?product=featured-boost", requiresAuth: true }],
      },
      {
        id: "pro-listing-upgrade",
        question: "What is the Pro Listing upgrade?",
        answer:
          "Pro Listing is a one-time listing-level upgrade ({{price:pro_listing_30}}, 30 days) that gives a single listing premium presentation and priority placement treatment on Vendibook for the duration of the run. It is bought per listing and does not auto-renew. It is separate from a Vendibook Pro membership.",
        actions: [A.pricing],
      },
      {
        id: "concierge-listing",
        question: "What is Concierge Listing?",
        answer:
          "Concierge Listing ({{price:listing_concierge}}, one time) is an optional service where the Vendibook team builds and polishes the listing for you from the details and photos you provide. Self-service listing stays free — Concierge just hands the work to us. We do not publish a guaranteed turnaround time.",
        actions: [{ label: "See Concierge", href: "/list/concierge" }],
      },
      {
        id: "listing-rewrite",
        question: "What is the Listing Rewrite service?",
        answer:
          "Listing Rewrite ({{price:listing_rewrite}}, one time) improves the title, description, and spec copy on a listing you have already published. It is a copy improvement only — pricing, photos, and availability stay yours to manage.",
        actions: [A.tools],
      },
      {
        id: "addon-differences",
        question: "What's the difference between Featured Boost, Pro Listing, and Vendibook Pro?",
        answer:
          "Featured Boost buys visibility for one listing for 30 days. Pro Listing is a premium upgrade applied to one listing for 30 days. Vendibook Pro is an account-level monthly membership: unlimited listings, the reduced 10.9% seller/host fee, premium tools, PermitPath Plus, and a Featured Boost credit each paid billing period.",
        actions: [A.pricing],
      },
      {
        id: "notarization",
        question: "Do you offer notarization?",
        answer:
          "Coming soon. In-app remote online notarization for bills of sale and title transfers is on the roadmap. State availability will vary at launch. In the meantime, our e-signature covers what's legally required in most states for private-party truck sales.",
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
    blurb: "How we protect your money, verify users, and handle disputes.",
    entries: [
      {
        id: "how-protection-works",
        question: "How does payment protection actually work?",
        answer:
          "When you pay on Vendibook, your money is held by our payment processor (PayPal) — not sent to the seller. The seller only gets paid after you confirm you got exactly what was listed, and Vendibook reviews the transaction before issuing the payout. Raise any issue before you confirm receipt. Pay-in-person deals happen directly between the two parties and are not covered by this hold.",
      },
      {
        id: "verified-badges",
        question: "What does the verified badge mean?",
        answer:
          "It means that person paid for the optional Plaid identity check and it passed, so their legal identity is confirmed. Most Vendibook members are not verified — it's a voluntary paid add-on, so its absence doesn't mean someone is unsafe, and its presence isn't a guarantee of behavior. Either way, keep messages and payment on-platform.",
      },
      {
        id: "avoid-scams",
        question: "How do I avoid scams?",
        answer:
          "Never move payment or messaging off Vendibook. Never send wire, crypto, gift cards, or Zelle. Be suspicious of prices way below market, urgency to send money before viewing, or brand-new accounts with no reviews. Every real transaction on Vendibook can be completed inside the app — if someone insists you go outside it, they're almost certainly a scammer.",
      },
      {
        id: "report",
        question: "How do I report a listing or user?",
        answer:
          "On any listing or profile, tap the menu (⋯) → Report. In a conversation, tap the menu → Report or Block. Reports go to our moderation team and we review within 1 business day. You can also email support@vendibook.com with the URL and screenshots.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
      {
        id: "disputes",
        question: "How does the dispute process work?",
        answer:
          "Step 1: Try to resolve directly via in-app messages — most issues clear here. Step 2: If that stalls, open Request refund or Report an issue on the transaction page. Vendibook reviews within 1 business day, contacts both parties for evidence, and issues a decision: full refund, partial refund, or release to seller. Step 3: If either party disagrees with the decision, escalate to support for admin review. Because we hold funds throughout, we can actually enforce the outcome.",
        actions: [A.viewTransactions],
      },
      {
        id: "fee-transparency",
        question: "What are Vendibook's fees, exactly?",
        answer:
          "Sales through Vendibook checkout: 12.9% commission from the seller, $0 from the buyer. Rentals: 12.9% commission from the host + 12.9% service fee on the renter. Pay-in-Person equipment sales: 100% free (no commission, no fee). Active Vendibook Pro members pay 10.9% on the seller/host side, capped at $500 saved per completed transaction. Subscriptions and one-time upgrades are separate — see the pricing page.",
        actions: [A.pricing],
      },
      {
        id: "insurance",
        question: "Do you provide insurance?",
        answer:
          "Vendibook is not an insurance provider. For rentals, hosts can require renters to show proof of insurance (commercial auto, general liability), and renters can require hosts to disclose coverage on the asset. Always confirm insurance requirements in the listing before booking. We're evaluating partner-provided policies for the future.",
      },
    ],
  },

  // ── 9. Account ─────────────────────────────────────────────────
  {
    id: "account",
    title: "Account",
    blurb: "Updating your info, privacy, bank details, cards, notifications, and closing your account.",
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
          "Every user has a public profile at /u/your-handle showing your verified badge, active listings, reviews, and the fields you've made public. Share the link; it's your storefront across the internet.",
      },
      {
        id: "update-bank",
        question: "How do I update my bank / payout account?",
        answer:
          "Account → Payments & payouts → Update payout details lets you change your payout destination (PayPal, Venmo, Cash App, or bank transfer) and see your payout history. Bank details are stored encrypted and are only used to send your payout.",
        actions: [A.account],
      },
      {
        id: "update-card",
        question: "How do I update my card on file?",
        answer:
          "Account → Payments & payouts shows your Vendibook receipts. Saved payment methods and card updates are managed in your PayPal account.",
        actions: [A.account],
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
          "Email support@vendibook.com from the address on file. We confirm any open transactions and close the account within 5 business days. Listings are unpublished, personal data is anonymized where legally possible, and transaction records are retained for tax/legal compliance. Open bookings, sales, and payouts must be completed or cancelled first.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
    ],
  },

  // ── 10. Referrals ──────────────────────────────────────────────
  {
    id: "referrals",
    title: "Refer & earn",
    blurb: "How our referral program pays you for growing the community.",
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
          "Rewards clear after the referred user's first transaction fully completes (buyer confirmation + payout window). Once cleared, rewards drop into your account balance or issue as an ACH payout depending on amount. Full terms and current reward amounts are on the referrals page.",
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
export const PRICE_TOKEN_PATTERN = /\{\{price:([a-z0-9_\-]+)\}\}/g;

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
