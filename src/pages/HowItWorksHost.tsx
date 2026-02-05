import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  ArrowRight, 
  Camera, 
  Calendar, 
  DollarSign, 
  Shield, 
  CheckCircle2,
  Truck,
  Users,
  Star,
  Clock,
  Zap,
  Play,
  ChevronDown,
  TrendingUp,
  BadgeCheck,
  Sparkles,
  MessageSquare,
  CreditCard,
  Building2,
  ChefHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Interactive earnings calculator component
const EarningsCalculator = () => {
  const [assetType, setAssetType] = useState<'truck' | 'kitchen' | 'trailer'>('truck');
  const [daysPerMonth, setDaysPerMonth] = useState([12]);
  const [dailyRate, setDailyRate] = useState([250]);

  const assetRates = {
    truck: { min: 150, max: 500, default: 250 },
    kitchen: { min: 200, max: 800, default: 350 },
    trailer: { min: 100, max: 400, default: 175 },
  };

  const monthlyEarnings = daysPerMonth[0] * dailyRate[0];
  const yearlyEarnings = monthlyEarnings * 12;

  return (
    <div className="bg-gradient-to-br from-foreground to-foreground/95 text-background rounded-3xl p-6 md:p-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Earnings Calculator</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-6">See your earning potential</h3>

        {/* Asset type selector */}
        <div className="mb-8">
          <label className="text-sm text-background/60 mb-3 block">What are you renting?</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'truck', label: 'Food Truck', icon: Truck },
              { id: 'kitchen', label: 'Kitchen', icon: Building2 },
              { id: 'trailer', label: 'Trailer', icon: ChefHat },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setAssetType(type.id as 'truck' | 'kitchen' | 'trailer');
                  setDailyRate([assetRates[type.id as keyof typeof assetRates].default]);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  assetType === type.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/5 border-background/20 hover:bg-background/10'
                }`}
              >
                <type.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Daily rate slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-background/60">Daily rate</label>
            <span className="text-2xl font-bold text-primary">${dailyRate[0]}</span>
          </div>
          <Slider
            value={dailyRate}
            onValueChange={setDailyRate}
            min={assetRates[assetType].min}
            max={assetRates[assetType].max}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-background/40 mt-2">
            <span>${assetRates[assetType].min}</span>
            <span>${assetRates[assetType].max}</span>
          </div>
        </div>

        {/* Days per month slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-background/60">Rental days per month</label>
            <span className="text-2xl font-bold">{daysPerMonth[0]} days</span>
          </div>
          <Slider
            value={daysPerMonth}
            onValueChange={setDaysPerMonth}
            min={4}
            max={25}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-background/40 mt-2">
            <span>4 days</span>
            <span>25 days</span>
          </div>
        </div>

        {/* Results */}
        <div className="bg-background/5 rounded-2xl p-6 border border-background/10">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-background/60 mb-1">Monthly earnings</p>
              <motion.p 
                key={monthlyEarnings}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl md:text-4xl font-bold text-primary"
              >
                ${monthlyEarnings.toLocaleString()}
              </motion.p>
            </div>
            <div>
              <p className="text-sm text-background/60 mb-1">Yearly potential</p>
              <motion.p 
                key={yearlyEarnings}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl md:text-4xl font-bold"
              >
                ${yearlyEarnings.toLocaleString()}
              </motion.p>
            </div>
          </div>
        </div>

        <Button size="lg" className="w-full mt-6 rounded-xl h-14 text-base" asChild>
          <Link to="/list">
            Start Earning Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

// Animated step component
const AnimatedStep = ({ 
  step, 
  title, 
  description, 
  icon: Icon, 
  isActive, 
  onClick 
}: { 
  step: number; 
  title: string; 
  description: string; 
  icon: React.ElementType; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
        isActive 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50 bg-background'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
              Step {step}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <AnimatePresence>
            {isActive && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-muted-foreground"
              >
                {description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isActive ? 'rotate-180' : ''}`} />
      </div>
    </motion.button>
  );
};

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return { count, ref };
};

// Stats component
const AnimatedStat = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
};

const steps = [
  {
    step: 1,
    title: 'Create your listing in minutes',
    description: 'Upload photos, write a description, set your daily rates and availability. Our AI helps you optimize your listing for maximum bookings.',
    icon: Camera,
  },
  {
    step: 2,
    title: 'Get booking requests',
    description: 'Verified renters will find your listing and send booking requests. You control who rents - review profiles and approve with one tap.',
    icon: MessageSquare,
  },
  {
    step: 3,
    title: 'Manage your calendar',
    description: 'Block dates, set buffer times between rentals, and sync with your existing schedule. Our smart calendar prevents double-bookings.',
    icon: Calendar,
  },
  {
    step: 4,
    title: 'Get paid instantly',
    description: 'Payments go directly to your bank account within 24-48 hours after each rental. No chasing invoices, no payment hassles.',
    icon: CreditCard,
  },
];

const benefits = [
  { 
    icon: Shield, 
    title: 'Verified renters only', 
    description: 'Every renter goes through ID verification before they can book.',
    stat: '100%'
  },
  { 
    icon: Zap, 
    title: 'Fast payouts', 
    description: 'Get paid directly to your bank account within 24-48 hours.',
    stat: '24hr'
  },
  { 
    icon: Calendar, 
    title: 'Smart scheduling', 
    description: 'Built-in calendar management with buffer times and sync.',
    stat: '0'
  },
  { 
    icon: TrendingUp, 
    title: 'Price optimization', 
    description: 'AI-powered pricing suggestions to maximize your earnings.',
    stat: '+32%'
  },
];

const faqs = [
  {
    question: "How much does it cost to list?",
    answer: "Listing is completely free. We only charge a small platform fee when you successfully complete a rental. No upfront costs, no monthly fees."
  },
  {
    question: "How do I get paid?",
    answer: "Payments are processed through Stripe directly to your bank account. You'll receive your earnings within 24-48 hours after each rental is completed."
  },
  {
    question: "What if a renter damages my equipment?",
    answer: "All renters are required to verify their identity and agree to our terms. We also encourage hosts to collect a security deposit through our platform for added protection."
  },
  {
    question: "Can I choose who rents my equipment?",
    answer: "Absolutely. Unless you enable Instant Book, you have full control to review each booking request and approve or decline based on the renter's profile and experience."
  },
  {
    question: "How long does it take to get my first booking?",
    answer: "Most hosts with complete listings and competitive pricing receive their first booking inquiry within 1-2 weeks. Listings with professional photos book 3x faster."
  },
  {
    question: "Can I list multiple assets?",
    answer: "Yes! Many of our top hosts manage multiple listings. You can list as many food trucks, trailers, or commercial kitchens as you have available."
  },
];

const testimonials = [
  {
    name: "Marcus J.",
    role: "Food Truck Owner, Houston",
    quote: "I was skeptical at first, but Vendibook has been a game-changer. My truck now earns money on days I don't use it.",
    earnings: "$3,200/mo",
    avatar: "M"
  },
  {
    name: "Sarah T.",
    role: "Commercial Kitchen Owner, LA",
    quote: "The booking system is seamless. I've tripled my kitchen's utilization and the verified renter system gives me peace of mind.",
    earnings: "$8,500/mo",
    avatar: "S"
  },
  {
    name: "David K.",
    role: "Fleet Owner, Dallas",
    quote: "Managing 4 food trucks used to be chaos. Now everything is in one dashboard. The earnings calculator was spot-on.",
    earnings: "$12,000/mo",
    avatar: "D"
  },
];

const HowItWorksHost = () => {
  const [activeStep, setActiveStep] = useState(1);

  // Auto-advance steps every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container max-w-6xl relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                  <Truck className="h-4 w-4" />
                  Become a Host
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                  Your idle assets are{' '}
                  <span className="text-primary">losing you money</span>
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Join hundreds of food truck and kitchen owners earning extra income by renting their assets on Vendibook. List for free, get paid fast.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button size="lg" className="rounded-xl h-14 text-base px-8" asChild>
                    <Link to="/list">
                      Start Listing — It's Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-xl h-14 text-base" asChild>
                    <Link to="/how-it-works-seller">
                      I Want to Sell Instead
                    </Link>
                  </Button>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Free to list</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Pay only when you earn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>24-48hr payouts</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <EarningsCalculator />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y border-border bg-muted/30">
          <div className="container max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <AnimatedStat value={2500} suffix="+" label="Active hosts" />
              <AnimatedStat value={98} suffix="%" label="Payout rate" />
              <AnimatedStat value={24} suffix="hr" label="Avg payout time" />
              <AnimatedStat value={4.9} suffix="/5" label="Host rating" />
            </div>
          </div>
        </section>

        {/* Interactive How It Works */}
        <section className="py-20 md:py-28">
          <div className="container max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="mb-4">How it works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Four steps to your first payout
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Getting started is simple. Most hosts complete setup in under 10 minutes and receive their first booking within a week.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step) => (
                  <AnimatedStep
                    key={step.step}
                    {...step}
                    isActive={activeStep === step.step}
                    onClick={() => setActiveStep(step.step)}
                  />
                ))}
              </div>

              {/* Visual */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 md:p-12 border border-primary/20">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-center"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6">
                        {activeStep === 1 && <Camera className="h-10 w-10" />}
                        {activeStep === 2 && <MessageSquare className="h-10 w-10" />}
                        {activeStep === 3 && <Calendar className="h-10 w-10" />}
                        {activeStep === 4 && <CreditCard className="h-10 w-10" />}
                      </div>
                      <h3 className="text-2xl font-bold mb-4">
                        {steps[activeStep - 1].title}
                      </h3>
                      <p className="text-muted-foreground text-lg">
                        {steps[activeStep - 1].description}
                      </p>
                      
                      {/* Progress dots */}
                      <div className="flex justify-center gap-2 mt-8">
                        {[1, 2, 3, 4].map((dot) => (
                          <button
                            key={dot}
                            onClick={() => setActiveStep(dot)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              dot === activeStep 
                                ? 'bg-primary w-8' 
                                : 'bg-primary/30 hover:bg-primary/50'
                            }`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 md:py-28 bg-foreground text-background">
          <div className="container max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="secondary" className="mb-4 bg-background/10 text-background border-0">
                Why Vendibook
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for hosts who value their time
              </h2>
              <p className="text-lg text-background/60 max-w-2xl mx-auto">
                We handle the complex stuff so you can focus on what matters — running your business.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="h-full bg-background/5 border-background/10 hover:bg-background/10 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                          <benefit.icon className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-bold text-primary">{benefit.stat}</span>
                      </div>
                      <h3 className="font-semibold text-background mb-2">{benefit.title}</h3>
                      <p className="text-sm text-background/60">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28">
          <div className="container max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="mb-4">Host stories</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Hear from hosts like you
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">
                            {testimonial.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{testimonial.name}</p>
                            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                          {testimonial.earnings}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="outline" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Common questions
              </h2>
            </motion.div>

            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-border">
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28">
          <div className="container max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl p-10 md:p-16 text-center text-primary-foreground relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <Badge className="bg-white/20 text-white border-0 mb-6">
                  Join 2,500+ hosts
                </Badge>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Ready to start earning?
                </h2>
                <p className="text-xl opacity-90 mb-8 max-w-xl mx-auto">
                  List your first asset today. It's free, takes 5 minutes, and you could have your first booking this week.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" className="rounded-xl h-14 text-base px-8" asChild>
                    <Link to="/list">
                      Create Your Listing
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="ghost" 
                    className="rounded-xl h-14 text-base text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to="/help">
                      Talk to Us
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksHost;
