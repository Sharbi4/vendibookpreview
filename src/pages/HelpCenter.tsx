import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
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
  MapPin,
  Scale,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  Send,
  Banknote,
  Package,
  CheckCircle2
} from 'lucide-react';
import HelpCenterSearch from '@/components/support/HelpCenterSearch';
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
    icon: Key,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
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
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
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
    icon: Tag,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
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
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
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

// Generate FAQ schema data for structured data
const helpCenterFAQs = [
  { question: 'How do Vendibook rentals work?', answer: 'Vendibook connects you with verified hosts who rent out food trucks, trailers, and mobile kitchens. Browse listings, book securely through our platform, and enjoy protection through escrow payments and 24/7 support.' },
  { question: 'What should I inspect before renting a food truck?', answer: 'Check the refrigeration systems, propane connections, electrical systems, ventilation hood, fire suppression system, and overall cleanliness. Our pre-rental inspection guide covers everything in detail.' },
  { question: 'How do I start a shared kitchen?', answer: 'Start by selecting a facility, setting up commercial equipment (NSF-certified), obtaining health permits, and creating a delivery-optimized menu. Our launch checklist walks you through each step.' },
];

const HelpCenter = () => {
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  
  // Track page views with Google Analytics
  usePageTracking();

  const toggleTopic = (title: string) => {
    setOpenTopics(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const openZendeskChat = () => {
    trackEventToDb('help_chat_click', 'engagement', { source: 'help_center' });
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  // JSON-LD for FAQ Page
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: helpCenterFAQs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Help Center - Guides for Food Trucks, Trailers & Shared Kitchens"
        description="Find answers fast. Guides for renting, buying, listing, and getting paid on Vendibook."
        canonical="/help"
        type="website"
      />
      
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Section 1: Top Utility Hero */}
        <section className="bg-muted/30 border-b border-border py-8 md:py-12">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-[1fr,320px] gap-6 items-start">
              {/* Left: Search */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  Find answers fast.
                </h1>
                <p className="text-muted-foreground text-sm mb-4">
                  Search guides or chat with Support (Zendesk) 24/7.
                </p>
                
                {/* Search Bar */}
                <HelpCenterSearch />

                {/* Popular search chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {popularSearches.map((chip) => (
                    <Link
                      key={chip.query}
                      to={`/faq?q=${encodeURIComponent(chip.query)}`}
                      className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right: Support Card */}
              <Card className="bg-background border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Need help right now?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Chat with our team 24/7 via Zendesk. For account, payouts, bookings, documents, and disputes.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={openZendeskChat} variant="dark-shine" size="sm" className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Support
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/contact">
                        <Send className="h-4 w-4 mr-2" />
                        Submit a Request
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Status indicators */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span>Average reply time: under 5 minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 text-green-600" />
                      <span>Secure payments via Stripe</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileCheck className="h-3 w-3 text-green-600" />
                      <span>Document & identity verification</span>
                    </div>
                  </div>
                  
                  {/* Credibility line */}
                  <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border">
                    Powered by Zendesk + Vendibook Support Desk APIs
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 2: Intent-Based Start Here Lanes */}
        <section className="py-8 md:py-10">
          <div className="container max-w-6xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Start here</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {intentLanes.map((lane) => (
                <Card key={lane.id} className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${lane.bgColor}`}>
                        <lane.icon className={`h-4 w-4 ${lane.color}`} />
                      </div>
                      <CardTitle className="text-sm font-semibold">{lane.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5">
                      {lane.tasks.map((task) => (
                        <li key={task.slug}>
                          <Link 
                            to={`/help/${task.slug}`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-start gap-1.5"
                          >
                            <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{task.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="dark-shine" size="sm" className="w-full h-8 text-xs">
                      <Link to={lane.cta.href}>
                        {lane.cta.label}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Guided Checklists */}
        <section className="py-8 md:py-10 bg-muted/30">
          <div className="container max-w-6xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Most-used guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guidedChecklists.map((checklist) => (
                <Link
                  key={checklist.slug}
                  to={`/help/${checklist.slug}`}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <checklist.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                    {checklist.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Resource: Regulations Hub */}
        <section className="py-8 md:py-10">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Startup Guide Card */}
              <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <ClipboardCheck className="h-5 w-5 text-white" />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      Launch Checklist
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Food Business Startup Guide
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Complete checklist to launch your food truck, trailer, or shared kitchen. Covers setup, permits, equipment, costs, and hidden risks.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Step-by-step</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Cost breakdowns</span>
                  </div>
                  <Button asChild size="sm" className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <Link to="/tools/startup-guide">
                      <ClipboardCheck className="h-4 w-4" />
                      Open Startup Guide
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Regulations Hub Card */}
              <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                      <Scale className="h-5 w-5 text-white" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Compliance Guide
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Regulations Hub
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    State-by-state mobile food regulations, ANSI certifications, cottage food laws, commissary resources, and shared kitchen compliance.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> 50 States</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> City-specific</span>
                  </div>
                  <Button asChild size="sm" className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Link to="/tools/regulations-hub">
                      <Scale className="h-4 w-4" />
                      Open Regulations Hub
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 4: Browse All Topics (Collapsed) */}
        <section className="py-8 md:py-10">
          <div className="container max-w-6xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Browse all topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {browseTopics.map((topic) => (
                <Collapsible
                  key={topic.title}
                  open={openTopics.includes(topic.title)}
                  onOpenChange={() => toggleTopic(topic.title)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="py-3 px-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <topic.icon className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-medium">{topic.title}</CardTitle>
                          </div>
                          {openTopics.includes(topic.title) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="py-2 px-4 border-t border-border">
                        <ul className="space-y-1.5">
                          {topic.articles.map((article) => (
                            <li key={article.slug}>
                              <Link
                                to={`/help/${article.slug}`}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                              >
                                <ArrowRight className="h-3 w-3" />
                                {article.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={openZendeskChat}
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-primary"
                        >
                          Still stuck? Chat with support
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Bottom Conversion CTAs */}
        <section className="py-8 md:py-10 bg-muted/30 border-t border-border">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-2 gap-4">
              {/* For Hosts */}
              <Card className="bg-background border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">For Hosts</Badge>
                  </div>
                  <CardTitle className="text-base">Turn your truck, trailer, kitchen, or lot into income.</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="dark-shine" size="sm">
                    <Link to="/list">
                      List your asset
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="dark-shine" size="sm">
                    <Link to="/host">
                      Host playbook
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* For Renters/Buyers */}
              <Card className="bg-background border-2 border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">For Renters & Buyers</Badge>
                  </div>
                  <CardTitle className="text-base">Ready to book or buy?</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="dark-shine" size="sm">
                    <Link to="/search">
                      Browse listings
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="dark-shine" size="sm">
                    <Link to="/how-it-works">
                      How it works
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sticky Chat Button (Mobile) */}
        <div className="md:hidden fixed bottom-4 right-4 z-40">
          <Button
            onClick={openZendeskChat}
            variant="dark-shine"
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg"
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
