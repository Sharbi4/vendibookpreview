import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Calculator, 
  Sparkles, 
  Camera, 
  BadgeCheck, 
  CheckCircle2,
  Truck,
  Users,
  CreditCard,
  Package,
  LayoutDashboard,
  Percent,
  Info,
  ArrowRight,
  ChevronRight,
  FileCheck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import affirmLogo from '@/assets/affirm-logo.png';
import afterpayLogo from '@/assets/afterpay-logo.jpg';

// Food truck photos - Sell page uses wedding/event themed trailers
import trailerWeddingFlowers from '@/assets/trailer-wedding-flowers.jpg';
import trailerCreamParty from '@/assets/trailer-cream-party.jpg';
import trailerPinkVintage from '@/assets/trailer-pink-vintage.jpg';

const SellMyFoodTruck = () => {
  // FAQ data for schema and accordion
  const faqs = [
    {
      question: "How do I sell my food truck on Vendibook?",
      answer: "Create a for-sale listing, add photos and details, and publish. You'll manage inquiries and confirmations from your dashboard."
    },
    {
      question: "How do I know what to price it at?",
      answer: "Start with the Pricing Calculator for a quick estimate, then use PricePilot for AI-based comps and a recommended range. Update your price anytime."
    },
    {
      question: "What happens after the buyer checks out?",
      answer: "You'll see the sale in your dashboard and confirm it to lock in next steps. Then you'll coordinate pickup or freight based on what was selected."
    },
    {
      question: "Can I sell a food trailer or equipment too?",
      answer: "Yes. List trailers, trucks, kitchens, equipment, and more — all in one marketplace."
    },
    {
      question: "Do you offer shipping or freight?",
      answer: "Yes. We offer nationwide freight coordination across the 48 contiguous U.S. states. Sellers can enable freight on their listings, and buyers can get an instant estimate at checkout."
    },
    {
      question: "Can I get a notarized sale receipt?",
      answer: "Yes. As an optional add-on, you can use Proof Notary to notarize your sale receipt remotely and online. This adds an extra layer of legal protection for both parties."
    },
    {
      question: "How do payouts work?",
      answer: "Payments are handled securely online. Payout timing depends on confirmation and the transaction flow shown in your dashboard."
    },
    {
      question: "What if there's a dispute?",
      answer: "Our support team helps document the issue and follow the dispute process so both sides have a clear path to resolution."
    }
  ];

  // Generate FAQ schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://vendibook.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Sell My Food Truck",
        "item": "https://vendibook.com/sell-my-food-truck"
      }
    ]
  };

  // HowTo schema for selling process
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Sell Your Food Truck on Vendibook",
    "description": "A step-by-step guide to selling your food truck, trailer, or commercial kitchen equipment on Vendibook's marketplace.",
    "totalTime": "PT30M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Create your listing",
        "text": "Add photos, specs, equipment, and your terms to create a compelling listing.",
        "url": "https://vendibook.com/list?mode=sale"
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Get verified",
        "text": "Complete identity verification to build trust with buyers and help them move faster.",
        "url": "https://vendibook.com/verify-identity"
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Confirm the sale and handoff",
        "text": "When a buyer checks out, confirm the sale in your dashboard and coordinate pickup or freight.",
        "url": "https://vendibook.com/dashboard"
      }
    ]
  };

  // Service schema for better rich results
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Food Truck Sales Marketplace",
    "description": "Sell your food truck, trailer, or commercial kitchen with verified buyers, secure checkout, and transparent fees.",
    "provider": {
      "@type": "Organization",
      "name": "Vendibook",
      "url": "https://vendibook.com"
    },
    "serviceType": "Marketplace",
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "For Sale Listings",
      "itemListElement": [
        {
          "@type": "OfferCatalog",
          "name": "Food Trucks for Sale",
          "itemListElement": []
        },
        {
          "@type": "OfferCatalog",
          "name": "Food Trailers for Sale",
          "itemListElement": []
        },
        {
          "@type": "OfferCatalog",
          "name": "Ghost Kitchens for Sale",
          "itemListElement": []
        }
      ]
    }
  };

  const benefits = [
    {
      icon: Truck,
      title: "Built for mobile food assets",
      description: "Trucks, trailers, kitchens, equipment, and Vendor Spaces."
    },
    {
      icon: Users,
      title: "Verified buyers",
      description: "Reduce tire-kickers and spam."
    },
    {
      icon: CreditCard,
      title: "Secure checkout",
      description: "Clear steps and protection for both sides."
    },
    {
      icon: Package,
      title: "Nationwide freight",
      description: "Ship across the 48 contiguous U.S. states with coordinated freight."
    },
    {
      icon: FileCheck,
      title: "Notarized receipts",
      description: "Optional Proof Notary add-on for remote, online notarization."
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard control",
      description: "Manage inquiries, documents, and confirmations."
    },
    {
      icon: Percent,
      title: "Flexible payment options",
      description: "Pay in person for free, or use our secure platform (12.9%) for extra protection."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Create your listing",
      description: "Add photos, specs, equipment, and your terms."
    },
    {
      number: "2",
      title: "Get verified",
      description: "Verified profiles help buyers move faster and build trust."
    },
    {
      number: "3",
      title: "Confirm the sale + handoff",
      description: "When a buyer checks out, you confirm the sale in your dashboard and follow the pickup or freight steps."
    }
  ];

  return (
    <>
      <SEO
        title="Sell My Food Truck | List & Sell on Vendibook"
        description="Sell your food truck faster with verified buyers, secure checkout, and simple next steps. Get a price estimate with our calculator or AI pricing suggestions."
        canonical="https://vendibook.com/sell-my-food-truck"
        type="website"
      />
      <JsonLd schema={[faqSchema, breadcrumbSchema, howToSchema, serviceSchema]} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5" />
            {/* Background photo collage */}
            <div className="absolute inset-0 opacity-5">
              <div className="grid grid-cols-3 h-full">
                <img src={trailerWeddingFlowers} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                <img src={trailerCreamParty} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                <img src={trailerPinkVintage} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
            </div>
            <div className="container relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl mx-auto text-center"
              >
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  Sell your food truck — with serious buyers and a clean process.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  List in minutes. Get a price estimate instantly. Manage offers, payments, and next steps from your dashboard.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                  <Button size="lg" variant="dark-shine" asChild className="text-base">
                    <Link to="/list?mode=sale">
                      List for Sale
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="dark-shine" asChild className="text-base">
                    <Link to="/tools/pricepilot">
                      Get a Price Estimate
                    </Link>
                  </Button>
                </div>
                
                {/* Trust Row */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Verified users
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Secure checkout
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="ml-0.5">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">
                        Payments are handled securely online. Sellers confirm the sale in their dashboard before payout is initiated.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" />
                    Nationwide freight
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Notarized receipts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    24/7 support
                  </span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Pricing Tools Section */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Price it right, faster.</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Use our Pricing Calculator for a quick range, or let PricePilot scan comps and suggest a strong ask based on your specs. You're always in control — adjust anytime.
                </p>
              </motion.div>
              
              <div className="max-w-md mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-lg bg-amber-500/10">
                          <Sparkles className="h-5 w-5 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-lg">PricePilot (AI Pricing Suggestions)</h3>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Comparable listings + a recommended price range with confidence cues.
                      </p>
                      <Button variant="dark-shine" asChild className="w-full">
                        <Link to="/tools/pricepilot">
                          Get AI Suggestions
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
              
            </div>
          </section>

          {/* Sell in 3 Steps */}
          <section className="py-16">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Sell in 3 steps</h2>
              </motion.div>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.number}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Next step callout */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="max-w-xl mx-auto"
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">
                      After checkout, you'll see a "Confirm Sale" button on the sale card in your dashboard.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* Why Vendibook Works for Sellers */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-bold">Built for sellers who want less back-and-forth.</h2>
              </motion.div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <benefit.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium mb-1">{benefit.title}</h3>
                            <p className="text-sm text-muted-foreground">{benefit.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Proof / Credibility Section */}
          <section className="py-16">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Real listings. Real operators.</h2>
              </motion.div>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                {[
                  { label: "Food Truck Owner", quote: "Clean process from listing to payout." },
                  { label: "Trailer Seller", quote: "Verified buyers made a real difference." },
                  { label: "Food Truck Owner", quote: "Dashboard made it easy to track everything." }
                ].map((testimonial, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <p className="text-sm italic text-muted-foreground mb-3">"{testimonial.quote}"</p>
                        <p className="text-xs font-medium text-primary">— {testimonial.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Fee Section */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Flexible payment options</h2>
                <p className="text-muted-foreground mb-4">
                  You choose how you get paid.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 text-left mb-6">
                  <Card className="bg-background border-green-500/20">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Pay in Person</h4>
                        <p className="text-xs text-muted-foreground">
                          Handle payment directly with the buyer — <strong className="text-green-600">completely free</strong>.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-background border-primary/20">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Secure Platform Payment</h4>
                        <p className="text-xs text-muted-foreground">
                          Use our secure checkout for <strong className="text-foreground">extra protection</strong> — 12.9% seller commission.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4 text-left mb-6">
                  <Card className="bg-background">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Nationwide Freight</h4>
                        <p className="text-xs text-muted-foreground">
                          Coordinate shipping across the 48 contiguous U.S. states. Freight cost is calculated at checkout based on distance and item specs.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-background">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Proof Notary (Optional)</h4>
                        <p className="text-xs text-muted-foreground">
                          Add remote, online notarization for your sale receipt. Extra legal protection for both buyer and seller.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Affirm & Afterpay Financing */}
                <Card className="bg-background border-blue-500/20 mb-6">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center gap-4">
                        <Link to="/payments" className="hover:opacity-80 transition-opacity">
                          <img 
                            src={affirmLogo} 
                            alt="Affirm" 
                            className="h-6 md:h-8 object-contain dark:invert" 
                          />
                        </Link>
                        <Link to="/payments" className="hover:opacity-80 transition-opacity">
                          <img 
                            src={afterpayLogo} 
                            alt="Afterpay" 
                            className="h-5 md:h-6 object-contain dark:invert" 
                          />
                        </Link>
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-xs text-muted-foreground">
                          Let buyers pay over time — you get paid upfront, no extra fees.
                        </p>
                      </div>
                      <Button variant="dark-shine" size="sm" asChild className="gap-1 shrink-0">
                        <Link to="/payments">
                          Learn more
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Button variant="dark-shine" size="sm" asChild>
                  <Link to="/pricing-calculator">
                    See fee breakdown
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold">Frequently asked questions</h2>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-2xl mx-auto"
              >
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                        {faq.question.toLowerCase().includes("price") && (
                          <span className="block mt-2">
                            <Link to="/pricing-calculator" className="text-primary hover:underline text-sm">Pricing Calculator</Link>
                            {" · "}
                            <Link to="/tools/pricepilot" className="text-primary hover:underline text-sm">PricePilot AI</Link>
                          </span>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl mx-auto"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to sell?</h2>
                <p className="text-muted-foreground mb-8">
                  List your truck today — or get a price estimate first.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <Button size="lg" variant="dark-shine" asChild>
                    <Link to="/list?mode=sale">
                      List for Sale
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="dark-shine" asChild>
                    <Link to="/tools/pricepilot">
                      Get a Price Estimate
                    </Link>
                  </Button>
                </div>
                <Link 
                  to="/search?mode=sale" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  Browse active for-sale listings
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
        
        {/* Sticky Mobile CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t md:hidden z-40">
          <div className="flex gap-2">
            <Button variant="dark-shine" asChild className="flex-1">
              <Link to="/list?mode=sale">List for Sale</Link>
            </Button>
            <Button variant="dark-shine" asChild className="flex-1">
              <Link to="/tools/pricepilot">Price Estimate</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellMyFoodTruck;
