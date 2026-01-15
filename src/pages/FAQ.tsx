import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  HelpCircle, 
  ArrowRight, 
  UserCheck, 
  CreditCard, 
  XCircle, 
  Shield, 
  Wallet, 
  Truck, 
  FileCheck, 
  Sparkles,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  List,
  Percent,
  Check,
  X as XIcon
} from 'lucide-react';
import PricingCalculator from '@/components/pricing/PricingCalculator';

interface FAQSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

const faqSections: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    questions: [
      {
        question: 'What is Vendibook?',
        answer: 'Vendibook is a verified marketplace where you can buy, sell, rent, or book mobile food assets—including food trucks, food trailers, carts, and more—through a secure, end-to-end platform built for trust, transparency, and fast transactions.',
      },
      {
        question: 'Who is Vendibook for?',
        answer: 'Hosts/Sellers: Owners listing an asset for rent or sale. Renters/Buyers: People booking or purchasing an asset. Manufacturers/Builders (optional): Verified suppliers listing inventory for direct purchase.',
      },
      {
        question: 'Is Vendibook available nationwide?',
        answer: 'Yes. Listings appear based on what\'s available in your area, and some services (like freight) vary by location.',
      },
    ],
  },
  {
    id: 'fees-commission',
    title: 'Fees & Commission',
    icon: Percent,
    questions: [
      {
        question: 'When does Vendibook charge fees?',
        answer: 'Vendibook only charges fees when a transaction happens on-platform. All fees are shown clearly before checkout.',
      },
      {
        question: 'What is the host commission for rentals?',
        answer: 'Hosts pay a 12.9% commission on the rental amount (excluding any refundable deposit).',
      },
      {
        question: 'What is the renter service fee?',
        answer: 'Renters pay a 12.9% platform/service fee at checkout. This covers secure payments, identity and trust safeguards, customer support, dispute handling, and payout routing.',
      },
      {
        question: 'What is the seller commission for sales?',
        answer: 'Sellers pay a 12.9% commission on the sale price.',
      },
      {
        question: 'Do buyers pay a platform fee on sales?',
        answer: 'No. Buyers do not pay a platform fee on sales.',
      },
      {
        question: 'Are there additional fees for freight or shipping?',
        answer: 'If a buyer selects buyer-paid freight, a freight/shipping charge may be added at checkout. Freight pricing and timing vary by route and carrier availability.',
      },
      {
        question: 'Are there payment processing fees?',
        answer: 'Payment processing costs may apply depending on the payment method and region. Any applicable charges are shown before purchase.',
      },
    ],
  },
  {
    id: 'verification',
    title: 'Accounts, Verification, and Trust',
    icon: UserCheck,
    questions: [
      {
        question: 'Why does Vendibook require verification?',
        answer: 'High-value transactions require a higher trust standard. Verification helps reduce fraud and scams, increase buyer confidence, protect payouts and prevent chargebacks, and create safer transactions for both sides.',
      },
      {
        question: 'What does "Verified" mean on Vendibook?',
        answer: 'A "Verified" badge indicates the user has completed identity and/or account checks required for certain platform actions, such as receiving payouts or listing higher-value assets.',
      },
      {
        question: 'Do I need to verify to use Vendibook?',
        answer: 'You can browse without verification, but verification and a connected payout account may be required to list, transact, or receive funds.',
      },
      {
        question: 'Why does Vendibook keep transactions on the platform?',
        answer: 'Because protection depends on it. On-platform transactions enable secure payments, documentation, support coverage, and dispute handling. Off-platform deals remove these protections.',
      },
    ],
  },
  {
    id: 'listings',
    title: 'Creating a Listing',
    icon: FileCheck,
    questions: [
      {
        question: 'How do I create a listing?',
        answer: 'Create your account, connect your payout account (required to get paid), click Create Listing, choose For Rent or For Sale, upload photos, details, and specs, set price, availability, rules, and cancellation terms, then publish.',
      },
      {
        question: 'Do I need to connect payouts before listing?',
        answer: 'Yes. If your payout account isn\'t connected, the system can\'t route earnings correctly. Vendibook requires payout setup before you can publish.',
      },
      {
        question: 'What makes a listing perform well?',
        answer: 'The best performing listings usually include: 8–20 clear photos (interior, exterior, equipment, storage, hookups), exact specs (dimensions, power/water needs, included equipment), transparent rules (pickup, delivery, deposit, cancellation terms), and fast response times with accurate availability.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Booking, Checkout, and Payments',
    icon: CreditCard,
    questions: [
      {
        question: 'How do payments work?',
        answer: 'Vendibook processes payments securely online. Funds can be held and released at key milestones (like confirmation, pickup, return confirmation, or delivery confirmation) to protect both parties.',
      },
      {
        question: 'When am I charged as a renter or buyer?',
        answer: 'Rentals: Usually charged at checkout (or per the listing\'s payment schedule if enabled). Sales: Charged at checkout when you purchase.',
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'Most major payment methods supported by our payment processor, depending on your region and eligibility.',
      },
      {
        question: 'Why might funds be delayed or held?',
        answer: 'Delays can occur when a payout account is newly connected, a transaction is high value, a booking requires confirmation milestones, or a dispute or review is opened. These steps exist to protect both sides and reduce fraud.',
      },
    ],
  },
  {
    id: 'cancellations',
    title: 'Cancellations and Refunds',
    icon: XCircle,
    questions: [
      {
        question: 'What is Vendibook\'s cancellation policy?',
        answer: 'Vendibook uses clear cancellation rules that are displayed on every listing page, before checkout, and inside your reservation/order details. Listings may offer different cancellation options depending on asset type and category. Your exact refund amount is always shown before you confirm.',
      },
      {
        question: 'Is there a free cancellation window?',
        answer: 'Some bookings may include a short free-cancellation window after booking, when eligible. If applicable, the eligibility and time window are shown at checkout and in the reservation details.',
      },
      {
        question: 'How are refunds calculated?',
        answer: 'Refund amounts depend on the listing\'s cancellation terms, time remaining before the booking start, any non-refundable discounts selected, and amount already paid (for payment schedules).',
      },
      {
        question: 'Can I get a partial refund?',
        answer: 'Yes—partial refunds may apply when you cancel after the free-cancellation period or outside the full-refund window. Partial refund rules are shown clearly before you book.',
      },
      {
        question: 'Are fees refundable?',
        answer: 'Some fees may be refundable depending on the timing of the cancellation and whether a full refund is issued. Your checkout screen and reservation details show what\'s refundable.',
      },
      {
        question: 'What if the host cancels?',
        answer: 'If a host cancels, you\'ll typically receive a full refund and we\'ll help you find alternatives when available.',
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Deposits, Damage, and Disputes',
    icon: Shield,
    questions: [
      {
        question: 'Does Vendibook charge a security deposit?',
        answer: 'Some listings require a deposit or deposit-style hold. If a deposit is required, it\'s always shown before checkout.',
      },
      {
        question: 'What if something gets damaged?',
        answer: 'If damage occurs, report it through the platform as soon as possible and include photos/videos, dates and timestamps, description of what happened, and any relevant receipts or quotes. We may temporarily pause payout while reviewing.',
      },
      {
        question: 'How does the dispute process work?',
        answer: 'First, attempt resolution with the other party in-platform. If unresolved, open a dispute with documentation. Vendibook reviews evidence and may request additional info. A decision is issued (refund, partial refund, or denial).',
      },
    ],
  },
  {
    id: 'payouts',
    title: 'Payouts and Timing',
    icon: Wallet,
    questions: [
      {
        question: 'When do hosts and sellers get paid?',
        answer: 'Payout timing depends on your connected payout account settings, banking settlement timelines, and any transaction hold or milestone release rules.',
      },
      {
        question: 'How long do payouts take to arrive?',
        answer: 'Most payouts arrive within a few business days after they\'re released. First-time payouts can take longer due to verification and risk review.',
      },
      {
        question: 'Can I get faster payouts?',
        answer: 'If faster payout options are available for your connected account, you\'ll see them in your payout settings.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery, Pickup, and Freight',
    icon: Truck,
    questions: [
      {
        question: 'Can a host offer delivery?',
        answer: 'Yes. A listing may allow pickup by the renter/buyer, delivery arranged by the renter/buyer, or Vendibook-facilitated freight (when available).',
      },
      {
        question: 'How does Vendibook-facilitated freight work?',
        answer: 'If freight is selected, a third-party carrier is scheduled, delivery timing depends on route and carrier availability, and you\'ll receive updates when shipping is scheduled and when it ships.',
      },
      {
        question: 'Who pays for freight?',
        answer: 'Freight may be paid by the buyer at checkout, or the seller as an incentive (like "free shipping"), deducted from proceeds.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Required Documents and Compliance',
    icon: FileCheck,
    questions: [
      {
        question: 'What documents might be required to list a rental?',
        answer: 'Depending on category and local requirements, you may be asked for government ID, food handling certifications (where applicable), business/commercial insurance (where applicable), and additional compliance documents tied to the listing type.',
      },
      {
        question: 'Why does Vendibook require documents?',
        answer: 'Because trust and compliance protect your business. Documents reduce bad actors, improve booking confidence, and support dispute resolution.',
      },
    ],
  },
  {
    id: 'ai-tools',
    title: 'AI Tools on Vendibook',
    icon: Sparkles,
    questions: [
      {
        question: 'What does the AI help with?',
        answer: 'Vendibook AI is designed to reduce friction and increase conversion, including listing creation assistance (copy, structure, clarity), pricing and optimization suggestions (where enabled), faster messaging workflows (suggested replies, summaries), and guided support for shipping, disputes, and documentation.',
      },
      {
        question: 'Where do I find the AI tools?',
        answer: 'Look for AI features inside Create Listing steps (suggestions and improvements), Messages (reply assistance, summaries), and Help Center chat (instant policy and workflow answers).',
      },
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings and Success on Vendibook',
    icon: Wallet,
    questions: [
      {
        question: 'How much can I make?',
        answer: 'Your earnings depend on your asset type, pricing, demand, and availability. The biggest drivers of higher earnings are strong photos + accurate specs, competitive pricing, clear pickup/delivery options, fast response times, and great reviews and reliability.',
      },
      {
        question: 'Can I list multiple assets?',
        answer: 'Yes. Many hosts grow earnings by listing multiple units and keeping calendars accurate.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety and Platform Rules',
    icon: Shield,
    questions: [
      {
        question: 'What if someone asks me to pay off-platform?',
        answer: 'Do not complete off-platform transactions. It removes payment protections and dispute coverage. Report the message so we can take action.',
      },
      {
        question: 'What if I suspect fraud?',
        answer: 'Stop communication, don\'t share personal financial details, and contact support through chat immediately.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: MessageCircle,
    questions: [
      {
        question: 'How do I contact Vendibook support?',
        answer: 'Use the in-platform chat for 24/7 help. For certain account types, additional support options may appear in your Contact page.',
      },
      {
        question: 'Where can I see my reservation details, refund status, or payout status?',
        answer: 'You can track everything inside your account: Reservations / Orders for booking and refund status, Payouts for host/seller earnings and transfer timing, Messages for communication history and support documentation.',
      },
    ],
  },
];

// Generate schema.org FAQ structured data
const generateFAQSchema = () => {
  const allQuestions = faqSections.flatMap((section) =>
    section.questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    }))
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions,
  };
};

const FAQ = () => {
  const faqSchema = generateFAQSchema();
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track scroll position to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Offset for header

      for (const section of faqSections) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const yOffset = -100; // Offset for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Frequently Asked Questions - Vendibook"
        description="Find answers to common questions about Vendibook - renting, buying, payments, cancellations, refunds, verification, and more."
        canonical="/faq"
        type="website"
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Hero Section - GRADIENT */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Orange Gradient - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/8 via-[#FF5124]/5 to-amber-200/4" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-[#FF5124]/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5124]/4 rounded-full blur-3xl" />
          </div>

          <div className="container relative z-10 text-center">
            <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-vendibook-orange/20 to-amber-400/20 border-vendibook-orange/30">
              <HelpCircle className="h-3 w-3 mr-1" />
              FAQ
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about using Vendibook
            </p>
          </div>
        </section>

        {/* Main Content with Sidebar - NATURAL */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container">
            <div className="flex gap-8">
              {/* Collapsible Sticky Sidebar - Hidden on mobile */}
              <aside 
                className={cn(
                  "hidden lg:block shrink-0 transition-all duration-300",
                  isSidebarCollapsed ? "w-14" : "w-64"
                )}
              >
                <div className="sticky top-24">
                  <div className={cn(
                    "bg-card border rounded-xl shadow-sm overflow-hidden transition-all duration-300",
                    isSidebarCollapsed ? "p-2" : "p-4"
                  )}>
                    {/* Sidebar Header */}
                    <div className={cn(
                      "flex items-center justify-between mb-4",
                      isSidebarCollapsed && "flex-col gap-2"
                    )}>
                      {!isSidebarCollapsed && (
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4 text-vendibook-orange" />
                          <span className="font-semibold text-sm text-foreground">Contents</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      >
                        {isSidebarCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="space-y-1">
                      {faqSections.map((section) => {
                        const isActive = activeSection === section.id;
                        const Icon = section.icon;
                        
                        return (
                          <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-lg transition-all duration-200 text-left",
                              isSidebarCollapsed 
                                ? "p-2 justify-center" 
                                : "px-3 py-2",
                              isActive 
                                ? "bg-gradient-to-r from-vendibook-orange/20 to-amber-400/10 text-vendibook-orange border-l-2 border-vendibook-orange" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            title={isSidebarCollapsed ? section.title : undefined}
                          >
                            <Icon className={cn(
                              "shrink-0",
                              isSidebarCollapsed ? "h-5 w-5" : "h-4 w-4"
                            )} />
                            {!isSidebarCollapsed && (
                              <span className="text-sm truncate">{section.title}</span>
                            )}
                          </button>
                        );
                      })}
                    </nav>

                    {/* Back to top */}
                    {!isSidebarCollapsed && (
                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3 rotate-[-90deg]" />
                          Back to top
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* Main FAQ Content */}
              <div className="flex-1 max-w-4xl">
                {/* Mobile Table of Contents */}
                <div className="lg:hidden mb-8 pb-8 border-b">
                  <div className="flex items-center gap-2 mb-4">
                    <List className="h-4 w-4 text-vendibook-orange" />
                    <span className="font-semibold text-sm text-foreground">Jump to section</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {faqSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                          activeSection === section.id
                            ? "bg-gradient-to-r from-vendibook-orange/20 to-amber-400/10 border-vendibook-orange/30 text-vendibook-orange"
                            : "bg-background hover:bg-primary/10 hover:border-primary/30"
                        )}
                      >
                        <section.icon className="h-3.5 w-3.5" />
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ Sections */}
                {faqSections.map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    id={section.id}
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                    className={sectionIndex > 0 ? 'mt-12 pt-12 border-t' : ''}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-vendibook-orange/20 to-amber-400/20">
                        <section.icon className="h-5 w-5 text-vendibook-orange" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                    </div>

                    {/* Special Pricing Grid for Fees & Commission section */}
                    {section.id === 'fees-commission' && (
                      <div className="mb-8 space-y-6">
                        {/* Commission Overview Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Rentals Card */}
                          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <CreditCard className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-bold text-lg text-foreground">Rentals (Bookings)</h3>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <span className="text-muted-foreground">Host commission</span>
                                  <span className="font-bold text-foreground text-lg">12.9%</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <span className="text-muted-foreground">Renter service fee</span>
                                  <span className="font-bold text-foreground text-lg">12.9%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-4">
                                Covers: secure payments, identity safeguards, support, dispute handling, payout routing
                              </p>
                            </CardContent>
                          </Card>

                          {/* Sales Card */}
                          <Card className="border-2 border-vendibook-orange/20 bg-gradient-to-br from-vendibook-orange/5 to-transparent">
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-lg bg-vendibook-orange/10">
                                  <Wallet className="h-5 w-5 text-vendibook-orange" />
                                </div>
                                <h3 className="font-bold text-lg text-foreground">Sales (Purchases)</h3>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <span className="text-muted-foreground">Seller commission</span>
                                  <span className="font-bold text-foreground text-lg">12.9%</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                  <span className="text-muted-foreground">Buyer platform fee</span>
                                  <span className="font-bold text-green-600 text-lg flex items-center gap-1">
                                    <Check className="h-4 w-4" /> $0
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-4">
                                Buyers may add freight if they choose buyer-paid shipping
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Additional Fees */}
                        <Card className="bg-muted/30 border-dashed">
                          <CardContent className="pt-6">
                            <h3 className="font-semibold text-foreground mb-4">Additional Fees (When Applicable)</h3>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-start gap-3">
                                <Truck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-foreground">Freight / Shipping</p>
                                  <p className="text-muted-foreground text-xs">Buyer-paid freight added at checkout when selected. Pricing varies by route.</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-foreground">Payment Processing</p>
                                  <p className="text-muted-foreground text-xs">May apply depending on payment method and region. Shown before purchase.</p>
                                </div>
                              </div>
                            </div>
                        </CardContent>
                        </Card>

                        {/* Interactive Pricing Calculator */}
                        <PricingCalculator />

                        {/* Example Calculations */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Rental Example */}
                          <Card className="bg-card">
                            <CardContent className="pt-6">
                              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Example</span>
                                Rental
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Rental price</span>
                                  <span className="font-medium text-foreground">$1,000</span>
                                </div>
                                <div className="flex justify-between text-destructive">
                                  <span>Host commission (12.9%)</span>
                                  <span>-$129</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                  <span className="font-semibold text-foreground">Host receives</span>
                                  <span className="font-bold text-green-600">$871</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground pt-2 border-t">
                                  <span>Renter service fee (12.9%)</span>
                                  <span>+$129</span>
                                </div>
                                <p className="text-xs text-muted-foreground italic pt-2">
                                  Deposit and delivery fees shown separately
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Sale Example */}
                          <Card className="bg-card">
                            <CardContent className="pt-6">
                              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                <span className="text-xs bg-vendibook-orange/10 text-vendibook-orange px-2 py-1 rounded">Example</span>
                                Sale
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sale price</span>
                                  <span className="font-medium text-foreground">$20,000</span>
                                </div>
                                <div className="flex justify-between text-destructive">
                                  <span>Seller commission (12.9%)</span>
                                  <span>-$2,580</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                  <span className="font-semibold text-foreground">Seller receives</span>
                                  <span className="font-bold text-green-600">$17,420</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground pt-2 border-t">
                                  <span>Buyer platform fee</span>
                                  <span className="text-green-600">$0</span>
                                </div>
                                <p className="text-xs text-muted-foreground italic pt-2">
                                  Buyer may add freight if choosing buyer-paid shipping
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    <Accordion type="single" collapsible className="w-full">
                      {section.questions.map((faq, index) => (
                        <AccordionItem key={index} value={`${section.id}-${index}`}>
                          <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Still Need Help CTA - GRADIENT */}
        <section className="relative py-12 md:py-16 overflow-hidden">
          {/* Orange Gradient - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/6 via-[#FF5124]/4 to-amber-100/3" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-20 w-72 h-72 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-20 w-80 h-80 bg-[#FF5124]/4 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="container max-w-3xl text-center relative z-10">
            <Card className="border-2 border-vendibook-orange/20 bg-gradient-to-br from-background to-vendibook-orange/5">
              <CardContent className="pt-8 pb-8">
                <div className="p-3 rounded-xl bg-gradient-to-br from-vendibook-orange/20 to-amber-400/20 w-fit mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-vendibook-orange" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Still Have Questions?</h2>
                <p className="text-muted-foreground mb-6">
                  Our support team is available 24/7 to help you with any questions or concerns.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="bg-vendibook-orange hover:bg-vendibook-orange/90">
                    <Link to="/contact">
                      Contact Support
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/help">
                      Visit Help Center
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
