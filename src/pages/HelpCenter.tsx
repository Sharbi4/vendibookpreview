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
  BadgeCheck,
  Landmark,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import HelpCenterSearch from '@/components/support/HelpCenterSearch';
import RequestCallCard from '@/components/support/RequestCallCard';
import PricingFaqSection from '@/components/shared/PricingFaqSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

// Popular search chips → deep-link into the FAQ search
const popularSearches = [
  { label: 'Fees & commission', query: 'fees commission' },
  { label: 'Payouts', query: 'payout when do I get paid' },
  { label: 'Buyer financing', query: 'financing' },
  { label: 'Delivery / pickup', query: 'delivery pickup freight' },
  { label: 'Memberships & add-ons', query: 'vendibook pro featured boost' },
];

// Intent-based lanes
const intentLanes = [
  {
    id: 'buy',
    title: 'Buy equipment',
    icon: ShoppingCart,
    tasks: [
      { label: 'How buying works, end to end', slug: 'buying-end-to-end' },
      { label: 'Buyer financing on eligible listings', slug: 'buyer-financing' },
      { label: 'Delivery, pickup & freight', slug: 'shipping-freight' },
    ],
    cta: { label: 'Browse for sale', href: '/search?mode=sale' },
  },
  {
    id: 'sell',
    title: 'Sell equipment',
    icon: DollarSign,
    tasks: [
      { label: 'Selling workflow, end to end', slug: 'selling-end-to-end' },
      { label: 'Fees & when you get paid', slug: 'payout-timing-fees' },
      { label: 'Pay in person (no commission)', slug: 'pay-in-person-guide' },
    ],
    cta: { label: 'Start a listing', href: '/list' },
  },
  {
    id: 'rent',
    title: 'Rent & book',
    icon: Key,
    tasks: [
      { label: 'How rentals work, end to end', slug: 'rentals-end-to-end' },
      { label: 'Deposits & damage claims', slug: 'deposits-protection' },
      { label: 'Pickup & return checklist', slug: 'pickup-delivery-checklist' },
    ],
    cta: { label: 'Browse rentals', href: '/search?mode=rent' },
  },
  {
    id: 'host',
    title: 'Host a kitchen or space',
    icon: Tag,
    tasks: [
      { label: 'Host onboarding checklist', slug: 'host-onboarding' },
      { label: 'Create a listing checklist', slug: 'host-listing-checklist' },
      { label: 'Payout setup', slug: 'payout-setup' },
    ],
    cta: { label: 'Host playbook', href: '/host' },
  },
];

// Most-used guides
const guidedChecklists = [
  { label: 'Host onboarding checklist', slug: 'host-onboarding', icon: ClipboardCheck },
  { label: 'Renter pre-trip inspection checklist', slug: 'pre-rental-inspection', icon: CheckCircle2 },
  { label: 'What to do if something breaks during a rental', slug: 'equipment-issues', icon: Shield },
  { label: 'How cancellations & refunds work', slug: 'cancellations-refunds', icon: RefreshCcw },
  { label: 'Disputes: what evidence to upload', slug: 'dispute-evidence', icon: FileText },
];

type TopicLink = { label: string; to: string };

const browseTopics: { title: string; icon: typeof BookOpen; articles: TopicLink[] }[] = [
  {
    title: 'Getting started',
    icon: BookOpen,
    articles: [
      { label: 'What Vendibook is', to: '/faq?cat=getting-started#what-is-vendibook' },
      { label: 'Creating your account', to: '/faq?cat=getting-started#create-account' },
      { label: 'How it works', to: '/how-it-works' },
    ],
  },
  {
    title: 'Buying equipment',
    icon: ShoppingCart,
    articles: [
      { label: 'How buying works', to: '/help/buying-end-to-end' },
      { label: 'Making offers', to: '/help/making-offers' },
      { label: 'Pay in person', to: '/help/pay-in-person-guide' },
    ],
  },
  {
    title: 'Selling equipment',
    icon: DollarSign,
    articles: [
      { label: 'Selling your asset', to: '/help/selling-end-to-end' },
      { label: 'How to sell your food truck online', to: '/help/sell-food-truck-online' },
      { label: 'Seller conversion guide', to: '/sell-my-food-truck' },
    ],
  },
  {
    title: 'Rentals & hosting',
    icon: Key,
    articles: [
      { label: 'How rentals work', to: '/help/rentals-end-to-end' },
      { label: 'Security deposits', to: '/help/deposits-protection' },
      { label: 'Host onboarding', to: '/help/host-onboarding' },
    ],
  },
  {
    title: 'Payments & payouts',
    icon: CreditCard,
    articles: [
      { label: 'Payout setup', to: '/help/payout-setup' },
      { label: 'Payout timing & fees', to: '/help/payout-timing-fees' },
      { label: 'Fees explained', to: '/faq?cat=pricing-fees' },
    ],
  },
  {
    title: 'Buyer financing',
    icon: Landmark,
    articles: [
      { label: 'How buyer financing works', to: '/help/buyer-financing' },
      { label: 'Current financing options', to: '/financing' },
      { label: 'Financed purchase payouts', to: '/faq?cat=pricing-fees#financing-payout' },
    ],
  },
  {
    title: 'Delivery, pickup & freight',
    icon: Truck,
    articles: [
      { label: 'Freight & shipping', to: '/help/shipping-freight' },
      { label: 'Pickup & delivery options', to: '/help/pickup-delivery-checklist' },
      { label: 'Return checklist', to: '/help/pickup-delivery-checklist' },
    ],
  },
  {
    title: 'Identity verification & trust',
    icon: BadgeCheck,
    articles: [
      { label: 'About identity verification', to: '/identity-verification' },
      { label: 'Disputes & claims', to: '/help/dispute-evidence' },
      { label: 'Avoiding scams', to: '/faq?cat=trust-safety#avoid-scams' },
    ],
  },
  {
    title: 'Memberships, packages & add-ons',
    icon: Package,
    articles: [
      { label: 'Vendibook Pro benefits', to: '/faq?cat=memberships-billing#pro-benefits' },
      { label: 'Featured Boost, Pro Listing & Concierge', to: '/faq?cat=tools-addons#addon-differences' },
      { label: 'Compare plans & prices', to: '/pricing' },
    ],
  },
  {
    title: 'PermitPath & seller tools',
    icon: Scale,
    articles: [
      { label: 'Open PermitPath', to: '/tools/permitpath' },
      { label: 'Basic vs PermitPath Plus', to: '/faq?cat=tools-addons#permit-path-plus' },
      { label: 'Mobile vending permits', to: '/help/mobile-vending-permits' },
    ],
  },
  {
    title: 'Account, notifications & support',
    icon: FileCheck,
    articles: [
      { label: 'Notification settings', to: '/faq?cat=account#notification-prefs' },
      { label: 'Update payout account', to: '/faq?cat=account#update-bank' },
      { label: 'Contact support', to: '/contact' },
    ],
  },
];

/**
 * Help Center FAQ schema. These answers are duplicated nowhere else — the
 * deeper pricing/fee schema lives on /faq — so the two pages never emit
 * contradictory structured data.
 */
const helpCenterFAQs = [
  {
    question: 'How do I get help from Vendibook support?',
    answer:
      'Request a callback from the Help Center, email support@vendibook.com, or use the contact form. Support hours are Monday to Friday, 9am to 5pm Arizona time. Off-hours messages are answered the next business day.',
  },
  {
    question: 'How do Vendibook rentals work?',
    answer:
      'Pick your dates on the listing calendar, submit a booking request, and pay through PayPal when the host approves — Instant Book listings skip approval. You e-sign the rental agreement, upload any required documents, and confirm pickup and return in the app.',
  },
  {
    question: 'What does Vendibook charge?',
    answer:
      'Listing is free. A completed sale or booking through Vendibook checkout carries a 12.9% seller or host commission, reduced to 10.9% for active Vendibook Pro members with savings capped at $500 per completed transaction. Renters pay a 12.9% service fee. Equipment sales settled in person carry no commission.',
  },
];

const SectionKicker = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 mb-2">{children}</div>
);

const HelpCenter = () => {
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  usePageTracking();

  const toggleTopic = (title: string) => {
    setOpenTopics((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const openSupportChat = () => {
    trackEventToDb('help_chat_click', 'engagement', { source: 'help_center' });
    window.dispatchEvent(new CustomEvent('open-vendi-chat', { detail: { prefill: '' } }));
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
    <div className="sale-light min-h-screen flex flex-col">
      <SEO
        title="Help Center — Support, Fees & Payouts | Vendibook"
        description="Vendibook Help Center: guides and current answers on buying, selling, rentals, PayPal payments and payouts, buyer financing, delivery, memberships, PermitPath, and support."
        canonical="/help"
        type="website"
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <Header />

      <main className="flex-1">
        {/* ===== Hero + support options ===== */}
        <section className="pt-10 md:pt-16 pb-10" aria-labelledby="support-heading">
          <div className="container max-w-6xl">
            <div className="text-center mb-8 md:mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                Vendibook Support
              </span>
              <h1
                id="support-heading"
                className="mt-4 text-3xl md:text-[2.75rem] leading-tight font-semibold tracking-tight text-foreground"
              >
                Help Center
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm md:text-base">
                Guides and straight answers on buying, selling, renting, hosting, payments, payouts,
                financing, and your account.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              <div className="lg:col-span-2">
                <RequestCallCard />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
                <div className="h-full rounded-3xl border border-border bg-card p-6 flex flex-col shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted text-foreground/70 mb-4">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">
                    Chat with support
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    Ask about your account, a listing, a booking, or a transaction and we'll route it
                    to the right place.
                  </p>
                  <Button onClick={openSupportChat} variant="cta" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Start a chat
                  </Button>
                </div>

                <div className="h-full rounded-3xl border border-border bg-card p-6 flex flex-col shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted text-foreground/70 mb-4">
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">
                    Email support
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    Write to <span className="text-foreground">support@vendibook.com</span>. Support
                    hours are Mon–Fri, 9am–5pm Arizona time.
                  </p>
                  <Button asChild variant="outline" className="w-full rounded-2xl">
                    <a href="mailto:support@vendibook.com">
                      <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                      Email support
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Search ===== */}
        <section className="py-10 border-t border-border" aria-labelledby="help-search-heading">
          <div className="container max-w-3xl">
            <SectionKicker>Knowledge base</SectionKicker>
            <h2
              id="help-search-heading"
              className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-4"
            >
              Find an answer
            </h2>
            <div className="rounded-2xl border border-border bg-card p-2">
              <HelpCenterSearch />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {popularSearches.map((chip) => (
                <Link
                  key={chip.query}
                  to={`/faq?q=${encodeURIComponent(chip.query)}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Intent lanes ===== */}
        <section className="py-10 border-t border-border">
          <div className="container max-w-6xl">
            <SectionKicker>Start here</SectionKicker>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-6">
              What are you trying to do?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {intentLanes.map((lane) => (
                <div
                  key={lane.id}
                  className="rounded-3xl border border-border bg-card p-5 flex flex-col shadow-[0_1px_2px_rgba(24,20,16,0.04)]"
                >
                  <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <lane.icon className="h-4 w-4 text-foreground/70" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground tracking-tight mb-3">
                    {lane.title}
                  </h3>
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {lane.tasks.map((task) => (
                      <li key={task.slug}>
                        <Link
                          to={`/help/${task.slug}`}
                          className="text-[13px] text-muted-foreground hover:text-primary transition-colors flex items-start gap-1.5"
                        >
                          <ArrowRight className="h-3 w-3 mt-1 shrink-0 opacity-50" />
                          <span>{task.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="sm" className="w-full rounded-full">
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
        <section className="py-10 border-t border-border">
          <div className="container max-w-4xl">
            <SectionKicker>Most-used guides</SectionKicker>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-5">
              The fastest paths to a fix
            </h2>
            <div className="rounded-3xl border border-border bg-card overflow-hidden divide-y divide-border">
              {guidedChecklists.map((checklist) => (
                <Link
                  key={checklist.slug}
                  to={`/help/${checklist.slug}`}
                  className="flex items-center gap-4 p-4 md:px-6 hover:bg-muted/60 transition-colors group"
                >
                  <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <checklist.icon className="h-4 w-4 text-foreground/70" />
                  </span>
                  <span className="text-sm text-foreground flex-1">{checklist.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Featured resources ===== */}
        <section className="py-10 border-t border-border">
          <div className="container max-w-6xl grid md:grid-cols-2 gap-5">
            <div className="rounded-3xl border border-border bg-card p-7">
              <SectionKicker>Launch checklist</SectionKicker>
              <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                Food Business Startup Guide
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                A step-by-step checklist to launch a food truck, trailer, or shared kitchen — setup,
                permits, equipment, and cost breakdowns.
              </p>
              <Button asChild variant="cta">
                <Link to="/tools/startup-guide">
                  Open Startup Guide
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="rounded-3xl border border-border bg-card p-7">
              <SectionKicker>Compliance</SectionKicker>
              <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                Regulations Hub &amp; PermitPath
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                State-by-state mobile food regulations, commissary requirements, and a guided permit
                roadmap for your city and business type.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to="/tools/regulations-hub">Regulations Hub</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to="/tools/permitpath">Open PermitPath</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Browse all topics ===== */}
        <section className="py-10 border-t border-border">
          <div className="container max-w-6xl">
            <SectionKicker>All topics</SectionKicker>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-5">
              Browse the Help Center
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {browseTopics.map((topic) => (
                <Collapsible
                  key={topic.title}
                  open={openTopics.includes(topic.title)}
                  onOpenChange={() => toggleTopic(topic.title)}
                >
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <CollapsibleTrigger className="w-full text-left">
                      <div className="py-3.5 px-4 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <topic.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{topic.title}</span>
                        </div>
                        {openTopics.includes(topic.title) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="py-3 px-4 border-t border-border">
                        <ul className="space-y-1.5">
                          {topic.articles.map((article) => (
                            <li key={article.to}>
                              <Link
                                to={article.to}
                                className="text-[13px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                              >
                                <ArrowRight className="h-3 w-3 opacity-50" />
                                {article.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing FAQ (schema lives on /faq to avoid duplicate FAQPage markup) */}
        <PricingFaqSection audience="all" className="border-t border-border" />

        {/* ===== Bottom CTAs ===== */}
        <section className="py-12 border-t border-border">
          <div className="container max-w-6xl grid md:grid-cols-2 gap-5">
            <div className="rounded-3xl border border-border bg-card p-7">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="h-4 w-4 text-primary" />
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  For sellers &amp; hosts
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight mb-5">
                Turn your truck, trailer, kitchen, or lot into income.
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="cta">
                  <Link to="/list">
                    List your asset
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to="/pricing">See pricing</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-7">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  For buyers &amp; renters
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight mb-5">
                Ready to book or buy?
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="cta">
                  <Link to="/search">
                    Browse listings
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to="/how-it-works">How it works</Link>
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

export default HelpCenter;
