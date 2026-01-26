import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  DollarSign,
  MapPin,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  FileCheck,
  Package,
  Star,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedSection, AnimatedCard } from '@/components/ui/animated';

// How It Works page uses interior/professional shots
import trailerInteriorCeiling from '@/assets/trailer-interior-ceiling.jpg';
import trailerInteriorFloor from '@/assets/trailer-interior-floor.jpg';
import trailerCafecito from '@/assets/trailer-cafecito.jpg';
import foodTruckGrilledCheese from '@/assets/food-truck-grilled-cheese.jpg';
import trailerBlack from '@/assets/trailer-black.jpg';
import trailerWhite from '@/assets/trailer-white.jpg';

const testimonials = [
  {
    name: "Marcus J.",
    role: "Food Truck Owner",
    location: "Atlanta, GA",
    text: "Sold my trailer in 2 weeks. The buyer financing made it easy for them to pay.",
  },
  {
    name: "Sarah C.",
    role: "Kitchen Host",
    location: "Houston, TX",
    text: "Love that Vendibook verifies all my renters. No more chasing documents myself.",
  },
  {
    name: "David W.",
    role: "Lot Owner",
    location: "Miami, FL",
    text: "Passive income from my parking lot. Setup took 10 minutes.",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Learn More | Vendibook - Sell, Rent & List Mobile Food Assets"
        description="Learn how to sell, rent, or list vendor lots on Vendibook. Verified accounts, secure payments, and nationwide freight."
      />
      <Header />

      <main className="flex-1">
        {/* ==================== HERO ==================== */}
        <section className="py-16 md:py-20 bg-muted/30 relative overflow-hidden">
          {/* Background image collage */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-3 h-full">
              <img src={trailerInteriorCeiling} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={trailerInteriorFloor} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={trailerCafecito} alt="" className="w-full h-full object-cover" aria-hidden="true" />
            </div>
          </div>
          
          <div className="container relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Vendibook Works
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                The secure marketplace for mobile food assets. Sell, rent, or list vendor lots with verified users and protected payments.
              </p>

              {/* Trust Badges - Simplified */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verified Users
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Secure Payments
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <Truck className="h-4 w-4 text-primary" />
                  Nationwide Freight
                </div>
              </div>

              <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                <Link to="/list">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ==================== FEATURED ASSETS GALLERY ==================== */}
        <section className="py-12 border-b border-border">
          <div className="container">
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Featured on Vendibook</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { src: trailerInteriorCeiling, alt: 'Food trailer interior ceiling' },
                { src: foodTruckGrilledCheese, alt: 'Grilled cheese food truck' },
                { src: trailerCafecito, alt: 'Coffee trailer' },
                { src: trailerBlack, alt: 'Black food trailer' },
                { src: trailerWhite, alt: 'White food trailer' },
                { src: trailerInteriorFloor, alt: 'Food trailer interior floor' },
              ].map((img, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="aspect-square rounded-xl overflow-hidden group"
                >
                  <img 
                    src={img.src} 
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== THREE OPTIONS ==================== */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Sell Card */}
              <AnimatedCard index={0}>
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-6">
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <DollarSign className="h-6 w-6 text-primary-foreground" />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Sell</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Sell food trucks, trailers, and equipment locally or nationwide.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        In-person or secure online payment
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Optional nationwide freight
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Buyer financing with Affirm/Afterpay
                      </li>
                    </ul>
                    <Button variant="dark-shine" className="w-full gap-2" asChild>
                      <Link to="/list?mode=sale">
                        Sell an Asset
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Rent Card */}
              <AnimatedCard index={1}>
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-6">
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <CalendarDays className="h-6 w-6 text-primary-foreground" />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Rent</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Monetize downtime by renting your assets to verified operators.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        We verify renter documents
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Set your own availability
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Identity-verified renters only
                      </li>
                    </ul>
                    <Button variant="dark-shine" className="w-full gap-2" asChild>
                      <Link to="/list?mode=rent">
                        Rent Out an Asset
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Vendor Lots Card */}
              <AnimatedCard index={2}>
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-6">
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <MapPin className="h-6 w-6 text-primary-foreground" />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Vendor Lots</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      List your parking lot or space for food truck vendors.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Hourly or daily booking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Define amenities & rules
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        Passive income from space
                      </li>
                    </ul>
                    <Button variant="dark-shine" className="w-full gap-2" asChild>
                      <Link to="/list">
                        List a Vendor Lot
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS - 3 STEPS ==================== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Three Simple Steps
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: 1, title: 'Create Listing', desc: 'Add photos, set your price, and describe your asset.' },
                  { step: 2, title: 'Connect with Buyers', desc: 'Verified users reach out. Review requests and approve.' },
                  { step: 3, title: 'Complete the Deal', desc: 'Get paid securely. We handle the details.' },
                ].map((item, index) => (
                  <motion.div 
                    key={item.step}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15, type: 'spring', stiffness: 100 }}
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto mb-4"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {item.step}
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== KEY FEATURES ==================== */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Why Choose Vendibook
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Verified Users</h3>
                    <p className="text-sm text-muted-foreground">
                      Identity verification reduces fraud and builds trust.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Document Review</h3>
                    <p className="text-sm text-muted-foreground">
                      We verify renter documents so you don't have to.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Secure Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Online checkout with clear records and protection.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Nationwide Freight</h3>
                    <p className="text-sm text-muted-foreground">
                      Sell to buyers across the 48 contiguous states.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== TESTIMONIALS ==================== */}
        <section className="py-16 md:py-20 bg-muted/30">
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
                {testimonials.map((testimonial, index) => (
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
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.1 + i * 0.05 }}
                            >
                              <Star className="h-3 w-3 fill-primary text-primary" />
                            </motion.div>
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

        {/* ==================== RENT OUT YOUR ASSET - VENDIBOOK ADVANTAGE ==================== */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4" />
                  The Vendibook Advantage
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Rent Out Your Asset with Confidence
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  We handle the hard work so you can focus on earning. From verified renters to automated compliance, Vendibook manages it all.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">
                <AnimatedCard index={0}>
                  <Card className="border-2 border-primary/10 h-full">
                    <CardContent className="p-6">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Identity-Verified Renters</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Every renter completes Stripe Identity verification before they can book. Know exactly who's using your asset.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Government ID verification
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Selfie matching
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Fraud detection built-in
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </AnimatedCard>

                <AnimatedCard index={1}>
                  <Card className="border-2 border-primary/10 h-full">
                    <CardContent className="p-6">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <FileCheck className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Automated Document Review</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        No more chasing paperwork. Set your requirements and we'll collect and verify documents before approval.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Business licenses
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Insurance certificates
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Health permits & more
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </AnimatedCard>

                <AnimatedCard index={2}>
                  <Card className="border-2 border-primary/10 h-full">
                    <CardContent className="p-6">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <CreditCard className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Protected Payments</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Funds are held securely and released to you 24 hours after the booking ends. Full protection against disputes.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Secure escrow payments
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          24-hour safety window
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          Optional security deposits
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </div>

              <div className="text-center">
                <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                  <Link to="/rent-my-commercial-kitchen">
                    Learn More About Renting
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FINAL CTA ==================== */}
        <section className="py-20 bg-foreground text-primary-foreground">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg opacity-90 mb-8">
                Create your first listing in minutes.
              </p>
              <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                <Link to="/list">
                  Create a Listing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
