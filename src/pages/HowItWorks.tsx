import { PostPurchasePeek } from '@/components/home/PostPurchasePeek';
import FlipInsuranceSection from '@/components/booking/FlipInsuranceSection';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Video,
  FileSignature,
  Navigation,
  CheckCircle2,
  BadgeDollarSign,
  BadgeCheck,
  CalendarSearch,
  ClipboardCheck,
  Handshake,
  KeyRound,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import imgBuying from '@/assets/how-buying-hero.jpg';
import imgSelling from '@/assets/how-selling-hero.jpg';
import imgCoffee from '@/assets/food-truck-coffee.jpg';
import searchPageArt from '@/assets/education/search-page.svg';
import loanArt from '@/assets/education/loan.svg';
import documentsOkArt from '@/assets/education/documents-ok.svg';
import deliveryMapArt from '@/assets/education/delivery-map.svg';
import signArt from '@/assets/education/sign.svg';
import './how-it-works.css';

/**
 * /how-it-works — flagship brand page, not an explainer.
 *
 * Positioning: Vendibook is not classifieds. The marketplace and the
 * transaction live in one place — discover, evaluate, connect, finance,
 * transport, complete.
 *
 * Copy guardrails (do not regress): no custodial or "payment protection" claims,
 * no guaranteed/instant payout timing, no universal identity-verification
 * claims (verification is "where completed"), no fabricated social-proof
 * metrics, financing stays third-party and never guaranteed, freight stays a
 * separately coordinated option.
 *
 * Presentation: warm white glass panels, rounded corners, no numbered steps —
 * the same treatment as the homepage Guarantee / BuyerMatch / Atlas bands.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

/* ------------------------------------------------------------------ */
/* Hero visual — live listing collage                                   */
/* ------------------------------------------------------------------ */

const HeroCollage = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative" aria-hidden="true">
      <motion.div
        className="relative overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_64px_-28px_rgba(24,20,16,0.3)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <img src={imgBuying} alt="" className="aspect-[16/9] w-full object-cover" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">Turn-key coffee truck</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Portland, OR
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-[11px]">
              <BadgeDollarSign className="h-3 w-3" />
              Financing available
            </span>
          </div>
          <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            Message the seller
            <span aria-hidden className="text-border">·</span>
            Make an offer
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-32 left-3 w-36 overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:bottom-28 sm:left-6 sm:w-52"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
      >
        <img src={imgCoffee} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="p-3">
          <p className="truncate text-xs font-semibold text-foreground">Coffee trailer</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Nashville, TN</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-3 top-6 rounded-full border border-border bg-card px-3.5 py-2 shadow-md sm:-right-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Truck className="h-3 w-3 text-primary" />
          Found it in another state? Freight can move it.
        </p>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Marketplace flow — discovery through the completed handoff          */
/* ------------------------------------------------------------------ */

interface FlowStep {
  title: string;
  body: React.ReactNode;
  art: string;
  artAlt: string;
}

const FLOW: FlowStep[] = [
  { title: 'Find equipment that fits your next move',
    body: <>Compare photos, specifications, location, and pricing. Explore financing with third-party partners and use PricePilot to put the asking price in context.</>,
    art: searchPageArt, artAlt: 'Compare food trucks and trailers on Vendibook' },
  { title: 'See it. Ask questions. Get clear.',
    body: <>Message the seller and schedule a video walkthrough from an eligible listing. See the layout, ask about the equipment, and discuss pickup or delivery before making your decision.</>,
    art: loanArt, artAlt: 'Evaluate equipment and plan your purchase' },
  { title: 'Agree on the deal. The seller approves.',
    body: <>Make an offer or submit your purchase details. Keep the price, fulfillment choice, and agreement together. The seller reviews and accepts before you complete online payment.</>,
    art: documentsOkArt, artAlt: 'Seller reviews the purchase and agreement' },
  { title: 'Your final review. Then Pay now.',
    body: <>After seller approval, review the final total and terms, choose your PayPal payment method, and submit payment online. Your transaction updates when payment is verified.</>,
    art: documentsOkArt, artAlt: 'Buyer reviews the final total before paying' },
  { title: 'A plan for every mile',
    body: <>Choose buyer pickup, seller delivery, or coordinated Vendibook Freight where available. Keep the agreed timing and handoff details on your transaction. Delivery tracking appears when the assigned seller or driver starts Delivery Mode.</>,
    art: deliveryMapArt, artAlt: 'Fulfillment and active delivery tracking' },
  { title: 'Walk through. Sign. Make it yours.',
    body: <>At pickup or drop-off, review the equipment together, document its condition with a video walkthrough and photos, and complete the required online signatures and handoff confirmations. Keep the receipt, agreements, and evidence in your transaction record.</>,
    art: signArt, artAlt: 'Condition walkthrough, signatures, and confirmed handoff' },
];

const FULFILLMENT = [
  { id: 'pickup', label: 'Buyer pickup', icon: KeyRound, title: 'Meet where the equipment is.',
    body: 'Agree on a pickup time with the seller. Review access, transport requirements, and the meeting location before you travel.',
    tracking: 'Your agreed pickup and handoff details stay on the transaction. Pickup does not include a delivery tracking promise.',
    handoff: 'Inspect together at pickup, document the condition, and complete signatures before confirming the handoff.' },
  { id: 'delivery', label: 'Seller delivery', icon: Truck, title: 'Bring the equipment to your next chapter.',
    body: 'Confirm the delivery address, access requirements, and timing with the seller. Follow updates from your transaction.',
    tracking: 'Live location appears once the seller or assigned driver starts Delivery Mode. An agreed delivery is not automatically a live tracked trip.',
    handoff: 'At drop-off, do the condition walkthrough together, record photos or video, and complete the required signatures and delivery confirmation.' },
  { id: 'freight', label: 'Vendibook Freight', icon: Navigation, title: 'More possibilities, even across state lines.',
    body: 'Request freight coordination for eligible equipment. Review the transport quote, carrier arrangements, and timing before committing.',
    tracking: 'Follow the confirmed transport updates on your transaction. Available tracking depends on the arranged transport and active Delivery Mode.',
    handoff: 'Document condition at carrier pickup and delivery. Review the equipment before signing the applicable delivery and handoff documents.' },
] as const;

function FulfillmentJourney() {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState('delivery');
  const option = FULFILLMENT.find(item => item.id === selected)!;
  return <section id="after-payment" className="hiw-section">
    <div className="hiw-wrap">
      <div className="hiw-fulfil-grid">
        <div>
          <p className="hiw-eyebrow">After payment, the details stay together</p>
          <h2 className="hiw-title">The deal isn&rsquo;t done until the handoff is.</h2>
          <p className="hiw-lede">Know what happens next, who is responsible, and where the record lives. Choose a fulfillment path to see the steps.</p>
          <div role="group" aria-label="Fulfillment options" className="hiw-chips">
            {FULFILLMENT.map(item => <button key={item.id} id={`fulfillment-${item.id}`} type="button"
              aria-pressed={selected === item.id} aria-controls="fulfillment-details"
              onClick={() => setSelected(item.id)}
              className="hiw-chip-btn">
              <item.icon aria-hidden="true" />{item.label}</button>)}
          </div>
          <div className="hiw-actions">
            <Link to="/browse" className="hiw-btn">Browse now <ArrowRight aria-hidden="true" /></Link>
            <Link to="/list" className="hiw-btn-ghost">List now</Link>
          </div>
        </div>
        <motion.div key={selected} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.25 }} id="fulfillment-details" role="region" aria-live="polite" aria-labelledby={`fulfillment-${selected}`} className="hiw-panel">
          <span className="hiw-detail-label">{option.label}</span>
          <h3 className="hiw-detail-title">{option.title}</h3>
          <ul className="hiw-detail-list">
            {[
              { icon: CalendarSearch, title: 'Coordinate the plan', body: option.body },
              { icon: MapPin, title: 'Follow the journey', body: option.tracking },
              { icon: Video, title: 'Walk through the condition', body: option.handoff },
              { icon: FileSignature, title: 'Sign and confirm', body: 'Complete the applicable digital documents and handoff confirmations. Find your receipt, signed paperwork, and transaction updates in your account.' },
            ].map((step) => <li key={step.title} className="hiw-detail-row">
              <span className="hiw-icon"><step.icon aria-hidden="true" /></span>
              <div><h4>{step.title}</h4><p>{step.body}</p></div>
            </li>)}
          </ul>
          <p className="hiw-detail-foot"><CheckCircle2 aria-hidden="true" />Questions after the handoff? Open the transaction to message the other party or report an issue to Vendibook.</p>
        </motion.div>
      </div>
    </div>
  </section>;
}


/* ------------------------------------------------------------------ */
/* Buying / selling cards                                               */
/* ------------------------------------------------------------------ */

interface SideCard {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: { label: string; to: string };
  secondary: { label: string; to: string };
  image: string;
  imageAlt: string;
}

const SIDES: SideCard[] = [
  {
    icon: ShoppingBag,
    eyebrow: 'For buyers',
    title: 'Buying on Vendibook',
    body: 'The market comes to you — with the context to act on it.',
    points: [
      'Rich listings with specs, photos, and seller history',
      'Direct messaging and written offers on the listing',
      'Financing and freight options built into the deal',
    ],
    cta: { label: 'Browse listings', to: '/browse' },
    secondary: { label: 'How purchasing works', to: '/how-purchasing-works' },
    image: imgBuying,
    imageAlt: 'A food truck listed for sale on Vendibook',
  },
  {
    icon: Tag,
    eyebrow: 'For sellers',
    title: 'Selling on Vendibook',
    body: 'Put your equipment in front of people already shopping for it.',
    points: [
      'Standard listings are free — publish in minutes',
      'Serious buyers message and offer through the platform',
      'Offers, agreements, and payment on one record',
    ],
    cta: { label: 'List your equipment', to: '/list' },
    secondary: { label: 'Read the seller guide', to: '/how-it-works-seller' },
    image: imgSelling,
    imageAlt: 'A seller preparing a food trailer listing on Vendibook',
  },
];

/* ------------------------------------------------------------------ */
/* Connected ecosystem                                                  */
/* ------------------------------------------------------------------ */

const ECOSYSTEM: { icon: LucideIcon; name: string; note: string; to: string }[] = [
  {
    icon: Search,
    name: 'PricePilot',
    note: 'Pricing guidance built on live Vendibook marketplace data.',
    to: '/tools/pricepilot',
  },
  {
    icon: BadgeDollarSign,
    name: 'Financing',
    note: 'Apply with third-party lending partners on eligible equipment.',
    to: 'https://financing.approvepayments.com/vendibook',
  },
  {
    icon: Wallet,
    name: 'Payments',
    note: 'Secure online PayPal checkout and how payouts work.',
    to: '/payments',
  },
  {
    icon: Truck,
    name: 'Vendibook Freight',
    note: 'Professional transport, coordinated with your transaction.',
    to: '/vendibook-freight',
  },
  {
    icon: ClipboardCheck,
    name: 'PermitPath',
    note: 'Every license, permit, and inspection for your address — one roadmap.',
    to: '/tools/permitpath',
  },
  {
    icon: ShoppingBag,
    name: 'Equipment for sale',
    note: 'Food trucks, trailers, and carts listed by their owners.',
    to: '/browse',
  },
  {
    icon: CalendarSearch,
    name: 'Equipment for rent',
    note: 'Trucks, commercial kitchens, and vendor spaces with live availability.',
    to: '/search?mode=rent',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const HowItWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="sale-light hiw min-h-screen flex flex-col">
      <SEO
        title="How Vendibook Works | Food Truck & Trailer Marketplace"
        description="Vendibook isn't classifieds. Discover, evaluate, finance, transport, and complete food truck and trailer transactions — all in one marketplace."
        canonical="/how-it-works"
      />
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'How Vendibook Works',
          description:
            'How Vendibook brings the marketplace and the transaction together for buying, selling, and renting food trucks, trailers, kitchens, and vendor spaces.',
          url: 'https://vendibook.com/how-it-works',
          isPartOf: { '@type': 'WebSite', name: 'Vendibook', url: 'https://vendibook.com' },
        }}
      />

      <Header />

      <main className="flex-1">
        {/* ---------------------------------------------------------- */}
        {/* HERO                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-hero">
          <div className="hiw-wrap">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works' },
              ]}
              className="mb-8"
            />
            <div className="hiw-hero-grid">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="hiw-chip">
                  <span className="hiw-chip-dot" aria-hidden="true" />
                  How Vendibook Works
                </span>
                <h1 className="hiw-h1">
                  Find your next truck.
                  <br />
                  <em>Finish the whole deal.</em>
                </h1>
                <p className="hiw-hero-copy is-lead">
                  From the first video walkthrough to the final signature, buy and sell food trucks and trailers with a clear next step.
                </p>
                <p className="hiw-hero-copy">
                  One marketplace for buying, selling, and renting food trucks, trailers,
                  kitchens, and vendor spaces — with messages, approvals, payment, delivery, and documents connected.
                </p>
                <div className="hiw-actions">
                  <Link to="/browse" className="hiw-btn">Browse now <ArrowRight aria-hidden="true" /></Link>
                  <Link to="/list" className="hiw-btn-ghost">List now</Link>
                </div>
              </motion.div>

              <div className="pb-6 pl-2 sm:pl-6">
                <HeroCollage />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* AFTER YOU BUY — one button opens the order-journey popup     */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-section" aria-labelledby="purchase-preview-title">
          <div className="hiw-wrap">
            <div className="hiw-panel">
              <p className="hiw-eyebrow">After you buy</p>
              <h2 id="purchase-preview-title" className="hiw-title hiw-title-sm">Your purchase has a clear next step.</h2>
              <p className="hiw-lede">
                Open your order from Transactions to follow payment, delivery and the handoff. Live location and route
                estimates appear when your delivery driver is actively sharing.
              </p>
              <PostPurchasePeek />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* MARKETPLACE FLOW — glass cards, no numbering                */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-section">
          <div className="hiw-wrap">
            <motion.div {...(reduce ? {} : fadeUp)} className="hiw-head max-w-2xl">
              <p className="hiw-eyebrow">The Vendibook way</p>
              <h2 className="hiw-title">From first search to final signature — one connected process.</h2>
              <p className="hiw-lede">
                See the equipment. Agree on the deal. Pay after seller approval. Follow the handoff through to completion.
              </p>
            </motion.div>

            <div className="hiw-flow-grid">
              {FLOW.map((f) => (
                <motion.div
                  key={f.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease }}
                  className="hiw-card"
                >
                  <div className="hiw-flow-art">
                    <img
                      src={f.art}
                      alt={f.artAlt}
                      loading="lazy"
                    />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <FulfillmentJourney />

        {/* ---------------------------------------------------------- */}
        {/* BUYING / SELLING CARDS                                      */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-section">
          <div className="hiw-wrap">
            <motion.div {...(reduce ? {} : fadeUp)} className="hiw-head max-w-2xl">
              <p className="hiw-eyebrow">Two sides, one table</p>
              <h2 className="hiw-title">Built for the people on both ends of the deal.</h2>
            </motion.div>

            <div className="hiw-sides">
              {SIDES.map((s, i) => (
                <motion.article
                  key={s.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.08, ease }}
                  className="hiw-panel hiw-side"
                >
                  <div className="hiw-side-shot">
                    <img
                      src={s.image}
                      alt={s.imageAlt}
                      loading="lazy"
                    />
                    <span className="hiw-side-tag">
                      <s.icon aria-hidden="true" />
                      {s.eyebrow}
                    </span>
                  </div>
                  <div className="hiw-side-body">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <ul className="hiw-points">
                      {s.points.map((pt) => (
                        <li key={pt}>
                          <BadgeCheck aria-hidden="true" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="hiw-side-actions">
                      <Link to={s.cta.to} className="hiw-btn">{s.cta.label} <ArrowRight aria-hidden="true" /></Link>
                      <Link to={s.secondary.to} className="hiw-link">{s.secondary.label} <ArrowRight aria-hidden="true" /></Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* CONNECTED ECOSYSTEM                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-section">
          <div className="hiw-wrap">
            <motion.div {...(reduce ? {} : fadeUp)} className="hiw-head max-w-2xl">
              <p className="hiw-eyebrow">The connected ecosystem</p>
              <h2 className="hiw-title">The tools around the transaction, in the same place as the transaction.</h2>
              <p className="hiw-lede">
                Pricing, financing, transport, and permits aren&rsquo;t afterthoughts here.
                They&rsquo;re part of the platform.
              </p>
            </motion.div>

            <ul className="hiw-eco">
              {ECOSYSTEM.map((t, i) => (
                <motion.li
                  key={t.name}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                >
                  <Link to={t.to} className="hiw-card hiw-tile">
                    <span className="hiw-icon"><t.icon aria-hidden="true" /></span>
                    <h3>{t.name}</h3>
                    <p>{t.note}</p>
                    <span className="hiw-link">Explore <ArrowRight aria-hidden="true" /></span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* RENT / HOST strip                                           */}
        {/* ---------------------------------------------------------- */}
        <FlipInsuranceSection source="how_it_works" />
        <section className="hiw-section">
          <div className="hiw-wrap">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="hiw-panel"
            >
              <div className="hiw-rent-grid">
                <div className="hiw-rent-cell">
                  <span className="hiw-icon"><CalendarSearch aria-hidden="true" /></span>
                  <div>
                    <h3>Need it short-term?</h3>
                    <p>
                      Rent trucks, commercial kitchens, and vendor spaces with live
                      availability. Request to book, or use Instant Book where the host
                      offers it.
                    </p>
                    <Link to="/search?mode=rent" className="hiw-link">
                      Browse rentals <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <div className="hiw-rent-cell">
                  <span className="hiw-icon"><KeyRound aria-hidden="true" /></span>
                  <div>
                    <h3>Own equipment or space?</h3>
                    <p>
                      Set your rates and calendar, review requests or switch on Instant
                      Book, and earn from what you already own.
                    </p>
                    <Link to="/how-it-works-host" className="hiw-link">
                      Read the host guide <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.p
              {...(reduce ? {} : fadeUp)}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.15, ease }}
              className="hiw-fine mt-8 max-w-2xl mx-auto text-center"
            >
              Vendibook operates the marketplace — we don&rsquo;t own the equipment and
              we&rsquo;re not the seller, manufacturer, or lender. Financing is provided by
              third-party partners, subject to their approval and terms.
            </motion.p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* FINAL CTA                                                   */}
        {/* ---------------------------------------------------------- */}
        <section className="hiw-section">
          <div className="hiw-wrap">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="hiw-panel hiw-cta"
            >
              <span className="hiw-chip">
                <Handshake aria-hidden="true" />
                The marketplace for mobile food
              </span>
              <h2>Serious about mobile food? So are we.</h2>
              <p>
                Vendibook is where food truck and trailer buyers, sellers, and operators
                get the whole deal done — not just the first step of it.
              </p>
              <div className="hiw-actions">
                <Link to="/browse" className="hiw-btn">Browse now <ArrowRight aria-hidden="true" /></Link>
                <Link to="/list" className="hiw-btn-ghost">List now</Link>
              </div>
              <p className="hiw-cta-fine">
                <Wallet aria-hidden="true" className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                Questions first? Visit the{' '}
                <Link to="/help">Help Center</Link>.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
