import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  ChefHat, 
  DollarSign, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Lock,
  QrCode,
  Smartphone,
  Share2,
  LayoutGrid,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// --- Animated Components ---

const QrScanAnimation = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <div className="relative w-56 h-[420px] mx-auto">
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-foreground rounded-[2.5rem] shadow-2xl p-2">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-5 bg-foreground rounded-full z-20" />
        <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden relative">
          
          {/* Listing Page Header on Phone */}
          <div className="p-4 space-y-3">
            <div className="h-24 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>

          {/* The QR Code Overlay */}
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-32 h-32 border-4 border-primary rounded-2xl p-3 bg-card">
              <QrCode className="w-full h-full text-foreground" />
              {/* Scanning Line */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-primary/80 rounded-full"
                initial={{ top: 0 }}
                animate={shouldReduceMotion ? {} : { top: ['10%', '90%', '10%'] }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </div>
          </div>

          {/* Success Notification */}
          <motion.div
            className="absolute bottom-6 left-4 right-4 bg-card border border-border rounded-xl p-3 shadow-lg flex items-center gap-3"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.4 }}
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Listing Found</p>
              <p className="text-xs text-muted-foreground">Redirecting to booking...</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// --- Modular Sections ---

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center bg-background overflow-hidden">
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
            Monetize your{' '}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">
              extra space.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one operating system to rent out kitchen stations, verify insurance, and manage bookings without the headache.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="dark-shine" className="h-14 px-8 text-lg">
              <Link to="/list?category=ghost_kitchen">
                Start Listing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-2">
              <Link to="/how-it-works">
                How It Works
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const DigitalStorefrontSection = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Text Content */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="mb-8">
              <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-primary/30 bg-primary/5 text-primary">
                <Smartphone className="h-3.5 w-3.5 mr-1.5 inline" />
                New Feature
              </Badge>

              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                Your kitchen,
                <br />
                <span className="text-muted-foreground">on demand.</span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed">
                We provide you with a professional Digital Storefront and physical QR Code Signage.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 p-5 bg-card border-2 border-border rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Share2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Shareable Booking Link</h3>
                  <p className="text-sm text-muted-foreground">Send one professional link to prospective tenants via text or email. They view your rates, availability, and book instantly.</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-5 bg-card border-2 border-border rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Walk-in Lead Capture</h3>
                  <p className="text-sm text-muted-foreground">Put our QR signage in your window. Walk-ins scan, verify their identity, and request a slot without interrupting your staff.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Animation */}
          <motion.div
            className="flex justify-center"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <QrScanAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MultiSlotFeature = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Slots Visual */}
          <motion.div
            className="order-2 lg:order-1"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className={`p-4 rounded-2xl border-2 ${i < 3 ? 'bg-muted/50 border-border' : 'bg-primary/5 border-primary/30'}`}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-foreground text-sm">Station {i}</span>
                    <Badge variant={i < 3 ? "secondary" : "default"} className="text-xs">
                      {i < 3 ? 'Booked' : 'Open'}
                    </Badge>
                  </div>
                  <div className="w-full h-16 bg-muted rounded-xl flex items-center justify-center">
                    <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {i < 3 ? 'Occupied by: Taco Bros' : 'Available for rent'}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Text Content */}
          <motion.div
            className="order-1 lg:order-2"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-600">
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5 inline" />
              Inventory Management
            </Badge>
            
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Rent out specific slots, not just the whole room.
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Most booking tools assume you are renting the entire building. Vendibook is built for <strong className="text-foreground">Shared Spaces</strong>.
            </p>
            
            <ul className="space-y-3">
              {[
                "List individual stations (e.g., 'Prep Table A', 'Hot Line', 'Parking Spot 1').",
                "Set different prices for different slots.",
                "Prevent double-bookings automatically.",
                "Manage hourly, daily, or monthly schedules per slot."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ProtectionSection = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container max-w-5xl">
        <motion.div 
          className="text-center mb-16"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 px-3 py-1.5 text-xs font-medium border-green-500/30 bg-green-500/5 text-green-600">
            <Shield className="h-3.5 w-3.5 mr-1.5 inline" />
            Host Protection
          </Badge>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Get the information you need
            <br />
            <span className="text-muted-foreground">to protect yourself.</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop chasing PDF attachments. Our system creates a "Compliance Gate" that renters must pass before they can book.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: "Insurance Collection",
              desc: "We collect Certificate of Insurance (COI) documents and verify expiration dates automatically."
            },
            {
              icon: Shield,
              title: "Health Permits",
              desc: "Verify Food Manager cards and ServSafe certifications to ensure safe handling in your facility."
            },
            {
              icon: Lock,
              title: "Identity Verification",
              desc: "Every renter must verify their government ID via Stripe Identity before their first booking."
            }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="p-6 bg-card border-2 border-border rounded-2xl text-center"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FaqSection = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container max-w-3xl">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
        Common Questions
      </h2>
      <Accordion type="single" collapsible className="space-y-4">
        {[
          {
            q: "Can I review renters before they book?",
            a: "Yes. Even with 'Instant Book' off, you have full control. You can review their profile, documents, and message them before accepting any request."
          },
          {
            q: "How do I get paid?",
            a: "We use Stripe Connect. Renters pay upfront when they book. Funds are held in escrow and released directly to your bank account 24 hours after the booking begins."
          },
          {
            q: "What if I have multiple stations?",
            a: "Our 'Multi-Slot' feature allows you to list one kitchen address but define capacity (e.g., '4 Slots'). This lets up to 4 different renters book the same time block."
          },
          {
            q: "Does Vendibook provide insurance?",
            a: "We are a marketplace, not an insurer. However, we strictly enforce your requirement for renters to carry their own General Liability policies and upload proof before booking."
          }
        ].map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-2 border-border rounded-xl px-6 bg-card">
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

const FinalCta = () => (
  <section className="py-16 md:py-20 bg-foreground">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-background mb-4">
          Ready to professionalize your rentals?
        </h2>
        <p className="text-lg text-background/70 mb-8">
          Create your digital storefront today. It takes less than 10 minutes to get set up and compliant.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg">
            <Link to="/list?category=ghost_kitchen">
              Create Free Profile
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-background/50">
          No credit card required to list • 12.9% fee only on successful bookings
        </p>
      </div>
    </div>
  </section>
);

// --- Main Page Component ---

const RentMyCommercialKitchen = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Can I review renters before they book?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes. Even with 'Instant Book' off, you have full control. You can review their profile, documents, and message them before accepting any request."
        }
      },
      {
        '@type': 'Question',
        name: 'How do I get paid?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "We use Stripe Connect. Renters pay upfront when they book. Funds are held in escrow and released directly to your bank account 24 hours after the booking begins."
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
        <HeroSection />
        <DigitalStorefrontSection />
        <MultiSlotFeature />
        <ProtectionSection />
        <FaqSection />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
};

export default RentMyCommercialKitchen;
