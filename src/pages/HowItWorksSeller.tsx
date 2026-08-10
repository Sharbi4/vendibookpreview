import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Camera,
  MessageSquare,
  CreditCard,
  Truck,
  DollarSign,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Package,
  Star} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import AnimatedHeroScene from '@/components/howitworks/AnimatedHeroScene';
import ScrollWalkthrough, { WalkthroughStep } from '@/components/howitworks/ScrollWalkthrough';
import { PaymentRailsSection, KeepExploring } from '@/components/howitworks/PaymentRailsSection';
import ValuePillars, { Pillar } from '@/components/howitworks/ValuePillars';
import PricingFaqSection from '@/components/shared/PricingFaqSection';
import { getPricingFaq } from '@/data/pricingFaq';

const steps: WalkthroughStep[] = [
  { number: 1, title: 'Create and publish for free', description: 'Upload photos, write specs, and set your asking price. Publishing never requires verification, payout setup, PayPal setup, financing, or a paid add-on.', icon: Camera, mock: 'photo' },
  { number: 2, title: 'Receive offers', description: 'Buyers send full-price purchases or counter-offers. Review, negotiate, or accept with one click.', icon: MessageSquare, mock: 'message' },
  { number: 3, title: 'Choose how you get paid', description: 'Enable PayPal Checkout, accept payment in person, or both — and optionally add Equinox Funding so buyers can finance.', icon: CreditCard, mock: 'payment' },
  { number: 4, title: 'Coordinate handoff', description: 'Local pickup or use Vendibook Freight ($4.50/mile) for nationwide delivery. We handle logistics quotes automatically.', icon: Truck, mock: 'truck' },
  { number: 5, title: 'Track the transaction and payout', description: 'For a completed Vendibook-processed sale, Vendibook records your proceeds minus the 12.9% seller platform fee and issues the payout through its reviewed payout workflow to your saved PayPal, Venmo, Cash App, or ACH destination. Follow every stage in your dashboard.', icon: DollarSign, mock: 'payout' }];

const pillars: Pillar[] = [
  { icon: Users, title: 'Offers in one place', description: 'Message, negotiate, and accept offers inside Vendibook.' },
  { icon: CreditCard, title: 'Buyer financing option', description: 'Add Equinox Funding to eligible sale listings to widen your buyer pool.' },
  { icon: ShieldCheck, title: 'PayPal Purchase Protection', description: 'Eligible purchases may include PayPal Purchase Protection; PayPal determines eligibility and outcomes.' },
  { icon: DollarSign, title: 'Free to publish', description: 'No upfront fees. The 12.9% seller platform fee applies only to a completed Vendibook-processed sale.' }];

const faqs = [
  { q: 'How much does selling cost?', a: 'Publishing is free. For a completed Vendibook-processed sale, a 12.9% seller platform fee is deducted from the recorded proceeds. Pay-in-person sales are arranged directly with the buyer and carry no Vendibook seller platform fee.' },
  { q: 'Do I need to verify my identity or set up payouts before publishing?', a: 'No. Publishing never requires identity verification, payout setup, PayPal setup, financing, a membership, or a paid add-on. Identity verification is an optional one-time $19.99 upgrade powered by Plaid and paid through PayPal, and the badge confirms identity only \u2014 not ownership, title, condition, value, or listing accuracy.' },
  { q: 'Can buyers finance my asset?', a: 'On eligible for-sale trucks, trailers, and carts you can turn on the optional Equinox Funding add-on. Buyers can then apply and download the financing purchase sheet. A 12.9% platform fee applies to an Equinox-financed Vendibook sale. Vendibook is not a lender \u2014 approval and terms are determined by Equinox and/or its funding providers.' },
  { q: 'Do you handle freight shipping?', a: 'Vendibook Freight covers door-to-door delivery across the 48 contiguous states at $4.50/mile, calculated and quoted at checkout.' },
  { q: 'How do I get paid?', a: 'Save a payout destination in your dashboard. After a completed Vendibook-processed sale, Vendibook records your proceeds minus the 12.9% seller platform fee and issues the payout through its current reviewed payout workflow to your saved PayPal, Venmo, Cash App, or ACH destination. Payout setup never blocks publishing.' },
  { q: 'What if a buyer backs out?', a: 'Once a PayPal payment completes, the order is recorded and our support team helps document the issue. Eligible purchases may include PayPal Purchase Protection; PayPal determines eligibility and outcomes.' },
  { q: 'Can I list multiple items?', a: 'Yes \u2014 list as many trucks, trailers, or pieces of equipment as you have. Manage everything from one dashboard.' }];

const HowItWorksSeller = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            ...faqs.map((f) => ({ q: f.q, a: f.a })),
            ...getPricingFaq('seller').map((f) => ({ q: f.question, a: f.answer })),
          ].map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <SEO
        title="Sell a Food Truck or Trailer Fast | Vendibook"
        description="Publish free, reach buyers nationwide, and close with PayPal Checkout, payment in person, or optional Equinox Funding. See how selling on Vendibook works, step by step."
        canonical="/how-it-works-seller"
      />
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-400 mb-4">
                  <Package className="w-3.5 h-3.5" />
                  For sellers
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.05]">
                  Sell to buyers who are ready to write the check.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Reach buyers looking for food trucks, trailers, and commercial kitchen equipment. Free to publish, PayPal Checkout or payment in person, optional Equinox financing, and nationwide freight.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" variant="glass-cta" className="rounded-full" asChild>
                    <Link to="/list/start">
                      List for sale <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" asChild>
                    <Link to="/how-it-works-host">I want to rent instead</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-5 mt-7 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-500" /> Free to publish</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-500" /> Buyer financing</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-500" /> Nationwide freight</div>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <AnimatedHeroScene variant="seller" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="py-10 md:py-14">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">From listing to sold in 5 steps</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Reach more buyers, close faster, and get paid securely — without dealing with no-shows or scams.
            </p>
          </div>
        </section>

        {/* WALKTHROUGH */}
        <ScrollWalkthrough steps={steps} tone="seller" />

        {/* PILLARS */}
        <ValuePillars pillars={pillars} tone="seller" />

        {/* PROOF — factual, no performance claims */}
        <section className="py-10 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { v: '$0', l: 'Cost to publish' },
                { v: '12.9%', l: 'Seller fee on a processed sale' },
                { v: '0%', l: 'Fee on pay-in-person sales' },
                { v: '48 states', l: 'Freight coverage' }].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{s.v}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Seller FAQs</h2>
            <Accordion type="single" collapsible>
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="relative bg-foreground text-background rounded-3xl p-8 md:p-14 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/[0.05] to-transparent" style={{ animation: 'shimmer-sweep 5s ease-in-out infinite' }} />
              </div>
              <h2 className="relative text-3xl md:text-4xl font-bold mb-3">Ready to sell?</h2>
              <p className="relative text-base md:text-lg opacity-80 mb-7 max-w-xl mx-auto">Free to publish. The 12.9% seller platform fee applies only to a completed Vendibook-processed sale.</p>
              <Button size="lg" variant="secondary" className="relative rounded-full" asChild>
                <Link to="/list/start">Create your listing <ArrowRight className="ml-1.5 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
        <PricingFaqSection audience="seller" />
        <PaymentRailsSection audience="seller" />

        <KeepExploring current="seller" />

      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksSeller;
