import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  FileSignature,
  HelpCircle,
  Landmark,
  MessageSquare,
  Truck,
  Video,
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
import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';
import paypalAppImage from '@/assets/paypal-app-2025.webp.asset.json';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.42, ease },
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

const PayPalVisual = () => (
  <div className="overflow-hidden border border-border bg-card shadow-lg">
    <img
      src={paypalAppImage.url}
      alt="PayPal app shown on a mobile phone"
      loading="eager"
      className="aspect-[4/3] w-full object-cover"
    />
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
      <div className="flex items-center gap-2">
        <PayPalMonogram className="h-5" />
        <span className="text-sm font-semibold text-foreground">Checkout powered by PayPal</span>
      </div>
        <span className="text-xs text-muted-foreground">Secure online payment</span>
    </div>
  </div>
);

const BUYING_SEQUENCE = [
  {
    icon: Video,
    title: 'See it live',
    body: 'Review the listing and schedule a live video walkthrough when you want a closer look before moving forward.',
  },
  {
    icon: FileSignature,
    title: 'Confirm the deal',
    body: 'Keep the agreed price, transaction details, messages, and purchase agreement connected to the order.',
  },
  {
    icon: Wallet,
    title: 'Pay through PayPal',
    body: 'When online checkout is available, complete payment through PayPal using the options PayPal makes available for your transaction.',
  },
  {
    icon: Truck,
    title: 'Track the handoff',
    body: 'Keep pickup, delivery updates, confirmations, and order details together through completion.',
  },
];

const BUYER_OPTIONS = [
  {
    icon: Wallet,
    title: 'PayPal balance or linked bank',
    body: 'Use eligible funding sources connected to your PayPal account.',
  },
  {
    icon: CreditCard,
    title: 'Debit or credit card',
    body: 'Pay with an eligible card through PayPal checkout.',
  },
  {
    icon: Wallet,
    title: 'Venmo, when available',
    body: 'Venmo may appear on eligible devices and transactions.',
  },
  {
    icon: CalendarClock,
    title: 'Pay Later, when eligible',
    body: 'PayPal may offer installment options for qualifying buyers and purchases.',
  },
];

const FAQS = [
  {
    q: 'When is PayPal checkout available?',
    a: 'Online checkout appears on eligible listings when the seller’s PayPal payment setup is ready and the transaction supports online payment.',
  },
  {
    q: 'What if I want to see the truck or trailer first?',
    a: 'Message the seller or schedule a live video walkthrough when available. You can ask to see specific equipment, systems, condition details, or documentation before deciding what to do next.',
  },
  {
    q: 'Can I cancel after I pay?',
    a: 'Cancellation and refund eligibility depend on the transaction status and the applicable Payments Terms. If something changes after payment, contact Vendibook support as soon as possible.',
  },
  {
    q: 'What does it mean when a seller can accept PayPal?',
    a: 'It means the seller completed the PayPal connection and payment-readiness steps required for Vendibook checkout. It does not mean Vendibook inspected the equipment, verified title, or guarantees the seller’s claims.',
  },
  {
    q: 'What is PayPal Pay Later?',
    a: 'Eligible buyers may see Pay in 4 or Pay Monthly inside PayPal checkout. PayPal determines availability, approval, rates, and terms.',
  },
  {
    q: 'Does PayPal Purchase Protection cover a food truck or trailer?',
    a: 'PayPal Purchase Protection applies only to eligible transactions, and PayPal’s current U.S. terms exclude vehicles. Review PayPal’s current terms before purchasing a food truck or trailer.',
  },
  {
    q: 'Who decides whether I qualify for Pay Later?',
    a: 'PayPal determines eligibility and the options shown at checkout. Vendibook is not the lender and does not decide approval, rates, or terms.',
  },
];

const Payments = () => {
  const reduce = useReducedMotion();

  return (
    <div className="sale-light flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SEO
        title="Pay with PayPal on Vendibook | Food Truck & Trailer Checkout"
        description="See how Vendibook brings listing details, seller communication, video walkthroughs, agreements, PayPal checkout, and delivery records into one transaction flow."
        canonical="/payments"
        ogTitle="How Payments Work on Vendibook"
        ogDescription="A clearer way to move from listing to payment and handoff."
        twitterTitle="How Payments Work on Vendibook"
        twitterDescription="A clearer way to move from listing to payment and handoff."
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
        <section className="border-b border-border pb-16 pt-12 md:pb-24 md:pt-20">
          <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.08fr,0.92fr] lg:gap-16">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <PayPalMonogram className="h-5" />
                 PayPal checkout on Vendibook
              </div>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
                 Keep the deal moving without taking it off-platform.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                 See the equipment, talk with the seller, review the agreement, pay through PayPal,
                 and keep pickup or delivery details together on Vendibook.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                   <Link to="/search">
                     Browse listings <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/how-purchasing-works">How buying works</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease }}
            >
              <PayPalVisual />
            </motion.div>
          </div>
        </section>

        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-3xl">
               <p className="text-sm font-semibold uppercase text-primary">How it works</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                 From first look to final handoff.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                 Everything stays connected to the same transaction, so you can see what happened and what comes next.
              </p>
            </motion.div>
            <div className="mt-12 border-y border-border">
              {BUYING_SEQUENCE.map((step, index) => (
                <motion.div
                  key={step.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: reduce ? 0 : index * 0.05 }}
                  className="grid gap-4 border-b border-border py-8 last:border-b-0 md:grid-cols-[72px,1fr,1.25fr] md:items-start md:gap-8"
                >
                  <span className="text-3xl font-semibold text-primary">0{index + 1}</span>
                  <div className="flex items-center gap-3">
                    <step.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-2xl">
               <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Use the payment options PayPal shows you.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                 Available methods vary by buyer, device, merchant, and transaction.
              </p>
            </motion.div>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {BUYER_OPTIONS.map((option) => (
                <motion.div key={option.title} {...fadeUp} className="flex gap-4 border-t border-border pt-6">
                  <option.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-foreground">{option.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-3xl">
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                 Need more flexibility? PayPal may offer Pay Later.<span className="text-primary">*</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                 Eligible buyers may see Pay in 4 or Pay Monthly directly in PayPal checkout.
              </p>
            </motion.div>
            <div className="mt-10 grid gap-8 border-y border-border py-10 lg:grid-cols-2 lg:gap-16">
              <motion.div {...fadeUp}>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Smaller eligible purchases</p>
                <h3 className="mt-3 text-2xl font-bold text-foreground">Pay in 4</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                   <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Four payments on eligible purchases.</li>
                   <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />PayPal determines eligibility and shows the applicable terms at checkout.</li>
                </ul>
                 <p className="mt-6"><ExtLink href={PAYPAL_LINKS.payIn4}>View Pay in 4 details</ExtLink></p>
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduce ? 0 : 0.06 }}>
                <p className="text-sm font-semibold uppercase text-primary">Larger qualifying purchases</p>
                <h3 className="mt-3 text-2xl font-bold text-foreground">Pay Monthly</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                   <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Monthly payment options may be available on qualifying purchases.</li>
                   <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Available term, rate, and approval are determined by PayPal.</li>
                </ul>
                 <p className="mt-6"><ExtLink href={PAYPAL_LINKS.payMonthly}>View Pay Monthly details</ExtLink></p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-3xl">
               <h2 className="text-3xl font-bold text-foreground sm:text-4xl">PayPal handles checkout. Vendibook keeps the deal organized.</h2>
               <p className="mt-4 text-muted-foreground">Each service has a clear role in the transaction.</p>
            </motion.div>
            <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
              <motion.div {...fadeUp} className="bg-card p-7 sm:p-9">
                <PayPalWordmark surface="light" className="text-lg" />
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                   <li>Processes the online payment.</li>
                   <li>Shows the eligible funding options available at checkout.</li>
                   <li>Handles Pay Later eligibility, terms, and repayment.</li>
                   <li>Processes card details within PayPal checkout.</li>
                </ul>
              </motion.div>
              <motion.div {...fadeUp} className="bg-card p-7 sm:p-9">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold text-foreground">Vendibook</span>
                </div>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                   <li>Keeps the listing, messages, and video walkthrough connected.</li>
                   <li>Provides the agreement and transaction workflow.</li>
                   <li>Organizes pickup, delivery updates, and confirmations.</li>
                   <li>Keeps the order and transaction record accessible in your account.</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[0.8fr,1.2fr] lg:gap-16">
            <motion.div {...fadeUp}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
                <Landmark className="h-4 w-4" aria-hidden="true" /> For sellers
              </div>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
                 Want buyers to pay online? Connect PayPal.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                 Create your listing first, then connect PayPal when you're ready to enable online checkout on eligible listings.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Sole proprietors can use a PayPal Business account; Vendibook does not require you to form an LLC just to list.
              </p>
              <Button variant="cta" size="lg" className="mt-8 rounded-full" asChild>
                <Link to="/sell-my-food-truck">
                  Start selling <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div {...fadeUp} className="border-y border-border py-2">
              {[
                 ['Create and publish your listing', 'Add the equipment details buyers need and take your listing live.'],
                 ['Connect PayPal', 'Complete the connection from your Vendibook account.'],
                 ['Complete account checks', 'Finish the steps PayPal requires for your account.'],
                 ['Offer online checkout', 'Eligible listings can show checkout when your payment setup is ready.'],
              ].map(([title, body]) => (
                <div key={title} className="grid gap-2 border-b border-border py-6 last:border-b-0 sm:grid-cols-[150px,1fr] sm:gap-6">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="grid gap-8 md:grid-cols-[0.45fr,1fr] md:gap-16">
              <div>
                <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
                 <h2 className="mt-4 text-3xl font-bold text-foreground">Buying from farther away?</h2>
              </div>
              <div>
                <p className="text-base leading-relaxed text-muted-foreground">
                   Eligible orders can include pickup, seller delivery, or freight options. Keep delivery details and order updates connected to the transaction.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                   If a separate freight charge is paid through PayPal, any Pay Later eligibility is determined separately by PayPal.
                </p>
                <Button variant="cta-outline" className="mt-7 rounded-full" asChild>
                  <Link to="/vendibook-freight">Explore Vendibook Freight</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4">
            <motion.h2 {...fadeUp} className="text-3xl font-bold text-foreground sm:text-4xl">
               Payment questions, answered.
            </motion.h2>
            <motion.div {...fadeUp} className="mt-8">
              <Accordion type="single" collapsible>
                {FAQS.map((faq, index) => (
                  <AccordionItem key={faq.q} value={`faq-${index}`} className="border-border">
                    <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        <section className="bg-foreground py-16 text-background md:py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <PayPalWordmark surface="dark" className="mx-auto text-lg" />
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold sm:text-4xl">
               Find the equipment. Keep the transaction in one place.
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="cta" size="lg" className="rounded-full" asChild>
                 <Link to="/search">Browse marketplace <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="rounded-full border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background" asChild>
                 <Link to="/sell-my-food-truck">Sell on Vendibook</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
               *PayPal Pay Later offers are subject to consumer credit approval, buyer and purchase eligibility,
               merchant and state availability, and PayPal/WebBank terms. Pay Monthly is an interest-bearing
               consumer installment loan issued by WebBank. Vendibook LC is not the lender and does not determine
               approval, rates, available terms, or APR. Twelve months is a possible Pay Monthly term, not a separate
               Pay in 12 product. Separate PayPal transactions, including separately charged Vendibook Freight, may
               require separate Pay Later applications. PayPal Purchase Protection applies only to eligible
               transactions. PayPal&rsquo;s current U.S. terms exclude vehicles. Review PayPal&rsquo;s current terms before
               purchasing a food truck or trailer.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs">
              <Link to="/legal/payments-terms" className="font-semibold text-primary hover:underline">Payments Terms</Link>
              <Link to="/legal/financing-disclosure" className="font-semibold text-primary hover:underline">Financing Disclosure</Link>
              <Link to="/legal/video-walkthrough-terms" className="font-semibold text-primary hover:underline">Video Walkthrough Terms</Link>
              <ExtLink href={PAYPAL_LINKS.payLater}>PayPal Pay Later overview</ExtLink>
              <ExtLink href={PAYPAL_LINKS.protection}>PayPal Purchase Protection terms</ExtLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Payments;