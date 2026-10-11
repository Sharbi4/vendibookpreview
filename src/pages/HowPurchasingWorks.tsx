import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  KeyRound,
  LifeBuoy,
  MapPin,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import deliveryMapArt from '@/assets/education/delivery-map.svg.asset.json';
import documentsOkArt from '@/assets/education/documents-ok.svg.asset.json';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.42, ease },
};

type JourneyStep = {
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
};

const PURCHASE_STEPS: JourneyStep[] = [
  {
    icon: Search,
    title: 'Find and review the right listing',
    body: 'Compare photos, equipment, condition, location, seller details, and available documents. Message the seller or request a live walkthrough before you commit.',
    detail: 'Listings, messages, and walkthroughs stay connected.',
  },
  {
    icon: ClipboardCheck,
    title: 'Agree on the purchase',
    body: 'Use the listed price or make an offer where available. Review the order, purchase agreement, delivery choice, and total before moving forward.',
    detail: 'The agreement and order details remain with the transaction.',
  },
  {
    icon: CreditCard,
    title: 'Choose an available payment path',
    body: 'Eligible listings can offer PayPal checkout. A seller may also allow Pay in Person, which keeps the sale organized on Vendibook while payment happens directly at handoff.',
    detail: 'Payment options depend on the listing and transaction.',
  },
  {
    icon: Truck,
    title: 'Coordinate pickup or delivery',
    body: 'After the purchase starts, use the order page and messages to agree on timing. Follow shipment updates when delivery or freight is used.',
    detail: 'Your order shows the next action for each side.',
  },
];

const HANDOFF_STEPS: JourneyStep[] = [
  {
    icon: KeyRound,
    title: 'Start the documented handoff',
    body: 'For local pickup, the seller starts the handoff and the buyer enters the six-digit pickup code. Delivery handoffs begin from the order when the equipment arrives.',
    detail: 'The code helps document that both sides are present for pickup.',
  },
  {
    icon: Video,
    title: 'Record the condition walkthrough',
    body: 'With the required notice accepted, capture the equipment, its condition, and relevant details. Photos or video are timestamped and stored with the transaction record.',
    detail: 'The record documents what was captured; it is not a Vendibook inspection.',
  },
  {
    icon: PackageCheck,
    title: 'Accept it, note exceptions, or report an issue',
    body: 'The buyer records how the equipment was received. If something is wrong, report it before completing the handoff so the issue and supporting evidence stay on the record.',
    detail: 'A reported issue keeps the handoff open for support review.',
  },
  {
    icon: FileCheck2,
    title: 'Review and complete the handoff',
    body: 'Review the handoff summary and condition acknowledgment. Once the required handoff and confirmation steps are complete, the sale can close.',
    detail: 'The completed record remains available from the order.',
  },
];

const FULFILLMENT = [
  {
    icon: KeyRound,
    title: 'Buyer pickup',
    eyebrow: 'Meet locally',
    body: 'Agree on a time in messages. At pickup, use the six-digit code, document the walkthrough, and record the buyer’s condition decision.',
  },
  {
    icon: MapPin,
    title: 'Seller delivery',
    eyebrow: 'When the seller offers it',
    body: 'Coordinate access and timing, follow order updates, then complete the same condition and evidence steps when the equipment arrives.',
  },
  {
    icon: Truck,
    title: 'Vendibook Freight',
    eyebrow: 'For longer distances',
    body: 'Freight is quoted and arranged separately when available. Shipment and delivery events can be documented before the handoff is completed.',
  },
];

const FAQS = [
  {
    q: 'What happens after I pay online?',
    a: 'Your order page shows the next step. You and the seller coordinate pickup or delivery, document the handoff, and complete the required confirmations. If there is a problem, report it before completing the handoff.',
  },
  {
    q: 'What is the documented handoff?',
    a: 'It is a transaction record for pickup or delivery. Depending on the handoff, it can include a pickup code, a recorded condition walkthrough, photos or video, the buyer’s condition decision, exceptions, and an acknowledgment.',
  },
  {
    q: 'Does Vendibook inspect or certify the equipment?',
    a: 'No. The handoff record documents information captured by the buyer and seller. It is not an inspection, appraisal, title verification, or guarantee by Vendibook. Buyers should arrange an independent inspection when appropriate.',
  },
  {
    q: 'What if the equipment is not as expected?',
    a: 'Do not mark the handoff complete. Record the issue and supporting evidence in the handoff flow, then continue with Vendibook support so the documented concern can be reviewed.',
  },
  {
    q: 'When is the seller paid?',
    a: 'Vendibook reviews the required delivery or handoff confirmations before issuing the seller payout. Payouts are typically released within 24 hours of delivery confirmation, and Vendibook strives for 24–48 hours. Timing can vary when a transaction needs review.',
  },
];

const HandoffPreview = () => {
  const nodes = [
    { label: 'Payment confirmed', icon: CheckCircle2, done: true },
    { label: 'Handoff walkthrough', icon: Video, active: true },
    { label: 'Buyer decision', icon: PackageCheck },
    { label: 'Sale complete', icon: Check },
  ];

  return (
    <div className="overflow-hidden border border-border bg-card shadow-lg">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Order handoff</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Your next step is always clear.</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
            <CircleDot className="h-3.5 w-3.5 text-primary" /> In progress
          </span>
        </div>
      </div>
      <ol className="p-5 sm:p-6">
        {nodes.map((node, index) => (
          <li key={node.label} className="relative flex gap-4 pb-6 last:pb-0">
            {index < nodes.length - 1 ? (
              <span className="absolute left-[17px] top-9 h-full w-px bg-border" aria-hidden />
            ) : null}
            <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border ${node.done ? 'border-primary bg-primary text-primary-foreground' : node.active ? 'border-primary bg-card text-primary' : 'border-border bg-card text-muted-foreground'}`}>
              <node.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="text-sm font-semibold text-foreground">{node.label}</p>
              {node.active ? <p className="mt-1 text-xs text-muted-foreground">Capture condition and supporting evidence</p> : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-5 py-4 sm:px-6">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">Pickup, delivery, evidence, and confirmations stay connected to the order.</p>
      </div>
    </div>
  );
};

const HowPurchasingWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="sale-light flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SEO
        title="How Purchasing Works on Vendibook"
        description="See how buying a food truck or trailer works on Vendibook, including offers, PayPal checkout, pickup or delivery, the documented condition handoff, confirmations, and seller payout review."
        canonical="/how-purchasing-works"
        ogTitle="How Purchasing Works on Vendibook"
        ogDescription="From the first listing to a documented pickup or delivery handoff."
        twitterTitle="How Purchasing Works on Vendibook"
        twitterDescription="From the first listing to a documented pickup or delivery handoff."
      />
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        }}
      />

      <Header />

      <main className="flex-1">
        <section className="border-b border-border pb-16 pt-8 md:pb-24 md:pt-12">
          <div className="container mx-auto max-w-6xl px-4">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works', to: '/how-it-works' },
                { label: 'How Purchasing Works' },
              ]}
              className="mb-8"
            />
            <div className="grid items-center gap-12 lg:grid-cols-[1.08fr,0.92fr] lg:gap-16">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Buying on Vendibook</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
                  From a promising listing to a documented handoff.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Review the equipment, agree on the deal, choose an available payment path, and keep pickup or delivery organized through the final condition decision.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/search">
                      Browse listings <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/payments">See payment options</Link>
                  </Button>
                </div>
              </motion.div>
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease }}
              >
                <HandoffPreview />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Before the handoff</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Move from search to a confirmed order.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Vendibook keeps the listing, conversation, agreement, payment record, and fulfillment choice connected.
              </p>
            </motion.div>
            <div className="mt-12 border-y border-border">
              {PURCHASE_STEPS.map((step, index) => (
                <motion.div
                  key={step.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ ...fadeUp.transition, delay: reduce ? 0 : index * 0.05 }}
                  className="grid gap-4 border-b border-border py-8 last:border-b-0 md:grid-cols-[72px,1fr,1.25fr] md:items-start md:gap-8"
                >
                  <span className="text-3xl font-semibold text-primary">0{index + 1}</span>
                  <div className="flex items-start gap-3">
                    <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    <p className="mt-3 text-xs font-medium text-foreground">{step.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid items-start gap-10 lg:grid-cols-[0.76fr,1.24fr] lg:gap-16">
              <motion.div {...(reduce ? {} : fadeUp)} className="lg:sticky lg:top-28">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">After purchase</p>
                <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">The new post-purchase handoff.</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  The handoff is more than a final checkbox. It creates a clear record of arrival, condition, exceptions, and completion.
                </p>
                <img
                  src={documentsOkArt.url}
                  alt="Purchase documents and handoff evidence kept together"
                  loading="lazy"
                  className="mt-8 aspect-[4/3] w-full border border-border bg-muted/40 object-contain p-5 shadow-sm"
                />
              </motion.div>
              <ol className="border-t border-border">
                {HANDOFF_STEPS.map((step, index) => (
                  <motion.li
                    key={step.title}
                    {...(reduce ? {} : fadeUp)}
                    transition={{ ...fadeUp.transition, delay: reduce ? 0 : index * 0.05 }}
                    className="grid gap-4 border-b border-border py-8 sm:grid-cols-[52px,1fr]"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Handoff {index + 1}</p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                      <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-relaxed text-foreground">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {step.detail}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Pickup or delivery</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">One handoff record, adapted to the journey.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">The exact steps reflect how the equipment reaches you.</p>
            </motion.div>
            <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              {FULFILLMENT.map((option, index) => (
                <motion.div
                  key={option.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ ...fadeUp.transition, delay: reduce ? 0 : index * 0.05 }}
                  className="bg-card p-7 sm:p-8"
                >
                  <option.icon className="h-6 w-6 text-primary" aria-hidden />
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{option.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{option.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{option.body}</p>
                </motion.div>
              ))}
            </div>
            <motion.div {...(reduce ? {} : fadeUp)} className="mt-10 grid items-center gap-8 border-y border-border py-10 md:grid-cols-[0.72fr,1.28fr]">
              <img
                src={deliveryMapArt.url}
                alt="Pickup and delivery coordination map"
                loading="lazy"
                className="mx-auto max-h-56 w-full object-contain"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Long-distance purchase</p>
                <h3 className="mt-2 text-2xl font-bold text-foreground">Shopping another city or state?</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Ask for a live walkthrough and independent inspection before purchase. When freight is available, transport is quoted separately and the delivery record leads into the same condition handoff.
                </p>
                <Button variant="cta-outline" className="mt-6 rounded-full" asChild>
                  <Link to="/vendibook-freight">Explore Vendibook Freight <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <motion.div {...(reduce ? {} : fadeUp)}>
                <PayPalMonogram className="h-7" />
                <h2 className="mt-5 text-3xl font-bold text-foreground">Online payment and seller payout are separate steps.</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  PayPal processes eligible online payments. Vendibook keeps the purchase and handoff record organized, then manually reviews and records the seller payout after the required confirmation steps.
                </p>
              </motion.div>
              <motion.div {...(reduce ? {} : fadeUp)} className="border-l border-border pl-6 sm:pl-8">
                <Banknote className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-xl font-semibold text-foreground">What happens after completion</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Payouts are typically released within 24 hours of delivery confirmation, and Vendibook strives for 24–48 hours. A transaction that needs review can take longer. Payment is sent through the payout method on file, which may be PayPal, ACH, or Venmo.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Questions</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Know what to expect.</h2>
            </motion.div>
            <div className="mt-10 border-t border-border">
              {FAQS.map((faq) => (
                <motion.div key={faq.q} {...(reduce ? {} : fadeUp)} className="grid gap-3 border-b border-border py-7 md:grid-cols-[0.8fr,1.2fr] md:gap-10">
                  <h3 className="font-semibold text-foreground">{faq.q}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border pb-20 pt-16 md:pb-24">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Ready to find your next truck or trailer?</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Browse the marketplace, compare the details, and keep the purchase organized through handoff.
              </p>
              <Button variant="cta" size="lg" className="mt-8 rounded-full" asChild>
                <Link to="/search">Browse listings <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <LifeBuoy className="h-3.5 w-3.5" /> Need help? Visit the{' '}
                <Link to="/help" className="font-medium text-foreground underline underline-offset-4">Help Center</Link>.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowPurchasingWorks;