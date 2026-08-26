import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Landmark,
  MessageSquare,
  Truck,
  Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import paypalAppImage from '@/assets/paypal-app-2025.webp.asset.json';
import paypalWordmarkWhite from '@/assets/paypal-logo-white.png.asset.json';

/**
 * /payments — public, editorial commerce page explaining Vendibook checkout
 * with PayPal and PayPal Pay Later.
 *
 * Copy guardrails (do not regress):
 *  - No Stripe / Affirm / Afterpay / Klarna references.
 *  - No escrow, "protected hold", or guarantee language.
 *  - Never promise Pay Later approval; PayPal decides eligibility per buyer,
 *    merchant, item, state, and transaction.
 *  - No hardcoded Pay in 4 dollar range (PayPal's own pages conflict).
 *  - 12 months is a possible Pay Monthly term, never a "Pay in 12" product.
 *  - Never market PayPal Purchase Protection for vehicles/trailers — PayPal's
 *    US terms exclude vehicles.
 *  - Purchase and separately charged Freight can be separate transactions and
 *    may require separate Pay Later applications.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

const PAYPAL_LINKS = {
  payLater: 'https://www.paypal.com/us/digital-wallet/ways-to-pay/buy-now-pay-later',
  payMonthly: 'https://www.paypal.com/us/cshelp/article/what-is-pay-monthly-help839',
  payIn4: 'https://www.paypal.com/us/cshelp/article/what-is-pay-in-4-help463',
  protection: 'https://www.paypal.com/us/legalhub/paypal/buyer-protection',
};

const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
  >
    {children}
    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
  </a>
);

/* ------------------------------------------------------------------ */
/* Reserved editorial image frame — swap in official PayPal artwork    */
/* ------------------------------------------------------------------ */

const PayPalVisualFrame = () => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_64px_-28px_rgba(24,20,16,0.3)]">
        <img
          src={paypalAppImage.url}
          alt="A person holding a phone with the PayPal app open beside a coffee and pastry"
          loading="lazy"
          className="aspect-[3/2] w-full object-cover"
        />

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <PayPalMonogram className="h-6" />
            <span className="text-sm font-semibold text-foreground">Checkout</span>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: 'PayPal balance, bank or debit', hint: 'Where available' },
              { label: 'Card through PayPal', hint: 'Where available' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5"
              >
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {row.hint}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-3.5">
              <span className="text-sm font-semibold text-foreground">Pay Later</span>
              <span className="text-[11px] uppercase tracking-wider text-primary">When eligible</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


/* ------------------------------------------------------------------ */

const BUYER_OPTIONS = [
  {
    icon: Wallet,
    title: 'PayPal balance, bank or debit',
    body: 'Buyers can pay with the funding sources PayPal makes available to them inside PayPal checkout, including a PayPal balance or a linked bank or debit account where PayPal offers it.',
  },
  {
    icon: CreditCard,
    title: 'Card through PayPal',
    body: 'Card payments run through PayPal’s hosted checkout. Vendibook never stores full card details — PayPal handles the payment itself.',
  },
  {
    icon: CalendarClock,
    title: 'Pay Later, when offered',
    body: 'If PayPal offers Pay Later for that buyer and that transaction, it appears as a funding option at checkout. PayPal decides whether it shows and whether it is approved.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Choose PayPal at Vendibook checkout',
    body: 'You start the purchase on the Vendibook listing, and the payment step opens PayPal checkout with the amount calculated by Vendibook.',
  },
  {
    n: '02',
    title: 'Pick the funding option PayPal shows you',
    body: 'PayPal presents the funding options you are eligible for on that transaction — including Pay in 4 or Pay Monthly when PayPal makes them available.',
  },
  {
    n: '03',
    title: 'Finish the handoff in Vendibook',
    body: 'After payment completes, you come back to Vendibook to message the seller, arrange pickup or delivery, and keep the transaction record in one place.',
  },
];

const FAQS = [
  {
    q: 'What is PayPal Pay Later?',
    a: 'Pay Later is PayPal’s name for its buy-now-pay-later options in the US: Pay in 4 and Pay Monthly. When PayPal offers one of them for your purchase, it appears as a funding option inside PayPal checkout. Availability is determined by PayPal, not by Vendibook.',
  },
  {
    q: 'What is the difference between Pay in 4 and Pay Monthly?',
    a: 'Pay in 4 splits an eligible smaller purchase into 4 interest-free payments — the first at purchase and three more every two weeks. Pay Monthly is an interest-bearing consumer installment loan issued by WebBank for qualifying purchases generally from $49 to $10,000, with possible 3, 6, 12, or 24 month terms and $0 down at checkout when offered. APR and terms depend on creditworthiness and the purchase.',
  },
  {
    q: 'Can I use Pay Monthly for a food trailer under $10,000?',
    a: 'A trailer priced under $10,000 may fall within PayPal’s published Pay Monthly purchase range, but that alone does not make it eligible. PayPal states Pay Monthly is unavailable for certain merchants and goods, and eligibility is decided for each buyer, item, state, and transaction. Pay Monthly may appear at checkout — it is never guaranteed.',
  },
  {
    q: 'Is there a Pay in 12 option?',
    a: 'No. PayPal does not offer a separate product called “Pay in 12.” Twelve months is one of the terms Pay Monthly may offer on an eligible purchase, alongside 3, 6, and 24 months. PayPal determines which terms are available at checkout.',
  },
  {
    q: 'Can I finance Vendibook Freight with PayPal Pay Later?',
    a: 'Eligible Vendibook Freight charges paid through PayPal may also surface Pay Later at checkout, subject to PayPal eligibility and approval. If the equipment purchase and Freight are charged as separate PayPal transactions, they are separate — Pay Monthly is a single-purchase loan, so each transaction requires its own application.',
  },
  {
    q: 'Does the seller have to wait for my Pay Later installments?',
    a: 'No. PayPal states that with Pay Later the merchant is paid in full at checkout while the buyer repays PayPal or WebBank over time, subject to PayPal’s terms and eligible transaction processing. Vendibook’s own seller payout still follows Vendibook’s applicable transaction and payout process.',
  },
  {
    q: 'Does PayPal Purchase Protection cover a food truck or trailer?',
    a: 'PayPal Purchase Protection applies only to eligible transactions, and PayPal’s current US terms exclude vehicles — including motor vehicles, recreational vehicles, aircraft, and boats. Do not assume a food truck or trailer purchase is covered. Review PayPal’s current Purchase Protection terms before you buy.',
  },
  {
    q: 'Who decides whether I am approved?',
    a: 'PayPal does. Pay in 4 and Pay Monthly are PayPal products, with Pay Monthly issued by WebBank. Vendibook is not the lender and does not decide approval, available terms, or APR.',
  },
];

const Payments = () => {
  const reduce = useReducedMotion();

  return (
    <div className="sale-light flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SEO
        title="PayPal Checkout for Food Trucks & Trailers | Vendibook"
        description="Vendibook checkout uses PayPal. Pay with balance, bank, debit, or card through PayPal — Pay Later may appear when you're eligible."
        canonical="/payments"
        ogTitle="PayPal Checkout on Vendibook"
        ogDescription="Buy or rent food trucks and trailers on Vendibook with PayPal checkout — Pay Later shown when eligible."
        twitterTitle="PayPal Checkout on Vendibook"
        twitterDescription="Buy or rent food trucks and trailers on Vendibook with PayPal checkout — Pay Later shown when eligible."
      />
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
      <Header />

      <main className="flex-1">
        {/* ---------------- HERO ---------------- */}
        <section className="relative overflow-hidden pb-16 pt-12 md:pb-24 md:pt-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(900px 480px at 85% -5%, rgba(255,106,26,0.10), transparent 65%)',
            }}
            aria-hidden="true"
          />
          <div className="container relative z-10 mx-auto max-w-6xl px-4">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  PayPal checkout
                </div>
                <h1 className="mb-5 text-4xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl md:text-[3.2rem]">
                  PayPal checkout for food trucks, trailers &amp; mobile kitchens.
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Vendibook checkout uses PayPal to give buyers familiar payment options — while the
                  purchase, seller conversation, delivery or pickup, and transaction record stay
                  connected inside Vendibook.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">
                      Browse food trucks &amp; trailers
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/how-purchasing-works">How buying works</Link>
                  </Button>
                </div>
                <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <PayPalMonogram className="h-4" />
                  Checkout powered by PayPal
                </p>
              </motion.div>

              <div className="pb-2 sm:pl-4">
                <PayPalVisualFrame />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- BUYER EXPERIENCE ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                PayPal checkout options for buyers.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Every Vendibook purchase runs through PayPal checkout. What you see there depends on
                what PayPal offers you for that specific transaction.
              </p>
            </motion.div>

            <div className="grid gap-5 md:grid-cols-3">
              {BUYER_OPTIONS.map((opt, i) => (
                <motion.div
                  key={opt.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: reduce ? 0 : i * 0.06 }}
                  className="rounded-[24px] border border-border bg-card p-7 shadow-[0_18px_44px_-30px_rgba(24,20,16,0.4)] transition-shadow duration-300 hover:shadow-[0_24px_56px_-28px_rgba(24,20,16,0.4)]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <opt.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{opt.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{opt.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- PAY LATER ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Buy now. Pay over time, when eligible.
                <span className="text-primary">*</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                PayPal Pay Later covers two different products in the US. Which one appears — if
                either does — is decided by PayPal at checkout.
              </p>
            </motion.div>

            <div className="grid gap-5 lg:grid-cols-2">
              <motion.div
                {...fadeUp}
                className="rounded-[28px] border border-border bg-card p-8 shadow-[0_18px_44px_-30px_rgba(24,20,16,0.4)]"
              >
                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Smaller eligible purchases
                </span>
                <h3 className="mt-4 text-2xl font-bold text-foreground">Pay in 4</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Four interest-free payments.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    First payment at purchase, then three payments every two weeks.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Intended for smaller eligible purchases — PayPal publishes the current purchase
                    limits.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Availability and approval are determined by PayPal.
                  </li>
                </ul>
                <p className="mt-6">
                  <ExtLink href={PAYPAL_LINKS.payIn4}>View current Pay in 4 terms</ExtLink>
                </p>
              </motion.div>

              <motion.div
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: reduce ? 0 : 0.08 }}
                className="rounded-[28px] border border-primary/25 bg-card p-8 shadow-[0_22px_56px_-30px_rgba(255,106,26,0.45)]"
              >
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Larger qualifying purchases
                </span>
                <h3 className="mt-4 text-2xl font-bold text-foreground">Pay Monthly</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Qualifying purchases generally from $49 to $10,000.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Possible terms of 3, 6, 12, or 24 months.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    $0 down at checkout when the option is offered.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Interest-bearing loan issued by WebBank; APR and terms vary with credit and the
                    purchase.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Not every applicant, purchase, merchant, or item is eligible.
                  </li>
                </ul>
                <p className="mt-6">
                  <ExtLink href={PAYPAL_LINKS.payMonthly}>View current Pay Monthly terms</ExtLink>
                </p>
              </motion.div>
            </div>

            <motion.p
              {...fadeUp}
              className="mt-6 rounded-3xl border border-border bg-muted/50 p-6 text-sm leading-relaxed text-foreground"
            >
              Looking at a trailer under $10,000? It may fall within PayPal Pay Monthly&rsquo;s
              published purchase range, but eligibility is determined by PayPal for each buyer,
              merchant, item, state and transaction. Availability is never guaranteed.
            </motion.p>

            {/* 12-month callout */}
            <motion.div
              {...fadeUp}
              className="mt-6 flex gap-4 rounded-3xl border border-border bg-card p-6 shadow-[0_18px_44px_-32px_rgba(24,20,16,0.4)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">What about 12 months?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  PayPal does not offer a separate &ldquo;Pay in 12&rdquo; product. Twelve months is
                  one of the terms Pay Monthly may offer on an eligible purchase. PayPal determines
                  which terms are available at checkout.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.h2
              {...fadeUp}
              className="mb-10 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              From checkout to handoff.
            </motion.h2>
            <div className="grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.n}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: reduce ? 0 : i * 0.08 }}
                  className="rounded-[24px] border border-border bg-card p-7 shadow-[0_18px_44px_-32px_rgba(24,20,16,0.4)]"
                >
                  <span className="text-sm font-bold tracking-[0.2em] text-primary">{s.n}</span>
                  <h3 className="mb-2 mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- SELLER CONFIDENCE ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div
              {...fadeUp}
              className="overflow-hidden rounded-[32px] border border-border bg-foreground px-7 py-12 text-background sm:px-12"
            >
              <div className="grid items-center gap-10 lg:grid-cols-[1.15fr,0.85fr]">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-background/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                    For sellers
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Pay Later for the buyer. Full payment to the merchant.
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-background/75">
                    PayPal states that when a buyer uses Pay Later, the merchant receives payment in
                    full at checkout while the buyer repays PayPal or WebBank over time — subject to
                    PayPal&rsquo;s terms and eligible transaction processing.
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-background/60">
                    Vendibook&rsquo;s seller payout still follows Vendibook&rsquo;s applicable
                    transaction and payout process. Pay Later does not change how or when Vendibook
                    releases your payout.
                  </p>
                  <div className="mt-8">
                    <Button variant="cta" size="lg" className="rounded-full" asChild>
                      <Link to="/sell-my-food-truck">
                        Sell on Vendibook <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="rounded-[24px] border border-background/15 bg-background/[0.06] p-7">
                  <p className="text-sm leading-relaxed text-background/80">
                    The buyer chooses the payment path. You keep the same Vendibook workflow —
                    listing, messages, transaction record, pickup or delivery coordination.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------- FREIGHT ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div
              {...fadeUp}
              className="rounded-[32px] border border-border bg-card p-8 shadow-[0_18px_44px_-32px_rgba(24,20,16,0.4)] sm:p-12"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Need to move it too?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Eligible Vendibook Freight charges paid through PayPal may also surface Pay Later at
                checkout, subject to PayPal eligibility and approval.
                <span className="text-primary">*</span>
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                If the equipment purchase and Freight are charged as separate PayPal transactions,
                they are separate. Pay Monthly is a single-purchase loan, so each transaction
                requires its own application. Vendibook does not combine a purchase and a Freight
                charge into one Pay Monthly plan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/vendibook-freight">
                    Explore Vendibook Freight <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/ship-your-food-truck">Get transportation pricing</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Questions about using Pay Later with Freight?{' '}
                <Link
                  to="/contact"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Contact us
                </Link>
              </p>
            </motion.div>
          </div>
        </section>

        {/* ---------------- TRUST SPLIT ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.h2
              {...fadeUp}
              className="mb-10 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              PayPal handles the payment. Vendibook keeps the purchase connected.
            </motion.h2>
            <div className="grid gap-5 md:grid-cols-2">
              <motion.div
                {...fadeUp}
                className="rounded-[28px] border border-border bg-card p-8 shadow-[0_18px_44px_-32px_rgba(24,20,16,0.4)]"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <PayPalMonogram className="h-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    PayPal
                  </span>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li>Processes the checkout and the payment itself.</li>
                  <li>
                    Owns the Pay Later application, approval decision, available terms, APR, and
                    repayment relationship.
                  </li>
                  <li>Determines which funding options appear for each transaction.</li>
                </ul>
              </motion.div>
              <motion.div
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: reduce ? 0 : 0.08 }}
                className="rounded-[28px] border border-border bg-card p-8 shadow-[0_18px_44px_-32px_rgba(24,20,16,0.4)]"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Vendibook
                  </span>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li>Keeps the listing, buyer and seller messages, and purchase record together.</li>
                  <li>Coordinates the handoff — pickup, delivery, and applicable confirmations.</li>
                  <li>
                    Is not the Pay Monthly lender and does not decide Pay Later approval or terms.
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4">
            <motion.h2
              {...fadeUp}
              className="mb-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Questions buyers actually ask.
            </motion.h2>
            <motion.div {...fadeUp}>
              <Accordion type="single" collapsible className="space-y-3">
                {FAQS.map((f, i) => (
                  <AccordionItem
                    key={f.q}
                    value={`faq-${i}`}
                    className="rounded-[20px] border border-border bg-card px-6"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section className="pb-16 pt-4 md:pb-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div
              {...fadeUp}
              className="rounded-[32px] border border-border bg-foreground px-7 py-14 text-center text-background sm:px-12"
            >
              <img
                src={paypalWordmarkWhite.url}
                alt="PayPal"
                loading="lazy"
                className="mx-auto mb-7 h-16 w-auto opacity-90 mix-blend-screen"
              />
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Find the equipment. Choose the payment path that works for you.
              </h2>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">
                    Browse listings <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
                  asChild
                >
                  <Link to="/financing">Explore financing</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-background/70">
                Questions about PayPal checkout?{' '}
                <Link to="/contact" className="font-semibold text-background underline-offset-4 hover:underline">
                  Contact us
                </Link>
              </p>
            </motion.div>
          </div>
        </section>

        {/* ---------------- DISCLOSURES ---------------- */}
        <section className="pb-16">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="rounded-3xl border border-border/70 bg-muted/40 p-6 sm:p-8">
              <p className="text-xs leading-relaxed text-muted-foreground">
                *PayPal Pay Later offers are subject to consumer credit approval, eligibility,
                merchant and purchase availability, state availability, and PayPal/WebBank terms.
                Pay in 4 and Pay Monthly availability can vary by transaction. Pay Monthly is an
                interest-bearing consumer installment loan issued by WebBank, with terms and APR
                based on eligibility and creditworthiness. Vendibook is not the lender and does not
                determine approval, available terms, or APR. Twelve months is a possible Pay Monthly
                term, not a separate Pay in 12 product. Separate PayPal transactions, including
                separately charged Vendibook Freight, may require separate Pay Later applications.
                PayPal Purchase Protection applies only to eligible transactions and PayPal&rsquo;s
                current US terms exclude vehicles from Purchase Protection. Review PayPal&rsquo;s
                current terms before applying.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <ExtLink href={PAYPAL_LINKS.payLater}>PayPal Pay Later overview</ExtLink>
                <ExtLink href={PAYPAL_LINKS.payMonthly}>Pay Monthly help</ExtLink>
                <ExtLink href={PAYPAL_LINKS.payIn4}>Pay in 4 help</ExtLink>
                <ExtLink href={PAYPAL_LINKS.protection}>PayPal Purchase Protection terms</ExtLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Payments;
