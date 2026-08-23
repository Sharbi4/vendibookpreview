import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeDollarSign,
  Camera,
  FileText,
  Handshake,
  KeyRound,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import imgSelling from '@/assets/how-selling-hero.jpg';
import imgGrilledCheese from '@/assets/food-truck-grilled-cheese.jpg';
import documentsOkArt from '@/assets/education/documents-ok.svg.asset.json';

/**
 * /how-it-works-seller — the warm, editorial seller guide.
 *
 * Answers, in order: why list here → what buyers see → how a sale comes
 * together → what it costs → questions.
 *
 * Copy guardrails (do not regress): no Stripe, no "verified buyers" or
 * universal verification claims, no "payment protection"/escrow language, no
 * guaranteed or instant payouts, no fabricated performance metrics (sell
 * times, photo multipliers, state counts), no Affirm/Klarna/Afterpay. Fees
 * match src/lib/commissions.ts and src/lib/fees/proFee.ts.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

/* ------------------------------------------------------------------ */
/* Hero visual — what a serious buyer sees                             */
/* ------------------------------------------------------------------ */

const HeroCollage = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative" aria-hidden="true">
      {/* Main listing card */}
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <img src={imgSelling} alt="" className="aspect-[16/9] w-full object-cover" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">Your listing, front and center</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Shown to people searching for exactly this
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-[11px]">
              <BadgeDollarSign className="h-3 w-3" />
              Financing available
            </span>
          </div>
          <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3.5 w-3.5" />
            Rich photos
            <span aria-hidden className="text-border">·</span>
            Full specs
            <span aria-hidden className="text-border">·</span>
            Your price
          </div>
        </div>
      </motion.div>

      {/* Floating offer card */}
      <motion.div
        className="absolute -left-2 bottom-40 w-44 rounded-2xl border border-border bg-card p-3.5 shadow-lg sm:left-2 sm:bottom-24 sm:w-56"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <MessageCircle className="h-3 w-3 text-primary" />
          New message from a buyer
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          “Is the truck still available? Can I see it this weekend?”
        </p>
      </motion.div>

      {/* Free-to-list cue */}
      <motion.div
        className="absolute right-2 top-6 rounded-full border border-border bg-card px-3.5 py-2 shadow-md sm:-right-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Tag className="h-3 w-3 text-primary" />
          Free to publish
        </p>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const LISTING_BLOCKS: { title: string; body: string }[] = [
  {
    title: 'Show it properly',
    body: 'Strong photos — and video, if you have it — do most of the talking. Show the kitchen line, the serving window, the storage. Buyers shopping for a $60,000 truck want to see it like they drove out to see it.',
  },
  {
    title: 'Put the details in writing',
    body: 'Equipment, condition, dimensions, price, and location, all up front. The questions a serious buyer would ask on the phone should already be answered on the page.',
  },
  {
    title: 'Say how you want to close',
    body: 'Set your payment and pickup options on the listing — PayPal online checkout, Pay in Person, your own delivery, or freight. Buyers see the choices before they ever message you.',
  },
];

const SAY_YES_FEATURED = {
  icon: BadgeDollarSign,
  kicker: 'On eligible listings',
  title: 'Financing',
  body: 'On eligible published for-sale equipment, buyers can apply for financing with Vendibook’s third-party partners — so “I can’t pay cash” doesn’t have to end the conversation. Vendibook isn’t the lender; approval and terms come from the financing provider.',
  cta: 'How financing works',
  to: '/financing',
};

const SAY_YES_ROWS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageCircle,
    title: 'Messages and offers in one place',
    body: 'Questions and offers arrive attached to your listing. Answer, negotiate where it’s supported, and keep the whole thread in one record.',
  },
  {
    icon: Truck,
    title: 'A way to reach far-away buyers',
    body: 'Local pickup, your own delivery, or Vendibook Freight where it’s available — distance stops being a dealbreaker.',
  },
  {
    icon: Wallet,
    title: 'Two ways to get paid',
    body: 'Secure PayPal online checkout, or Pay in Person where you offer it. Either way, the sale is recorded to your dashboard.',
  },
];

const SALE_STEPS: { title: string; body: string }[] = [
  {
    title: 'Answer questions',
    body: 'Buyers message you from the listing. Reply like a person — the details you already wrote down do most of the work.',
  },
  {
    title: 'Agree on the purchase',
    body: 'Full price or an offer you’re happy with. The buyer pays through PayPal checkout, or you arrange payment in person.',
  },
  {
    title: 'Arrange the handoff',
    body: 'Local pickup, your own delivery, or Vendibook Freight where available — whatever you set on the listing.',
  },
  {
    title: 'Confirm, then get paid',
    body: 'Once the handoff is confirmed, Vendibook reviews the completed sale and moves your payout forward to your saved PayPal, Venmo, or ACH destination.',
  },
];

const COST_ROWS: { label: string; value: string; note: string }[] = [
  {
    label: 'Publishing a listing',
    value: 'Free',
    note: 'No subscription, no upfront fee, no add-on required to go live.',
  },
  {
    label: 'A Pay in Person sale',
    value: 'No Vendibook commission',
    note: 'Meet the buyer, take payment directly, confirm the handoff. The online-sale fee doesn’t apply.',
  },
  {
    label: 'A PayPal online checkout sale',
    value: '12.9% seller fee',
    note: 'Deducted from the completed sale. Vendibook Pro members pay 10.9% instead, up to $500 saved per transaction.',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How much does it cost to sell?',
    a: 'Publishing is free. A sale completed in person carries no Vendibook commission. A sale completed through PayPal online checkout carries a 12.9% seller fee, deducted from the completed sale — 10.9% for active Vendibook Pro members, up to $500 saved per transaction.',
  },
  {
    q: 'Do I need to verify my identity or set up payouts before publishing?',
    a: 'No. Publishing never requires identity verification, payout setup, PayPal setup, or a paid add-on. Identity verification is an optional one-time $19.99 step powered by Plaid — the badge confirms identity only, not ownership, title, condition, or listing accuracy.',
  },
  {
    q: 'Can buyers finance my equipment?',
    a: 'Eligible published for-sale trucks, trailers, and carts can offer buyer financing through Vendibook’s third-party financing partners. Buyers apply with the financing provider directly. Vendibook is not a lender — approval and terms are determined by the provider.',
  },
  {
    q: 'What if the buyer is in another state?',
    a: 'Vendibook Freight may be available as a separately coordinated and paid option, arranged as part of the transaction. You can also offer your own delivery, or keep it pickup-only — it’s your listing.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Save a payout destination in your dashboard — PayPal, Venmo, or ACH. After a completed online sale and the delivery confirmation steps, Vendibook reviews the sale and initiates your payout — typically released within 24 hours of delivery confirmation, and we always strive for 24–48 hours.',
  },
  {
    q: 'What if something goes wrong with a buyer?',
    a: 'Keep your messages and offers on the listing — that record matters. If a sale runs into trouble, our support team can step in, and the Help Center explains how disputes are reviewed.',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const HowItWorksSeller = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <SEO
        title="Sell Your Food Truck or Trailer | How Selling Works — Vendibook"
        description="List for free and reach buyers shopping specifically for food trucks and trailers. Answer questions, review offers, and choose PayPal checkout or Pay in Person."
        canonical="/how-it-works-seller"
      />
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-14 pb-16 md:pt-20 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground mb-4">
                  Selling on Vendibook
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  Put your food truck in front of people already looking for one.
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Create a detailed listing, reach buyers shopping specifically for
                  food trucks and trailers, answer questions, review offers where
                  available, and choose how you want to complete the sale.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/list/start?mode=sale">
                      List for free <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/how-purchasing-works">See how buying works</Link>
                  </Button>
                </div>
              </motion.div>

              <div className="pb-6 pl-2 sm:pl-6 min-w-0 w-full">
                <HeroCollage />
              </div>
            </div>
          </div>
        </section>

        {/* A — WHY SELL HERE (featured editorial story) */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <motion.div {...(reduce ? {} : fadeUp)} className="order-2 lg:order-1">
                <div className="overflow-hidden rounded-3xl border border-border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.15)]">
                  <img
                    src={imgGrilledCheese}
                    alt="A grilled cheese food truck listed for sale on Vendibook"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              </motion.div>
              <motion.div {...(reduce ? {} : fadeUp)} className="order-1 lg:order-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Why list here
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  A better place to sell specialized equipment.
                </h2>
                <p className="text-base text-muted-foreground mt-4 leading-relaxed">
                  On a general classifieds site, your turn-key coffee trailer sits
                  between a used couch and a carburetor — and half the messages ask
                  if you’ll trade for a jet ski. Vendibook is one category: food
                  trucks, trailers, kitchens, and vendor spaces. The people browsing
                  came here for equipment like yours.
                </p>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  No marketplace can promise every inquiry becomes a sale. But a
                  purpose-built audience means fewer dead ends and better conversations.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* B — MAKE THE LISTING WORTH OPENING */}
        <section className="py-12 md:py-20">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mb-10 flex items-center justify-between gap-8"
            >
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Your listing
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Make the listing worth opening.
                </h2>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  The listings that get real messages are the ones that answer questions
                  before they’re asked. You don’t need a studio — you need completeness.
                </p>
              </div>
              <img
                src={documentsOkArt}
                alt="Listing details and documents checked and in order"
                loading="lazy"
                className="hidden md:block h-32 w-auto shrink-0 rounded-2xl border border-border bg-card object-contain shadow-sm"
              />
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {LISTING_BLOCKS.map((b, i) => (
                <motion.div
                  key={b.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span aria-hidden className="block h-px w-10 bg-primary/50 mb-5" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* C — GIVE BUYERS MORE WAYS TO SAY YES */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Reaching “yes”
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Give buyers more ways to say yes.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                The right buyer isn’t always local, and isn’t always paying cash.
                More paths to a completed sale means fewer conversations that stall.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
              {/* Featured — financing */}
              <motion.div {...(reduce ? {} : fadeUp)}>
                <Link
                  to={SAY_YES_FEATURED.to}
                  className="group flex flex-col h-full rounded-3xl border border-border bg-card p-7 sm:p-8 hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <SAY_YES_FEATURED.icon className="w-5 h-5 text-primary" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1.5">
                    {SAY_YES_FEATURED.kicker}
                  </p>
                  <h3 className="text-xl font-semibold text-foreground mb-2.5">
                    {SAY_YES_FEATURED.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {SAY_YES_FEATURED.body}
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold text-primary">
                    {SAY_YES_FEATURED.cta}
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>

              {/* Stacked rows */}
              <div className="flex flex-col gap-4 md:gap-5">
                {SAY_YES_ROWS.map((r, i) => (
                  <motion.div
                    key={r.title}
                    {...(reduce ? {} : fadeUp)}
                    transition={{ duration: 0.4, delay: reduce ? 0 : 0.06 + i * 0.06, ease }}
                    className="flex items-center gap-4 flex-1 rounded-3xl border border-border bg-card p-5 sm:p-6"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <r.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-foreground">
                        {r.title}
                      </span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mt-0.5">
                        {r.body}
                      </span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* D — FROM INTERESTED BUYER TO COMPLETED SALE */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                How a sale comes together
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                From interested buyer to completed sale.
              </h2>
            </motion.div>

            <ol className="space-y-0">
              {SALE_STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex gap-5 sm:gap-8 py-6 border-b border-border last:border-b-0"
                >
                  <span
                    aria-hidden
                    className="shrink-0 text-sm font-semibold text-primary tabular-nums pt-0.5"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      {s.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* E — WHAT IT COSTS */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                The numbers
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                What it costs to sell.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                No subscription to publish. No fee until a sale actually completes
                through online checkout — and none at all when you’re paid in person.
              </p>
            </motion.div>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)]"
            >
              <dl>
                {COST_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 py-5 border-b border-border last:border-b-0 first:pt-0 last:pb-0"
                  >
                    <dt className="sm:w-56 shrink-0">
                      <span className="block text-base font-semibold text-foreground">{row.label}</span>
                    </dt>
                    <dd className="flex-1">
                      <span className="block text-base font-semibold text-primary">{row.value}</span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mt-1">
                        {row.note}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 pt-5 border-t border-border text-xs text-muted-foreground leading-relaxed">
                Selling often?{' '}
                <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground">
                  Vendibook Pro
                </Link>{' '}
                lowers the seller-side fee on completed online sales, among other benefits.
              </p>
            </motion.div>
          </div>
        </section>

        {/* F — FAQ */}
        <section className="py-12 md:py-20">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Questions sellers actually ask.
              </h2>
            </motion.div>
            <Accordion type="single" collapsible>
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-20 border-t border-border bg-card/40">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Someone is searching for what you’re selling.
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Publishing is free and takes a few minutes. Your listing can be live
                before lunch.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/list/start?mode=sale">
                    List for free <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">Browse the marketplace</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Questions? Visit the{' '}
                <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
                  Help Center
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksSeller;
