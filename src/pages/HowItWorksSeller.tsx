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
import AnimatedHeroScene from '@/components/howitworks/AnimatedHeroScene';
import ScrollWalkthrough, { WalkthroughStep } from '@/components/howitworks/ScrollWalkthrough';
import { PaymentRailsSection, KeepExploring } from '@/components/howitworks/PaymentRailsSection';
import ValuePillars, { Pillar } from '@/components/howitworks/ValuePillars';

const steps: WalkthroughStep[] = [
  { number: 1, title: 'List with great photos', description: 'Upload high-res photos, write specs, set asking price. Listings with 8+ photos sell 3x faster.', icon: Camera, mock: 'photo' },
  { number: 2, title: 'Receive offers', description: 'Buyers send full-price purchases or counter-offers. Review, negotiate, or accept with one click.', icon: MessageSquare, mock: 'message' },
  { number: 3, title: 'Choose how you get paid', description: 'Enable PayPal Checkout, accept payment in person, or both — and optionally add Equinox Funding so buyers can finance.', icon: CreditCard, mock: 'payment' },
  { number: 4, title: 'Coordinate handoff', description: 'Local pickup or use Vendibook Freight ($4.50/mile) for nationwide delivery. We handle logistics quotes automatically.', icon: Truck, mock: 'truck' },
  { number: 5, title: 'Get paid', description: 'Once the buyer confirms receipt, Vendibook records your proceeds and issues your payout to the destination you saved. Track everything in your dashboard.', icon: DollarSign, mock: 'payout' }];

const pillars: Pillar[] = [
  { icon: Users, title: 'Real buyers', description: 'Message, negotiate, and accept offers inside Vendibook.' },
  { icon: CreditCard, title: 'Buyer financing option', description: 'Add Equinox Funding to eligible sale listings to widen your buyer pool.' },
  { icon: ShieldCheck, title: 'Payment protection', description: 'PayPal-paid orders include PayPal\u2019s buyer and seller dispute protection.' },
  { icon: DollarSign, title: 'No upfront fees', description: 'Free to list. Pay only when the sale completes.' }];

const faqs = [
  { q: 'How much does selling cost?', a: 'Free to list. We charge a small platform fee (typically under 10%) only after the sale closes successfully.' },
  { q: 'Can buyers finance my asset?', a: 'Yes — turn on the Equinox Funding add-on and eligible buyers can apply. Financing is provided by Equinox Funding LLC, subject to credit approval.' },
  { q: 'Do you handle freight shipping?', a: 'Vendibook Freight covers door-to-door US delivery at $4.50/mile, calculated and quoted automatically at checkout.' },
  { q: 'How do I get paid?', a: 'Save a payout destination in your dashboard. After an online sale completes, Vendibook records your proceeds minus the 12.9% platform fee and issues the payout. Payout setup never blocks publishing.' },
  { q: 'What if a buyer backs out?', a: 'Once a PayPal payment completes, the order is recorded and our support team mediates any dispute alongside PayPal\'s own buyer protection process.' },
  { q: 'Can I list multiple items?', a: 'Yes — list as many trucks, trailers, or pieces of equipment as you have. Manage everything from one dashboard.' }];

const HowItWorksSeller = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Sell a Food Truck or Trailer Fast | Vendibook"
        description="List free, reach buyers nationwide, and close with PayPal checkout or optional Equinox Funding financing. See how selling on Vendibook works—step by step."
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
                  Reach thousands of buyers looking for food trucks, trailers, and commercial kitchen equipment. Free to list, PayPal checkout, optional Equinox financing and nationwide freight.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" variant="glass-cta" className="rounded-full" asChild>
                    <Link to="/list?mode=sale">
                      List for sale <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" asChild>
                    <Link to="/how-it-works-host">I want to rent instead</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-5 mt-7 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-500" /> Free to list</div>
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

        {/* PROOF */}
        <section className="py-10 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { v: '14 days', l: 'Avg time to sell' },
                { v: '3x', l: 'Faster with 8+ photos' },
                { v: '47 states', l: 'Buyer reach' },
                { v: '$0', l: 'Upfront cost' }].map((s) => (
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
              <p className="relative text-base md:text-lg opacity-80 mb-7 max-w-xl mx-auto">No upfront fees. You only pay when the sale completes.</p>
              <Button size="lg" variant="secondary" className="relative rounded-full" asChild>
                <Link to="/list?mode=sale">Create your listing <ArrowRight className="ml-1.5 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
        <PaymentRailsSection audience="seller" />

        <KeepExploring current="seller" />

      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksSeller;
