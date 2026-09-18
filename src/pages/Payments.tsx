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
  ShieldCheck,
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
      <span className="text-xs text-muted-foreground">Encrypted checkout</span>
    </div>
  </div>
);

const BUYING_SEQUENCE = [
  {
    icon: ShieldCheck,
    title: 'Confirm the seller can accept PayPal.',
    body: 'PayPal checkout is available only after the seller’s PayPal business account passes the payment-readiness checks required for the transaction.',
  },
  {
    icon: Video,
    title: 'See the equipment before you commit.',
    body: 'Request a live Vendibook video walkthrough, ask the seller to show specific systems, and keep the conversation in your transaction record.',
  },
  {
    icon: FileSignature,
    title: 'Review the purchase agreement.',
    body: 'Vendibook prepares a purchase and sale agreement from the transaction details for the buyer and seller to review and sign electronically.',
  },
  {
    icon: Truck,
    title: 'Document pickup or delivery.',
    body: 'Keep handoff details, messages, delivery updates, and confirmations together in Vendibook so both parties have the same record.',
  },
];

const BUYER_OPTIONS = [
  {
    icon: Wallet,
    title: 'PayPal balance, bank or debit',
    body: 'Use the funding sources PayPal makes available to you inside checkout, including a PayPal balance or linked bank or debit account where offered.',
  },
  {
    icon: CreditCard,
    title: 'Debit or credit card',
    body: 'Card payments run through PayPal’s official checkout. Vendibook never stores your full card details.',
  },
  {
    icon: Wallet,
    title: 'Venmo',
    body: 'Venmo may appear through PayPal checkout on eligible devices and transactions. PayPal decides when it is available.',
  },
  {
    icon: CalendarClock,
    title: 'Pay Later, when eligible',
    body: 'PayPal may show Pay Later for a specific buyer and transaction. PayPal alone determines availability, approval, and terms.',
  },
];

const FAQS = [
  {
    q: 'When does the seller actually get paid?',
    a: 'PayPal processes the buyer payment at checkout. Vendibook records the seller payable, and seller payouts are reviewed and recorded through Vendibook’s current payout process. Your order page shows the transaction status and next steps.',
  },
  {
    q: 'What if the seller won’t do a walkthrough?',
    a: 'Do not continue if you are not comfortable with the equipment or the seller’s answers. Contact Vendibook support from the transaction so the concern and next steps can be documented.',
  },
  {
    q: 'Can I cancel after I pay?',
    a: 'Contact support immediately. Cancellation and refund eligibility depend on the transaction status, the seller’s actions, and the applicable Payments Terms. A cancellation is not automatic merely because it is requested.',
  },
  {
    q: 'Is my seller a real business?',
    a: 'A seller offering PayPal checkout must have a PayPal business account that meets the payment-readiness checks used by Vendibook. A PayPal business account can be a sole proprietorship in the owner’s legal name. This does not mean Vendibook inspected the item, verified title, or endorses the seller.',
  },
  {
    q: 'What is PayPal Pay Later?',
    a: 'Pay Later is PayPal’s name for its buy-now-pay-later options in the US: Pay in 4 and Pay Monthly. When PayPal offers one for your purchase, it appears inside PayPal checkout. Availability is determined by PayPal, not Vendibook.',
  },
  {
    q: 'What is the difference between Pay in 4 and Pay Monthly?',
    a: 'Pay in 4 splits an eligible smaller purchase into four interest-free payments. Pay Monthly is an interest-bearing consumer installment loan issued by WebBank. Terms depend on creditworthiness and the purchase. PayPal provides the current offer and disclosures.',
  },
  {
    q: 'Can I use Pay Monthly for a food trailer under $10,000?',
    a: 'A trailer under $10,000 may fall within PayPal’s published Pay Monthly purchase range, but that alone does not make it eligible. PayPal decides eligibility for each buyer, item, merchant, state, and transaction.',
  },
  {
    q: 'Is there a Pay in 12 option?',
    a: 'No. PayPal does not offer a separate product called “Pay in 12.” Twelve months is one term Pay Monthly may offer on an eligible purchase. PayPal determines which terms are available at checkout.',
  },
  {
    q: 'Can I finance Vendibook Freight with PayPal Pay Later?',
    a: 'Eligible Freight charges paid through PayPal may surface Pay Later, subject to PayPal eligibility and approval. If the purchase and Freight are separate transactions, each requires its own PayPal decision and any separate application.',
  },
  {
    q: 'Does the seller have to wait for my Pay Later installments?',
    a: 'No. The buyer’s repayment relationship is with PayPal or WebBank. Pay Later does not change Vendibook’s current transaction and seller payout process.',
  },
  {
    q: 'Does PayPal Purchase Protection cover a food truck or trailer?',
    a: 'PayPal Purchase Protection applies only to eligible transactions, and PayPal’s current US terms exclude vehicles. Do not assume a food truck or trailer purchase is covered. Review PayPal’s current terms before buying.',
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
        title="Safer Food Truck Checkout with PayPal | Vendibook"
        description="Understand seller readiness, video walkthroughs, purchase agreements, handoff records, and PayPal checkout before buying a food truck or trailer."
        canonical="/payments"
        ogTitle="How Payments Work on Vendibook"
        ogDescription="A clear path from equipment review to PayPal checkout and documented handoff."
        twitterTitle="How Payments Work on Vendibook"
        twitterDescription="A clear path from equipment review to PayPal checkout and documented handoff."
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
                Vendibook checkout with PayPal
              </div>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
                Buying a food truck shouldn&rsquo;t feel like a leap of faith.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Review the equipment live, put the sale terms in writing, pay through PayPal, and
                keep pickup or delivery details in one transaction record. Large purchases deserve
                a process you can see and understand.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">
                    Browse food trucks and trailers <ArrowRight className="ml-1.5 h-4 w-4" />
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
              <p className="text-sm font-semibold uppercase text-primary">Before you pay</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                A clearer way to buy unfamiliar equipment.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                These are practical safeguards built into the buying experience. They do not replace
                your own inspection, title review, or professional advice.
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
            <p className="mt-6 text-sm text-muted-foreground">
              If something does not look right, stop and{' '}
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                contact us
              </Link>{' '}
              before continuing.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="grid gap-8 border-l-4 border-primary pl-6 md:grid-cols-[1fr,0.45fr] md:gap-16 md:pl-10">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Read this before buying</p>
                <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                  PayPal&rsquo;s Purchase Protection excludes vehicles.
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
                  That includes food trucks and trailers. We would rather tell you up front than let
                  you assume otherwise. Use the live walkthrough, written agreement, transaction
                  messages, and documented handoff to evaluate and record the purchase.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Eligible non-vehicle transactions may qualify under PayPal&rsquo;s own terms.{' '}
                  <ExtLink href={PAYPAL_LINKS.protection}>Review the current terms</ExtLink>.
                </p>
              </div>
              <div className="self-end text-sm leading-relaxed text-muted-foreground">
                Vendibook does not inspect equipment, verify title, or guarantee a seller&rsquo;s claims.
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-2xl">
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Ways to pay through PayPal.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                PayPal decides which options appear for each buyer, device, and transaction. No
                option is guaranteed, and Vendibook does not add a fee based on the option selected.
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
                Pay over time, when PayPal offers it.<span className="text-primary">*</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                PayPal Pay Later includes Pay in 4 and Pay Monthly in the US. PayPal determines
                availability, approval, and the terms shown in checkout.
              </p>
            </motion.div>
            <div className="mt-10 grid gap-8 border-y border-border py-10 lg:grid-cols-2 lg:gap-16">
              <motion.div {...fadeUp}>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Smaller eligible purchases</p>
                <h3 className="mt-3 text-2xl font-bold text-foreground">Pay in 4</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Four interest-free payments.</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />First payment at purchase, then three every two weeks.</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />PayPal publishes the current purchase limits and decides eligibility.</li>
                </ul>
                <p className="mt-6"><ExtLink href={PAYPAL_LINKS.payIn4}>View current Pay in 4 terms</ExtLink></p>
              </motion.div>
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduce ? 0 : 0.06 }}>
                <p className="text-sm font-semibold uppercase text-primary">Larger qualifying purchases</p>
                <h3 className="mt-3 text-2xl font-bold text-foreground">Pay Monthly</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Qualifying purchases generally from $49 to $10,000.</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Possible terms of 3, 6, 12, or 24 months.</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />$0 down when offered; loan issued by WebBank.</li>
                  <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />PayPal supplies current rates, disclosures, and approval terms.</li>
                </ul>
                <p className="mt-6"><ExtLink href={PAYPAL_LINKS.payMonthly}>View current Pay Monthly terms</ExtLink></p>
              </motion.div>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <motion.div {...fadeUp} className="border-l border-border pl-5">
                <h3 className="font-semibold text-foreground">Looking at a trailer under $10,000?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  It may fall within PayPal&rsquo;s published Pay Monthly range, but PayPal decides
                  eligibility for each buyer, merchant, item, state, and transaction.
                </p>
              </motion.div>
              <motion.div {...fadeUp} className="border-l border-border pl-5">
                <h3 className="font-semibold text-foreground">There is no separate “Pay in 12.”</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Twelve months is one possible Pay Monthly term. PayPal determines which terms are
                  available at checkout.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...fadeUp} className="max-w-3xl">
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Who does what.</h2>
              <p className="mt-4 text-muted-foreground">Clear roles make a large transaction easier to understand.</p>
            </motion.div>
            <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
              <motion.div {...fadeUp} className="bg-card p-7 sm:p-9">
                <PayPalWordmark surface="light" className="text-lg" />
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <li>Processes checkout and the payment itself.</li>
                  <li>Determines which funding options appear.</li>
                  <li>Owns Pay Later approval, terms, disclosures, and repayment.</li>
                  <li>Handles card information within PayPal&rsquo;s official checkout.</li>
                </ul>
              </motion.div>
              <motion.div {...fadeUp} className="bg-card p-7 sm:p-9">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold text-foreground">Vendibook</span>
                </div>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <li>Hosts listing details, messages, and live video walkthroughs.</li>
                  <li>Provides the purchase agreement workflow for both parties.</li>
                  <li>Coordinates pickup, delivery, and transaction confirmations.</li>
                  <li>Records seller payables and the status of the current payout process.</li>
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
                A PayPal Business account can still be just you.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Sole proprietors are welcome. You can use your own legal name, and Vendibook does not
                require an LLC or registered company. PayPal performs its own identity and account
                eligibility checks.
              </p>
              <Button variant="cta" size="lg" className="mt-8 rounded-full" asChild>
                <Link to="/sell-my-food-truck">
                  Start selling <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div {...fadeUp} className="border-y border-border py-2">
              {[
                ['Buyer payment', 'PayPal processes the buyer’s payment in checkout.'],
                ['Seller payable', 'Vendibook records what is owed to the seller after applicable fees.'],
                ['Payout status', 'Seller payouts are reviewed and recorded through the current Vendibook payout process.'],
                ['Funding costs', 'PayPal funding options and processing terms can vary. Sellers should review PayPal’s current pricing and their Vendibook Seller Payment Terms.'],
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
                <h2 className="mt-4 text-3xl font-bold text-foreground">Need to move it too?</h2>
              </div>
              <div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Eligible Vendibook Freight charges paid through PayPal may also surface Pay Later,
                  subject to PayPal eligibility and approval.<span className="text-primary">*</span>
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  If the equipment purchase and Freight are separate PayPal transactions, each is a
                  separate purchase. Pay Monthly is a single-purchase loan, so each transaction may
                  require its own application.
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
              Questions buyers actually ask.
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
              Start with the equipment. Understand every step before you pay.
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="cta" size="lg" className="rounded-full" asChild>
                <Link to="/browse">Browse listings <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="rounded-full border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background" asChild>
                <Link to="/how-purchasing-works">How buying works</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              *PayPal Pay Later offers are subject to consumer credit approval, buyer and purchase
              eligibility, merchant and state availability, and PayPal/WebBank terms. Pay Monthly is
              an interest-bearing consumer installment loan issued by WebBank. Vendibook LC is not
              the lender and does not determine approval, rates, available terms, or APR. Twelve
              months is a possible Pay Monthly term, not a separate Pay in 12 product. Separate
              PayPal transactions, including separately charged Vendibook Freight, may require
              separate Pay Later applications. PayPal Purchase Protection applies only to eligible
              transactions; PayPal&rsquo;s current US terms exclude vehicles.
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