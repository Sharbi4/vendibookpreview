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
import EquinoxFinancingCallout from '@/components/howitworks/EquinoxFinancingCallout';
import PricingFaqSection from '@/components/shared/PricingFaqSection';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import { PaymentRailsSection, ProviderTrustStrip, KeepExploring } from '@/components/howitworks/PaymentRailsSection';

type Role = 'buy' | 'rent' | 'sell' | 'host';

const roleConfig: Record<Role, {
  label: string;
  blurb: string;
  cta: { label: string; href: string };
  steps: WalkthroughStep[];
  pillars: Pillar[];
  faqs: { q: string; a: string }[];
}> = {
  buy: {
    label: 'Buy',
    blurb: 'Shop food trucks, trailers, carts, and equipment. Pay in person or through Vendibook online checkout, with financing options available for eligible buyers.',
    cta: { label: 'Browse for sale', href: '/search?mode=sale' },
    steps: [
      { number: 1, title: 'Find the right equipment', description: 'Search by city, category, condition, and price. Listings show photos, specs, and how the seller wants to be paid.', icon: Search, mock: 'search' },
      { number: 2, title: 'Connect with the seller', description: 'Message with questions, arrange an inspection, or send an offer. Some sellers display an Identity Verified badge — an optional Plaid check, not a requirement.', icon: MessageSquare, mock: 'message' },
      { number: 3, title: 'Choose how to pay', description: 'Pay in person at handoff, or use Vendibook online checkout where the seller enables it. Financing through third-party partners is available for qualified buyers.', icon: CreditCard, mock: 'payment' },
      { number: 4, title: 'Arrange pickup or delivery', description: 'Coordinate local pickup, seller delivery, or freight where the seller offers it, then confirm the handoff in your transaction record.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: Search, title: 'Real inventory', description: 'Trucks, trailers, carts, kitchens, and vendor spaces listed by their owners.' },
      { icon: CreditCard, title: 'Your choice of payment', description: 'Pay in person or online through Vendibook’s PayPal checkout where offered.' },
      { icon: ShieldCheck, title: 'Optional verification', description: 'Sellers can add a Plaid Identity Verified badge. Look for it on the profile.' },
      { icon: FileCheck, title: 'Financing options', description: 'Apply with third-party financing partners if you qualify — Vendibook does not lend.' }],
    faqs: [
      { q: 'How do I pay for equipment?', a: 'It depends on the listing. Sellers can accept payment in person at handoff, enable Vendibook online checkout (processed through PayPal), or both. The listing page shows which options apply before you commit.' },
      { q: 'How does financing work?', a: 'On eligible for-sale listings you can generate a pro forma purchase sheet and apply with a third-party financing partner. Vendibook does not lend, approve applicants, set rates or terms, or guarantee funding.' },
      { q: 'What does the Identity Verified badge mean?', a: 'It means that member chose to complete an optional identity check powered by Plaid. It is not required to buy, sell, rent, or publish, so treat it as extra context rather than a guarantee.' },
      { q: 'Can I inspect before buying?', a: 'Yes. Message the seller to schedule an in-person inspection before you agree to anything. For payments made online through PayPal, PayPal’s own dispute process also applies.' }]},
  rent: {
    label: 'Rent',
    blurb: 'Book food trucks, trailers, commissary and commercial kitchens, and vendor spaces by the hour, day, or month.',
    cta: { label: 'Browse rentals', href: '/search?mode=rent' },
    steps: [
      { number: 1, title: 'Find a listing and pick your dates', description: 'Filter by city, category, and price, then choose the dates or time slot you need from the host’s live availability.', icon: Search, mock: 'search' },
      { number: 2, title: 'Request to book or Instant Book', description: 'Some listings accept Instant Book. Others review your request first. Message the host any time with questions.', icon: MessageSquare, mock: 'listing' },
      { number: 3, title: 'Confirm payment and any documents', description: 'Pay through Vendibook online checkout where offered, or in person if the host accepts it. Some hosts ask for documents such as insurance or a permit before use.', icon: CreditCard, mock: 'docs' },
      { number: 4, title: 'Pick up, use, and return', description: 'The host shares access details once your booking is confirmed. Return the equipment or space as agreed and complete the booking.', icon: Truck, mock: 'truck' }],
    pillars: [
      { icon: Calendar, title: 'Real availability', description: 'Hosts manage their own calendar, so what you see is what’s open.' },
      { icon: MessageSquare, title: 'Talk before you book', description: 'Message hosts about access, equipment, and timing inside Vendibook.' },
      { icon: CreditCard, title: 'Clear payment terms', description: 'Every listing states how it accepts payment before you commit.' },
      { icon: FileCheck, title: 'Documents where required', description: 'Hosts can request insurance, licenses, or permits for their listing.' }],
    faqs: [
      { q: 'Do all listings work the same way?', a: 'No. Approval rules, documents, and payment options are set per listing by the host. Some accept Instant Book, others review each request, so check the listing page.' },
      { q: 'How do I pay for a booking?', a: 'Hosts can enable Vendibook online checkout (processed through PayPal), accept payment in person, or both. The listing shows which options apply.' },
      { q: 'Do I need identity verification to rent?', a: 'No. Identity verification is an optional paid add-on powered by Plaid that adds a badge to a profile. It is not required to book.' },
      { q: 'What if something goes wrong?', a: 'Message the host first, then contact Vendibook support. For payments made online through PayPal, you can also use PayPal’s dispute process.' }]},
  sell: {
    label: 'Sell',
    blurb: 'List your food truck, trailer, cart, or equipment for sale. Publishing a standard listing is free, and you choose how you get paid.',
    cta: { label: 'List free', href: '/list/start?mode=sale' },
    steps: [
      { number: 1, title: 'List free', description: 'Start at /list/start, add photos, specs, and your asking price. Publishing a standard listing is free, subject to current account limits.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Connect with buyers', description: 'Answer questions, review offers, and negotiate inside Vendibook. You can add an optional Plaid Identity Verified badge if you want it.', icon: MessageSquare, mock: 'message' },
      { number: 3, title: 'Choose your transaction path', description: 'Pay in person carries no Vendibook commission. Online checkout through Vendibook carries a 12.9% seller fee, and financing gives eligible buyers another way to purchase.', icon: DollarSign, mock: 'payment' },
      { number: 4, title: 'Complete the handoff', description: 'Coordinate pickup, delivery, or freight, confirm the sale, and Vendibook reviews and issues payout on completed online sales.', icon: Truck, mock: 'payout' }],
    pillars: [
      { icon: Users, title: 'Free to publish', description: 'Standard listings are free to create and publish, subject to account limits.' },
      { icon: DollarSign, title: 'Pay in person is free', description: 'No Vendibook commission on equipment sales settled in person.' },
      { icon: CreditCard, title: '12.9% on online sales', description: 'One clear seller fee on completed Vendibook online checkout sales.' },
      { icon: ShieldCheck, title: 'Optional verified badge', description: 'Plaid identity verification is available as an add-on — never required.' }],
    faqs: [
      { q: 'What does it cost to sell?', a: 'Publishing a standard listing is free. Equipment sales settled in person carry no Vendibook commission. Completed sales through Vendibook online checkout carry a 12.9% seller fee.' },
      { q: 'Does Vendibook Pro change my fee?', a: 'Active Vendibook Pro sellers save 2 percentage points on eligible seller transaction fees — 10.9% instead of 12.9% — capped at $500 of savings per completed transaction. See the pricing page for details.' },
      { q: 'How do I get paid?', a: 'Pay-in-person sales are settled directly between you and the buyer. For online sales, Vendibook records your proceeds and payouts are reviewed and issued by our team. We do not offer automatic split settlement or instant bank payout.' },
      { q: 'Can buyers finance a purchase?', a: 'Eligible buyers can apply with third-party financing partners. Vendibook does not lend, approve applicants, or guarantee funding.' }]},
  host: {
    label: 'Host',
    blurb: 'Rent out your truck, trailer, kitchen, or vendor space. Set your rates and availability, and decide how renters pay.',
    cta: { label: 'List free', href: '/list/start?mode=rent' },
    steps: [
      { number: 1, title: 'Create and publish your listing', description: 'Start at /list/start, add photos and details, and set hourly, daily, weekly, or monthly rates. Publishing a standard listing is free.', icon: Camera, mock: 'photo' },
      { number: 2, title: 'Set your availability', description: 'Block dates, define operating hours, and keep your calendar current so renters only request time you can actually offer.', icon: Calendar, mock: 'calendar' },
      { number: 3, title: 'Review requests or use Instant Book', description: 'Approve booking requests yourself, or turn on Instant Book where it’s supported. You can request documents such as insurance or permits.', icon: MessageSquare, mock: 'docs' },
      { number: 4, title: 'Manage the handoff and payout review', description: 'Share access details, complete the booking, and Vendibook records your proceeds. Payouts on online bookings are reviewed and issued by our team.', icon: DollarSign, mock: 'payout' }],
    pillars: [
      { icon: Calendar, title: 'You control the calendar', description: 'Set rates, availability, and buffer time between bookings.' },
      { icon: FileCheck, title: 'Request documents', description: 'Ask for insurance, licenses, or permits before you approve a booking.' },
      { icon: DollarSign, title: 'Free to list', description: 'Publishing a standard listing is free. A host fee applies to completed online bookings.' },
      { icon: ShieldCheck, title: 'Optional verification', description: 'Plaid identity verification is an add-on that adds a badge — never required to host.' }],
    faqs: [
      { q: 'What does it cost to host?', a: 'Publishing a standard listing is free. A 12.9% host fee applies to completed bookings paid through Vendibook online checkout. Active Vendibook Pro hosts pay 10.9% on eligible transactions, capped at $500 of savings per transaction.' },
      { q: 'How do payouts work?', a: 'Vendibook records your proceeds after a booking completes, and payouts are reviewed and issued by our team. We do not offer automatic payout routing, instant bank transfer, or guaranteed release timing.' },
      { q: 'Do I need identity verification to host?', a: 'No. Plaid identity verification is an optional paid add-on that adds a badge to your profile. It is not required to publish, take bookings, or get paid.' },
      { q: 'Can I list more than one space?', a: 'Yes — you can manage multiple listings from a single dashboard, subject to current account and listing limits.' }]}};



const HowItWorks = () => {
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as Role) || 'buy';
  const [role, setRole] = useState<Role>(
    ['buy', 'rent', 'sell', 'host'].includes(initialRole) ? initialRole : 'buy'
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
        title="How Vendibook Works: Buy, Rent, Sell & Host"
        description="How Vendibook works for buyers, renters, sellers, and hosts: free listings, messaging and offers, PayPal checkout or pay in person, financing options, and delivery coordination."
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
                  Everything you need to move a mobile food business forward.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Buy, rent, sell, or host food trucks, trailers, kitchens, and vendor spaces — with listings,
                  communication, payments, financing options, documents, and fulfillment organized in one marketplace.
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
                    <Link to="/list/start">List free</Link>
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
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Pick a path.</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Find or book */}
              <motion.button
                type="button"
                onClick={() => {
                  setRole('buy');
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
                  <Search className="w-3 h-3" /> Buy or rent
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">I want to buy or rent something</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-5 leading-relaxed">
                  Search trucks, trailers, carts, kitchens, and vendor spaces. Check availability, message the owner, and agree on terms before you commit.
                </p>
                <ol className="space-y-2 mb-5 text-sm text-foreground/80">
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">01</span> Search by city, date, and category</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">02</span> Message the seller or host, or send a request</li>
                  <li className="flex gap-2"><span className="text-foreground/40 font-mono text-xs mt-0.5">03</span> Pay in person or through Vendibook online checkout</li>
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

        {/* EQUINOX FINANCING — sellers and buyers */}
        {(role === 'sell' || role === 'buy') && (
          <EquinoxFinancingCallout audience={role === 'sell' ? 'seller' : 'buyer'} />
        )}

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
