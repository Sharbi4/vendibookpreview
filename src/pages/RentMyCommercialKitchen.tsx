import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-muted/50 to-background pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ChefHat className="h-4 w-4" />
                For Restaurant & Kitchen Owners
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Turn Your Empty Kitchen Stations Into a Second Revenue Stream
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                Don't let your overhead eat your profits. Vendibook connects restaurant owners with vetted food entrepreneurs looking for hourly prep space, ghost kitchen rentals, and commissary access.
              </p>

              <p className="text-base text-foreground font-medium mb-8">
                We handle the marketing, payments, and document verification so you just approve the booking.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-foreground hover:bg-foreground/90 text-background font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Link to="/list?category=ghost_kitchen">
                    Create a Free Kitchen Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-foreground text-foreground hover:bg-foreground hover:text-background"
                >
                  <Link to="/pricing-calculator">Estimate Your Earnings</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Free to list. You keep 100% control of your schedule.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-8 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StripeLogo className="h-6" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>Verified Renters</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <span>Document Review</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

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
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold"
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
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold"
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
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold"
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

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Host Fee</p>
                  <p className="text-4xl font-bold">12.9%</p>
                  <p className="text-sm text-muted-foreground mt-2">Deducted from payout</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Renter Fee</p>
                  <p className="text-4xl font-bold">12.9%</p>
                  <p className="text-sm text-muted-foreground mt-2">Added to booking total</p>
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
                className="bg-foreground hover:bg-foreground/90 text-background font-semibold"
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

        {/* Final CTA Section */}
        <section className="py-16 md:py-20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to turn that dark kitchen into bright revenue?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join hundreds of smart operators maximizing their real estate.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-foreground hover:bg-foreground/90 text-background font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Link to="/list?category=ghost_kitchen">
                    Create a Kitchen Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact">
                    <Headphones className="mr-2 h-5 w-5" />
                    Talk to Support
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Free to list. You stay in control. We handle the process.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.1)] safe-area-bottom">
        <div className="p-3 pb-safe">
          <Button
            asChild
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold"
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
