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
import PricingFaqSection from '@/components/shared/PricingFaqSection';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import { PaymentRailsSection, ProviderTrustStrip, KeepExploring } from '@/components/howitworks/PaymentRailsSection';

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
      { number: 1, title: 'Search by city & date', description: 'Filter by location, dates, asset type, and price. Every listing shows real photos, live availability, and the payment methods it accepts.', icon: Search, mock: 'search' },
      { number: 2, title: 'Compare listings', description: 'Inspect specs, amenities, and reviews. Hosts who complete the optional Plaid identity check show a verified badge.', icon: ShieldCheck, mock: 'listing' },
      { number: 3, title: 'Message the host', description: 'Ask about availability, equipment, or access instructions. Most hosts reply within an hour.', icon: MessageSquare, mock: 'message' },
      { number: 4, title: 'Request & pay', description: 'Send a request, and once the host approves, pay online with PayPal Checkout where the listing offers it — or settle in person if the host accepts that.', icon: CreditCard, mock: 'payment' },
      { number: 5, title: 'Pick up or get it delivered', description: 'Coordinate pickup, on-site setup, or nationwide freight shipping. Hosts share access details once the booking is confirmed.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: ShieldCheck, title: 'Know who you book', description: 'Host profiles, reviews, and an optional Plaid-verified identity badge.' },
      { icon: CreditCard, title: 'PayPal checkout', description: 'Pay online through PayPal on listings that enable it.' },
      { icon: Clock, title: 'Fast host replies', description: 'Most renters get a response within an hour during business hours.' },
      { icon: MapPin, title: 'Coast-to-coast inventory', description: 'Trucks, trailers, kitchens, and vendor spaces in every major US city.' }],
    faqs: [
      { q: 'How do I know the listing is real?', a: 'Listings are reviewed for completeness, and hosts can optionally purchase Plaid identity verification to display a verified badge on their profile and listings.' },
      { q: 'What payment methods can I use?', a: 'It depends on the listing. Hosts can enable PayPal Checkout for online payment, accept payment in person, or both — the listing page always shows which apply.' },
      { q: 'Can I inspect before paying?', a: 'Yes. Message the host directly to schedule an in-person inspection before booking.' },
      { q: 'What if the equipment isn\'t as described?', a: 'Contact support within 24 hours of handoff. For PayPal-paid orders you also have PayPal\'s own buyer dispute process.' }]},
  buy: {
    label: 'Buy a truck or trailer',
    blurb: 'Shop food trucks, trailers, and commercial kitchen equipment. Pay online with PayPal, settle in person, or apply for equipment financing through Equinox Funding.',
    cta: { label: 'Browse for sale', href: '/search?mode=sale' },
    steps: [
      { number: 1, title: 'Find your asset', description: 'Search by city, build, condition, and price. See full specs, multiple photos, and seller history.', icon: Search, mock: 'search' },
      { number: 2, title: 'Review the seller', description: 'Check their profile, response rate, and past sales. Sellers who complete Plaid identity verification show a verified badge.', icon: ShieldCheck, mock: 'verified' },
      { number: 3, title: 'Negotiate or make an offer', description: 'Send the asking price, submit a counter-offer, or message the seller to negotiate terms directly.', icon: MessageSquare, mock: 'message' },
      { number: 4, title: 'Choose how you pay', description: 'PayPal Checkout when the seller enables it, payment in person at handoff, or apply for financing with Equinox Funding on eligible listings.', icon: CreditCard, mock: 'payment' },
      { number: 5, title: 'Pickup or nationwide freight', description: 'Pick up locally or use Vendibook freight ($4.50/mile) for door-to-door delivery anywhere in the US.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: ShieldCheck, title: 'Transparent sellers', description: 'Profiles, sales history, and an optional Plaid-verified identity badge.' },
      { icon: CreditCard, title: 'Equipment financing', description: 'Apply with Equinox Funding on eligible for-sale listings — credit approval required.' },
      { icon: Truck, title: 'Nationwide freight', description: 'Optional door-to-door delivery — calculated automatically at checkout.' },
      { icon: CheckCircle2, title: 'Clear terms up front', description: 'Every listing states its accepted payment methods and fees before you commit.' }],
    faqs: [
      { q: 'How does equipment financing work?', a: 'On eligible for-sale listings you can download a pro forma purchase sheet and apply with Equinox Funding LLC. Financing is offered by Equinox, not Vendibook, and is subject to credit approval.' },
      { q: 'Can I get freight shipping?', a: 'Yes — sellers can opt into Vendibook Freight. We calculate $4.50/mile automatically and add it to checkout.' },
      { q: 'What if the truck isn\'t as advertised?', a: 'Inspect before handoff whenever possible. For PayPal-paid orders you can also raise a dispute through PayPal, and our support team can help mediate.' },
      { q: 'Are inspections allowed before purchase?', a: 'Absolutely. Most serious buyers schedule an in-person inspection — message the seller to coordinate.' }]},
  host: {
    label: 'Host / rent out',
    blurb: 'Turn your truck, trailer, kitchen, or parking lot into recurring income. Set your rates, control your calendar, and choose how renters pay.',
    cta: { label: 'List for rent', href: '/list?mode=rent' },
    steps: [
      { number: 1, title: 'Create your listing', description: 'Add photos, write a description, set hourly/daily/weekly/monthly rates. Our wizard takes about 8 minutes.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Set your availability', description: 'Block dates, define operating hours, set buffer time between rentals. Smart calendar prevents double-bookings.', icon: Calendar, mock: 'calendar' },
      { number: 3, title: 'Pick your payment methods', description: 'Enable PayPal Checkout for online payment, accept payment in person, or both. Save a payout destination whenever you\'re ready — it never blocks publishing.', icon: CreditCard, mock: 'payment' },
      { number: 4, title: 'Approve booking requests', description: 'Review renter profiles and accept with one tap — or enable Instant Book for faster turnover.', icon: MessageSquare, mock: 'message' },
      { number: 5, title: 'Get paid', description: 'PayPal-paid bookings are recorded automatically, your 12.9% platform fee is deducted, and Vendibook issues your payout to the destination you saved.', icon: DollarSign, mock: 'payout' }],
    pillars: [
      { icon: ShieldCheck, title: 'Documents on file', description: 'Require insurance, licenses, or permits before you approve a booking.' },
      { icon: DollarSign, title: 'Clear 12.9% fee', description: 'Free to list. One platform fee applies when a booking completes.' },
      { icon: FileCheck, title: 'Automated docs', description: 'We collect, verify, and store insurance + permit documents for you.' },
      { icon: TrendingUp, title: 'AI price optimization', description: 'Vendi suggests rates based on local demand to maximize earnings.' }],
    faqs: [
      { q: 'How much does it cost to list?', a: 'Listing is free. We take a 12.9% platform fee only when you complete a booking. No subscriptions, no upfront cost.' },
      { q: 'How do payouts work?', a: 'Save a payout destination in your dashboard. Once a booking completes, Vendibook records your proceeds and issues the payout. Payout setup is never required to publish or receive bookings.' },
      { q: 'Do I need identity verification to host?', a: 'No. Plaid identity verification is an optional paid add-on that adds a verified badge — it is not required to list, book, or get paid.' },
      { q: 'Can I list multiple assets?', a: 'Yes — many top hosts manage 4+ listings from a single dashboard. No limit.' }]},
  sell: {
    label: 'Sell a truck/trailer',
    blurb: 'List your food truck, trailer, or equipment for sale. Free to list, PayPal or in-person payment, and optional Equinox Funding financing for your buyers.',
    cta: { label: 'List for sale', href: '/list?mode=sale' },
    steps: [
      { number: 1, title: 'List with great photos', description: 'Upload high-res photos, write specs, set asking price. Listings with 8+ photos sell 3x faster.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Receive offers', description: 'Buyers send full-price purchases or counter-offers. Review, negotiate, or accept with one click.', icon: MessageSquare, mock: 'message' },
      { number: 3, title: 'Choose your payment methods', description: 'Enable PayPal Checkout, accept payment in person, or both — and optionally add Equinox Funding so buyers can finance.', icon: CreditCard, mock: 'payment' },
      { number: 4, title: 'Coordinate handoff', description: 'Local pickup or use Vendibook Freight for nationwide delivery. We handle logistics quotes automatically.', icon: Truck, mock: 'truck' },
      { number: 5, title: 'Get paid', description: 'PayPal sales are recorded with the 12.9% platform fee deducted and paid out to your saved destination. Pay-in-person sales are settled directly — and are free of Vendibook fees.', icon: DollarSign, mock: 'payout' }],
    pillars: [
      { icon: Users, title: 'Real buyers', description: 'Message, negotiate, and accept offers inside Vendibook.' },
      { icon: CreditCard, title: 'Buyer financing option', description: 'Add Equinox Funding to eligible sale listings to widen your buyer pool.' },
      { icon: ShieldCheck, title: 'Optional verified badge', description: 'Plaid identity verification adds trust — always optional.' },
      { icon: DollarSign, title: 'No upfront fees', description: 'Free to list. 12.9% on completed online sales; pay-in-person sales are free.' }],
    faqs: [
      { q: 'How much does selling cost?', a: 'Free to list. Completed online sales carry a 12.9% platform fee. Pay-in-person sales carry no commission and no buyer fee.' },
      { q: 'Can buyers finance?', a: 'Yes — turn on the Equinox Funding add-on for your for-sale listing and eligible buyers can apply. Financing is provided by Equinox Funding LLC, subject to credit approval.' },
      { q: 'Do you handle shipping?', a: 'Vendibook Freight covers door-to-door US delivery at $4.50/mile, calculated and quoted automatically at checkout.' },
      { q: 'How do I get paid?', a: 'Save a payout destination in your dashboard. After an online sale completes, Vendibook records your proceeds and issues the payout. Setting it up is never required to publish.' }]}};


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
                  Vendibook connects buyers, renters, hosts, and sellers of food trucks, trailers, commercial kitchens, and vendor spaces. PayPal checkout, optional Equinox financing, automated documents, nationwide delivery.
                </p>
                <div className="mb-7">
                  <ProviderTrustStrip />
                </div>

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
                  Search trucks, trailers, kitchens, and vendor spaces. Check availability, message hosts, or let our concierge confirm everything before you commit.
                </p>
                <ol className="space-y-2 mb-5 text-sm text-foreground/80">
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">01</span> Search by city, date, and category</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">02</span> Check availability or ask Vendibook for help</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">03</span> Pay with PayPal Checkout or in person</li>
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
                  Turn your truck, trailer, kitchen, or vendor space into income. Real buyers and renters, automated documents, and PayPal or in-person payment.
                </p>
                <ol className="space-y-2 mb-5 text-sm text-foreground/80">
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">01</span> List in minutes — free, no subscription</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">02</span> Add photos, pricing, and any documents — identity verification is an optional paid add-on</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">03</span> Get paid — PayPal checkout, in person, or optional Equinox financing</li>
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
                { v: '12k+', l: 'Members' },
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

        <PricingFaqSection
          audience={role === 'host' ? 'host' : role === 'sell' ? 'seller' : role === 'rent' ? 'renter' : 'buyer'}
          includeSchema
        />
        <PaymentRailsSection audience={role === 'host' ? 'host' : role === 'sell' ? 'seller' : 'buyer'} />

        <KeepExploring current="overview" />

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
