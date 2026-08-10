import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Calculator, 
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
  MapPin,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger} from '@/components/ui/tooltip';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import SellerPaymentsExplainer from '@/components/sell/SellerPaymentsExplainer';

// Food truck photos - Sell page uses wedding/event themed trailers
import trailerWeddingFlowers from '@/assets/trailer-wedding-flowers.jpg';
import trailerCreamParty from '@/assets/trailer-cream-party.jpg';
import trailerPinkVintage from '@/assets/trailer-pink-vintage.jpg';

const SellMyFoodTruck = () => {
  // FAQ data for schema and accordion
  const faqs = [
    {
      question: "How do I sell my food truck on Vendibook?",
      answer: "Create a for-sale listing, add photos and details, and publish \u2014 publishing is free and never requires identity verification, payout setup, PayPal setup, financing, or a paid add-on. You'll manage inquiries, offers, and confirmations from your dashboard."
    },
    {
      question: "How do I know what to price it at?",
      answer: "Start with the Pricing Calculator for a quick estimate, then use PricePilot for data-backed comps and a recommended range. Update your price anytime."
    },
    {
      question: "What happens after the buyer checks out?",
      answer: "You'll see the sale in your dashboard and confirm it to lock in next steps, then coordinate pickup or freight based on what was selected."
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
      answer: "For a completed Vendibook-processed sale, Vendibook records your proceeds minus the 12.9% seller platform fee and issues the payout through Vendibook's current reviewed payout workflow to the PayPal, Venmo, Cash App, or ACH destination you saved. Pay-in-person sales are arranged directly with the buyer and carry no Vendibook seller platform fee."
    },
    {
      question: "What if there's a dispute?",
      answer: "Our support team helps document the issue and follow the dispute process. Eligible purchases may include PayPal Purchase Protection; PayPal determines eligibility and outcomes."
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
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://vendibook.com" },
      { "@type": "ListItem", "position": 2, "name": "Sell My Food Truck", "item": "https://vendibook.com/sell-my-food-truck" }
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
      { "@type": "HowToStep", "position": 1, "name": "Create and publish your listing", "text": "Add photos, specs, equipment, and your terms, then publish for free.", "url": "https://vendibook.com/list/start" },
      { "@type": "HowToStep", "position": 2, "name": "Choose how you get paid", "text": "Enable PayPal Checkout, accept payment in person, or both, and optionally add Equinox Funding on an eligible for-sale listing.", "url": "https://vendibook.com/payments" },
      { "@type": "HowToStep", "position": 3, "name": "Confirm the sale and handoff", "text": "When a buyer checks out, confirm the sale in your dashboard and coordinate pickup or freight.", "url": "https://vendibook.com/dashboard" }
    ]
  };

  // Service schema for better rich results
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Food Truck Sales Marketplace",
    "description": "Sell your food truck, trailer, or commercial kitchen with PayPal Checkout, pay-in-person options, optional financing, and transparent fees.",
    "provider": { "@type": "Organization", "name": "Vendibook", "url": "https://vendibook.com" },
    "serviceType": "Marketplace",
    "areaServed": { "@type": "Country", "name": "United States" },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "For Sale Listings",
      "itemListElement": [
        { "@type": "OfferCatalog", "name": "Food Trucks for Sale", "itemListElement": [] },
        { "@type": "OfferCatalog", "name": "Food Trailers for Sale", "itemListElement": [] },
        { "@type": "OfferCatalog", "name": "Shared Kitchens for Sale", "itemListElement": [] }
      ]
    }
  };

  const benefits = [
    { icon: Truck, title: "Built for mobile food assets", description: "Trucks, trailers, kitchens, equipment, and Vendor Spaces." },
    { icon: Users, title: "Buyers searching on purpose", description: "Inquiries come from people browsing mobile food assets, not a general feed." },
    { icon: CreditCard, title: "PayPal Checkout", description: "Online payment through PayPal, or arrange payment in person." },
    { icon: Package, title: "Nationwide freight", description: "Ship across the 48 contiguous U.S. states with coordinated freight." },
    { icon: FileCheck, title: "Notarized receipts", description: "Optional Proof Notary add-on for remote, online notarization." },
    { icon: LayoutDashboard, title: "Dashboard control", description: "Manage inquiries, documents, and confirmations." },
    { icon: Percent, title: "Flexible payment options", description: "Pay in person with no Vendibook seller fee, or take PayPal Checkout at a 12.9% seller platform fee." }
  ];

  const steps = [
    { number: "1", title: "Create and publish free", description: "Add photos, specs, equipment, and your terms, then publish at no cost." },
    { number: "2", title: "Choose how you get paid", description: "Enable PayPal Checkout, accept payment in person, or both." },
    { number: "3", title: "Confirm the sale + handoff", description: "When a buyer checks out, you confirm the sale in your dashboard and follow the pickup or freight steps." }
  ];

  return (
    <>
      <SEO
        title="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        description="List your food truck or trailer free on Vendibook and reach buyers actively searching. PayPal Checkout or pay in person, optional Equinox financing, and nationwide freight."
        canonical="/sell-my-food-truck"
        type="website"
        ogTitle="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        ogDescription="Reach buyers actively searching for food trucks. Free to publish, PayPal Checkout or pay in person, optional financing, nationwide freight."
        twitterTitle="Sell Your Food Truck — Without Getting Buried on Facebook Marketplace"
        twitterDescription="Publish free in minutes and reach buyers shopping for food trucks and trailers."
      />

      <JsonLd schema={[faqSchema, breadcrumbSchema, howToSchema, serviceSchema]} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02]" />
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
                  Sell your food truck — without getting buried on Facebook Marketplace.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Publish once, free, and reach buyers actively searching for food trucks and trailers — not scrolling past your post. PayPal Checkout or pay in person, with optional buyer financing.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                  <Button size="lg" variant="glass-cta" asChild className="text-base">
                    <Link to="/list/start">
                      List Your Food Truck
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="glass-cta" asChild className="text-base">
                    <Link to="/food-trucks-for-sale">
                      See Food Trucks for Sale
                    </Link>
                  </Button>
                </div>
                <div className="flex justify-center mb-8">
                  <TellVendibookButton
                    variant="ghost"
                    size="default"
                    defaultIntent="sell"
                    defaultCategory="food_truck"
                    sourcePage="sell_my_food_truck"
                  >
                    Just exploring? Tell Vendibook about your truck →
                  </TellVendibookButton>
                </div>

                
                {/* Trust Row */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-foreground/50" />
                    Free to publish
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-foreground/50" />
                    PayPal Checkout
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="ml-0.5" aria-label="About PayPal Checkout">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">
                        PayPal is the online checkout provider. Sellers confirm the sale in their dashboard, and eligible purchases may include PayPal Purchase Protection — PayPal determines eligibility and outcomes.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-foreground/50" />
                    Optional verified badge
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-foreground/50" />
                    Nationwide freight
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-foreground/50" />
                    Notarized receipts
                  </span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Why Sellers Choose Vendibook (vs Facebook Marketplace) */}
          <section className="py-16 border-t border-foreground/5">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl mx-auto mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Why food truck sellers choose Vendibook.
                </h2>
                <p className="text-muted-foreground">
                  Facebook Marketplace was built for couches. Vendibook is built for mobile food assets — every visitor is here on purpose.
                </p>
              </motion.div>

              <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
                <Card className="border-foreground/10">
                  <CardContent className="p-6">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Facebook Marketplace</div>
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li>• Buried in a feed of couches, cars, and random goods</li>
                      <li>• "Is this still available?" from people who never reply</li>
                      <li>• No verification — scams and lowballers everywhere</li>
                      <li>• Cash-only handoffs with no buyer protection</li>
                      <li>• No financing option — buyers walk if they can't pay cash</li>
                      <li>• No freight — buyer has to live nearby</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-foreground/20 bg-foreground/[0.02]">
                  <CardContent className="p-6">
                    <div className="text-xs font-medium uppercase tracking-wider text-foreground mb-3">Vendibook</div>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>Buyers come searching specifically for trucks &amp; trailers</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>Inquiries from operators shopping for mobile food assets</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>PayPal Checkout, pay in person, or both</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>Optional notarized sale receipts</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>Optional Equinox Funding so eligible buyers can apply to finance</span></li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-foreground/70 shrink-0 mt-0.5" /><span>Nationwide freight across all 48 states</span></li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <Button size="lg" variant="glass-cta" asChild>
                  <Link to="/list/start">
                    List Your Food Truck
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">Free to publish. No Vendibook seller platform fee when you handle payment in person.</p>
              </div>
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
                  <Card className="h-full hover:shadow-md transition-shadow border-foreground/10">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-lg bg-foreground/10">
                          <Zap className="h-5 w-5 text-foreground/70" />
                        </div>
                        <h3 className="font-semibold text-lg">PricePilot (AI Pricing Suggestions)</h3>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Comparable listings + a recommended price range with confidence cues.
                      </p>
                      <Button variant="glass-cta" asChild className="w-full">
                        <Link to="/tools/pricepilot">
                          Get Pricing Suggestions
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
                    <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.number}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </motion.div>
                ))}
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="max-w-xl mx-auto"
              >
                <Card className="bg-foreground/[0.03] border-foreground/10">
                  <CardContent className="p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-foreground/50 mt-0.5 shrink-0" />
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
                          <div className="p-2 rounded-lg bg-foreground/10 shrink-0">
                            <benefit.icon className="h-4 w-4 text-foreground/70" />
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
                  { label: "Trailer Seller", quote: "Offers and messages stayed in one place." },
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
                        <p className="text-xs font-medium text-foreground/60">— {testimonial.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How selling and getting paid works — single source of payment copy */}
          <SellerPaymentsExplainer asset="food truck" ctaHref="/list/start" ctaLabel="List Your Food Truck Free" />

          {/* Pricing tools link */}
          <section className="py-10 text-center">
            <Button variant="glass-cta" size="sm" asChild>
              <Link to="/pricing-calculator">
                See fee breakdown
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
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
                            <Link to="/pricing-calculator" className="text-foreground/70 hover:underline text-sm">Pricing Calculator</Link>
                            {" · "}
                            <Link to="/tools/pricepilot" className="text-foreground/70 hover:underline text-sm">PricePilot AI</Link>
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
          <section className="py-20 bg-foreground">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl mx-auto"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-background">Ready to sell?</h2>
                <p className="text-background/60 mb-8">
                  List your food truck today and reach buyers actively searching — not scrolling Facebook Marketplace.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <Button size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
                    <Link to="/list/start">
                      List Your Food Truck
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-background/20 text-background hover:bg-background/10 hover:text-background" asChild>
                    <Link to="/food-trucks-for-sale">
                      See Food Trucks for Sale
                    </Link>
                  </Button>
                </div>
                <Link 
                  to="/tools/pricepilot" 
                  className="text-sm text-background/50 hover:text-background/70 transition-colors inline-flex items-center gap-1"
                >
                  Get a price estimate first
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
            <Button variant="glass-cta" asChild className="flex-1">
              <Link to="/list/start">List Your Food Truck</Link>
            </Button>
            <Button variant="glass-cta" asChild className="flex-1">
              <Link to="/food-trucks-for-sale">For Sale</Link>
            </Button>
          </div>

        </div>
      </div>
    </>
  );
};

export default SellMyFoodTruck;
