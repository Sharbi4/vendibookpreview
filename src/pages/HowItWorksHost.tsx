import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Camera,
  Calendar,
  FileCheck,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Users,
  Clock} from 'lucide-react';
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
import ValuePillars, { Pillar } from '@/components/howitworks/ValuePillars';

const steps: WalkthroughStep[] = [
  { number: 1, title: 'Create your listing in minutes', description: 'Add photos, write a description, set hourly/daily/weekly/monthly rates. Our wizard takes about 8 minutes.', icon: Camera, mock: 'photo' },
  { number: 2, title: 'Set your availability', description: 'Block dates, set operating hours, define buffer time between rentals. Smart calendar prevents double-bookings.', icon: Calendar, mock: 'calendar' },
  { number: 3, title: 'Require the right documents', description: 'Need insurance, business licenses, or health permits? We collect, verify, and store them automatically.', icon: FileCheck, mock: 'docs' },
  { number: 4, title: 'Approve booking requests', description: 'Review renter profiles and accept with one tap — or enable Instant Book for faster turnover.', icon: MessageSquare, mock: 'message' },
  { number: 5, title: 'Get paid', description: 'PayPal-paid bookings are recorded automatically, the 12.9% platform fee is deducted, and Vendibook issues your payout to the destination you saved.', icon: DollarSign, mock: 'payout' }];

const pillars: Pillar[] = [
  { icon: ShieldCheck, title: 'Know who you book', description: 'Renter profiles, reviews, and required documents before you approve.' },
  { icon: DollarSign, title: 'Clear 12.9% fee', description: 'Free to list. One platform fee applies when a booking completes.' },
  { icon: FileCheck, title: 'Automated docs', description: 'We collect, verify, and store insurance + permit documents.' },
  { icon: TrendingUp, title: 'AI price optimization', description: 'Vendi suggests rates based on local demand to maximize earnings.' }];

const faqs = [
  { q: 'How much does it cost to list?', a: 'Listing is completely free. We take a 12.9% platform fee only when you complete a booking. No subscriptions.' },
  { q: 'How do payouts work?', a: 'Save a payout destination in your dashboard. Once a booking completes, Vendibook records your proceeds and issues the payout. Payout setup is never required to publish or receive bookings.' },
  { q: 'What if a renter damages my equipment?', a: 'Set a security deposit at the listing level. We collect it at booking and release or refund based on your damage report.' },
  { q: 'Can I choose who rents?', a: 'Yes. Unless you enable Instant Book, you review every booking request and approve or decline manually.' },
  { q: 'How long until my first booking?', a: 'Most hosts with complete listings and competitive pricing receive their first inquiry within 1–2 weeks.' },
  { q: 'Can I list multiple assets?', a: 'Yes — many top hosts manage 4+ listings from one dashboard. No limit.' }];

const HowItWorksHost = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Host on Vendibook: Earn from Your Truck or Kitchen"
        description="Free to list. Control your calendar, choose PayPal checkout or in-person payment, and turn your truck, trailer, kitchen, or vendor space into recurring income."
        canonical="/how-it-works-host"
      />
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.04] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-4">
                  
                  For hosts
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.05]">
                  Earn while your assets work for you.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  List your food truck, trailer, commercial kitchen, or vendor space. Set your rates, control your calendar, and choose how renters pay.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" variant="glass-cta" className="rounded-full" asChild>
                    <Link to="/list?mode=rent">
                      Start hosting <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" asChild>
                    <Link to="/how-it-works">Compare paths</Link>
                  </Button>
                </div>
                {/* Quick proof */}
                <div className="flex items-center gap-5 mt-7 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free to list</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 24hr payouts</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> PayPal checkout</div>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <AnimatedHeroScene variant="host" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="py-10 md:py-14">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">From listing to payout in 5 steps</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Built for operators who want recurring income without the chaos of managing rentals manually.
            </p>
          </div>
        </section>

        {/* WALKTHROUGH */}
        <ScrollWalkthrough steps={steps} tone="host" />

        {/* PILLARS */}
        <ValuePillars pillars={pillars} tone="host" />

        {/* SOCIAL PROOF */}
        <section className="py-10 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { v: '$3.2k', l: 'Avg monthly host earnings' },
                { v: '24hr', l: 'Payout speed' },
                { v: '12.9%', l: 'Flat platform fee' },
                { v: '12.9%', l: 'Platform fee — that\'s it' }].map((s) => (
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Host FAQs</h2>
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
              <h2 className="relative text-3xl md:text-4xl font-bold mb-3">List your asset today</h2>
              <p className="relative text-base md:text-lg opacity-80 mb-7 max-w-xl mx-auto">No upfront cost. Get your first booking inquiry within 1–2 weeks.</p>
              <Button size="lg" variant="secondary" className="relative rounded-full" asChild>
                <Link to="/list?mode=rent">Start hosting <ArrowRight className="ml-1.5 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksHost;
