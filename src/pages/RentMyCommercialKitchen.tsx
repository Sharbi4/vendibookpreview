import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { WhiteGlovePopup } from '@/components/kitchen/WhiteGlovePopup';
import {
  ChefHat,
  DollarSign,
  Shield,
  FileCheck,
  Rocket,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Truck,
  UtensilsCrossed,
  Cake,
  Building2,
  CreditCard,
  Megaphone,
  Scale,
  Headphones,
  MessageCircle,
  Zap,
  Star,
  Timer,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { StripeLogo } from '@/components/ui/StripeLogo';
import KitchenBenefitsAnimation from '@/components/kitchen/KitchenBenefitsAnimation';

// Social proof stats
const socialProofStats = [
  { value: '200+', label: 'Kitchens Listed', icon: Building2 },
  { value: '$2M+', label: 'Host Earnings', icon: DollarSign },
  { value: '100%', label: 'Verified Renters', icon: BadgeCheck },
  { value: '<5min', label: 'Listing Setup', icon: Timer },
];

const RentMyCommercialKitchen = () => {
  const [showEarningsModal, setShowEarningsModal] = useState(false);

  const useCases = [
    {
      icon: Truck,
      title: 'Commissary Seekers',
      description: 'Food trucks and mobile carts needing code-compliant prep space.',
    },
    {
      icon: Building2,
      title: 'Ghost Kitchen Brands',
      description: 'Delivery-only concepts (UberEats/DoorDash) needing production lines.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Volume Caterers',
      description: 'Chefs needing extra walk-in space or ovens for large events.',
    },
    {
      icon: Cake,
      title: 'Wholesale Bakers',
      description: "Early morning production runs that don't conflict with your dinner service.",
    },
  ];

  const whyUs = [
    {
      icon: DollarSign,
      title: 'Monetize Idle Hours',
      description:
        "Don't change your operation. Rent out the graveyard shift (12 AM - 6 AM) or closed Mondays. You set the hours; we fill them.",
    },
    {
      icon: Shield,
      title: 'Total Control',
      description:
        'Your kitchen, your rules. Set specific requirements for cleaning, storage, and equipment usage. You have final approval on every single booking request.',
    },
    {
      icon: FileCheck,
      title: '"Done-For-You" Compliance',
      description:
        "Tired of chasing paperwork? We collect and review the renter's ServSafe, Liability Insurance, and Business Licenses before they ever step foot in your building.",
    },
    {
      icon: Rocket,
      title: 'Automated Marketing',
      description:
        'We turn your kitchen into a high-converting listing with search-optimized pages, bringing demand directly to your door.',
    },
  ];

  const steps = [
    {
      step: 1,
      title: 'Create Your Listing',
      description: 'Upload photos, set your hourly rate, and define "Prep-Only" or "Full Access."',
    },
    {
      step: 2,
      title: 'Set Your Rules',
      description: 'Choose your required documents (Insurance, ServSafe, etc.).',
    },
    {
      step: 3,
      title: 'Get Paid Requests',
      description: 'Renters submit booking requests with payment already secured.',
    },
    {
      step: 4,
      title: 'Review & Approve',
      description: "You verify their profile and documents. If it's a fit, click Accept.",
    },
    {
      step: 5,
      title: 'Automatic Payout',
      description: 'Funds are released to your bank account after the booking is successfully completed.',
    },
  ];

  const verificationPoints = [
    { label: 'Stripe Identity Verification', description: 'We confirm they are who they say they are.' },
    { label: 'Document Review', description: 'We check expiration dates on Food Handler cards and Insurance policies.' },
    { label: 'Host-Controlled Deposits', description: 'You set the security deposit amount. We hold it to protect your equipment.' },
  ];

  const feeFeatures = [
    { icon: CreditCard, label: 'Payment processing & fraud protection (Stripe)' },
    { icon: Megaphone, label: 'Marketing your space to thousands of local food entrepreneurs' },
    { icon: FileCheck, label: 'Administrative document review & storage' },
    { icon: Scale, label: 'Dispute resolution & deposit handling' },
  ];

  const faqs = [
    {
      question: 'Do I have to review the legal documents myself?',
      answer:
        'No. You set the requirements (e.g., "Must have $1M Liability Insurance"). Vendibook collects and reviews these documents for accuracy. You simply view the "Approved" status.',
    },
    {
      question: 'When is payment collected?',
      answer:
        "We charge the renter's card the moment they send a booking request. The funds are held securely in escrow until the booking is complete.",
    },
    {
      question: 'Can I restrict what equipment they use?',
      answer:
        'Absolutely. You can list your space as "Prep Tables Only" or "Full Hot Line." You can also mark specific equipment (like your expensive mixer) as "Off Limits."',
    },
    {
      question: 'Is this legal in my city?',
      answer:
        'Most health departments allow permitted commercial kitchens to act as "commissaries." We recommend checking your local codes, but our document tracking helps you stay compliant.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Commercial Kitchen Rental Platform',
    provider: {
      '@type': 'Organization',
      name: 'Vendibook',
      url: 'https://vendibook.com',
    },
    description: 'Monetize your restaurant\'s unused hours. Safely rent your commercial kitchen to vetted ghost brands and caterers.',
    areaServed: 'United States',
    serviceType: 'Kitchen Rental Marketplace',
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <SEO
        title="Rent Your Commercial Kitchen: Turn Downtime Into Profit | Vendibook"
        description="Monetize your restaurant's unused hours. Safely rent your commercial kitchen to vetted ghost brands and caterers. We handle the paperwork, payments, and screening."
        canonical="/rent-my-commercial-kitchen"
      />
      <JsonLd schema={[faqSchema, serviceSchema]} />

      <Header />

      <main className="min-h-screen">
        {/* Hero Section - Enhanced */}
        <section className="relative bg-gradient-to-b from-muted/50 via-background to-background pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" aria-hidden="true" />
          
          <div className="container relative z-10">
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto text-center"
            >
              {/* Urgency badge */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20"
              >
                <Zap className="h-4 w-4" />
                Join 200+ kitchen owners earning passive income
              </motion.div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Turn Your Empty Kitchen Into a{' '}
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                  Second Revenue Stream
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                Stop letting overhead eat your profits. Connect with vetted food entrepreneurs looking for hourly prep space, ghost kitchen rentals, and commissary access.
              </p>

              <p className="text-sm sm:text-base text-foreground font-medium mb-8">
                We handle marketing, payments, and document verification—you just approve bookings.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4">
                <Button
                  asChild
                  size="lg"
                  variant="dark-shine"
                  className="h-12 sm:h-14 text-base sm:text-lg px-6 sm:px-8"
                >
                  <Link to="/list?category=ghost_kitchen">
                    Create Free Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 sm:h-14 text-base sm:text-lg px-6 sm:px-8 border-2"
                >
                  <Link to="/kitchen-earnings-calculator">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Estimate Earnings
                  </Link>
                </Button>
              </div>

              <motion.p 
                className="text-sm text-muted-foreground flex items-center justify-center gap-2"
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Free to list • No monthly fees • Cancel anytime
              </motion.p>

              {/* Trust Badges - Enhanced with hover */}
              <motion.div 
                className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8 pt-8 border-t border-border"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {[
                  { icon: StripeLogo, label: 'Secure Payments', isComponent: true },
                  { icon: Shield, label: 'Verified Renters', color: 'text-green-600' },
                  { icon: FileCheck, label: 'Document Review', color: 'text-blue-600' },
                ].map((badge, index) => (
                  <motion.div
                    key={badge.label}
                    className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 rounded-full bg-card border border-border/50 hover:border-primary/30 transition-colors"
                    whileHover={shouldReduceMotion ? {} : { y: -2 }}
                  >
                    {badge.isComponent ? (
                      <StripeLogo className="h-5" />
                    ) : (
                      <badge.icon className={`h-4 w-4 ${badge.color}`} />
                    )}
                    <span className="text-xs sm:text-sm">{badge.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
        
        {/* Social Proof Stats Bar */}
        <section className="py-6 sm:py-8 bg-card border-y border-border">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {socialProofStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Animation Section */}
        <KitchenBenefitsAnimation />

        {/* Revenue Data Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                How Much Is Your Downtime Worth?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Most commercial kitchens sit empty for 6–10 hours a day. See what comparable hosts are earning by monetizing that "dead time."
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card className="text-center border-2 border-primary/20">
                <CardContent className="pt-8 pb-6">
                  <TrendingUp className="h-10 w-10 text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">Average Weekly Earnings</p>
                  <p className="text-4xl font-bold text-primary">$500/week</p>
                  <p className="text-sm text-muted-foreground mt-2">renting just 3 days/week</p>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-green-500/20">
                <CardContent className="pt-8 pb-6">
                  <DollarSign className="h-10 w-10 text-green-600 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">Monthly Potential</p>
                  <p className="text-4xl font-bold text-green-600">$2,000+</p>
                  <p className="text-sm text-muted-foreground mt-2">in passive revenue</p>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <em>Earnings vary by city (e.g., Austin, Los Angeles, Miami), kitchen size, and equipment availability.</em>
            </p>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 md:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Who Needs Your Space?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We bring you verified professionals, not hobbyists. Your kitchen is perfect for:
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={useCase.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <useCase.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{useCase.title}</h3>
                      <p className="text-sm text-muted-foreground">{useCase.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Button
                asChild
                size="lg"
                variant="dark-shine"
              >
                <Link to="/list?category=ghost_kitchen">
                  List Your Kitchen for These Renters
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why Us Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Why Owners Choose Vendibook Over Craigslist
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {whyUs.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                          <item.icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-16 md:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                From "Empty" to "Earning" in 5 Steps
              </h2>
              <p className="text-muted-foreground">
                A streamlined process designed for busy restaurateurs.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold">{step.step}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button
                asChild
                size="lg"
                variant="dark-shine"
              >
                <Link to="/list?category=ghost_kitchen">
                  Create a Kitchen Listing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Draft in minutes. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Trust & Safety Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Verification Built for Peace of Mind
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                You wouldn't hand your keys to a stranger. Neither would we.
              </p>
            </motion.div>

            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-6 text-center">The Vendibook Screening Shield</h3>
                <div className="space-y-4">
                  {verificationPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{point.label}</p>
                        <p className="text-sm text-muted-foreground">{point.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-10">
              <Button
                asChild
                size="lg"
                variant="dark-shine"
              >
                <Link to="/list?category=ghost_kitchen">
                  Set Your Security Requirements
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 md:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground">No monthly subscriptions. We only make money when you do.</p>
            </motion.div>

            <div className="max-w-md mx-auto mb-10">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Host Fee</p>
                  <p className="text-4xl font-bold">12.9%</p>
                  <p className="text-sm text-muted-foreground mt-2">Deducted from payout</p>
                </CardContent>
              </Card>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 text-center">What Your Fee Covers</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {feeFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <feature.icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <p className="text-sm">{feature.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-10">
              <Button
                asChild
                size="lg"
                variant="dark-shine"
              >
                <Link to="/list?category=ghost_kitchen">
                  Start Earning Risk-Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Common Questions About Renting Your Commercial Kitchen
              </h2>
            </motion.div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Enhanced */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-foreground via-foreground to-primary/90 text-primary-foreground relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl" />
          </div>
          
          <div className="container relative z-10">
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <motion.div
                initial={shouldReduceMotion ? {} : { scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <Star className="h-4 w-4 fill-current" />
                Free to list • No monthly fees
              </motion.div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Ready to turn that dark kitchen into bright revenue?
              </h2>
              <p className="text-base sm:text-lg opacity-90 mb-10">
                Join hundreds of smart operators maximizing their real estate.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6">
                <Button
                  asChild
                  size="lg"
                  className="h-12 sm:h-14 text-base sm:text-lg px-6 sm:px-8 bg-white text-foreground hover:bg-white/90"
                >
                  <Link to="/list?category=ghost_kitchen">
                    Create Free Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  size="lg" 
                  variant="outline"
                  className="h-12 sm:h-14 text-base sm:text-lg px-6 sm:px-8 border-white/30 text-white hover:bg-white/10"
                >
                  <Link to="/contact">
                    <Headphones className="mr-2 h-5 w-5" />
                    Talk to Support
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <motion.div 
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm opacity-80"
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                whileInView={{ opacity: 0.8 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Setup in 5 minutes
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Cancel anytime
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Sticky Mobile CTA - Enhanced */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)] safe-area-bottom">
        <div className="p-3 pb-safe flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Start earning today</p>
            <p className="text-[10px] text-muted-foreground">Free to list</p>
          </div>
          <Button
            asChild
            variant="dark-shine"
            className="shrink-0"
          >
            <Link to="/list?category=ghost_kitchen">
              Create Listing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* White Glove Service Popup - appears after 15 seconds */}
      <WhiteGlovePopup delayMs={15000} />
    </>
  );
};

export default RentMyCommercialKitchen;
