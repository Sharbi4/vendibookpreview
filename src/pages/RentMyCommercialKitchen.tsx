import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  ChefHat, 
  DollarSign, 
  Shield, 
  FileCheck, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Truck, 
  Building2, 
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  QrCode,
  Smartphone,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// --- Modular Components ---

const KitchenHero = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-amber-500/5" aria-hidden="true" />

      <div className="container relative z-10 py-20 md:py-28">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <ChefHat className="h-4 w-4 mr-2 inline" />
            For Commercial Kitchens
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
            Your kitchen.{' '}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">
              Fully booked.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn your downtime into a second revenue stream. We connect you with vetted food businesses and handle the payments and compliance automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild size="lg" variant="dark-shine" className="h-14 px-8 text-lg">
              <Link to="/list?category=ghost_kitchen">
                List Your Kitchen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-2">
              <Link to="/kitchen-earnings-calculator">
                Calculate Earnings
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Free to list
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-500" />
              $2M+ host earnings
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const ValueGrid = () => {
  const shouldReduceMotion = useReducedMotion();
  
  const values = [
    {
      icon: Clock,
      title: "Fill the 'Dead' Hours",
      desc: "Monetize the graveyard shift (12 AM - 6 AM) or slow Mondays. You set the schedule; we fill the slots."
    },
    {
      icon: ClipboardCheck,
      title: "Know Who's Cooking",
      desc: "Review each renter's business info, equipment needs, and intended use in our app before approving any booking."
    },
    {
      icon: Shield,
      title: "Protect Your Facility",
      desc: "We collect liability insurance, ServSafe certs, and business licenses. Get the documentation you need upfront."
    },
    {
      icon: DollarSign,
      title: "Guaranteed Payouts",
      desc: "Renters pay upfront. Funds are held in escrow and released to you automatically. No chasing invoices."
    },
    {
      icon: Users,
      title: "Your Own Storefront",
      desc: "Get a shareable profile page with reviews, photos, and availability. Send the link to renters or let them discover you."
    },
    {
      icon: QrCode,
      title: "Free QR Signage",
      desc: "We send you professional signage with a QR code linking to your listing. Capture walk-in leads effortlessly."
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <motion.div 
          className="text-center mb-16"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why list on Vendibook?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We aren't just a directory. We are an operating system designed to protect your facility while maximizing revenue.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {values.map((item, i) => (
            <motion.div
              key={item.title}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full border-2 border-border shadow-lg bg-card hover:shadow-xl hover:border-primary/30 transition-all">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6">
                    <item.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const QRSignageSection = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Phone Mockup with QR Animation */}
          <motion.div
            className="relative flex justify-center order-2 lg:order-1"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative w-64 h-[500px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-6 bg-foreground rounded-full z-10" />
                <div className="w-full h-full bg-background rounded-[2.25rem] overflow-hidden flex flex-col items-center justify-center p-6">
                  {/* QR Code with Scan Animation */}
                  <motion.div
                    className="relative"
                    initial={shouldReduceMotion ? {} : { scale: 0.9 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-40 h-40 bg-card border-2 border-border rounded-2xl p-4 relative overflow-hidden">
                      {/* QR Pattern */}
                      <div className="grid grid-cols-5 gap-1 w-full h-full">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className={`rounded-sm ${[0, 1, 2, 4, 5, 6, 9, 10, 14, 15, 18, 19, 20, 22, 23, 24].includes(i) ? 'bg-foreground' : 'bg-transparent'}`}
                            initial={shouldReduceMotion ? {} : { opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.02 }}
                          />
                        ))}
                      </div>
                      {/* Scan Line Animation */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-primary"
                        initial={{ top: 0 }}
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          repeatDelay: 1
                        }}
                      />
                    </div>
                    {/* Corner Brackets */}
                    <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </motion.div>
                  
                  <p className="mt-6 text-sm font-medium text-foreground text-center">Scan to Book</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">Your Kitchen Name</p>
                </div>
              </div>
              
              {/* Floating Badge */}
              <motion.div
                className="absolute -right-4 top-20 bg-card border-2 border-border rounded-xl p-3 shadow-lg"
                initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">New Lead!</p>
                    <p className="text-[10px] text-muted-foreground">Just now</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Right: Copy */}
          <motion.div
            className="order-1 lg:order-2"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-primary/30 bg-primary/5 text-primary">
              <QrCode className="h-3.5 w-3.5 mr-1.5 inline" />
              Free Signage
            </Badge>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              Turn foot traffic
              <br />
              <span className="text-muted-foreground">into booked shifts.</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We mail you professional signage with a QR code that links directly to your listing. 
              Hang it in your window or by the door—renters scan, browse your availability, and book instantly.
            </p>

            <ul className="space-y-4">
              {[
                "Free printed signage shipped to you",
                "QR links to your live booking calendar",
                "Capture leads even when you're closed",
                "Track scans in your dashboard"
              ].map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-3 text-foreground"
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ComplianceFeature = () => {
  const shouldReduceMotion = useReducedMotion();
  
  const requirements = [
    "General Liability Insurance ($1M+)",
    "ServSafe / Food Manager Certification",
    "Business License & Permits",
    "Stripe Identity Verification"
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Copy */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-green-500/30 bg-green-500/5 text-green-600">
              <Shield className="h-3.5 w-3.5 mr-1.5 inline" />
              Safety First
            </Badge>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              We chase the paperwork,
              <br />
              <span className="text-muted-foreground">so you don't have to.</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Managing external renters usually means chasing down expired PDFs. We automated it.
              Our system locks the booking flow until the renter provides:
            </p>

            <ul className="space-y-4">
              {requirements.map((req, i) => (
                <motion.li
                  key={req}
                  className="flex items-center gap-3 text-foreground"
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  {req}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: Abstract UI "Vault" representation */}
          <motion.div
            className="relative"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative bg-card rounded-3xl border border-border shadow-2xl p-8 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Document Vault</p>
                    <p className="text-sm text-muted-foreground">3 of 3 verified</p>
                  </div>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Verified
                </Badge>
              </div>

              {/* Document rows */}
              <div className="space-y-4 mb-8">
                {[
                  { name: "Liability Insurance", status: "Verified" },
                  { name: "ServSafe Certificate", status: "Verified" },
                  { name: "Business License", status: "Verified" }
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{doc.name}</span>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>

              {/* Action button */}
              <Button className="w-full" variant="dark-shine">
                Approve Booking
              </Button>

              {/* Decorative blurred background elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/20 rounded-full blur-3xl" aria-hidden="true" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const RevenuePreview = () => {
  const shouldReduceMotion = useReducedMotion();
  
  const audiences = [
    { icon: Truck, title: "Food Trucks", desc: "Need prep space for code compliance." },
    { icon: Building2, title: "Ghost Brands", desc: "Delivery-only concepts needing production lines." },
    { icon: Users, title: "Caterers", desc: "Large event prep requiring walk-in space." }
  ];

  return (
    <section className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
      <div className="container relative z-10">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-600">
            Revenue Potential
          </Badge>
          
          <p className="text-5xl md:text-6xl font-bold text-foreground mb-4">
            $2,000/mo
          </p>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            That's the average earnings for kitchens renting out just 3 shifts per week. Your idle equipment is an asset—put it to work.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {audiences.map((item, i) => (
              <motion.div
                key={item.title}
                className="p-6 bg-card rounded-2xl border border-border shadow-sm"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <Button asChild size="lg" variant="dark-shine" className="h-14 px-8 text-lg">
            <Link to="/list?category=ghost_kitchen">
              Start Earning
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" aria-hidden="true" />
    </section>
  );
};

const KitchenFAQ = () => {
  const faqs = [
    {
      q: "Do I have to review the legal documents myself?",
      a: "No. You set the requirements (e.g., '$1M Liability Insurance'). Vendibook collects and verifies the dates on these documents automatically. You simply see a green 'Verified' checkmark."
    },
    {
      q: "Can I restrict what equipment they use?",
      a: "Absolutely. You can list your space as 'Prep Tables Only' or 'Full Hot Line.' You can also explicitly mark specific equipment (like a specialized mixer) as off-limits in your house rules."
    },
    {
      q: "When is payment collected?",
      a: "We charge the renter's card the moment they send a booking request. The funds are held securely in escrow and released to you 24 hours after the booking starts."
    },
    {
      q: "Is this legal in my city?",
      a: "Most health departments allow permitted commercial kitchens to act as 'commissaries.' Our document tracking is specifically designed to help you and your renters stay compliant with local codes."
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Common Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

// --- Main Page ---

const RentMyCommercialKitchen = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I have to review the legal documents myself?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "No. You set the requirements. Vendibook collects and verifies the dates on these documents automatically."
        }
      },
      {
        '@type': 'Question',
        name: 'When is payment collected?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "We charge the renter's card the moment they send a booking request. The funds are held securely in escrow."
        }
      }
    ],
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
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Rent Your Commercial Kitchen: Turn Downtime Into Profit | Vendibook"
        description="Monetize your restaurant's unused hours. Safely rent your commercial kitchen to vetted ghost brands and caterers. We handle the paperwork, payments, and screening."
        canonical="/rent-my-commercial-kitchen"
      />
      <JsonLd schema={[faqSchema, serviceSchema]} />

      <Header />

      <main className="flex-1">
        <KitchenHero />
        <ValueGrid />
        <QRSignageSection />
        <ComplianceFeature />
        <RevenuePreview />
        <KitchenFAQ />
        
        {/* Final CTA Bar */}
        <section className="py-16 md:py-20 bg-foreground">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-background mb-8">
                Ready to list?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg">
                  <Link to="/list?category=ghost_kitchen">
                    Create Free Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-background/20 text-background hover:bg-background/10 hover:text-background">
                  <Link to="/contact">
                    Contact Sales
                  </Link>
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

export default RentMyCommercialKitchen;
