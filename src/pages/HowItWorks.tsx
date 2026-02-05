import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  DollarSign,
  MapPin,
  CheckCircle2,
  CalendarDays,
  FileCheck,
  Package,
  Star,
  Quote,
  HelpCircle,
  Search,
  PlusCircle,
  MessageSquare,
  Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedCard } from '@/components/ui/animated';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type UserRole = 'none' | 'buyer' | 'seller';

const testimonials = [
  {
    name: "Marcus J.",
    role: "Food Truck Owner",
    location: "Atlanta, GA",
    text: "Sold my trailer in 2 weeks. The buyer financing made it easy for them to pay.",
    rating: 5,
    forRole: 'seller' as const,
  },
  {
    name: "Sarah C.",
    role: "Kitchen Host",
    location: "Houston, TX",
    text: "Love that Vendibook verifies all my renters. No more chasing documents myself.",
    rating: 5,
    forRole: 'seller' as const,
  },
  {
    name: "Elena R.",
    role: "Food Truck Buyer",
    location: "Denver, CO",
    text: "Found my dream truck and paid with Affirm. The escrow gave me peace of mind.",
    rating: 5,
    forRole: 'buyer' as const,
  },
];

const buyerFaqs = [
  {
    question: "How do I know the listing is legitimate?",
    answer: "All sellers on Vendibook complete identity verification through Stripe. You'll see a verified badge on their profile.",
  },
  {
    question: "How do payments work when I buy?",
    answer: "You can pay with card, Affirm, or Afterpay. Funds are held in escrow and only released to the seller after you confirm receipt.",
  },
  {
    question: "What if I'm not satisfied with my purchase?",
    answer: "Contact us within 24 hours of receiving your asset. We'll help mediate and can hold funds until the issue is resolved.",
  },
  {
    question: "Can I inspect before buying?",
    answer: "Yes! You can message sellers directly to schedule an in-person inspection before committing to purchase.",
  },
];

const sellerFaqs = [
  {
    question: "How much does it cost to list?",
    answer: "Creating a listing is completely free. We only charge a small platform fee when you make a sale or complete a rental booking.",
  },
  {
    question: "How long does it take to get verified?",
    answer: "Identity verification typically takes just 2-3 minutes using our Stripe-powered verification system. You'll need a valid government ID.",
  },
  {
    question: "How do I get paid?",
    answer: "Payments are deposited directly to your bank account. For sales, funds release after buyer confirmation. For rentals, 24 hours after the booking ends.",
  },
  {
    question: "What documents do renters need?",
    answer: "You choose the requirements: business licenses, insurance certificates, health permits, and more. We collect and verify them before approval.",
  },
];

const buyerSteps = [
  {
    step: 1,
    icon: Search,
    title: "Find Your Asset",
    description: "Browse verified food trucks, trailers, commercial kitchens, and Vendor Spaces nationwide.",
  },
  {
    step: 2,
    icon: MessageSquare,
    title: "Verify & Connect",
    description: "All sellers are identity-verified. Message them to ask questions or schedule an inspection.",
  },
  {
    step: 3,
    icon: CreditCard,
    title: "Secure Checkout",
    description: "Pay safely with card, Affirm, or Afterpay. Funds are held in escrow until you confirm.",
  },
  {
    step: 4,
    icon: Handshake,
    title: "Complete Transaction",
    description: "Pickup, delivery, or nationwide freight. Confirm when satisfied to release payment.",
  },
];

const sellerPathOptions = [
  {
    icon: DollarSign,
    title: "Sell a Food Truck or Trailer",
    description: "List your vehicle for sale with secure payments and optional buyer financing.",
    link: "/sell-my-food-truck",
    features: ["Buyer financing with Affirm/Afterpay", "Optional nationwide freight", "Secure escrow payments"],
  },
  {
    icon: CalendarDays,
    title: "Rent Out a Commercial Kitchen",
    description: "Monetize your kitchen space with verified, document-compliant renters.",
    link: "/rent-my-commercial-kitchen",
    features: ["Identity-verified renters", "Automated document collection", "Flexible scheduling"],
  },
  {
    icon: MapPin,
    title: "List a Vendor Space",
    description: "Turn your parking lot or space into passive income for food vendors.",
    link: "/vendor-spaces",
    features: ["Hourly or daily bookings", "Define amenities & rules", "Zero hassle setup"],
  },
];

const HowItWorks = () => {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    const urlRole = searchParams.get('role');
    return (urlRole === 'buyer' || urlRole === 'seller') ? urlRole : 'none';
  });

  // Sync URL with role selection
  useEffect(() => {
    if (selectedRole === 'none') {
      searchParams.delete('role');
    } else {
      searchParams.set('role', selectedRole);
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedRole, searchParams, setSearchParams]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Smooth scroll to content
    setTimeout(() => {
      document.getElementById('role-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleBackToSelection = () => {
    setSelectedRole('none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const relevantTestimonials = testimonials.filter(t => 
    selectedRole === 'none' || t.forRole === selectedRole
  ).slice(0, 3);

  const relevantFaqs = selectedRole === 'buyer' ? buyerFaqs : sellerFaqs;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="How It Works | Vendibook - Buy, Sell & Rent Mobile Food Assets"
        description="Learn how to buy, sell, or rent food trucks, trailers, commercial kitchens, and Vendor Spaces on Vendibook."
      />
      <Header />

      <main className="flex-1">
        {/* ==================== ROLE SELECTION HERO ==================== */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
                What would you like to do?
              </h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Choose your path and we'll show you exactly how it works.
              </p>

              {/* Role Selection Cards */}
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Buyer/Renter Card */}
                <motion.button
                  onClick={() => handleRoleSelect('buyer')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    selectedRole === 'buyer'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  whileHover={shouldReduceMotion ? {} : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    selectedRole === 'buyer' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <Search className={`h-6 w-6 ${selectedRole === 'buyer' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Buy or Rent</h2>
                  <p className="text-sm text-muted-foreground">
                    Find food trucks, trailers, kitchens, and Vendor Spaces to purchase or rent.
                  </p>
                </motion.button>

                {/* Seller/Host Card */}
                <motion.button
                  onClick={() => handleRoleSelect('seller')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    selectedRole === 'seller'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  whileHover={shouldReduceMotion ? {} : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    selectedRole === 'seller' ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <PlusCircle className={`h-6 w-6 ${selectedRole === 'seller' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Sell or Host</h2>
                  <p className="text-sm text-muted-foreground">
                    Sell your assets, rent out equipment, or list your space for vendors.
                  </p>
                </motion.button>
              </div>

              {/* Trust Badges - Compact */}
              <motion.div 
                className="flex flex-wrap justify-center gap-4 mt-10 text-sm text-muted-foreground"
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified Users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  <span>Nationwide Shipping</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ==================== CONDITIONAL CONTENT ==================== */}
        {selectedRole !== 'none' && (
          <div id="role-content">
            {/* Back button */}
            <div className="container pt-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Choose a different path
              </Button>
            </div>

            {/* ==================== BUYER WALKTHROUGH ==================== */}
            {selectedRole === 'buyer' && (
              <section className="py-12 md:py-16">
                <div className="container">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        How Buying & Renting Works
                      </h2>
                      <p className="text-muted-foreground max-w-xl mx-auto">
                        Find verified listings, pay securely, and complete your transaction with confidence.
                      </p>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                      {buyerSteps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <motion.div
                            key={step.step}
                            className="relative"
                            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="h-full border-2 border-border hover:border-primary/30 transition-colors">
                              <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                                    {step.step}
                                  </div>
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                      <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                        <Link to="/search">
                          Start Browsing
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ==================== SELLER PATH OPTIONS ==================== */}
            {selectedRole === 'seller' && (
              <section className="py-12 md:py-16">
                <div className="container">
                  <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        Choose Your Listing Type
                      </h2>
                      <p className="text-muted-foreground max-w-xl mx-auto">
                        Each path has a dedicated guide to help you get started quickly.
                      </p>
                    </div>

                    {/* Seller Options Grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                      {sellerPathOptions.map((option, index) => {
                        const Icon = option.icon;
                        return (
                          <AnimatedCard key={option.title} index={index}>
                            <Card className="border-2 border-border hover:border-primary/40 transition-colors h-full">
                              <CardContent className="p-6">
                                <motion.div 
                                  className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mb-4"
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                >
                                  <Icon className="h-6 w-6 text-background" />
                                </motion.div>
                                <h3 className="text-lg font-bold text-foreground mb-2">{option.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                                  {option.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                                <Button variant="dark-shine" className="w-full gap-2" asChild>
                                  <Link to={option.link}>
                                    Learn More
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>
                          </AnimatedCard>
                        );
                      })}
                    </div>

                    {/* Quick Start CTA */}
                    <div className="text-center mt-10">
                      <p className="text-sm text-muted-foreground mb-3">Ready to jump in?</p>
                      <Button size="lg" variant="outline" className="gap-2" asChild>
                        <Link to="/list">
                          Create Free Listing Now
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ==================== WHY VENDIBOOK (Shared) ==================== */}
            <section className="py-12 md:py-16 bg-muted/30">
              <div className="container">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                    Why Choose Vendibook
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Verified Users</h3>
                        <p className="text-sm text-muted-foreground">
                          Identity verification reduces fraud and builds trust.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                        <FileCheck className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Document Review</h3>
                        <p className="text-sm text-muted-foreground">
                          We verify renter documents so you don't have to.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Secure Payments</h3>
                        <p className="text-sm text-muted-foreground">
                          Funds held in escrow until transaction is complete.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Nationwide Freight</h3>
                        <p className="text-sm text-muted-foreground">
                          Buy or sell to anyone in the 48 contiguous states.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== TESTIMONIALS (Filtered) ==================== */}
            <section className="py-12 md:py-16">
              <div className="container">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                      <Star className="h-4 w-4 fill-primary" />
                      Trusted by Entrepreneurs
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      What Users Are Saying
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {relevantTestimonials.map((testimonial, index) => (
                      <AnimatedCard key={index} index={index}>
                        <Card className="border-border/50 h-full">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-9 w-9 border-2 border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground text-sm">{testimonial.name}</span>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                </div>
                                <p className="text-xs text-muted-foreground">{testimonial.role} • {testimonial.location}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-0.5 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                              ))}
                            </div>
                            
                            <div className="relative">
                              <Quote className="absolute -top-0.5 -left-0.5 h-5 w-5 text-primary/10" />
                              <p className="text-muted-foreground text-sm leading-relaxed pl-2">
                                {testimonial.text}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== FAQ (Role-specific) ==================== */}
            <section className="py-12 md:py-16 bg-muted/30">
              <div className="container">
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                      <HelpCircle className="h-4 w-4" />
                      {selectedRole === 'buyer' ? 'Buyer FAQs' : 'Seller FAQs'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      Frequently Asked Questions
                    </h2>
                  </div>

                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {relevantFaqs.map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <AccordionItem 
                          value={`item-${index}`} 
                          className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-primary/30 transition-colors"
                        >
                          <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    ))}
                  </Accordion>

                  <motion.div 
                    className="text-center mt-8"
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    <p className="text-sm text-muted-foreground mb-3">
                      Still have questions?
                    </p>
                    <Button variant="outline" className="gap-2" asChild>
                      <Link to="/help">
                        Visit Help Center
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* ==================== FINAL CTA ==================== */}
            <section className="py-16 md:py-20 bg-gradient-to-br from-foreground via-foreground to-primary/90 text-primary-foreground">
              <div className="container">
                <motion.div 
                  className="max-w-2xl mx-auto text-center"
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    {selectedRole === 'buyer' ? 'Find Your Next Asset' : 'Start Earning Today'}
                  </h2>
                  <p className="text-lg opacity-90 mb-8">
                    {selectedRole === 'buyer' 
                      ? 'Browse verified listings from trusted sellers across the country.'
                      : 'Create your first listing in under 5 minutes. No monthly fees.'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button 
                      size="lg" 
                      className="gap-2 px-8 h-12 text-base bg-white text-foreground hover:bg-white/90"
                      asChild
                    >
                      <Link to={selectedRole === 'buyer' ? '/search' : '/list'}>
                        {selectedRole === 'buyer' ? 'Browse Listings' : 'Create Free Listing'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="gap-2 px-8 h-12 text-base border-white/30 text-white hover:bg-white/10"
                      asChild
                    >
                      <Link to="/contact">
                        Talk to Us
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Trust indicators */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm opacity-80">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {selectedRole === 'buyer' ? 'All sellers verified' : 'No credit card required'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Secure payments
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {selectedRole === 'buyer' ? 'Escrow protection' : 'Setup in minutes'}
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== PLACEHOLDER WHEN NO ROLE SELECTED ==================== */}
        {selectedRole === 'none' && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container">
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-muted-foreground">
                  Select an option above to see how Vendibook works for you.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
