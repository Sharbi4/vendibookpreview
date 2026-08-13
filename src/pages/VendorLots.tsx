import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  DollarSign, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  QrCode, 
  LayoutGrid, 
  CalendarClock,
  Store,
  FileCheck,
  Smartphone,
  Star,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { WhiteGlovePopup } from '@/components/kitchen/WhiteGlovePopup';

// --- Animated QR Phone Component ---
const QRPhoneAnimation = () => (
  <div className="relative w-full max-w-xs mx-auto">
    <div className="relative bg-foreground rounded-[2.5rem] p-3 shadow-2xl">
      <div className="bg-background rounded-[2rem] overflow-hidden aspect-[9/16] relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-foreground/[0.03] to-background">
          <div className="relative bg-card border-2 border-border rounded-2xl p-6 shadow-lg">
            <div className="w-32 h-32 grid grid-cols-5 gap-1">
              {[...Array(25)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-sm ${
                    [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 19, 20, 22, 23, 24].includes(i)
                      ? 'bg-foreground'
                      : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
            <motion.div
              className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-foreground/60 to-transparent rounded-full"
              animate={{ top: ['15%', '85%', '15%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground text-center">Scan to Book This Spot</p>
          <p className="text-xs text-muted-foreground text-center mt-1">vendibook.com/your-lot</p>
        </div>

        <motion.div
          className="absolute top-4 right-4 bg-foreground text-background text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        >
          <DollarSign className="h-3 w-3" />
          New Lead!
        </motion.div>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground rounded-full" />
      </div>
    </div>
  </div>
);

// --- Hero Section ---
const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-background to-foreground/[0.02]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-foreground/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="mb-6 bg-foreground/10 text-foreground border-foreground/15 px-4 py-1.5">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            For Property Owners
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Monetize your{' '}
            <span className="text-muted-foreground">empty pavement.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The easiest way to rent parking spots to food trucks and pop-up vendors. 
            Capture drive-by leads, automate payments, and verify insurance in one platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="glass-cta"
              size="lg"
              onClick={() => navigate('/list')}
              className="text-base px-8"
            >
              List Your Lot Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-base"
            >
              How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Value Props ---
const ValuePropsSection = () => {
  const values = [
    { icon: QrCode, title: "QR Code & Share Link", desc: "Download a QR code for your lot. Trucks scan to book and pay instantly—no phone calls needed." },
    { icon: LayoutGrid, title: "Multi-Slot Management", desc: "Have 5 spots? Create 5 slots. Multiple vendors book simultaneously without conflicts." },
    { icon: Shield, title: "Liability Protection", desc: "We collect COI documents and verify insurance before any booking is confirmed." },
    { icon: Store, title: "Your Own Storefront", desc: "Get a shareable profile page with reviews, photos, and availability to attract more vendors." },
    { icon: CalendarClock, title: "Flexible Terms", desc: "Set hourly, daily, weekly, or monthly rates. You control pricing and availability." },
    { icon: DollarSign, title: "Passive Income", desc: "Hosts earn an average of $1,500/month per spot. Get paid automatically via direct deposit." }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything you need to rent your lot</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">We handle the technology, payments, and paperwork so you can focus on earning.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <Card key={index} className="border-2 border-border bg-card/80 backdrop-blur-xl hover:border-foreground/20 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="p-3 bg-foreground/10 rounded-xl w-fit mb-4">
                  <value.icon className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- QR Signage Feature Section ---
const QRSignageSection = () => (
  <section className="py-20 bg-background overflow-hidden">
    <div className="container">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <Badge className="mb-4 bg-foreground/10 text-foreground border-0">
            <Smartphone className="h-3.5 w-3.5 mr-1.5" />
            Automated Sales
          </Badge>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Turn drive-by traffic into{' '}
            <span className="text-muted-foreground">instant revenue.</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            Food trucks are always scouting for spots. Give them a way to book immediately when they see your lot.
          </p>
          
          <div className="space-y-4">
            {[
              { icon: QrCode, title: "Downloadable QR Code", desc: "Print or display your QR code anywhere. Trucks scan the code to book and pay instantly." },
              { icon: Share2, title: "Shareable Link", desc: "Get a dedicated URL (vendibook.com/your-lot) to share on social media or local groups." },
              { icon: Star, title: "Reviews & Ratings", desc: "Build credibility with verified reviews. Top-rated lots get more bookings." }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card border-2 border-border rounded-xl">
                <div className="p-2 bg-foreground/10 rounded-lg h-fit">
                  <item.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="order-1 lg:order-2">
          <QRPhoneAnimation />
        </div>
      </div>
    </div>
  </section>
);

// --- Compliance Section ---
const ComplianceSection = () => (
  <section className="py-20 bg-muted/30">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-foreground/10 text-foreground border-0">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Automated Vetting
          </Badge>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            No insurance? <span className="text-muted-foreground">No booking.</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Renting your property carries risk. We mitigate it by enforcing strict document requirements.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-foreground font-medium mb-4">
                <FileCheck className="h-5 w-5" />
                We Collect & Verify:
              </div>
              <ul className="space-y-3">
                {["General Liability Insurance (COI)", "Health Department Permits", "Business License", "Food Manager Certification"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-foreground/40 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-foreground/15 bg-foreground/[0.03]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-foreground font-medium mb-4">
                <Shield className="h-5 w-5" />
                Asset Protection
              </div>
              <p className="text-muted-foreground mb-4">
                You can require specific coverage limits (e.g. $1M/$2M) in your listing settings. 
                Vendors must upload proof matching your criteria.
              </p>
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="p-2 bg-foreground/10 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Status: Compliant</p>
                  <p className="text-xs text-muted-foreground">COI Verified • Exp 12/25</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </section>
);

// --- FAQ Section ---
const FaqSection = () => (
  <section className="py-20 bg-background">
    <div className="container max-w-3xl">
      <h2 className="text-3xl font-bold text-foreground text-center mb-12">Common Questions</h2>
      
      <Accordion type="single" collapsible className="space-y-4">
        {[
          { q: "Can I choose who parks on my lot?", a: "Yes. You have full control. You can require approval for every booking request, reviewing the vendor's profile, photos, and menu before saying yes." },
          { q: "What if they stay longer than booked?", a: "Vendors are charged for the specific time block they book. If they overstay, you can report it, and our terms allow for additional charges. Most professional vendors are very respectful of time slots." },
          { q: "Do I need to provide electricity?", a: "No. You can list your space as 'Dry Hire' (no utilities). However, spots with power (shore power) and water access typically command higher rental rates." },
          { q: "How does the QR code work?", a: "We generate a unique code for your listing. You print it or we send you a sign. Vendors scan it with their phone camera, which takes them directly to your checkout page to book instantly." }
        ].map((faq, i) => (
          <AccordionItem 
            key={i} 
            value={`item-${i}`} 
            className="border-2 border-border rounded-xl px-6 data-[state=open]:border-foreground/20"
          >
            <AccordionTrigger className="hover:no-underline text-left font-semibold">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

// --- Final CTA ---
const FinalCta = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 bg-foreground">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-background mb-4">
            Got space? <span className="text-background/60">Get paid.</span>
          </h2>
          
          <p className="text-lg text-background/60 mb-8">
            List your parking lot, event space, or street corner today. 
            It's free to list and takes less than 10 minutes.
          </p>
          
          <Button
            size="lg"
            onClick={() => navigate('/list')}
            className="text-base px-8 bg-background text-foreground hover:bg-background/90"
          >
            List Your Space
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <p className="text-sm text-background/40 mt-6">
            Join hundreds of property owners monetizing their lots on VendiBook.
          </p>
        </div>
      </div>
    </section>
  );
};

// --- Main Page Component ---
const VendorLots = () => {
  return (
    <>
      <SEO
        title="List Your Vendor Space — Earn Passive Income | Vendibook"
        description="Turn empty parking into passive income. Food trucks book & pay instantly. QR booking links, automated insurance, fast payouts."
        canonical="/vendor-spaces"
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <ValuePropsSection />
          <QRSignageSection />
          <ComplianceSection />
          <FaqSection />
          <FinalCta />
        </main>
        <Footer />
        <WhiteGlovePopup delayMs={20000} />
      </div>
    </>
  );
};

export default VendorLots;
