/**
 * Vendibook FAQ content.
 *
 * All answers here reflect the platform's current, code-verified behavior:
 *  - Commission model: src/lib/commissions.ts (rental 12.9% host + 12.9% renter;
 *    sale 12.9% seller / $0 buyer; Pay-in-Person sales = 0% commission).
 *  - Payout timing: rentals 24h, sales 25d after buyer confirms receipt
 *    (project memory / cash-transaction-workflow).
 *  - Payment methods: Stripe checkout with Affirm / Afterpay / Klarna
 *    (see src/pages/BookingCheckout.tsx, PricingCalculator.tsx).
 *  - Location privacy: 800m masking until confirmed booking.
 *  - Support: (725) 755-9598, support@vendibook.com, Mon-Fri 9-5 AZ (no DST).
 *
 * Where a policy is intentionally configurable per listing (deposits,
 * cancellation windows, required documents), the copy defers to the listing
 * detail page rather than stating a fixed rule.
 */

export interface FaqAction {
  /** Short button label. */
  label: string;
  /** Internal route (starts with `/`) or absolute URL / mailto:/ tel: */
  href: string;
  /** Optional auth requirement hint shown to the user. */
  requiresAuth?: boolean;
}

export interface FaqEntry {
  /** Stable id — used for anchors, related links, analytics. */
  id: string;
  question: string;
  answer: string;
  /** Optional secondary keywords to boost search matching. */
  keywords?: string[];
  /** Direct actions the user can take about this question. */
  actions?: FaqAction[];
  /** Ids of related entries surfaced under the answer. */
  related?: string[];
}

export interface FaqCategory {
  id: string;
  title: string;
  /** Optional 1-line description shown under the category title. */
  blurb?: string;
  entries: FaqEntry[];
}

// -------- Reusable action shortcuts --------
const A = {
  createListing: { label: "Create a listing", href: "/list", requiresAuth: true },
  viewTransactions: { label: "View transactions", href: "/transactions", requiresAuth: true },
  dashboard: { label: "Open dashboard", href: "/dashboard", requiresAuth: true },
  verify: { label: "Continue verification", href: "/verify-identity", requiresAuth: true },
  notifPrefs: { label: "Notification preferences", href: "/notification-preferences", requiresAuth: true },
  contactSupport: { label: "Request support", href: "/contact" },
  helpCenter: { label: "Open Help Center", href: "/help" },
  browseRentals: { label: "Browse rentals", href: "/search?mode=rent" },
  browseSales: { label: "Browse for sale", href: "/search?mode=sale" },
  permitPath: { label: "Open Permit Path", href: "/tools/permit-path" },
  messages: { label: "Open messages", href: "/messages", requiresAuth: true },
  favorites: { label: "Saved listings", href: "/favorites", requiresAuth: true },
  account: { label: "Account settings", href: "/account", requiresAuth: true },
} satisfies Record<string, FaqAction>;

// Convenience: safe factory (avoid mutating the shared A record).
const act = (a: FaqAction, override?: Partial<FaqAction>): FaqAction => ({ ...a, ...override });

export const faqCategories: FaqCategory[] = [
  // ── Getting Started ─────────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting started",
    entries: [
      {
        id: "what-is-vendibook",
        question: "What is Vendibook?",
        answer:
          "Vendibook is a verified marketplace for mobile food and beverage businesses. You can buy or sell food trucks and trailers, rent trucks, trailers, commercial kitchens, commissaries, and vendor spaces, and manage the whole transaction — messaging, payments, agreements, and payouts — in one place.",
        keywords: ["about", "platform", "marketplace", "overview"],
        actions: [A.browseRentals, A.browseSales],
      },
      {
        id: "who-can-use",
        question: "Who can use Vendibook?",
        answer:
          "Anyone in the U.S. over 18 with a valid email address. Buyers, renters, sellers, and hosts share one account and can switch between browsing and hosting tools from the dashboard.",
        keywords: ["account", "eligibility", "us", "age"],
      },
      {
        id: "what-can-i-list",
        question: "What can I list on Vendibook?",
        answer:
          "Food trucks, food trailers, and carts (for sale or for rent), commercial kitchens and commissaries, and vendor spaces. Related equipment can be included with a listing; standalone equipment-only listings are not currently supported.",
        keywords: ["listing", "categories", "trailer", "kitchen", "commissary", "vendor"],
        actions: [A.createListing],
      },
      {
        id: "free-account",
        question: "Is it free to create an account?",
        answer:
          "Yes. Signing up and browsing are always free. You only pay when a transaction happens on-platform or when you buy an optional listing upgrade.",
      },
      {
        id: "free-publish",
        question: "Is it free to publish a listing?",
        answer:
          "Yes. Publishing a standard listing is free. Optional paid upgrades (Featured Boost and promoted placements) are available at checkout and are never required to publish.",
        actions: [A.createListing],
      },
      {
        id: "coverage",
        question: "Where is Vendibook available?",
        answer:
          "Vendibook operates across the United States. Listing volume, freight availability, and inspection partners vary by market — the search page will show what's currently active near you.",
        keywords: ["locations", "cities", "states", "coverage"],
      },
      {
        id: "does-vendibook-own",
        question: "Does Vendibook own the listed trucks, trailers, kitchens, or spaces?",
        answer:
          "No. Vendibook is a marketplace. Every listing is owned by an independent seller or host. Vendibook handles the transaction infrastructure, not the assets themselves.",
      },
      {
        id: "contact-support",
        question: "How do I contact Vendibook support?",
        answer:
          "Call (725) 755-9598, email support@vendibook.com, or use the Contact page. Live support hours are Monday–Friday, 9am–5pm Arizona time (no daylight savings). Outside those hours you can leave a message and we respond the next business day.",
        actions: [A.contactSupport, { label: "Call support", href: "tel:+17257559598" }, { label: "Email support", href: "mailto:support@vendibook.com" }],
      },
    ],
  },

  // ── Accounts & Profiles ──────────────────────────────────────────
  {
    id: "accounts-profiles",
    title: "Accounts and profiles",
    entries: [
      {
        id: "create-account",
        question: "How do I create an account?",
        answer:
          "Click Sign up and register with email + password or Google. You'll be sent a verification email — click the link to activate your account. Google sign-ins are activated immediately.",
        actions: [{ label: "Sign up", href: "/auth?mode=signup" }],
      },
      {
        id: "edit-profile",
        question: "How do I edit my profile?",
        answer:
          "Open Account settings from the header menu. You can update your display name, business name, avatar, phone number, city, and bio. Public profile fields are shown on your storefront; contact fields stay private.",
        actions: [A.account],
      },
      {
        id: "change-email-phone",
        question: "How do I change my email address or phone number?",
        answer:
          "Update your phone under Account. Email changes are handled through Account → Security; you'll receive a confirmation link at the new address before the change takes effect.",
        actions: [A.account],
      },
      {
        id: "reset-password",
        question: "How do I reset my password?",
        answer:
          "On the sign-in page, click 'Forgot password'. Enter your email and we'll send a secure reset link that expires after one hour.",
        actions: [{ label: "Reset password", href: "/reset-password" }],
      },
      {
        id: "one-account-buyer-seller",
        question: "Can I use one account as both a buyer and a seller?",
        answer:
          "Yes. Every account can browse, book, sell, and host from the same login. The dashboard automatically shows the right tools based on what you're doing.",
      },
      {
        id: "switch-buyer-host",
        question: "How do I switch between buyer and host tools?",
        answer:
          "Use the account menu in the header — 'My purchases and rentals' opens buyer/renter views; 'Hosting' opens listings, bookings, and payouts. No role change is required.",
        actions: [A.dashboard],
      },
      {
        id: "close-account",
        question: "How do I close my account?",
        answer:
          "Email support@vendibook.com from the address on file. We will confirm any open transactions and close the account within 5 business days. Active bookings, sales, and payouts must be completed or cancelled first.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
      {
        id: "active-on-close",
        question: "What happens to active listings or transactions if I close my account?",
        answer:
          "Listings are unpublished and archived. Open bookings and sales are held for resolution — either completed with the counterparty or refunded per the listing's cancellation terms. Records remain in the database for legal and tax retention.",
      },
      {
        id: "data-protection",
        question: "How is my information protected?",
        answer:
          "All traffic uses TLS. Passwords are hashed. Payment card data is handled exclusively by Stripe (Vendibook never sees or stores card numbers). Identity documents are only visible to Vendibook support and the payment provider — never to another user.",
      },
      {
        id: "public-vs-private",
        question: "Which profile information is visible to other users?",
        answer:
          "Publicly visible: display name (or business name), avatar, city/state, verification badges, listing count, and reviews. Private: email, phone number, exact address, payout details, and identity documents.",
      },
    ],
  },

  // ── Verification ─────────────────────────────────────────────────
  {
    id: "verification",
    title: "Verification",
    entries: [
      {
        id: "why-verify",
        question: "Why does Vendibook request identity verification?",
        answer:
          "Verification reduces fraud, unlocks higher-value transactions, and is required by our payment processor before payouts can be sent. It protects buyers, renters, hosts, and sellers alike.",
        actions: [A.verify],
      },
      {
        id: "who-must-verify",
        question: "Which users must complete verification?",
        answer:
          "Hosts and sellers must verify identity before receiving a payout. Buyers and renters may be asked to verify for high-value transactions or when a host requires it on their listing.",
      },
      {
        id: "verify-documents",
        question: "What documents may be required?",
        answer:
          "A government-issued photo ID (driver's license, passport, or state ID) plus a live selfie for face-match. The check runs through Stripe Identity — Vendibook does not store the raw document image.",
      },
      {
        id: "verify-time",
        question: "How long does verification usually take?",
        answer:
          "Most checks complete within a few minutes. Manual review takes up to 1–2 business days. You'll receive a notification (and email) with the result.",
      },
      {
        id: "verify-fails",
        question: "What happens if verification fails?",
        answer:
          "You'll see the reason on the verification page and can retry with a different document or a clearer photo. If automated checks continue to fail, contact support for manual review.",
        actions: [A.verify, A.contactSupport],
      },
      {
        id: "verify-manual",
        question: "Can Vendibook manually approve verification?",
        answer:
          "Yes, in limited cases. If your ID is valid but automated checks are inconclusive, our team can review documentation manually — email support@vendibook.com after two failed attempts.",
      },
      {
        id: "id-visible-to-other-user",
        question: "Is my identity document visible to another user?",
        answer:
          "No. Identity documents are only visible to Vendibook and Stripe Identity. The other party sees only your verified badge and display name.",
      },
      {
        id: "verify-pending",
        question: "Why is my verification status still pending?",
        answer:
          "Pending usually means the check is waiting on Stripe review, additional documents, or an out-of-hours manual review. If it's been more than 2 business days, contact support with your account email.",
        actions: [A.contactSupport],
      },
    ],
  },

  // ── Listings & Publishing ────────────────────────────────────────
  {
    id: "listings-publishing",
    title: "Listing creation and publishing",
    entries: [
      {
        id: "publish-listing",
        question: "How do I publish a listing?",
        answer:
          "Open 'Create a listing', pick For Sale or For Rent, complete the wizard (photos, pricing, availability, location, policies), then click Publish. The wizard auto-saves as you go and shows exactly which fields are still required.",
        actions: [A.createListing],
      },
      {
        id: "listing-types",
        question: "Which listing types are supported?",
        answer:
          "Food trucks and trailers (for sale or rent), commercial kitchens, commissaries, and vendor spaces. Each type surfaces the fields relevant to that category (equipment, hourly slots, permit compatibility, etc.).",
      },
      {
        id: "listing-required-info",
        question: "What information is required?",
        answer:
          "Title, category, description, at least one photo, price (sale price or hourly/daily/weekly/monthly rate depending on mode), city/state, and a geocoded address. Rentals also require availability. Optional-but-recommended: equipment list, amenities, and cancellation policy.",
      },
      {
        id: "listing-photos",
        question: "How many photos can I upload?",
        answer:
          "Up to 20 photos per listing. HEIC uploads from iPhone are converted automatically. The first photo is used as the cover — you can reorder by drag & drop.",
      },
      {
        id: "listing-draft",
        question: "Can I save a listing as a draft?",
        answer:
          "Yes. Drafts save automatically after every step. You can leave the wizard and return from your dashboard to resume where you left off.",
        actions: [A.dashboard],
      },
      {
        id: "listing-wont-publish",
        question: "Why will my listing not publish?",
        answer:
          "Publishing checks that all required fields are filled, at least one photo is uploaded, the address geocoded successfully, and (for hosts) a payout account is connected. The Publish button lists any missing pieces before you can submit.",
      },
      {
        id: "edit-published",
        question: "How do I edit a published listing?",
        answer:
          "From your dashboard, open the listing and click Edit. Changes are live immediately. Price changes do not affect confirmed bookings or accepted offers already in flight.",
        actions: [A.dashboard],
      },
      {
        id: "pause-unpublish",
        question: "How do I pause or unpublish a listing?",
        answer:
          "In the listing editor, change the status to Paused. Paused listings are hidden from search but keep their URL, reviews, and analytics. You can republish anytime.",
      },
      {
        id: "mark-sold",
        question: "How do I mark a listing as sold or unavailable?",
        answer:
          "Sale listings are marked Sold automatically when a transaction is completed. You can also mark a listing Sold or Unavailable manually from the dashboard.",
      },
      {
        id: "under-review",
        question: "Why is my listing under review?",
        answer:
          "New listings and edits that touch price, category, or ownership may be routed to moderation. Reviews typically take under 2 business hours during support hours.",
      },
      {
        id: "vendibook-remove-listing",
        question: "Can Vendibook remove a listing?",
        answer:
          "Yes, if it violates our Terms — misleading claims, prohibited items, spam, or non-compliant vending assets. We contact the owner with the reason and the option to appeal.",
      },
      {
        id: "featured-listings",
        question: "How are featured listings displayed?",
        answer:
          "Featured listings receive priority placement in search and category pages, a Featured badge, and a 30-day boost. Featured status is applied automatically after payment confirmation.",
      },
      {
        id: "multiple-listings",
        question: "Can I create multiple listings?",
        answer:
          "Yes. There's no limit. Many hosts run several trucks or kitchen slots from a single account.",
      },
      {
        id: "duplicate-relist",
        question: "How do I duplicate or relist an older listing?",
        answer:
          "From your dashboard, open the archived or sold listing and choose Duplicate. All fields prefill so you only need to update photos, price, and availability.",
      },
    ],
  },

  // ── Buying ───────────────────────────────────────────────────────
  {
    id: "buying",
    title: "Buying",
    entries: [
      {
        id: "contact-seller",
        question: "How do I contact a seller?",
        answer:
          "Open the listing and click Message host/seller. All communication stays on-platform so Vendibook can help if there's a dispute.",
        actions: [A.messages],
      },
      {
        id: "make-offer",
        question: "How do I make an offer?",
        answer:
          "On any for-sale listing, click Make an offer, enter your amount, and optionally add a note. Offers expire after 48 hours if the seller doesn't respond.",
      },
      {
        id: "inspect-before-buy",
        question: "Can I inspect a truck or trailer before buying?",
        answer:
          "Yes. You can request an inspection or in-person viewing through the listing before paying. Vendibook does not guarantee mechanical condition, so on high-value purchases we recommend a professional pre-purchase inspection.",
      },
      {
        id: "seller-verified",
        question: "How do I know whether a seller is verified?",
        answer:
          "Verified sellers show a checkmark badge on their profile and listing. Hover the badge to see what has been verified (identity, payout account).",
      },
      {
        id: "condition-guarantee",
        question: "Does Vendibook guarantee the condition of a listing?",
        answer:
          "No. Sellers are responsible for accurate descriptions and photos. Vendibook protects the transaction (payment escrow, dispute mediation) but does not inspect assets or warrant condition.",
      },
      {
        id: "financing",
        question: "Can I finance a purchase?",
        answer:
          "Yes, when the listing supports it. Affirm covers $35–$30,000 with monthly plans, Afterpay covers up to $4,000 in 4 payments, and Klarna is available on eligible listings. Selection happens at Stripe checkout — you'll see your rate before you commit.",
      },
      {
        id: "out-of-state",
        question: "Can I purchase from another state?",
        answer:
          "Yes. Vendibook supports interstate sales. Freight can be quoted at $4.50/mile through the platform, or you can arrange your own carrier and coordinate pickup.",
      },
      {
        id: "transportation",
        question: "How does transportation work?",
        answer:
          "For sale listings, choose Pickup, Buyer-arranged freight, or Vendibook-facilitated freight at checkout. Freight is scheduled after payment clears and tracked on your transaction page.",
      },
      {
        id: "verify-before-pay",
        question: "What should I verify before paying?",
        answer:
          "Confirm the price, delivery method, seller identity (verified badge), documentation (title/registration), and any promises made in messages. Never move payment off-platform — off-platform payments lose Vendibook protection.",
      },
      {
        id: "protected-sale",
        question: "What is a Vendibook Protected Sale?",
        answer:
          "A Protected Sale is one processed by Vendibook through Stripe. Funds are held until the buyer confirms receipt, giving you 25 days of dispute coverage. Pay-in-Person sales do not include this protection.",
      },
      {
        id: "pay-seller-in-person",
        question: "Can I pay the seller directly in person?",
        answer:
          "Only if the seller has enabled Pay in Person on the listing. Cash sales are 100% free (no commission), but Vendibook cannot escrow funds or mediate payment disputes on off-platform payments.",
      },
      {
        id: "after-offer-accepted",
        question: "What happens after my offer is accepted?",
        answer:
          "A transaction is created in your dashboard. You'll see the next step (usually payment or documents), the agreed terms, and messages with the seller — all in one place.",
        actions: [A.viewTransactions],
      },
      {
        id: "confirm-receipt",
        question: "When should I confirm that I received the vehicle or trailer?",
        answer:
          "Confirm receipt only after physical delivery and a walkaround. Confirmation releases the seller's payout, so make sure documents (title, keys, and any agreed extras) are in hand first.",
      },
    ],
  },

  // ── Selling ──────────────────────────────────────────────────────
  {
    id: "selling",
    title: "Selling",
    entries: [
      {
        id: "receive-inquiries",
        question: "How do I receive buyer inquiries?",
        answer:
          "Inquiries and offers arrive as in-app notifications and email. All conversations live under Messages, and offers appear on your dashboard.",
        actions: [A.dashboard, A.notifPrefs],
      },
      {
        id: "respond-offer",
        question: "How do I respond to an offer?",
        answer:
          "From the offer notification or dashboard, choose Accept, Decline, or Counter. Accepting creates the transaction immediately.",
      },
      {
        id: "accept-decline-counter",
        question: "Can I accept, decline, or counter an offer?",
        answer:
          "Yes. Counteroffers are single-use — the buyer has 48 hours to accept, decline, or send a new offer.",
      },
      {
        id: "change-price",
        question: "How do I change my asking price?",
        answer:
          "Edit the listing from your dashboard. Existing accepted offers are unaffected; new offers use the new price.",
      },
      {
        id: "ownership-docs",
        question: "How do I provide ownership documents?",
        answer:
          "Upload title, registration, and any bill of sale from the transaction page after the buyer pays. Documents are shared only with the buyer for that transaction.",
      },
      {
        id: "seller-payout-timing",
        question: "When do I receive payment?",
        answer:
          "Sale payouts release 25 days after the buyer confirms receipt — this matches Stripe's dispute window. Rental payouts release 24 hours after the booking's start (see Rentals).",
      },
      {
        id: "buyer-no-confirm",
        question: "What happens if the buyer does not confirm receipt?",
        answer:
          "If the buyer doesn't confirm within 7 days of delivery, Vendibook auto-completes the transaction so your 25-day payout clock can start. If the buyer disputes, the auto-complete is paused pending review.",
      },
      {
        id: "report-buyer",
        question: "How do I report a problem with a buyer?",
        answer:
          "Open the transaction and click Report an issue, or contact support directly. Include photos and messages — evidence speeds up review.",
        actions: [A.contactSupport],
      },
      {
        id: "seller-pro-white-glove",
        question: "What are Seller Pro and White Glove services?",
        answer:
          "Seller Pro is an optional package that upgrades your listing (priority placement, professional listing polish, buyer analytics). White Glove is a hands-on service where our team writes copy, arranges photography, and manages inquiries. Both are optional add-ons.",
      },
      {
        id: "listing-help",
        question: "Can Vendibook help create my listing?",
        answer:
          "Yes. Our AI Listing Studio suggests copy and pricing. For full assistance, choose White Glove at listing time or contact support.",
        actions: [{ label: "Open Listing Studio", href: "/tools/listing-studio" }],
      },
      {
        id: "sell-without-vendibook-payment",
        question: "Can I sell without using Vendibook payment processing?",
        answer:
          "You can enable Pay in Person on a sale listing, which lets you and the buyer complete cash payments locally. Vendibook still tracks the handoff (4-step confirmation) but does not process funds or mediate payment disputes.",
      },
    ],
  },

  // ── Renting ──────────────────────────────────────────────────────
  {
    id: "renting",
    title: "Renting",
    entries: [
      {
        id: "rentals-work",
        question: "How do rentals work?",
        answer:
          "Pick dates on the listing, submit a booking request (or Book Instantly on Instant Book listings), pay when the host approves, exchange contact info via the platform, and confirm pickup and return in the app.",
        actions: [A.browseRentals],
      },
      {
        id: "request-dates",
        question: "How do renters request dates?",
        answer:
          "Select an available range on the calendar. Blocked dates and existing bookings are automatically excluded. Hourly listings use a slot picker instead of full days.",
      },
      {
        id: "rental-confirmed",
        question: "When is a rental confirmed?",
        answer:
          "Confirmation happens when the host approves and payment succeeds. Instant Book listings skip the approval step — payment confirms the booking immediately.",
      },
      {
        id: "host-required-docs",
        question: "What documents can a host require?",
        answer:
          "Common requirements: driver's license, insurance certificate, business license, food handler's card, or health permit. The listing shows required documents up front; you'll upload them before checkout.",
      },
      {
        id: "when-charged",
        question: "When is the renter charged?",
        answer:
          "For request-to-book listings, payment is captured when the host approves. For Instant Book, payment is captured immediately. Card is authorized at checkout in both cases.",
      },
      {
        id: "host-payout-timing",
        question: "When does the host receive the payout?",
        answer:
          "Rental payouts release 24 hours after the booking's scheduled start. Payouts arrive in your bank via Stripe within 1–2 business days after release.",
      },
      {
        id: "deposits-handled",
        question: "How are security deposits handled?",
        answer:
          "Deposits are set per listing. Where a listing lists a deposit, it is captured with the rental payment and held until return; the host requests deductions with evidence, and Vendibook mediates if the renter disputes.",
      },
      {
        id: "damage",
        question: "What happens if the rental is damaged?",
        answer:
          "Document the damage with photos and dates. The host files a claim from the transaction page within 48 hours of return. Vendibook reviews evidence from both parties and applies deductions from the deposit or opens a dispute.",
      },
      {
        id: "extensions",
        question: "How do extensions work?",
        answer:
          "Request an extension from the transaction page. The host approves the new end date and additional charges are billed to the same payment method.",
      },
      {
        id: "cancellations",
        question: "How do cancellations work?",
        answer:
          "Cancellation terms are set per listing (flexible, moderate, strict) and shown before you book. Refunds process to your original payment method within 5–10 business days.",
      },
      {
        id: "host-cancels",
        question: "What happens if the host cancels?",
        answer:
          "You receive a full refund automatically, and Vendibook helps you find an alternative when available. Repeated host cancellations affect the host's standing on the platform.",
      },
      {
        id: "renter-no-show",
        question: "What happens if the renter does not arrive?",
        answer:
          "Hosts should attempt to reach the renter through in-app messages first. If the renter is a no-show, the host reports it and Vendibook applies the listing's cancellation policy.",
      },
      {
        id: "pickup-return-confirmations",
        question: "How do pickup and return confirmations work?",
        answer:
          "Both parties confirm pickup at the start and return at the end from the transaction page. Confirmations trigger notifications and, on return, start the deposit-release timer.",
      },
      {
        id: "additional-charges",
        question: "Can additional charges be requested after the rental?",
        answer:
          "Yes — for damage, extra hours, cleaning fees, or fuel, if the listing lists those charges. Renters have 48 hours to accept or dispute an additional charge before it's automatically approved.",
      },
      {
        id: "rental-disputes",
        question: "How are rental disputes handled?",
        answer:
          "Open a dispute from the transaction page. Vendibook admins review messages, photos, and the agreed terms snapshot, then issue a decision (release, partial refund, or full refund).",
      },
    ],
  },

  // ── Hosting ──────────────────────────────────────────────────────
  {
    id: "hosting",
    title: "Hosting",
    entries: [
      {
        id: "become-host",
        question: "How do I become a host?",
        answer:
          "Publish a rental listing and connect your Stripe payout account. That's it — no separate signup.",
        actions: [A.createListing],
      },
      {
        id: "host-tools",
        question: "What tools does hosting include?",
        answer:
          "Availability calendar, hourly and daily pricing, deposits, required documents, cancellation policies, messaging, analytics, and Stripe payouts. Advanced hosts can add subscription pricing or Instant Book.",
      },
      {
        id: "host-fees",
        question: "What does hosting cost?",
        answer:
          "Hosting is free. When a booking pays, Vendibook takes a 12.9% commission from your payout and adds a separate 12.9% service fee to the renter. See the Fees section for the full math.",
      },
      {
        id: "instant-book",
        question: "How does Instant Book work?",
        answer:
          "When you enable Instant Book, renters can confirm without waiting for approval. It typically increases bookings but requires clear rules and documents up front.",
      },
    ],
  },

  // ── Food trucks & trailers ───────────────────────────────────────
  {
    id: "food-trucks-trailers",
    title: "Food trucks and trailers",
    entries: [
      {
        id: "trucks-vs-trailers",
        question: "What's the difference between a truck and a trailer on Vendibook?",
        answer:
          "Trucks are self-propelled vehicles; trailers are towed. Both share the same booking, payout, and inspection flows. Trailer listings surface hitch class and tow weight; truck listings surface engine and drivetrain fields.",
      },
      {
        id: "truck-inspections",
        question: "Are food trucks inspected before being listed?",
        answer:
          "No. Owners self-attest condition. For rentals we recommend renters run a pre-trip inspection (from the checklist in Help); for purchases we recommend a paid pre-purchase inspection.",
      },
      {
        id: "generator-propane",
        question: "Are generator hours and propane included?",
        answer:
          "That's set per listing. Look for the equipment and inclusions section on the listing — if it isn't listed, ask the host in messages before booking.",
      },
    ],
  },

  // ── Commercial kitchens & commissaries ───────────────────────────
  {
    id: "commercial-kitchens",
    title: "Commercial kitchens and commissaries",
    entries: [
      {
        id: "find-kitchen",
        question: "How do I find a commercial kitchen?",
        answer:
          "Filter search by category: Commercial kitchen or Commissary. Filter further by hourly availability, equipment, or permit compatibility.",
        actions: [{ label: "Browse kitchens", href: "/search?category=commercial_kitchen" }],
      },
      {
        id: "what-is-commissary",
        question: "What is a commissary?",
        answer:
          "A commissary is a licensed base of operations for mobile food vendors — used for prep, storage, cleaning, and often required by local health departments for permit compliance.",
      },
      {
        id: "hourly-daily-monthly-kitchen",
        question: "Can I rent kitchen space hourly, daily, or monthly?",
        answer:
          "Yes. Kitchens choose which pricing tiers they offer. The listing shows available rates and any minimum block.",
      },
      {
        id: "recurring-availability",
        question: "Can hosts add recurring availability?",
        answer:
          "Yes. Hosts can define recurring weekly time slots (e.g., every Tuesday 6am–12pm) plus one-off blocked dates.",
      },
      {
        id: "storage-cleaning-fees",
        question: "Are storage, cleaning, or equipment fees included?",
        answer:
          "That depends on the listing. Check the Inclusions and Additional fees sections before booking. Message the host if anything is unclear.",
      },
      {
        id: "kitchen-permits",
        question: "How do I know which permits a kitchen supports?",
        answer:
          "Kitchens list the permit types they can support (health department, MFF, catering). For full compliance walk-through, use Permit Path.",
        actions: [A.permitPath],
      },
      {
        id: "kitchen-inspections",
        question: "Does Vendibook inspect commercial kitchens?",
        answer:
          "No. Hosts self-attest and provide their own health department permits. Renters are welcome to tour before booking.",
      },
      {
        id: "message-before-booking",
        question: "Can I message the kitchen before booking?",
        answer:
          "Yes — open the listing and click Message host. Many hosts encourage a walkthrough before your first booking.",
        actions: [A.messages],
      },
    ],
  },

  // ── Vendor spaces ────────────────────────────────────────────────
  {
    id: "vendor-spaces",
    title: "Vendor spaces",
    entries: [
      {
        id: "what-is-vendor-space",
        question: "What is a vendor space?",
        answer:
          "A vendor space is a rentable spot for mobile vendors — a parking lot slot, food hall stall, event booth, or private property location. Vendor spaces can be booked hourly, daily, weekly, or monthly.",
        actions: [{ label: "Browse vendor spaces", href: "/search?category=vendor_space" }],
      },
      {
        id: "vendor-space-utilities",
        question: "Do vendor spaces include power and water?",
        answer:
          "It depends on the listing. Look for the Amenities section (power/water hookups, cover, waste). If not listed, confirm with the host before booking.",
      },
    ],
  },

  // ── Payments ─────────────────────────────────────────────────────
  {
    id: "payments",
    title: "Payments",
    entries: [
      {
        id: "payment-methods",
        question: "Which payment methods are accepted?",
        answer:
          "Credit/debit cards, Apple Pay, and Google Pay everywhere. ACH is available on eligible sales above $5,000. Where enabled by the listing: Affirm, Afterpay, Klarna, and Pay in Person (cash).",
      },
      {
        id: "bnpl",
        question: "Does Vendibook accept buy-now-pay-later options?",
        answer:
          "Yes. Affirm (up to $30k monthly plans), Afterpay (up to $4k, 4 payments), and Klarna are offered at checkout when the listing amount qualifies.",
      },
      {
        id: "payment-failed",
        question: "Why did my payment fail?",
        answer:
          "Common reasons: card declined, insufficient funds, wrong billing zip, or your bank blocking the charge for review. Try a different card or contact your bank, then retry from the transaction page.",
        actions: [A.viewTransactions],
      },
      {
        id: "payment-pending",
        question: "Why is my payment still pending?",
        answer:
          "Some methods (ACH, BNPL) confirm asynchronously. Your dashboard updates to Paid as soon as Stripe confirms the payment — usually within minutes for cards, up to 3 business days for ACH.",
      },
      {
        id: "charged-twice",
        question: "Will I be charged twice if I refresh the page?",
        answer:
          "No. Checkout uses an idempotency key so refreshing or clicking Pay again does not create a duplicate charge. If you ever see two charges, contact support with both transaction IDs.",
      },
      {
        id: "receipt",
        question: "How do I obtain a receipt?",
        answer:
          "Every successful payment emails a receipt automatically. You can also download a PDF receipt from the transaction page.",
        actions: [A.viewTransactions],
      },
      {
        id: "payment-history",
        question: "Where can I view payment history?",
        answer:
          "Open Transactions from your dashboard — every payment, refund, and payout is listed with status and Stripe reference.",
        actions: [A.viewTransactions],
      },
      {
        id: "fees-work",
        question: "How do fees work?",
        answer:
          "Rentals: 12.9% commission from the host + 12.9% service fee added to the renter. Sales: 12.9% commission from the seller; buyers pay no platform fee. Pay-in-Person sales are 100% free.",
      },
      {
        id: "fees-refundable",
        question: "Are fees refundable?",
        answer:
          "When Vendibook issues a full refund (e.g., host cancels, dispute resolved in buyer's favor), platform fees are refunded too. On partial refunds, fees are refunded proportionally.",
      },
      {
        id: "off-platform-payment",
        question: "Can a payment be completed outside Vendibook?",
        answer:
          "Off-platform payments lose all Vendibook protection: no escrow, no dispute mediation, no chargeback support. We strongly discourage it and never require it.",
      },
      {
        id: "payment-protection",
        question: "How are payment details protected?",
        answer:
          "Card details are entered directly into Stripe's PCI-compliant checkout — Vendibook never sees or stores card numbers. All API calls use TLS.",
      },
    ],
  },

  // ── Deposits ─────────────────────────────────────────────────────
  {
    id: "deposits",
    title: "Deposits",
    entries: [
      {
        id: "deposit-charge-or-hold",
        question: "Is a deposit a charge or an authorization?",
        answer:
          "On Vendibook a deposit is a captured charge (not a hold), collected alongside the rental payment. It's returned to your original payment method after the host closes out the rental with no deductions.",
      },
      {
        id: "deposit-refunded",
        question: "When is my deposit refunded?",
        answer:
          "After both parties confirm return and the host either closes the rental without deductions or the 48-hour claim window passes without a claim. Refunds arrive within 5–10 business days.",
      },
      {
        id: "deposit-deducted",
        question: "Can a host deduct from my deposit?",
        answer:
          "Only through an itemized claim with evidence, filed within 48 hours of return. You have 48 hours to accept or dispute the claim. Vendibook mediates disputes; hosts cannot deduct arbitrarily.",
      },
    ],
  },

  // ── Payouts ──────────────────────────────────────────────────────
  {
    id: "payouts",
    title: "Payouts",
    entries: [
      {
        id: "payout-method",
        question: "How do hosts and sellers receive payouts?",
        answer:
          "Payouts go through Stripe Connect to the U.S. bank account you connect during onboarding. Vendibook never sees your bank details.",
      },
      {
        id: "connect-payout",
        question: "How do I connect my payout account?",
        answer:
          "From the dashboard, click Connect payouts. You'll complete Stripe's onboarding (identity + bank routing/account) directly with Stripe. Onboarding usually takes 3–5 minutes.",
        actions: [A.dashboard],
      },
      {
        id: "payout-restricted",
        question: "Why is my payout account restricted?",
        answer:
          "Stripe restricts accounts that need additional information (SSN, address, business docs) or that have flagged transactions. Open the payout section of your dashboard to see the exact action required.",
        actions: [A.dashboard],
      },
      {
        id: "payout-timing",
        question: "When is my payout released?",
        answer:
          "Rentals: 24 hours after the booking's scheduled start. Sales: 25 days after the buyer confirms receipt (matches Stripe's dispute window). After release, your bank typically receives funds within 1–2 business days.",
      },
      {
        id: "payout-pending",
        question: "Why is my payout pending?",
        answer:
          "Reasons: booking hasn't started yet, buyer hasn't confirmed receipt, Stripe onboarding incomplete, or an open dispute. The transaction page shows the specific reason.",
      },
      {
        id: "payout-failed",
        question: "What happens if a payout fails?",
        answer:
          "Stripe retries automatically. Common causes are closed bank accounts or wrong routing numbers. Update your bank in the Stripe payout portal and Vendibook will retry within 24 hours.",
      },
      {
        id: "change-payout-destination",
        question: "Can Vendibook change my payout destination?",
        answer:
          "No. Payout destinations are managed inside Stripe by the account owner. This protects you from unauthorized changes.",
      },
      {
        id: "payout-history",
        question: "Where can I view payout history?",
        answer:
          "Payouts appear on the dashboard alongside each transaction, and detailed history is available in your Stripe payout portal.",
        actions: [A.dashboard],
      },
    ],
  },

  // ── Refunds & cancellations ──────────────────────────────────────
  {
    id: "refunds-cancellations",
    title: "Refunds and cancellations",
    entries: [
      {
        id: "request-refund",
        question: "How do I request a refund?",
        answer:
          "Open the transaction and click Request refund. Add a reason and any evidence. Vendibook reviews and applies the cancellation policy on the listing.",
        actions: [A.viewTransactions],
      },
      {
        id: "approve-refund",
        question: "Who approves refunds?",
        answer:
          "Refunds within the listing's cancellation policy process automatically. Refunds outside the policy require host approval or Vendibook admin review.",
      },
      {
        id: "refund-timing",
        question: "How long do refunds take?",
        answer:
          "Once issued, refunds appear on your card statement within 5–10 business days. ACH refunds may take up to 10 business days.",
      },
      {
        id: "refund-fees",
        question: "Are transaction fees refundable?",
        answer:
          "Yes on full refunds; proportionally on partial refunds. Non-refundable service fees are called out explicitly in your cancellation summary before you confirm.",
      },
      {
        id: "cant-complete",
        question: "What happens if a seller or host cannot complete the transaction?",
        answer:
          "You get a full refund automatically. Vendibook may compensate you (rebooking credit, transportation reimbursement) on a case-by-case basis and takes action on the counterparty's account when they cancel repeatedly.",
      },
      {
        id: "cancel-after-payment",
        question: "What happens if I cancel after payment?",
        answer:
          "Your refund follows the listing's cancellation policy. The exact refundable amount and any non-refundable portion are shown before you confirm the cancellation.",
      },
      {
        id: "refund-status",
        question: "Where can I see refund status?",
        answer:
          "Every transaction page shows the current refund state: Requested, Approved, Refund processing, Refunded, or Denied.",
        actions: [A.viewTransactions],
      },
      {
        id: "refund-fails",
        question: "What happens if a refund fails?",
        answer:
          "Stripe notifies us and retries. If your card is closed, we contact you for a working destination. Refunds cannot be denied once processed — only rerouted.",
      },
    ],
  },

  // ── Protected transactions ───────────────────────────────────────
  {
    id: "protected-transactions",
    title: "Protected transactions",
    entries: [
      {
        id: "what-is-protected",
        question: "What is a protected transaction?",
        answer:
          "Any rental or sale paid through Vendibook (Stripe). Funds are held in escrow, messages are archived, agreements are captured as an immutable snapshot, and Vendibook can mediate disputes.",
      },
      {
        id: "protected-vs-inperson",
        question: "How is a protected transaction different from Pay in Person?",
        answer:
          "Protected transactions run payment through Stripe with escrow and dispute coverage. Pay in Person is a cash handoff — Vendibook tracks the 4-step confirmation for a record but does not hold funds.",
      },
    ],
  },

  // ── In-person transactions ───────────────────────────────────────
  {
    id: "in-person-transactions",
    title: "In-person transactions",
    entries: [
      {
        id: "pay-in-person",
        question: "What is Pay in Person?",
        answer:
          "Pay in Person lets buyers and sellers complete a sale with cash at pickup. It's optional per listing. There is no Vendibook commission on Pay-in-Person sales.",
      },
      {
        id: "in-person-flow",
        question: "How does the Pay-in-Person flow work?",
        answer:
          "Four steps in-app: (1) Request submitted → (2) Seller confirms → (3) Buyer confirms → (4) Completed. Payment happens at the meeting; the app records the confirmation.",
      },
      {
        id: "in-person-safety",
        question: "Is Pay in Person safe?",
        answer:
          "Vendibook cannot escrow or mediate off-platform payments. We recommend a public meeting place, a witness, and photo documentation. If in doubt, use a protected online payment instead.",
      },
    ],
  },

  // ── Documents & contracts ────────────────────────────────────────
  {
    id: "documents-contracts",
    title: "Documents and contracts",
    entries: [
      {
        id: "supported-docs",
        question: "What documents does Vendibook support?",
        answer:
          "Identity, driver's license, commercial auto insurance, certificate of insurance, health permit, business license, food handler card, commissary agreement, rental agreement, purchase agreement, bill of sale, inspection reports, and pickup/return checklists.",
      },
      {
        id: "upload-doc",
        question: "How do I upload a required document?",
        answer:
          "From the transaction or listing page, click the document slot and pick a file (or use your phone camera). PDF, JPG, PNG, HEIC are supported up to 10 MB.",
      },
      {
        id: "doc-privacy",
        question: "Who can see my documents?",
        answer:
          "Only the transaction counterparty (host or renter/buyer as appropriate) and Vendibook staff for support. Storage URLs are signed and time-limited.",
      },
      {
        id: "doc-rejected",
        question: "What if my document is rejected?",
        answer:
          "You'll get an in-app + email notification with the reason and can upload a new file immediately. The transaction stays in an awaiting-documents state until an approved file is on file.",
      },
      {
        id: "immutable-terms",
        question: "Can the agreed terms change after I book?",
        answer:
          "No. When a booking or sale is created, the terms are captured as an immutable snapshot. Any later listing edits do not change your agreement.",
      },
    ],
  },

  // ── Inspections ──────────────────────────────────────────────────
  {
    id: "inspections",
    title: "Inspections",
    entries: [
      {
        id: "inspection-required",
        question: "Are inspections required?",
        answer:
          "Not required. Highly recommended for purchases over a few thousand dollars. Some hosts require a pre-trip inspection checklist on rentals — this is set per listing.",
      },
      {
        id: "who-inspects",
        question: "Who performs the inspection?",
        answer:
          "You do (visual walkaround) or a paid third party (mechanic, food-truck inspector). Vendibook does not perform inspections itself.",
      },
    ],
  },

  // ── Transportation ───────────────────────────────────────────────
  {
    id: "transportation",
    title: "Transportation",
    entries: [
      {
        id: "freight-options",
        question: "What transportation options are available?",
        answer:
          "Pickup by the buyer or renter, buyer-arranged carrier, or Vendibook-facilitated freight. Freight quotes use $4.50/mile as a baseline and are confirmed with a carrier before scheduling.",
      },
      {
        id: "freight-timing",
        question: "How long does freight take?",
        answer:
          "Typically 3–10 business days after scheduling, depending on distance and carrier availability. You'll receive updates when the carrier is booked, when it ships, and when it delivers.",
      },
    ],
  },

  // ── Financing ────────────────────────────────────────────────────
  {
    id: "financing",
    title: "Financing",
    entries: [
      {
        id: "who-offers-financing",
        question: "Who provides Vendibook financing?",
        answer:
          "Financing is provided by third-party lenders (Affirm, Afterpay, Klarna) at checkout — not by Vendibook. Rates and eligibility are set by the lender based on your credit.",
      },
      {
        id: "affirm-details",
        question: "How does Affirm work on Vendibook?",
        answer:
          "Affirm handles $35 – $30,000 with monthly payments up to 36 months. Select Affirm at Stripe checkout, enter your info, and see your rate before committing. No hidden fees.",
      },
    ],
  },

  // ── Permit Path ──────────────────────────────────────────────────
  {
    id: "permit-path",
    title: "Permit Path",
    entries: [
      {
        id: "what-is-permit-path",
        question: "What is Permit Path?",
        answer:
          "Permit Path is our guided tool for figuring out which health, business, and vending permits you need in your city and state. It saves your progress and tracks issue and expiration dates.",
        actions: [A.permitPath],
      },
      {
        id: "permit-path-legal-advice",
        question: "Is Permit Path legal advice?",
        answer:
          "No. Permit Path is a research tool. Always confirm requirements with your local health department and business licensing office before operating.",
      },
    ],
  },

  // ── Listing upgrades ─────────────────────────────────────────────
  {
    id: "listing-upgrades",
    title: "Listing upgrades",
    entries: [
      {
        id: "what-are-upgrades",
        question: "What are listing upgrades?",
        answer:
          "Optional paid boosts that increase visibility. The main one is Featured Boost (30 days of priority placement + a badge). Upgrades are one-time payments — they do not renew automatically.",
      },
      {
        id: "upgrade-auto-renew",
        question: "Do listing upgrades renew automatically?",
        answer:
          "No. Featured Boost and other one-time upgrades expire at the end of their term. You can renew manually.",
      },
      {
        id: "upgrade-activation",
        question: "When does my upgrade activate?",
        answer:
          "Automatically after payment confirms. If you paid but don't see it applied within 10 minutes, contact support with your Stripe receipt.",
        actions: [A.contactSupport],
      },
    ],
  },

  // ── Host subscriptions ───────────────────────────────────────────
  {
    id: "host-subscriptions",
    title: "Host subscriptions",
    entries: [
      {
        id: "sub-availability",
        question: "Are host subscriptions available?",
        answer:
          "Vendibook offers optional Seller Pro / host tier packages purchased through Stripe. See the Upgrades panel in your dashboard for what's currently offered.",
        actions: [A.dashboard],
      },
      {
        id: "sub-cancel",
        question: "How do I cancel a subscription?",
        answer:
          "From the Upgrades panel or by emailing support. Cancellations stop the next renewal; the current period stays active until it ends.",
      },
    ],
  },

  // ── Messaging & notifications ────────────────────────────────────
  {
    id: "messaging-notifications",
    title: "Messaging and notifications",
    entries: [
      {
        id: "how-messaging-works",
        question: "How does messaging work?",
        answer:
          "Every listing has an in-app conversation. Messages support attachments up to 10 MB (PDF, JPG, PNG, HEIC, DOCX). Both parties get email and in-app notifications for new messages.",
        actions: [A.messages],
      },
      {
        id: "block-report",
        question: "Can I block or report another user?",
        answer:
          "Yes. Open the conversation and click the menu → Block or Report. Blocked users cannot message you. Reports go to Vendibook moderation.",
      },
      {
        id: "notif-preferences",
        question: "How do I change notification preferences?",
        answer:
          "Open Notification preferences from your account. Choose per-channel (email, in-app, SMS) for each event type — messages, offers, bookings, payouts, refunds.",
        actions: [A.notifPrefs],
      },
      {
        id: "sms-notifs",
        question: "Do I get SMS notifications?",
        answer:
          "SMS is available for critical events (payment failed, booking confirmed, urgent messages) when you've added and verified a phone number. Message rates apply.",
      },
    ],
  },

  // ── Reviews ──────────────────────────────────────────────────────
  {
    id: "reviews",
    title: "Reviews",
    entries: [
      {
        id: "who-can-review",
        question: "Who can leave a review?",
        answer:
          "Only participants of a completed Vendibook transaction can leave a review. Reviews from unconfirmed or cancelled transactions are not accepted.",
      },
      {
        id: "review-window",
        question: "How long do I have to leave a review?",
        answer:
          "14 days after a transaction completes. After that the review window closes.",
      },
      {
        id: "edit-review",
        question: "Can I edit or delete a review?",
        answer:
          "You can edit within 48 hours of posting. After that, contact support to request an edit — deletions are rare and only for policy violations.",
      },
      {
        id: "review-anonymity",
        question: "Are reviews anonymous?",
        answer:
          "Reviews show a shortened form of your name (e.g., 'Alex M.') and your city. Full name, email, and other private data are never shown.",
      },
    ],
  },

  // ── Safety & fraud prevention ────────────────────────────────────
  {
    id: "safety",
    title: "Safety and fraud prevention",
    entries: [
      {
        id: "spot-scam",
        question: "How do I identify a possible scam?",
        answer:
          "Red flags: pressure to move off-platform, requests for wire transfer or crypto, deals that seem too good, urgency to send money before viewing, or a brand-new account with no reviews.",
      },
      {
        id: "off-platform-comm",
        question: "Should I communicate outside Vendibook?",
        answer:
          "No. Keep all messaging on-platform. On-platform records are how Vendibook mediates disputes and refunds. Off-platform chats have no protection.",
      },
      {
        id: "wire-crypto",
        question: "Should I send a wire transfer or cryptocurrency?",
        answer:
          "Never. Vendibook never asks for wires, crypto, gift cards, or payment apps. Any request to do so is fraud — report it immediately.",
        actions: [A.contactSupport],
      },
      {
        id: "before-meeting",
        question: "What should I do before meeting another user?",
        answer:
          "Confirm identity through the platform, use a public meeting location, tell someone where you'll be, and bring a friend. For high-value handoffs, do the transfer at a bank or police station meet-up spot.",
      },
      {
        id: "report-suspicious",
        question: "How do I report suspicious behavior?",
        answer:
          "Use the Report button in the conversation, or email support@vendibook.com with the user's profile URL, listing, and messages. We review within 1 business day.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
      {
        id: "verified-badge-meaning",
        question: "Does a verified badge guarantee that a user is trustworthy?",
        answer:
          "Verified means we've confirmed identity and/or payout details. It's a strong signal but not a guarantee of behavior. Always follow the safety tips above.",
      },
      {
        id: "before-buying-truck",
        question: "What should I check before buying a food truck or trailer?",
        answer:
          "Title/registration, VIN, service records, mileage, propane and electrical safety, refrigeration temps, generator hours, and equipment condition. On any purchase over $10k, hire a pre-purchase inspection.",
      },
    ],
  },

  // ── Technical support ────────────────────────────────────────────
  {
    id: "technical-support",
    title: "Technical support",
    entries: [
      {
        id: "site-issue",
        question: "The site isn't working — what should I do?",
        answer:
          "Try a hard refresh (Ctrl/Cmd + Shift + R). If it persists, check status.vendibook.com or contact support with a screenshot and the URL you were on.",
        actions: [A.contactSupport],
      },
      {
        id: "browser-support",
        question: "Which browsers are supported?",
        answer:
          "The latest 2 versions of Chrome, Safari, Firefox, and Edge on desktop; Safari and Chrome on iOS and Android. Older browsers may see UI issues.",
      },
      {
        id: "photo-upload-fails",
        question: "My photo upload keeps failing — how do I fix it?",
        answer:
          "Files must be under 20 MB and in JPG, PNG, or HEIC format. Very large iPhone photos are downscaled automatically. If uploads still fail, switch networks or try one photo at a time.",
      },
      {
        id: "bug-report",
        question: "How do I report a bug?",
        answer:
          "Email support@vendibook.com with steps to reproduce, what you expected, what happened, and a screenshot or short screen recording if possible.",
        actions: [{ label: "Email support", href: "mailto:support@vendibook.com" }],
      },
    ],
  },
];

/** Flat list of every entry (useful for search + related). */
export const allFaqEntries = faqCategories.flatMap((c) => c.entries);

/** Look up a category by id. */
export const findFaqCategory = (id: string): FaqCategory | undefined =>
  faqCategories.find((c) => c.id === id);

/** Look up an entry by id across all categories. */
export const findFaqEntry = (id: string): FaqEntry | undefined =>
  allFaqEntries.find((e) => e.id === id);
