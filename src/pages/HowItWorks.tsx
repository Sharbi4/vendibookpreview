import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShieldCheck,
  CreditCard,
  Handshake,
  MessageSquare,
  Calendar,
  Camera,
  DollarSign,
  Truck,
  FileCheck,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  MapPin} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger} from '@/components/ui/accordion';
import AnimatedHeroScene from '@/components/howitworks/AnimatedHeroScene';
import ScrollWalkthrough, { WalkthroughStep } from '@/components/howitworks/ScrollWalkthrough';
import ValuePillars, { Pillar } from '@/components/howitworks/ValuePillars';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';

type Role = 'rent' | 'buy' | 'host' | 'sell';

const roleConfig: Record<Role, {
  label: string;
  blurb: string;
  cta: { label: string; href: string };
  steps: WalkthroughStep[];
  pillars: Pillar[];
  faqs: { q: string; a: string }[];
}> = {
  rent: {
    label: 'Rent equipment',
    blurb: 'Browse food trucks, trailers, commercial kitchens, and vendor spaces by city. Book by the hour, day, or month.',
    cta: { label: 'Browse rentals', href: '/search?mode=rent' },
    steps: [
      { number: 1, title: 'Search by city & date', description: 'Filter by location, dates, asset type, and price. Every listing shows verified-host status, real photos, and live availability.', icon: Search, mock: 'search' },
      { number: 2, title: 'Compare verified listings', description: 'Inspect specs, amenities, and reviews. All hosts pass Identity verification before they can list.', icon: ShieldCheck, mock: 'listing' },
      { number: 3, title: 'Message the host', description: 'Ask about availability, equipment, or access instructions. Most hosts reply within an hour.', icon: MessageSquare, mock: 'message' },
      { number: 4, title: 'Book & pay securely', description: 'Pay by card, ACH, Affirm, Klarna, or Afterpay. Funds are held in payment protection — released to the host after handoff.', icon: CreditCard, mock: 'payment' },
      { number: 5, title: 'Pick up or get it delivered', description: 'Coordinate pickup, on-site setup, or nationwide freight shipping. Hosts share access details once payment clears.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: ShieldCheck, title: 'Verified hosts only', description: 'Identity-verified before any listing goes live.' },
      { icon: CreditCard, title: 'Payment Protection protection', description: 'Funds are held until you confirm the equipment is as described.' },
      { icon: Clock, title: 'Fast host replies', description: 'Most renters get a response within an hour during business hours.' },
      { icon: MapPin, title: 'Coast-to-coast inventory', description: 'Trucks, trailers, kitchens, and vendor spaces in every major US city.' }],
    faqs: [
      { q: 'How do I know the listing is real?', a: 'Every host completes Identity verification before publishing. You\'ll see a verified badge on their profile and listings.' },
      { q: 'What payment methods can I use?', a: 'Card, ACH (for $5K+), Apple/Google Pay, Affirm and Klarna ($35–$30K), and Afterpay (up to $4K). Funds are held in payment protection.' },
      { q: 'Can I inspect before paying?', a: 'Yes. Message the host directly to schedule an in-person inspection before booking.' },
      { q: 'What if the equipment isn\'t as described?', a: 'Open a dispute within 24 hours of handoff. We hold funds and mediate until resolved.' }]},
  buy: {
    label: 'Buy a truck or trailer',
    blurb: 'Shop verified food trucks, trailers, and commercial kitchen equipment with secure payment protection payments and optional buyer financing.',
    cta: { label: 'Browse for sale', href: '/search?mode=sale' },
    steps: [
      { number: 1, title: 'Find your asset', description: 'Search by city, build, condition, and price. See full specs, multiple photos, and seller history.', icon: Search, mock: 'search' },
      { number: 2, title: 'Verify the seller', description: 'Every seller is identity-verified. Review their profile, response rate, and past sales before reaching out.', icon: ShieldCheck, mock: 'verified' },
      { number: 3, title: 'Negotiate or make an offer', description: 'Send the asking price, submit a counter-offer, or message the seller to negotiate terms directly.', icon: MessageSquare, mock: 'message' },
      { number: 4, title: 'Pay securely with payment protection', description: 'Pay in full or finance with Affirm/Afterpay/Klarna. We hold the money until you confirm receipt.', icon: CreditCard, mock: 'payment' },
      { number: 5, title: 'Pickup or nationwide freight', description: 'Pick up locally or use Vendibook freight ($4.50/mile) for door-to-door delivery anywhere in the US.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: ShieldCheck, title: 'Verified sellers', description: 'Identity verification + sales history visible on every profile.' },
      { icon: CreditCard, title: 'Buyer financing', description: 'Affirm, Klarna, and Afterpay let buyers spread payments over time.' },
      { icon: Truck, title: 'Nationwide freight', description: 'Optional door-to-door delivery — calculated automatically at checkout.' },
      { icon: CheckCircle2, title: 'Money-back protection', description: 'Funds stay in payment protection until you confirm the asset arrives as described.' }],
    faqs: [
      { q: 'How does buyer financing work?', a: 'At checkout, choose Affirm or Klarna for $35–$30K, or Afterpay up to $4K. Soft credit check, instant decision, monthly payments.' },
      { q: 'Can I get freight shipping?', a: 'Yes — sellers can opt into Vendibook Freight. We calculate $4.50/mile automatically and add it to checkout.' },
      { q: 'What if the truck isn\'t as advertised?', a: 'You have 24 hours after delivery to confirm. Open a dispute and we\'ll hold funds while we investigate.' },
      { q: 'Are inspections allowed before purchase?', a: 'Absolutely. Most serious buyers schedule an in-person inspection — message the seller to coordinate.' }]},
  host: {
    label: 'Host / rent out',
    blurb: 'Turn your truck, trailer, kitchen, or parking lot into recurring income. Set your rates, control your calendar, get paid in 24 hours.',
    cta: { label: 'List for rent', href: '/list?mode=rent' },
    steps: [
      { number: 1, title: 'Create your listing', description: 'Add photos, write a description, set hourly/daily/weekly/monthly rates. Our wizard takes about 8 minutes.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Set your availability', description: 'Block dates, define operating hours, set buffer time between rentals. Smart calendar prevents double-bookings.', icon: Calendar, mock: 'calendar' },
      { number: 3, title: 'Define document requirements', description: 'Require business license, insurance, or health permits before approval. We collect and verify them automatically.', icon: FileCheck, mock: 'docs' },
      { number: 4, title: 'Approve booking requests', description: 'Review verified renter profiles. Accept with one tap — or enable Instant Book for faster turnover.', icon: MessageSquare, mock: 'message' },
      { number: 5, title: 'Get paid automatically', description: 'Funds release to your bank 24 hours after the rental ends. Track everything from your host dashboard.', icon: DollarSign, mock: 'payout' }],
    pillars: [
      { icon: ShieldCheck, title: 'Verified renters only', description: 'Every renter passes ID verification before they can request to book.' },
      { icon: DollarSign, title: '24-hour payouts', description: 'Direct deposit to your bank within 24 hours of rental completion.' },
      { icon: FileCheck, title: 'Automated docs', description: 'We collect, verify, and store insurance + permit documents for you.' },
      { icon: TrendingUp, title: 'AI price optimization', description: 'Vendi suggests rates based on local demand to maximize earnings.' }],
    faqs: [
      { q: 'How much does it cost to list?', a: 'Listing is free. We take a 12.9% platform fee only when you complete a booking. No subscriptions, no upfront cost.' },
      { q: 'How fast do I get paid?', a: 'Funds are released to your bank account 24 hours after the rental ends and the renter confirms.' },
      { q: 'What if a renter damages my equipment?', a: 'Require a security deposit at the listing level. We collect it at booking and release/refund based on damage reports.' },
      { q: 'Can I list multiple assets?', a: 'Yes — many top hosts manage 4+ listings from a single dashboard. No limit.' }]},
  sell: {
    label: 'Sell a truck/trailer',
    blurb: 'List your food truck, trailer, or equipment for sale. Reach verified buyers nationwide. Free to list, payment protection protection included.',
    cta: { label: 'List for sale', href: '/list?mode=sale' },
    steps: [
      { number: 1, title: 'List with great photos', description: 'Upload high-res photos, write specs, set asking price. Listings with 8+ photos sell 3x faster.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Receive offers', description: 'Verified buyers send full-price purchases or counter-offers. Review, negotiate, or accept with one click.', icon: MessageSquare, mock: 'message' },
      { number: 3, title: 'Accept payment securely', description: 'Buyer pays via card, ACH, or financing. Funds are held in payment protection — protecting both parties.', icon: CreditCard, mock: 'payment' },
      { number: 4, title: 'Coordinate handoff', description: 'Local pickup or use Vendibook Freight for nationwide delivery. We handle logistics quotes automatically.', icon: Truck, mock: 'truck' },
      { number: 5, title: 'Get paid', description: 'Once the buyer confirms receipt, funds release to your bank instantly. Track everything in your dashboard.', icon: DollarSign, mock: 'payout' }],
    pillars: [
      { icon: Users, title: 'Verified buyers', description: 'Every buyer is identity-verified — no spam, no tire-kickers.' },
      { icon: CreditCard, title: 'Buyer financing built-in', description: 'Affirm, Klarna, Afterpay expand your buyer pool overnight.' },
      { icon: ShieldCheck, title: 'Payment Protection protection', description: 'Funds held until handoff confirmed — fraud protection both ways.' },
      { icon: DollarSign, title: 'No upfront fees', description: 'Free to list. Pay a small fee only when the sale completes.' }],
    faqs: [
      { q: 'How much does selling cost?', a: 'Free to list. We charge a small platform fee (typically under 10%) only after the sale closes.' },
      { q: 'Can buyers finance?', a: 'Yes — buyers can finance with Affirm/Klarna ($35–$30K) or Afterpay (up to $4K). You still get paid in full at close.' },
      { q: 'Do you handle shipping?', a: 'Vendibook Freight covers door-to-door US delivery at $4.50/mile, calculated and quoted automatically at checkout.' },
      { q: 'How long until I get paid?', a: 'Funds release immediately once the buyer confirms receipt — typically same-day for local pickup, 2–5 days for freight.' }]}};

const HowItWorks = () => {
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as Role) || 'rent';
  const [role, setRole] = useState<Role>(
    ['rent', 'buy', 'host', 'sell'].includes(initialRole) ? initialRole : 'rent'
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('role', role);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const config = roleConfig[role];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="How Vendibook Works: Rent, Buy, Host & Sell"
        description="See how Vendibook works in 60 seconds: verified users, secure payment protection payments, nationwide delivery, and 24/7 support for food trucks & kitchens."
        canonical="/how-it-works"
      />

      <Header />

      <main className="flex-1">
        {/* HERO — illustrated */}
        <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground mb-4">
                  
                  The marketplace for mobile food
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.05]">
                  Rent, buy, host, or sell —<br className="hidden md:block" /> all in one place.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Vendibook connects verified buyers, renters, hosts, and sellers of food trucks, trailers, commercial kitchens, and vendor spaces. Secure payments, automated documents, nationwide delivery.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" variant="glass-cta" className="rounded-full" asChild>
                    <Link to="/search">
                      Browse listings <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" asChild>
                    <Link to="/list">List your asset</Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <AnimatedHeroScene variant="marketplace" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* TWO-PATH CHOOSER — split intent immediately */}
        <section className="py-12 md:py-16 border-y border-border bg-card/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Where do you want to start?</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Pick a path. We'll handle the rest.</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Find or book */}
              <motion.button
                type="button"
                onClick={() => {
                  setRole('rent');
                  document.getElementById('role-walkthrough')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                whileHover={{ y: -4 }}
                className={`text-left rounded-2xl border p-6 md:p-7 bg-background transition-all ${
                  role === 'rent' || role === 'buy'
                    ? 'border-foreground/40 shadow-lg'
                    : 'border-border hover:border-foreground/30 hover:shadow-md'
                }`}
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-foreground/5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70 mb-3">
                  <Search className="w-3 h-3" /> Find or book
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">I want to find or book something</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-5 leading-relaxed">
                  Search verified trucks, trailers, kitchens, and vendor spaces. Check availability, message hosts, or let our concierge confirm everything before you commit.
                </p>
                <ol className="space-y-2 mb-5 text-sm text-foreground/80">
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">01</span> Search by city, date, and category</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">02</span> Check availability or ask Vendibook for help</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">03</span> Book securely with payment protection protection</li>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="dark-shine" asChild className="rounded-full">
                    <Link to="/search" onClick={(e) => e.stopPropagation()}>Browse listings <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                  <span onClick={(e) => e.stopPropagation()}>
                    <TellVendibookButton variant="outline" size="sm" defaultIntent="rent" sourcePage="how_it_works_renter_path" showIcon={false}>
                      Talk to concierge
                    </TellVendibookButton>
                  </span>
                </div>
              </motion.button>

              {/* List or sell */}
              <motion.button
                type="button"
                onClick={() => {
                  setRole('host');
                  document.getElementById('role-walkthrough')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                whileHover={{ y: -4 }}
                className={`text-left rounded-2xl border p-6 md:p-7 bg-background transition-all ${
                  role === 'host' || role === 'sell'
                    ? 'border-foreground/40 shadow-lg'
                    : 'border-border hover:border-foreground/30 hover:shadow-md'
                }`}
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">
                  <DollarSign className="w-3 h-3" /> List or sell
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">I want to list or sell something</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-5 leading-relaxed">
                  Turn your truck, trailer, kitchen, or vendor space into income. Verified buyers and renters, automated documents, and 24-hour payouts.
                </p>
                <ol className="space-y-2 mb-5 text-sm text-foreground/80">
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">01</span> List in minutes — free, no subscription</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">02</span> Verify your identity and documents</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">03</span> Get paid — rentals in 24h, sales in 2–5 days</li>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="dark-shine" asChild className="rounded-full">
                    <Link to="/list" onClick={(e) => e.stopPropagation()}>Start a listing <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                  <span onClick={(e) => e.stopPropagation()}>
                    <TellVendibookButton variant="outline" size="sm" defaultIntent="list" sourcePage="how_it_works_host_path" showIcon={false}>
                      Talk to concierge
                    </TellVendibookButton>
                  </span>
                </div>
              </motion.button>
            </div>
          </div>
        </section>

        <div id="role-walkthrough" />

        {/* ROLE TABS */}
        <section className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-y border-border">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4">
              {(Object.keys(roleConfig) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`relative whitespace-nowrap px-4 md:px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    role === r ? 'text-background' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {role === r && (
                    <motion.div
                      layoutId="role-pill"
                      className="absolute inset-0 bg-foreground rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{roleConfig[r].label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* INTRO COPY */}
        <AnimatePresence mode="wait">
          <motion.section
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="py-10 md:py-14"
          >
            <div className="container max-w-3xl mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">{config.label}, the Vendibook way</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{config.blurb}</p>
            </div>
          </motion.section>
        </AnimatePresence>

        {/* SCROLL WALKTHROUGH */}
        <ScrollWalkthrough
          key={role + '-walk'}
          steps={config.steps}
          tone={role === 'host' ? 'host' : role === 'sell' ? 'seller' : 'neutral'}
        />

        {/* VALUE PILLARS */}
        <ValuePillars
          pillars={config.pillars}
          tone={role === 'host' ? 'host' : role === 'sell' ? 'seller' : 'neutral'}
        />

        {/* SOCIAL PROOF STRIP */}
        <section className="py-10 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { v: '12k+', l: 'Verified users' },
                { v: '$4.2M', l: 'Transacted' },
                { v: '47 states', l: 'Active inventory' },
                { v: '4.9★', l: 'Average rating' }].map((s) => (
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Common questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {config.faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="relative bg-foreground text-background rounded-3xl p-8 md:p-14 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/[0.05] to-transparent" style={{ animation: 'shimmer-sweep 5s ease-in-out infinite' }} />
              </div>
              <h2 className="relative text-3xl md:text-4xl font-bold mb-3">Ready to {role === 'host' ? 'host' : role === 'sell' ? 'sell' : role === 'buy' ? 'buy' : 'rent'}?</h2>
              <p className="relative text-base md:text-lg opacity-80 mb-7 max-w-xl mx-auto">
                Join thousands of operators using Vendibook to grow their food business.
              </p>
              <div className="relative flex flex-wrap gap-3 justify-center">
                <Button size="lg" variant="secondary" className="rounded-full" asChild>
                  <Link to={config.cta.href}>{config.cta.label} <ArrowRight className="ml-1.5 w-4 h-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background" asChild>
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
