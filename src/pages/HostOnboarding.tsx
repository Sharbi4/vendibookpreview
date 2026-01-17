import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  TrendingUp,
  Users,
  FileCheck,
  Headphones,
  BadgeCheck,
  Calculator,
  FileText,
  Lightbulb,
  Star,
  Truck,
  ShoppingBag,
  Repeat,
  MessageCircle,
  FileQuestion,
  Clock,
  Package,
  Handshake,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

type ListingMode = 'rent' | 'sell' | 'both';

declare global {
  interface Window {
    zE?: (...args: any[]) => void;
  }
}

const HostOnboarding = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as ListingMode) || 'rent';
  const [selectedMode, setSelectedMode] = useState<ListingMode>(initialMode);

  // Update URL when mode changes
  useEffect(() => {
    setSearchParams({ mode: selectedMode }, { replace: true });
    trackEvent({
      category: 'Supply',
      action: 'host_mode_selected',
      label: selectedMode,
    });
  }, [selectedMode, setSearchParams]);

  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  // Dynamic content based on mode
  const getHeroContent = () => {
    switch (selectedMode) {
      case 'rent':
        return {
          primaryCta: 'Start Rental Listing',
          primaryLink: '/list?mode=rent',
          secondaryCta: 'See Rental Flow',
          secondaryLink: '/help/rental-end-to-end',
        };
      case 'sell':
        return {
          primaryCta: 'Start For-Sale Listing',
          primaryLink: '/list?mode=sell',
          secondaryCta: 'See Selling Flow',
          secondaryLink: '/help/selling-end-to-end',
        };
      case 'both':
        return {
          primaryCta: 'Start Listing',
          primaryLink: '/list',
          secondaryCta: 'Compare Both',
          secondaryLink: '/help/host-onboarding',
        };
    }
  };

  const getBenefits = () => {
    switch (selectedMode) {
      case 'rent':
        return [
          { icon: <Calendar className="h-6 w-6" />, title: 'Availability calendar', description: 'Block dates and set minimum rental periods on your terms.' },
          { icon: <ShieldCheck className="h-6 w-6" />, title: 'Deposits & condition checks', description: 'Collect deposits and document pickup/return condition.' },
          { icon: <FileCheck className="h-6 w-6" />, title: 'Document requirements', description: 'Require licenses or insurance before approving bookings.' },
          { icon: <Truck className="h-6 w-6" />, title: 'Delivery/pickup settings', description: 'Set delivery fees and pickup instructions your way.' },
          { icon: <CreditCard className="h-6 w-6" />, title: 'Stripe payouts', description: 'Receive payments directly to your bank account.' },
          { icon: <Headphones className="h-6 w-6" />, title: '24/7 Zendesk support', description: 'Get help with disputes, questions, and anything you need.' },
        ];
      case 'sell':
        return [
          { icon: <DollarSign className="h-6 w-6" />, title: 'Buy-now pricing', description: 'Set a fixed price or accept offers from buyers.' },
          { icon: <Users className="h-6 w-6" />, title: 'Verified buyers', description: 'Connect with verified buyers and reduce fraud risk.' },
          { icon: <FileCheck className="h-6 w-6" />, title: 'Document requirements', description: 'Collect necessary documents for a smooth closing.' },
          { icon: <Package className="h-6 w-6" />, title: 'Pickup/delivery coordination', description: 'Flexible handoff options for buyers.' },
          { icon: <CreditCard className="h-6 w-6" />, title: 'Secure Stripe payments', description: 'Funds held in escrow until transaction completes.' },
          { icon: <Headphones className="h-6 w-6" />, title: '24/7 Zendesk support', description: 'Support through close and beyond.' },
        ];
      case 'both':
        return [
          { icon: <Repeat className="h-6 w-6" />, title: 'Rental income + exit ready', description: 'Earn recurring income now, sell when the time is right.' },
          { icon: <TrendingUp className="h-6 w-6" />, title: 'One dashboard', description: 'Manage both rental and sale activity in one place.' },
          { icon: <Users className="h-6 w-6" />, title: 'Verified users', description: 'All renters and buyers go through verification.' },
          { icon: <Calculator className="h-6 w-6" />, title: 'Flexible pricing', description: 'Set rental rates and sale price with market comps.' },
          { icon: <CreditCard className="h-6 w-6" />, title: 'Stripe payouts', description: 'All payments processed securely through Stripe.' },
          { icon: <Sparkles className="h-6 w-6" />, title: 'AI tools included', description: 'Optimize pricing and listing copy automatically.' },
        ];
    }
  };

  const getSteps = () => {
    switch (selectedMode) {
      case 'rent':
        return [
          { step: 1, title: 'Create listing', description: 'Add photos, rates, delivery options, rules, and document requirements.' },
          { step: 2, title: 'Get verified', description: 'Complete identity verification to build trust with renters.' },
          { step: 3, title: 'Approve renters', description: 'Review requests, check documents, and confirm pickup/delivery.' },
          { step: 4, title: 'Get paid', description: 'Payouts initiated within 24 hours of rental start via Stripe.' },
        ];
      case 'sell':
        return [
          { step: 1, title: 'Create for-sale listing', description: 'Add photos, set price or enable offers, and specify terms.' },
          { step: 2, title: 'Get verified', description: 'Build buyer confidence with identity verification.' },
          { step: 3, title: 'Confirm buyer + handoff', description: 'Collect documents, schedule pickup, and confirm transfer.' },
          { step: 4, title: 'Get paid', description: 'Funds released to your account after buyer confirms receipt.' },
        ];
      case 'both':
        return [
          { step: 1, title: 'Create dual listing', description: 'List for rent with option to sell—one listing, two modes.' },
          { step: 2, title: 'Get verified', description: 'One-time verification covers both rental and sale.' },
          { step: 3, title: 'Manage activity', description: 'Handle bookings and sale inquiries from one dashboard.' },
          { step: 4, title: 'Get paid', description: 'Stripe payouts for rentals and sales, all in one place.' },
        ];
    }
  };

  const getToolsContent = () => {
    switch (selectedMode) {
      case 'rent':
        return [
          { icon: <Calculator className="h-5 w-5" />, title: 'Price Pilot', description: 'Get market-based rental rate recommendations.' },
          { icon: <FileText className="h-5 w-5" />, title: 'Listing Studio', description: 'Generate compelling rental descriptions.' },
          { icon: <Lightbulb className="h-5 w-5" />, title: 'Permit Path', description: 'Find required licenses for your location.' },
        ];
      case 'sell':
        return [
          { icon: <Calculator className="h-5 w-5" />, title: 'Price Pilot', description: 'Get comparable sale prices for your asset.' },
          { icon: <FileText className="h-5 w-5" />, title: 'Listing Studio', description: 'Generate high-converting sale descriptions.' },
          { icon: <Lightbulb className="h-5 w-5" />, title: 'Permit Path', description: 'Understand transfer requirements by state.' },
        ];
      case 'both':
        return [
          { icon: <Calculator className="h-5 w-5" />, title: 'Price Pilot', description: 'Rental rates + sale comps in one tool.' },
          { icon: <FileText className="h-5 w-5" />, title: 'Listing Studio', description: 'Copy optimized for rentals and sales.' },
          { icon: <Lightbulb className="h-5 w-5" />, title: 'Permit Path', description: 'Location-specific requirements.' },
        ];
    }
  };

  const getFinalCtaContent = () => {
    switch (selectedMode) {
      case 'rent':
        return {
          headline: 'Ready to earn recurring income?',
          cta: 'Start Rental Listing',
          link: '/list?mode=rent',
        };
      case 'sell':
        return {
          headline: 'Ready to sell with confidence?',
          cta: 'Start For-Sale Listing',
          link: '/list?mode=sell',
        };
      case 'both':
        return {
          headline: 'Maximize revenue: rent now, sell later.',
          cta: 'Start Listing',
          link: '/list',
        };
    }
  };

  const heroContent = getHeroContent();
  const benefits = getBenefits();
  const steps = getSteps();
  const tools = getToolsContent();
  const finalCta = getFinalCtaContent();

  const trustPills = [
    {
      icon: <BadgeCheck className="h-5 w-5" />,
      label: 'Identity verification',
      content: 'Every host and renter completes Stripe Identity verification. Verified users display a badge, building trust before any transaction.',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: 'Secure payments',
      content: 'All payments processed through Stripe Connect. Rental payouts within 24 hours of start. Sale payouts after buyer confirmation.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: 'Deposits & disputes',
      content: 'Security deposits held and released automatically. Evidence-based dispute resolution with photo documentation and messaging history.',
    },
    {
      icon: <FileCheck className="h-5 w-5" />,
      label: 'Document checks',
      content: 'Require licenses, insurance, certifications, or permits before approving any booking. You control what documents are needed.',
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      label: '24/7 support',
      content: 'Chat with our team anytime via Zendesk. Submit tickets for complex issues. Average response time: under 5 minutes.',
    },
  ];

  const testimonials = [
    {
      quote: "Finally, a platform that understands food truck operators. The document requirements feature alone saves me hours of back-and-forth.",
      author: "Marcus T.",
      role: "Food Truck Owner, Austin",
      rating: 5,
    },
    {
      quote: "Sold my trailer in two weeks. The verification process made buyers feel confident, and Stripe handled everything smoothly.",
      author: "Jennifer L.",
      role: "Trailer Seller, Denver",
      rating: 5,
    },
    {
      quote: "I rent my truck during slow seasons and keep the sale option open. Best of both worlds with one listing.",
      author: "Carlos M.",
      role: "Ghost Kitchen Operator, Miami",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="List Your Food Truck, Trailer, or Kitchen | Vendibook"
        description="Earn from your mobile food asset. Rent it out, sell it, or do both — with verified users and Stripe-powered payouts."
        type="website"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify([generateOrganizationSchema(), generateWebSiteSchema()])
      }} />
      
      <Header />

      <main className="flex-1">
        {/* HERO — "Choose your path" */}
        <section className="relative bg-gradient-to-br from-background via-muted/30 to-primary/5 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.06),transparent_50%)]" />
          <div className="container relative">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                  Earn from your mobile food asset
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Rent it out, sell it, or do both — with verified users and Stripe-powered payouts.
                </p>
              </div>


              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <Button asChild size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90">
                  <Link to={heroContent.primaryLink}>
                    {heroContent.primaryCta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-8 py-6">
                  <Link to={heroContent.secondaryLink}>{heroContent.secondaryCta}</Link>
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Free to list · No monthly fees · You stay in control
              </p>
            </div>
          </div>
        </section>

        {/* WHAT YOU GET — Dynamic Benefits */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                What you get
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {selectedMode === 'rent' && 'Everything you need to rent your asset with confidence.'}
                {selectedMode === 'sell' && 'Everything you need to sell your asset securely.'}
                {selectedMode === 'both' && 'The best of rental income and sale flexibility.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
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

        {/* HOW IT WORKS — Dynamic 4-step flow */}
        <section className="py-14 md:py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                How it works
              </h2>
              <p className="text-muted-foreground">
                {selectedMode === 'rent' && 'From listing to payout in four simple steps.'}
                {selectedMode === 'sell' && 'Sell your asset with confidence.'}
                {selectedMode === 'both' && 'One listing, two revenue streams.'}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST & SAFETY — Clickable pills with popovers */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Built for trust and safety
              </h2>
              <p className="text-muted-foreground">
                Every transaction is protected by our marketplace guarantees.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto mb-8">
              {trustPills.map((pill, index) => (
                <Popover key={index}>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-muted border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                      <span className="text-primary">{pill.icon}</span>
                      <span className="text-sm font-medium text-foreground">{pill.label}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
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
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h4 className="font-semibold text-foreground mb-0.5">Need help right now?</h4>
                      <p className="text-sm text-muted-foreground">Chat with our team 24/7 or submit a support request.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={openZendeskChat}>
                        Chat with Support
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/contact">Submit Request</Link>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Powered by Zendesk + Vendibook Support Desk APIs
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* AI TOOLS — Context-aware tools */}
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
                  From pricing recommendations to marketing copy, our tools help you create better listings and earn more.
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
                Trusted by hosts nationwide
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

        {/* FINAL CTA — Dynamic conversion footer */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-muted/30 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {finalCta.headline}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join hundreds of operators who trust Vendibook to connect them with verified renters and buyers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <Button asChild size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90">
                  <Link to={finalCta.link}>
                    {finalCta.cta}
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

// Mode selector card component
interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  isSelected: boolean;
  onClick: () => void;
}

const ModeCard = ({ icon, title, badge, isSelected, onClick }: ModeCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl border-2 transition-all cursor-pointer relative",
      isSelected
        ? "border-primary bg-primary/5 shadow-sm"
        : "border-border bg-background hover:border-primary/30 hover:bg-muted/50"
    )}
  >
    <span className={cn("transition-colors", isSelected ? "text-primary" : "text-muted-foreground")}>
      {icon}
    </span>
    <span className={cn("font-medium transition-colors", isSelected ? "text-foreground" : "text-muted-foreground")}>
      {title}
    </span>
    {badge && (
      <span className="absolute -top-2.5 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
        {badge}
      </span>
    )}
    {isSelected && (
      <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />
    )}
  </button>
);

export default HostOnboarding;
