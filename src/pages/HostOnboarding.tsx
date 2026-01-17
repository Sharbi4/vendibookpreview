import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Shield,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  DollarSign,
  Users,
  FileCheck,
  Headphones,
  BadgeCheck,
  Calculator,
  FileText,
  Lightbulb,
  Star,
  Truck,
  MessageCircle,
  Receipt,
  ShieldCheck,
  ClipboardCheck,
  MessageSquare,
  Banknote,
  Tag,
  Camera,
  UserCheck,
  Handshake,
  Wallet,
} from 'lucide-react';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    zE?: (...args: any[]) => void;
  }
}

const HostOnboarding = () => {
  const [activeTab, setActiveTab] = useState<'rentals' | 'sales'>('rentals');

  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  const benefits = [
    { icon: <Calendar className="h-6 w-6" />, title: 'Availability calendar', description: 'Block dates, set minimum rental periods, and control lead time.' },
    { icon: <Tag className="h-6 w-6" />, title: 'Rental pricing + rules', description: 'Set day/week rates, deposits, policies, and add-ons your way.' },
    { icon: <DollarSign className="h-6 w-6" />, title: 'Sales pricing + buyer flow', description: 'Set a fixed price, include what\'s included, and receive serious inquiries.' },
    { icon: <ShieldCheck className="h-6 w-6" />, title: 'Deposits & condition checks', description: 'Collect deposits (rentals) and document pickup/return condition.' },
    { icon: <Receipt className="h-6 w-6" />, title: 'Secure checkout + payout tracking', description: 'Protected payments, clear status updates, and transparent transaction history.' },
    { icon: <Truck className="h-6 w-6" />, title: 'Delivery / pickup settings', description: 'Offer pickup, delivery, or buyer-paid delivery coordination (optional).' },
    { icon: <FileCheck className="h-6 w-6" />, title: 'Document requirements', description: 'Request licenses, insurance, or credentials before approval (rentals).' },
    { icon: <MessageSquare className="h-6 w-6" />, title: 'Messaging + booking management', description: 'Keep everything in one place: questions, requests, dates, and terms.' },
    { icon: <Banknote className="h-6 w-6" />, title: 'Stripe payouts', description: 'Get paid to your bank account through Stripe Connect.' },
    { icon: <Headphones className="h-6 w-6" />, title: '24/7 Zendesk support', description: 'Support for disputes, questions, and account help.' },
  ];

  const rentalSteps = [
    { step: 1, icon: <Camera className="h-5 w-5" />, title: 'Create listing', description: 'Add photos, rates, availability, delivery options, rules, deposit, and document requirements.' },
    { step: 2, icon: <UserCheck className="h-5 w-5" />, title: 'Get verified', description: 'Complete identity verification to build trust with renters.' },
    { step: 3, icon: <ClipboardCheck className="h-5 w-5" />, title: 'Approve renters', description: 'Review requests, confirm documents, and finalize pickup/delivery details.' },
    { step: 4, icon: <Wallet className="h-5 w-5" />, title: 'Get paid', description: 'Payouts initiated within 24 hours of rental start via Stripe.' },
  ];

  const salesSteps = [
    { step: 1, icon: <Camera className="h-5 w-5" />, title: 'Create listing', description: 'Add photos, price, specs, included equipment, and pickup/delivery preferences.' },
    { step: 2, icon: <UserCheck className="h-5 w-5" />, title: 'Get verified', description: 'Verification builds confidence for serious buyers.' },
    { step: 3, icon: <Handshake className="h-5 w-5" />, title: 'Confirm buyer + terms', description: 'Message securely, confirm details, and proceed to protected checkout.' },
    { step: 4, icon: <Wallet className="h-5 w-5" />, title: 'Get paid', description: 'Payouts initiated after order confirmation via Stripe.' },
  ];

  const trustPills = [
    {
      icon: <BadgeCheck className="h-5 w-5" />,
      label: 'Identity verification',
      content: 'Verified profiles help reduce fraud and increase conversion.',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: 'Secure online payments',
      content: 'Protected checkout through Stripe-powered payments.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: 'Deposits & disputes',
      content: 'Deposits for rentals, documented condition checks, and a clear dispute process.',
    },
    {
      icon: <FileCheck className="h-5 w-5" />,
      label: 'Document checks',
      content: 'Require the right credentials before approving a booking.',
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      label: '24/7 support',
      content: 'Chat anytime or submit a request for help.',
    },
  ];

  const tools = [
    { icon: <Calculator className="h-5 w-5" />, title: 'PricePilot', description: 'Market-based rental and sale pricing guidance.' },
    { icon: <FileText className="h-5 w-5" />, title: 'Listing Studio', description: 'High-converting descriptions from your specs and photos.' },
    { icon: <Lightbulb className="h-5 w-5" />, title: 'PermitPath', description: 'Find required licenses and documents by location.' },
  ];

  const testimonials = [
    {
      quote: "Finally a platform built for mobile food assets. Document requirements save hours of back-and-forth.",
      author: "Marcus T.",
      role: "Food Truck Owner, Austin",
      rating: 5,
    },
    {
      quote: "Sold my trailer in two weeks. Verification made buyers confident and checkout was smooth.",
      author: "Jennifer L.",
      role: "Trailer Seller, Denver",
      rating: 5,
    },
    {
      quote: "I rent during slow seasons and keep the sale option open. One listing, two income paths.",
      author: "Carlos M.",
      role: "Operator, Miami",
      rating: 5,
    },
  ];

  const steps = activeTab === 'rentals' ? rentalSteps : salesSteps;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="List Your Asset | Vendibook"
        description="Earn from your mobile food asset. Rent it out, sell it, or do both — with verified users and Stripe-powered payouts."
        type="website"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify([generateOrganizationSchema(), generateWebSiteSchema()])
      }} />
      
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-background via-muted/30 to-primary/5 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.06),transparent_50%)]" />
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                List Your Asset
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                Book more rentals. Close more sales.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Rent it out, sell it, or do both — with verified users, protected payments, and Stripe-powered payouts.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
                <Button asChild size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90">
                  <Link to="/list">
                    Start Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-8 py-6">
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
              <div className="mb-4">
                <Link to="/tools" className="text-sm text-primary hover:underline font-medium">
                  Explore Host Tools →
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Free to list · No monthly fees · You stay in control
              </p>
            </div>
          </div>
        </section>

        {/* VALUE STRIP */}
        <section className="py-8 bg-muted/40 border-y border-border/50">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">Rent for events, seasons, or weekends</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">Sell outright when you're ready</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">One listing can support both paths</p>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Hosting, simplified
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Everything you need to rent or sell with confidence.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-6xl mx-auto">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>


        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-14 md:py-20 bg-muted/30 scroll-mt-20">
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                A Secure Process
              </h2>
              <p className="text-muted-foreground mb-6">
                From listing to payout in four simple steps — whether you rent, sell, or both.
              </p>
              
              {/* Toggle */}
              <div className="inline-flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('rentals')}
                  className={cn(
                    "px-6 py-2 rounded-md text-sm font-medium transition-all",
                    activeTab === 'rentals'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Rentals
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={cn(
                    "px-6 py-2 rounded-md text-sm font-medium transition-all",
                    activeTab === 'sales'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sales
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-10">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                    {step.icon}
                  </div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Step {step.step}</div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Free to list callout */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Free to list — No monthly fees to publish listings.</span>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST & SAFETY */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Built for trust and safety
              </h2>
              <p className="text-muted-foreground">
                Every transaction is backed by protections designed for high-value mobile assets.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto mb-10">
              {trustPills.map((pill, index) => (
                <Popover key={index}>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer">
                      <span className="text-primary">{pill.icon}</span>
                      <span className="text-sm font-medium text-foreground">{pill.label}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {pill.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{pill.label}</h4>
                        <p className="text-sm text-muted-foreground">{pill.content}</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </div>

            {/* Support row */}
            <div className="max-w-xl mx-auto">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-foreground mb-1">Need help right now?</h4>
                    <p className="text-sm text-muted-foreground">Chat with our team 24/7 or submit a support request.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button size="sm" onClick={openZendeskChat}>
                      Chat with Support
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/contact">Submit Request</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* AI TOOLS */}
        <section className="py-14 md:py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Free for all hosts</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  AI-powered tools to help you succeed
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  From pricing recommendations to listing copy, our tools help you create better listings and earn more.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {tools.map((tool, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-background border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {tool.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{tool.title}</h4>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button asChild variant="outline" size="lg">
                  <Link to="/tools">
                    Explore Host Tools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Trusted by operators nationwide
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border border-border/50">
                  <CardContent className="p-5">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-foreground mb-4 text-sm leading-relaxed">"{testimonial.quote}"</p>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-muted/30 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to earn from your asset?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join operators who trust Vendibook to connect with verified renters and serious buyers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <Button asChild size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90">
                  <Link to="/list">
                    Start Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-8 py-6">
                  <Link to="/tools">Explore Host Tools</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free to list · No subscription required</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Mobile sticky chat FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={openZendeskChat}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default HostOnboarding;
