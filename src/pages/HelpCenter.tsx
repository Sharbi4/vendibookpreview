import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  ArrowRight,
  ShoppingCart,
  Key,
  Tag,
  DollarSign,
  Truck,
  ClipboardCheck,
  Shield,
  FileText,
  CreditCard,
  RefreshCcw,
  FileCheck,
  Scale,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Send,
  Banknote,
  Package,
  CheckCircle2
} from 'lucide-react';
import HelpCenterSearch from '@/components/support/HelpCenterSearch';
import RequestCallCard from '@/components/support/RequestCallCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

// Popular search chips
const popularSearches = [
  { label: 'Payments & payouts', query: 'payments payouts' },
  { label: 'Cancellation & refunds', query: 'cancellation refunds' },
  { label: 'Required documents', query: 'documents required' },
  { label: 'Delivery / pickup', query: 'delivery pickup' },
  { label: 'Disputes & claims', query: 'disputes claims' },
];

// Intent-based lanes data
const intentLanes = [
  {
    id: 'rent',
    title: 'Rent / Book',
    code: 'RENT_01',
    icon: Key,
    tasks: [
      { label: 'How rentals work (end-to-end)', slug: 'rentals-end-to-end' },
      { label: 'Deposits & damage protection', slug: 'deposits-protection' },
      { label: 'Pickup / delivery & return checklist', slug: 'pickup-delivery-checklist' },
    ],
    cta: { label: 'Browse rentals', href: '/search?mode=rent' },
  },
  {
    id: 'buy',
    title: 'Buy',
    code: 'BUY_02',
    icon: ShoppingCart,
    tasks: [
      { label: 'How buying works (end-to-end)', slug: 'buying-end-to-end' },
      { label: 'Shipping / freight options', slug: 'shipping-freight' },
      { label: 'Inspections & what to verify', slug: 'pre-rental-inspection' },
    ],
    cta: { label: 'Browse for-sale', href: '/search?mode=sale' },
  },
  {
    id: 'list',
    title: 'List / Rent Out',
    code: 'HOST_03',
    icon: Tag,
    tasks: [
      { label: 'Create a listing checklist', slug: 'host-listing-checklist' },
      { label: 'Stripe Connect setup (required)', slug: 'stripe-connect-setup' },
      { label: 'Payout timing & fees', slug: 'payout-timing-fees' },
    ],
    cta: { label: 'Start a listing', href: '/list' },
  },
  {
    id: 'sell',
    title: 'Sell',
    code: 'SELL_04',
    icon: DollarSign,
    tasks: [
      { label: 'Selling workflow (end-to-end)', slug: 'selling-end-to-end' },
      { label: 'Pricing guidance + comps', slug: 'pricing-guidance' },
      { label: 'Closing, shipping & release of funds', slug: 'closing-shipping' },
    ],
    cta: { label: 'Set up payouts', href: '/host' },
  },
];

// Guided checklists
const guidedChecklists = [
  { label: 'Host onboarding checklist (10 min)', slug: 'host-onboarding', icon: ClipboardCheck },
  { label: 'Renter pre-trip inspection checklist', slug: 'pre-rental-inspection', icon: CheckCircle2 },
  { label: 'What to do if something breaks during a rental', slug: 'equipment-issues', icon: Shield },
  { label: 'How cancellations & partial refunds work', slug: 'cancellations-refunds', icon: RefreshCcw },
  { label: 'Disputes: what evidence to upload', slug: 'dispute-evidence', icon: FileText },
];

// Collapsed topics
const browseTopics = [
  { title: 'Getting Started', icon: BookOpen, articles: [
    { label: 'How Vendibook works', slug: 'how-vendibook-works' },
    { label: 'Creating your account', slug: 'creating-account' },
    { label: 'Verifying your identity', slug: 'identity-verification' },
  ]},
  { title: 'Rentals & Bookings', icon: Key, articles: [
    { label: 'How rentals work (end-to-end)', slug: 'rentals-end-to-end' },
    { label: 'Booking a listing', slug: 'booking-listing' },
    { label: 'Extending a rental', slug: 'extending-rental' },
  ]},
  { title: 'Buying & Selling', icon: ShoppingCart, articles: [
    { label: 'How buying works', slug: 'buying-end-to-end' },
    { label: 'Selling your asset', slug: 'selling-end-to-end' },
    { label: 'How to sell your food truck online', slug: 'sell-food-truck-online' },
    { label: 'Freight & shipping', slug: 'shipping-freight' },
  ]},
  { title: 'Payments, Deposits & Payouts', icon: CreditCard, articles: [
    { label: 'How payments work', slug: 'payments-overview' },
    { label: 'Security deposits', slug: 'deposits-protection' },
    { label: 'Payout timing & fees', slug: 'payout-timing-fees' },
  ]},
  { title: 'Cancellations & Refunds', icon: RefreshCcw, articles: [
    { label: 'Cancellation policies', slug: 'cancellations-refunds' },
    { label: 'Requesting a refund', slug: 'requesting-refund' },
    { label: 'Partial refunds', slug: 'partial-refunds' },
  ]},
  { title: 'Insurance, Documents & Verification', icon: FileCheck, articles: [
    { label: 'Required documents', slug: 'required-documents' },
    { label: 'Insurance requirements', slug: 'insurance-requirements' },
    { label: 'Identity verification', slug: 'identity-verification' },
  ]},
  { title: 'Delivery, Pickup & Returns', icon: Truck, articles: [
    { label: 'Pickup & delivery options', slug: 'pickup-delivery-checklist' },
    { label: 'Return process', slug: 'return-process' },
    { label: 'Late returns', slug: 'late-returns' },
  ]},
  { title: 'Trust & Safety', icon: Shield, articles: [
    { label: 'Disputes & claims', slug: 'disputes-claims' },
    { label: 'Prohibited items', slug: 'prohibited-items' },
    { label: 'Reporting issues', slug: 'reporting-issues' },
  ]},
  { title: 'Compliance & Permits', icon: Scale, articles: [
    { label: '📚 Regulations Hub (Full Guide)', slug: '../tools/regulations-hub' },
    { label: 'Mobile vending permits', slug: 'mobile-vending-permits' },
    { label: 'Health department inspections', slug: 'health-inspections' },
    { label: 'Commissary requirements', slug: 'commissary-requirements' },
  ]},
];

const helpCenterFAQs = [
  { question: 'How do Vendibook rentals work?', answer: 'Vendibook connects you with verified hosts who rent out food trucks, trailers, and mobile kitchens. Browse listings, book securely through our platform, and enjoy protection through payment protection payments and 24/7 support.' },
  { question: 'What should I inspect before renting a food truck?', answer: 'Check the refrigeration systems, propane connections, electrical systems, ventilation hood, fire suppression system, and overall cleanliness. Our pre-rental inspection guide covers everything in detail.' },
  { question: 'How do I start a shared kitchen?', answer: 'Start by selecting a facility, setting up commercial equipment (NSF-certified), obtaining health permits, and creating a delivery-optimized menu. Our launch checklist walks you through each step.' },
];

/** Section label — small mono kicker */
const Kicker = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">
    {children}
  </div>
);

const HelpCenter = () => {
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  usePageTracking();

  const toggleTopic = (title: string) => {
    setOpenTopics(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const openZendeskChat = () => {
    trackEventToDb('help_chat_click', 'engagement', { source: 'help_center' });
    try {
      (window as any).Tawk_API?.maximize?.();
    } catch (error) {
      console.debug('Tawk chat open error:', error);
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: helpCenterFAQs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-white">
      <SEO
        title="Help Center — Vendibook Support"
        description="Request a call, search guides, or chat 24/7. Help for renting, buying, listing, and getting paid on Vendibook."
        canonical="/help"
        type="website"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1 relative">
        {/* Page-wide satin aura */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden">
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_60%)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_55%)]" />
        </div>

        {/* ===== HERO: Request a Call (TOP) ===== */}
        <section className="relative pt-10 md:pt-16 pb-10 md:pb-14">
          <div className="container max-w-5xl">
            <div className="text-center mb-8 md:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md mb-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Vendibook · Help Center
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-white">
                Real help, the moment you need it.
              </h1>
              <p className="text-white/55 mt-3 max-w-xl mx-auto text-sm md:text-base">
                Request an instant callback, search the knowledge base, or chat with our AI support agent.
              </p>
            </div>

            <RequestCallCard />
          </div>
        </section>

        {/* ===== Search + quick chat ===== */}
        <section className="relative py-8 md:py-12 border-t border-white/[0.06]">
          <div className="container max-w-5xl">
            <div className="grid md:grid-cols-[1fr,300px] gap-6 items-start">
              <div>
                <Kicker>Knowledge Base</Kicker>
                <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-4">
                  Search guides, articles, and policies.
                </h2>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur-md">
                  <HelpCenterSearch />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {popularSearches.map((chip) => (
                    <Link
                      key={chip.query}
                      to={`/faq?q=${encodeURIComponent(chip.query)}`}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right: lightweight chat panel */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-md p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Online · 24/7</span>
                </div>
                <h3 className="text-base font-medium text-white">Prefer to type?</h3>
                <p className="text-xs text-white/55 mt-1 mb-4">
                  Chat with our AI support agent or submit a ticket — replies in under 5 minutes.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={openZendeskChat}
                    className="w-full h-10 bg-white text-black hover:bg-white/90 font-medium"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Support
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-10 bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
                  >
                    <Link to="/contact">
                      <Send className="h-4 w-4 mr-2" />
                      Submit a Request
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Intent lanes ===== */}
        <section className="relative py-10 md:py-14 border-t border-white/[0.06]">
          <div className="container max-w-6xl">
            <Kicker>Start here</Kicker>
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-6">
              What are you trying to do?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {intentLanes.map((lane) => (
                <div
                  key={lane.id}
                  className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-sm hover:border-white/20 transition-all overflow-hidden"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
                      <lane.icon className="h-4 w-4 text-white/80" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/30">{lane.code}</span>
                  </div>
                  <h3 className="text-base font-medium text-white tracking-tight mb-3">{lane.title}</h3>
                  <ul className="space-y-1.5 mb-5">
                    {lane.tasks.map((task) => (
                      <li key={task.slug}>
                        <Link
                          to={`/help/${task.slug}`}
                          className="text-xs text-white/55 hover:text-white transition-colors flex items-start gap-1.5"
                        >
                          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-white/30" />
                          <span>{task.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="sm"
                    className="w-full h-9 bg-white/[0.06] hover:bg-primary border border-white/10 hover:border-primary text-white text-xs font-medium transition-all"
                  >
                    <Link to={lane.cta.href}>
                      {lane.cta.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Most-used guides ===== */}
        <section className="relative py-10 md:py-14 border-t border-white/[0.06]">
          <div className="container max-w-6xl">
            <Kicker>Most-used guides</Kicker>
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-6">
              The fastest paths to a fix.
            </h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/[0.06] bg-white/[0.02]">
              {guidedChecklists.map((checklist) => (
                <Link
                  key={checklist.slug}
                  to={`/help/${checklist.slug}`}
                  className="flex items-center gap-4 p-4 md:px-6 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <checklist.icon className="h-4 w-4 text-white/70" />
                  </div>
                  <span className="text-sm text-white/85 group-hover:text-white flex-1">
                    {checklist.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Feature cards ===== */}
        <section className="relative py-10 md:py-14 border-t border-white/[0.06]">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Startup Guide */}
              <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-7 overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Launch Checklist</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-2">
                    Food Business Startup Guide
                  </h3>
                  <p className="text-sm text-white/55 leading-relaxed mb-5">
                    Complete checklist to launch your food truck, trailer, or shared kitchen. Setup, permits, equipment, costs, and hidden risks.
                  </p>
                  <div className="flex flex-wrap gap-4 text-[11px] text-white/45 font-mono mb-6">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400/70" /> Step-by-step
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400/70" /> Cost breakdowns
                    </span>
                  </div>
                  <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    <Link to="/tools/startup-guide">
                      Open Startup Guide
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Regulations Hub */}
              <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-7 overflow-hidden">
                <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Compliance Guide</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-2">
                    Regulations Hub
                  </h3>
                  <p className="text-sm text-white/55 leading-relaxed mb-5">
                    State-by-state mobile food regulations, ANSI certifications, cottage food laws, commissary resources, and shared kitchen compliance.
                  </p>
                  <div className="flex flex-wrap gap-4 text-[11px] text-white/45 font-mono mb-6">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400/70" /> 50 States
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400/70" /> City-specific
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="bg-white/[0.04] border-white/15 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/tools/regulations-hub">
                      Open Regulations Hub
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Browse all topics ===== */}
        <section className="relative py-10 md:py-14 border-t border-white/[0.06]">
          <div className="container max-w-6xl">
            <Kicker>Topic taxonomy</Kicker>
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-6">
              Browse all topics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {browseTopics.map((topic) => (
                <Collapsible
                  key={topic.title}
                  open={openTopics.includes(topic.title)}
                  onOpenChange={() => toggleTopic(topic.title)}
                >
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <CollapsibleTrigger className="w-full text-left">
                      <div className="py-3.5 px-4 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <topic.icon className="h-4 w-4 text-white/60" />
                            <span className="text-sm font-medium text-white/90">{topic.title}</span>
                          </div>
                          {openTopics.includes(topic.title) ? (
                            <ChevronUp className="h-4 w-4 text-white/40" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-white/40" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="py-3 px-4 border-t border-white/[0.06]">
                        <ul className="space-y-1.5">
                          {topic.articles.map((article) => (
                            <li key={article.slug}>
                              <Link
                                to={`/help/${article.slug}`}
                                className="text-xs text-white/55 hover:text-white transition-colors flex items-center gap-1.5 py-1"
                              >
                                <ArrowRight className="h-3 w-3 text-white/30" />
                                {article.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={openZendeskChat}
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 h-7 text-xs text-white/50 hover:text-white hover:bg-white/5"
                        >
                          Still stuck? Chat with support
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Bottom CTAs ===== */}
        <section className="relative py-12 md:py-16 border-t border-white/[0.06]">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-7 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">For Hosts</span>
                </div>
                <h3 className="text-lg md:text-xl font-medium text-white tracking-tight mb-5">
                  Turn your truck, trailer, kitchen, or lot into income.
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link to="/list">
                      List your asset
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-white/[0.04] border-white/15 text-white hover:bg-white/10 hover:text-white">
                    <Link to="/host">Host playbook</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-7 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-white/70" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">For Renters & Buyers</span>
                </div>
                <h3 className="text-lg md:text-xl font-medium text-white tracking-tight mb-5">
                  Ready to book or buy?
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-white text-black hover:bg-white/90">
                    <Link to="/search">
                      Browse listings
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-white/[0.04] border-white/15 text-white hover:bg-white/10 hover:text-white">
                    <Link to="/how-it-works">How it works</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sticky Chat Button (Mobile) */}
        <div className="md:hidden fixed bottom-4 right-4 z-40">
          <Button
            onClick={openZendeskChat}
            size="lg"
            className="rounded-full h-14 w-14 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
