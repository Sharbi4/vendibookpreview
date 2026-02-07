import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  UserCheck, 
  FileText,
  Lock,
  Store,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// --- Modular Components ---

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            The Marketplace for Food Assets
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            A safer way to{' '}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">
              do business in food.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Whether you're buying a food truck, renting a commercial kitchen, or selling your equipment — Vendibook handles the verification, payments, and paperwork.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const PlatformPillars = () => {
  const shouldReduceMotion = useReducedMotion();
  
  const pillars = [
    {
      icon: ShieldCheck,
      title: "Identity Verified",
      desc: "Every buyer and seller is verified via Stripe Identity before they can transact. No anonymous actors."
    },
    {
      icon: Lock,
      title: "Escrow Protection",
      desc: "Payments are held securely in escrow and only released when the transaction is completed satisfactorily."
    },
    {
      icon: FileText,
      title: "Compliance Engine",
      desc: "For rentals, we automatically verify liability insurance and health permits before bookings start."
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              className="text-center"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary mx-auto mb-5 flex items-center justify-center">
                <pillar.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{pillar.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const WorkflowToggle = () => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const shouldReduceMotion = useReducedMotion();

  const steps = {
    buy: [
      { title: 'Search & Verify', desc: 'Browse verified listings. Check Seller badges and reviews.', icon: Search },
      { title: 'Secure Offer', desc: 'Make an offer or book dates. Funds are held in escrow.', icon: CreditCard },
      { title: 'Inspection/Use', desc: 'Inspect the truck or start your kitchen shift.', icon: UserCheck },
      { title: 'Release Funds', desc: 'Confirm you are happy. Seller gets paid.', icon: CheckCircle2 },
    ],
    sell: [
      { title: 'List Asset', desc: 'Create a listing for your truck or kitchen slots.', icon: Store },
      { title: 'Get Requests', desc: 'Receive inquiries from verified buyers/renters.', icon: Search },
      { title: 'Approve & Earn', desc: 'Accept bookings. Payment is secured upfront.', icon: CheckCircle2 },
      { title: 'Automatic Payout', desc: 'Funds transferred to your bank after completion.', icon: DollarSign },
    ]
  };

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Header with Toggle */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              How it works
            </h2>
            
            {/* Segmented Control */}
            <div className="inline-flex items-center p-1.5 bg-muted rounded-full">
              <button
                onClick={() => setMode('buy')}
                className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all ${
                  mode === 'buy' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Buying & Renting
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all ${
                  mode === 'sell' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Selling & Hosting
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5 bg-border" aria-hidden="true" />

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid sm:grid-cols-2 md:grid-cols-4 gap-8"
              >
                {steps[mode].map((step, i) => (
                  <div key={step.title} className="relative text-center">
                    <div className="relative z-10 mx-auto mb-4">
                      <step.icon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold mx-auto">
                        {i + 1}
                      </div>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const FaqSection = () => {
  const faqs = [
    { q: "Is my money safe?", a: "Yes. We use Stripe Connect for all transactions. For sales, money is held in escrow and only released to the seller once you confirm you have received the item." },
    { q: "How do you verify users?", a: "We require government ID verification via Stripe Identity for all sellers and kitchen hosts. Renters must also provide valid insurance documents." },
    { q: "What are the fees?", a: "Listing is free. We charge a service fee (typically 10-12.9%) only when a transaction is successfully completed." },
    { q: "Can I inspect a food truck before buying?", a: "Absolutely. You can message the seller to arrange an in-person viewing. We recommend inspecting before releasing funds." }
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Common Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

const FinalCta = () => (
  <section className="py-20 md:py-28 bg-foreground">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-background mb-4">
          Ready to get started?
        </h2>
        <p className="text-lg text-background/70 mb-8">
          Join thousands of food entrepreneurs trading safely on Vendibook.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg">
            <Link to="/search">
              Browse Listings
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-background/20 text-background hover:bg-background/10 hover:text-background">
            <Link to="/list">
              Create a Listing
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="How It Works | Vendibook - Buy, Sell & Rent Mobile Food Assets"
        description="Learn how to safely buy, sell, or rent food trucks, trailers, commercial kitchens, and vendor spaces on Vendibook."
      />

      <Header />
      
      <main className="flex-1">
        <HeroSection />
        <PlatformPillars />
        <WorkflowToggle />
        <FaqSection />
        <FinalCta />
      </main>
      
      <Footer />
    </div>
  );
};

export default HowItWorks;
