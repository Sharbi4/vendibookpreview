import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  FileText,
  Truck,
  Headphones,
  ArrowRight,
  DollarSign,
  MapPin,
  Zap,
  Lightbulb,
  Camera,
  Clock,
  CheckCircle2,
  Users,
  Building2,
  Sparkles,
  CircleDollarSign,
  FileCheck,
  HelpCircle,
  Stamp,
  Package,
  CalendarDays,
  Home,
  Droplets,
  Shield,
  Sun,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const HowItWorks = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['sell', 'rent', 'lots', 'tools'];
      let current: string | null = null;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            current = sectionId;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Learn More | Vendibook - Sell, Rent & List Mobile Food Assets"
        description="Learn how to sell, rent, or list vendor lots on Vendibook. Verified accounts, secure payments, document workflows, and nationwide freight."
      />
      <Header />

      <main className="flex-1">
        {/* ==================== HERO ==================== */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">
                Learn More
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Vendibook Works
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                A secure, organized place to sell, rent, and operate in mobile food.
                Vendibook brings structure to an industry that's often run through scattered messages and handshake deals.
                List with confidence, reach verified users, set clear requirements, and keep every step understandable.
              </p>

              {/* Jump Buttons */}
              <div className="flex flex-wrap gap-3 justify-center mb-10">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-md hover:shadow-lg transition-all hover:scale-105" asChild>
                  <a href="#sell">
                    <DollarSign className="h-4 w-4" />
                    Sell
                  </a>
                </Button>
                <Button size="lg" className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all hover:scale-105" asChild>
                  <a href="#rent">
                    <CalendarDays className="h-4 w-4" />
                    Rent
                  </a>
                </Button>
                <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white shadow-md hover:shadow-lg transition-all hover:scale-105" asChild>
                  <a href="#lots">
                    <MapPin className="h-4 w-4" />
                    Vendor Lots
                  </a>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2 hover:scale-105 transition-all" asChild>
                  <a href="#tools">
                    <Sparkles className="h-4 w-4" />
                    Free Tools
                  </a>
                </Button>
              </div>

              {/* Trust Strip */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm">
                <TrustBadge
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Verified Accounts"
                  tooltip="We use account checks and identity signals to reduce bad actors and increase trust across the marketplace."
                />
                <TrustBadge
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Optional Secure Checkout"
                  tooltip="Choose in-person payments or secure online checkout for a cleaner record and smoother long-distance deals."
                />
                <TrustBadge
                  icon={<FileText className="h-4 w-4" />}
                  label="Document Requirements"
                  tooltip="For rentals and lots, hosts can require documents before approving."
                />
                <TrustBadge
                  icon={<Truck className="h-4 w-4" />}
                  label="Nationwide Freight"
                  tooltip="Sell to buyers outside your local area with freight coordination across the 48 contiguous U.S. states."
                />
                <TrustBadge
                  icon={<Headphones className="h-4 w-4" />}
                  label="24/7 Support"
                  tooltip="Chat support anytime for questions, issues, and dispute help."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================== SELL SECTION ==================== */}
        <section id="sell" className="py-16 md:py-24 bg-muted/30 scroll-mt-20 relative">
          <div className="container">
            <div className="lg:grid lg:grid-cols-[1fr,340px] lg:gap-12">
              {/* Main Content */}
              <div>
                <div className="mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary text-sm font-medium mb-4">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5 text-white" />
                    </div>
                    For Sellers
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Sell with confidence — locally or nationwide
                  </h2>
                  <p className="text-muted-foreground max-w-2xl">
                    Vendibook helps you sell food trucks, trailers, ghost kitchens, and equipment without the chaos of "is this still available?" threads. You stay in control of your terms, while we give buyers the trust signals and clarity they need to commit.
                  </p>
                </div>

                {/* Step 1: Payment Options */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Choose how you get paid</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-2 border-border">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          In-person payment
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Best for local deals
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Coordinate pickup with the buyer
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Accept payment your way
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Keep everything organized in your dashboard
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/30 bg-primary/5">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          Secure online checkout
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Optional</span>
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Buyer pays securely online through Vendibook
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Cleaner transaction record and clearer next steps
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            Ideal for higher-value assets and out-of-town buyers
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <InfoPopup
                    trigger="Which option should I use?"
                    content="Use in-person for simple local deals. Choose online checkout when you want a smoother experience, cleaner records, and more buyer confidence."
                  />
                </div>

                {/* Step 2: Proof Notary */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Optional paid add-on: Notarized sale receipt with Proof Notary</h3>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    For high-ticket sales, paperwork matters. You can add Proof Notary to notarize the sale receipt remotely and online.
                  </p>

                  <Card className="border border-border mb-4">
                    <CardContent className="p-5">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Stamp className="h-5 w-5 text-primary" />
                        Why sellers choose it
                      </h4>
                      <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Remote notarization (no in-person appointment)
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Verified signing process
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Time-stamped audit trail
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Extra confidence for buyers, lenders, and ownership transfer
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    <InfoPopup
                      trigger="What is Proof Notary?"
                      content="Proof Notary is an online notarization service. When added, your sale receipt can be notarized remotely to create a more official, verifiable record."
                    />
                    <InfoPopup
                      trigger="How much does it cost?"
                      content="Proof Notary is an optional add-on with an additional cost. You'll see the exact price before you add it to a listing or complete a sale."
                    />
                  </div>
                </div>

                {/* Step 3: Freight */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Reach buyers across the United States with Vendibook Freight</h3>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    Want to sell beyond your city? Vendibook Freight opens your listing to buyers outside your local area — so you can sell to serious buyers across the country instead of waiting for the right person nearby.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-2">Buyer-paid freight</h4>
                        <p className="text-sm text-muted-foreground">
                          Buyer selects freight at checkout and pays for it
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-2">Seller-provided freight</h4>
                        <p className="text-sm text-muted-foreground">
                          You include freight to increase conversions (we still coordinate delivery)
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border border-border mb-4">
                    <CardContent className="p-5">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        What to expect
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Freight coordination across the 48 contiguous U.S. states
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Pickup readiness instructions for the seller
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          Delivery scheduling updates for the buyer via email
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <InfoPopup
                    trigger="How freight works"
                    content="After purchase, we coordinate pickup and delivery through trusted carrier partners. You'll get pickup guidance; the buyer gets scheduling updates and delivery coordination."
                  />
                </div>

                {/* Fees */}
                <div className="bg-card border border-border rounded-xl p-6 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">Transparent fees</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sales: seller commission</span>
                      <span className="font-medium text-foreground">12.9%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Buyer platform fee (sales)</span>
                      <span className="font-medium text-foreground">None</span>
                    </li>
                    <li className="flex items-center justify-between text-muted-foreground text-xs pt-2 border-t border-border">
                      <span>Optional add-ons (Freight, Proof Notary) shown clearly before purchase</span>
                    </li>
                  </ul>
                </div>

                {/* Inline CTA for mobile and desktop */}
                <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 rounded-xl p-6 lg:hidden group hover:border-primary/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h4 className="relative font-bold text-foreground mb-2">Ready to sell?</h4>
                  <p className="relative text-sm text-muted-foreground mb-4">Create a for-sale listing and reach buyers locally or nationwide.</p>
                  <Button variant="gradient" className="relative w-full gap-2 shadow-md hover:shadow-lg transition-all" asChild>
                    <Link to="/create-listing?mode=sale">
                      <ArrowRight className="h-4 w-4" />
                      Create For-Sale Listing
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Sticky Sidebar Modal */}
              <div className="hidden lg:block">
                <div className={cn(
                  "sticky top-24 transition-opacity duration-300",
                  activeSection === 'sell' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                  <StickyActionCard
                    title="Create a For-Sale Listing"
                    subtitle="Sell locally or nationwide — add freight or notarization if you want."
                    steps={[
                      'Add photos + details',
                      'Set price + pickup/delivery',
                      'Choose payment method',
                      'Optional: Freight + Proof Notary',
                      'Publish',
                    ]}
                    ctaText="Create For-Sale Listing"
                    ctaHref="/create-listing?mode=sale"
                    secondaryText="View example listing"
                    secondaryHref="/search?mode=sale"
                    reassurance="Most listings go live in minutes. You stay in control of the deal."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== RENT SECTION ==================== */}
        <section id="rent" className="py-16 md:py-24 bg-background scroll-mt-20 relative">
          <div className="container">
            <div className="lg:grid lg:grid-cols-[1fr,340px] lg:gap-12">
              {/* Main Content */}
              <div>
                <div className="mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <CalendarDays className="h-3.5 w-3.5 text-white" />
                    </div>
                    For Hosts
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Turn idle time into income — and help vendors get started
                  </h2>
                  <p className="text-muted-foreground max-w-2xl">
                    Renting lets you earn from days your asset isn't in use, while supporting new and growing food businesses. The modern food world is flexible: pop-ups, rotating markets, seasonal runs, and mobile-first concepts. Vendibook helps you participate safely and professionally.
                  </p>
                </div>

                {/* Set Terms */}
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-foreground mb-4">Set terms that protect your asset</h3>
                  <p className="text-muted-foreground mb-4">You're in control:</p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Availability calendar
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Daily/weekly rates
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Minimum rental periods
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Pickup/delivery instructions
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Optional recurring rentals for steady income
                    </li>
                  </ul>

                  <InfoPopup
                    trigger="Recurring rentals"
                    content="Offer a repeat schedule (like weekends or weekly). It's a simple way to create predictable income and long-term relationships."
                  />
                </div>

                {/* Document Requirements */}
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    Require documents before approval
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full ml-2">
                      Optional, recommended
                    </span>
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You can request documents and review them before confirming a rental.
                  </p>

                  <Card className="border border-border mb-4">
                    <CardContent className="p-5">
                      <h4 className="font-semibold text-foreground mb-3">Common examples</h4>
                      <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          Government ID
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          Proof of insurance (general liability / auto)
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          Business registration (optional)
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          Event permit (if applicable)
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          Food handler certification (if relevant)
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    <InfoPopup
                      trigger="Insurance: What counts?"
                      content="A policy that covers the rental dates and operational use. Many hosts request general liability for events."
                    />
                    <InfoPopup
                      trigger="Event permit: When to require it"
                      content="If the renter is operating at a permitted event or public site, requesting the permit helps reduce risk."
                    />
                    <InfoPopup
                      trigger="Sample renter checklist"
                      content="ID + insurance + pickup plan + return condition expectations."
                    />
                  </div>
                </div>

                {/* Fees */}
                <div className="bg-card border border-border rounded-xl p-6 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">Clear fees at checkout</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Host commission (rentals)</span>
                      <span className="font-medium text-foreground">12.9%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Renter service fee</span>
                      <span className="font-medium text-foreground">12.9%</span>
                    </li>
                    <li className="flex items-center justify-between text-muted-foreground text-xs pt-2 border-t border-border">
                      <span>Everything is shown clearly before confirmation</span>
                    </li>
                  </ul>
                </div>

                {/* Inline CTA for mobile and desktop */}
                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/20 rounded-xl p-6 lg:hidden group hover:border-emerald-500/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h4 className="relative font-bold text-foreground mb-2">Ready to rent out your asset?</h4>
                  <p className="relative text-sm text-muted-foreground mb-4">Create a rental listing and start earning on your schedule.</p>
                  <Button className="relative w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 gap-2 shadow-md hover:shadow-lg transition-all" asChild>
                    <Link to="/create-listing?mode=rent">
                      <ArrowRight className="h-4 w-4" />
                      Create Rental Listing
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Sticky Sidebar Modal */}
              <div className="hidden lg:block">
                <div className={cn(
                  "sticky top-24 transition-opacity duration-300",
                  activeSection === 'rent' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                  <StickyActionCard
                    title="Create a Rental Listing"
                    subtitle="Earn on your schedule with clear requirements."
                    steps={[
                      'Photos + listing details',
                      'Availability + rates',
                      'Pickup/delivery',
                      'Document requirements (optional)',
                    ]}
                    ctaText="Create Rental Listing"
                    ctaHref="/create-listing?mode=rent"
                    secondaryText="View example rental listing"
                    secondaryHref="/search?mode=rent"
                    reassurance="Approve renters only when you're comfortable."
                    accent="emerald"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== VENDOR LOTS SECTION ==================== */}
        <section id="lots" className="py-16 md:py-24 bg-muted/30 scroll-mt-20 relative">
          <div className="container">
            <div className="lg:grid lg:grid-cols-[1fr,340px] lg:gap-12">
              {/* Main Content */}
              <div>
                <div className="mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium mb-4">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-white" />
                    </div>
                    For Property Owners
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Get paid for your space — and give vendors a safer place to operate
                  </h2>
                  <p className="text-muted-foreground max-w-2xl">
                    Vendor lots are partnerships that strengthen local food communities. When property owners and businesses open reliable space, vendors can operate with consistency — and you earn from space you already have.
                  </p>
                </div>

                {/* Hourly/Daily */}
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-foreground mb-4">List by the hour or by the day</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-amber-600" />
                          Hourly
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Pop-ups, lunch service, short events
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-amber-600" />
                          Daily
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Markets, weekend runs, festivals
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-foreground mb-4">Optional amenities you can include</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <AmenityBadge icon={<Zap className="h-3.5 w-3.5" />} label="Power" />
                    <AmenityBadge icon={<Droplets className="h-3.5 w-3.5" />} label="Water" />
                    <AmenityBadge icon={<Building2 className="h-3.5 w-3.5" />} label="Waste access" />
                    <AmenityBadge icon={<Sun className="h-3.5 w-3.5" />} label="Lighting" />
                    <AmenityBadge icon={<Home className="h-3.5 w-3.5" />} label="Restrooms nearby" />
                    <AmenityBadge icon={<Shield className="h-3.5 w-3.5" />} label="Security notes" />
                    <AmenityBadge icon={<Clock className="h-3.5 w-3.5" />} label="Rules/quiet hours" />
                  </div>

                  <InfoPopup
                    trigger="What makes a great vendor lot listing?"
                    content="Clear hours, pricing, what's included, and rules. Vendors want to know exactly what they're getting before they commit."
                  />
                </div>

                {/* Expectations */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-4">Set expectations for safe operations</h3>
                  <p className="text-muted-foreground mb-4">Use your listing to communicate:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Setup areas and parking guidelines
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Operating hours and cleanup expectations
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      Any requirements (insurance, permits, noise limits)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      What's allowed and what's not
                    </li>
                  </ul>
                </div>

                {/* Inline CTA for mobile and desktop */}
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/20 rounded-xl p-6 lg:hidden group hover:border-amber-500/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h4 className="relative font-bold text-foreground mb-2">Ready to list your space?</h4>
                  <p className="relative text-sm text-muted-foreground mb-4">Create a vendor lot listing and start earning from your property.</p>
                  <Button className="relative w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 gap-2 shadow-md hover:shadow-lg transition-all" asChild>
                    <Link to="/create-listing?category=vendor_lot">
                      <ArrowRight className="h-4 w-4" />
                      Create Vendor Lot Listing
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Sticky Sidebar Modal */}
              <div className="hidden lg:block">
                <div className={cn(
                  "sticky top-24 transition-opacity duration-300",
                  activeSection === 'lots' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                  <StickyActionCard
                    title="Create a Vendor Lot Listing"
                    subtitle="Monetize your space and support local vendors."
                    steps={[
                      'Address or service area',
                      'Operating hours',
                      'Hourly/daily pricing',
                      'Amenities + rules',
                    ]}
                    ctaText="Create Vendor Lot Listing"
                    ctaHref="/create-listing?category=vendor_lot"
                    secondaryText="Contact Us to Partner"
                    secondaryHref="/contact"
                    reassurance="Clear listings attract better vendors and better repeat bookings."
                    accent="amber"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FREE TOOLS SECTION ==================== */}
        <section id="tools" className="py-16 md:py-24 bg-background scroll-mt-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-amber-500/20 text-primary text-sm font-medium mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  Free for Everyone
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Free Tools for the Community
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Built to support owners and operators. Vendibook exists to make the mobile food industry easier to navigate — especially for entrepreneurs starting up and owners trying to operate more professionally.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                <ToolCard
                  icon={<CircleDollarSign className="h-5 w-5" />}
                  title="Pricing Support"
                  description="Get guidance to price with more confidence and avoid leaving money on the table."
                  href="/tools/price-pilot"
                />
                <ToolCard
                  icon={<FileCheck className="h-5 w-5" />}
                  title="Permits & Requirements Guidance"
                  description="Starting points to research what you may need to operate in a city or state."
                  href="/tools/permit-path"
                />
                <ToolCard
                  icon={<Lightbulb className="h-5 w-5" />}
                  title="Listing Templates & Tips"
                  description="Simple frameworks to create clearer listings that build trust faster."
                  href="/tools/listing-studio"
                />
                <ToolCard
                  icon={<Headphones className="h-5 w-5" />}
                  title="Help Center + 24/7 Chat"
                  description="Answers fast, plus support if something goes wrong."
                  href="/help"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="gradient" className="gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105" asChild>
                  <Link to="/tools">
                    <Sparkles className="h-4 w-4" />
                    Explore Free Tools
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 border-2 hover:scale-105 transition-all" asChild>
                  <Link to="/help">
                    <Headphones className="h-4 w-4" />
                    Visit Help Center
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 border-2 hover:scale-105 transition-all" asChild>
                  <Link to="/contact">
                    <ArrowRight className="h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== WHY VENDIBOOK SECTION ==================== */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Vendibook
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                A secure place where mobile food can grow
              </p>

              <p className="text-muted-foreground mb-8">
                Mobile food is entrepreneurship. It's ownership. It's community. But too often, the tools are scattered and the process is unclear.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <div className="relative overflow-hidden bg-card border-2 border-primary/20 rounded-xl p-5 text-left group hover:border-primary/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-3 shadow-md">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="relative font-semibold text-foreground mb-1">Trust</h4>
                  <p className="relative text-sm text-muted-foreground">Verified users and clear records</p>
                </div>
                <div className="relative overflow-hidden bg-card border-2 border-primary/20 rounded-xl p-5 text-left group hover:border-primary/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-3 shadow-md">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="relative font-semibold text-foreground mb-1">Clarity</h4>
                  <p className="relative text-sm text-muted-foreground">Steps that explain what happens next</p>
                </div>
                <div className="relative overflow-hidden bg-card border-2 border-primary/20 rounded-xl p-5 text-left group hover:border-primary/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-3 shadow-md">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="relative font-semibold text-foreground mb-1">Control</h4>
                  <p className="relative text-sm text-muted-foreground">You set terms, requirements, and availability</p>
                </div>
                <div className="relative overflow-hidden bg-card border-2 border-primary/20 rounded-xl p-5 text-left group hover:border-primary/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-3 shadow-md">
                    <Headphones className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="relative font-semibold text-foreground mb-1">Support</h4>
                  <p className="relative text-sm text-muted-foreground">Help when you need it</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FINAL CTA ==================== */}
        <section className="py-20 bg-foreground text-primary-foreground">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to start?
              </h2>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="gradient" className="gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105" asChild>
                  <Link to="/create-listing?mode=sale">
                    <DollarSign className="h-4 w-4" />
                    Sell an Asset
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:scale-105 transition-all"
                  asChild
                >
                  <Link to="/create-listing?mode=rent">
                    <CalendarDays className="h-4 w-4" />
                    Rent Out an Asset
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:scale-105 transition-all"
                  asChild
                >
                  <Link to="/create-listing?category=vendor_lot">
                    <MapPin className="h-4 w-4" />
                    List a Vendor Lot
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

/* ============================================
   Sub-Components
   ============================================ */

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}

const TrustBadge = ({ icon, label, tooltip }: TrustBadgeProps) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all cursor-help group">
          <span className="text-primary group-hover:scale-110 transition-transform">{icon}</span>
          <span>{label}</span>
          <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm" side="bottom">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface InfoPopupProps {
  trigger: string;
  content: string;
}

const InfoPopup = ({ trigger, content }: InfoPopupProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mt-2 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all group">
        <HelpCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
        <span className="group-hover:underline">{trigger}</span>
      </button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{trigger}</DialogTitle>
        <DialogDescription>{content}</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

interface StickyActionCardProps {
  title: string;
  subtitle: string;
  steps: string[];
  ctaText: string;
  ctaHref: string;
  secondaryText: string;
  secondaryHref: string;
  reassurance: string;
  accent?: 'primary' | 'emerald' | 'amber';
}

const StickyActionCard = ({
  title,
  subtitle,
  steps,
  ctaText,
  ctaHref,
  secondaryText,
  secondaryHref,
  reassurance,
  accent = 'primary',
}: StickyActionCardProps) => {
  const accentClasses = {
    primary: 'border-primary/20 bg-primary/5',
    emerald: 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20',
    amber: 'border-amber-500/20 bg-amber-50 dark:bg-amber-950/20',
  };

  const buttonClasses = {
    primary: '',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <Card className={cn('border-2', accentClasses[accent])}>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>

        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Quick steps
          </p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <Button className={cn('w-full mb-2 gap-2 shadow-md hover:shadow-lg transition-all', buttonClasses[accent])} asChild>
          <Link to={ctaHref}>
            <ArrowRight className="h-4 w-4" />
            {ctaText}
          </Link>
        </Button>

        <Link
          to={secondaryHref}
          className="block text-center text-sm text-primary hover:underline mb-4"
        >
          {secondaryText}
        </Link>

        <p className="text-xs text-muted-foreground text-center">{reassurance}</p>
      </CardContent>
    </Card>
  );
};

interface AmenityBadgeProps {
  icon: React.ReactNode;
  label: string;
}

const AmenityBadge = ({ icon, label }: AmenityBadgeProps) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
    {icon}
    {label}
  </span>
);

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const ToolCard = ({ icon, title, description, href }: ToolCardProps) => (
  <Link
    to={href}
    className="relative overflow-hidden block bg-card border-2 border-primary/20 rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
      <span className="text-white">{icon}</span>
    </div>
    <h4 className="relative font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
      {title}
    </h4>
    <p className="relative text-sm text-muted-foreground">{description}</p>
  </Link>
);

export default HowItWorks;
