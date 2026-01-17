import { Link } from 'react-router-dom';
import {
  Search,
  FileCheck,
  CheckCircle2,
  Shield,
  CreditCard,
  MessageSquare,
  Calendar,
  ArrowRight,
  DollarSign,
  BadgeCheck,
  Clock,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  Sparkles,
  CircleDollarSign,
  FileText,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="How Vendibook Works | Rent & Buy Mobile Food Assets"
        description="Learn how to rent or buy food trucks, trailers, ghost kitchens, and vendor lots on Vendibook. Verified listings, secure payments, and clear workflows."
      />
      <Header />

      <main className="flex-1">
        {/* SECTION 1 — Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Vendibook Works
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                The trusted marketplace to rent or buy food trucks, trailers, kitchens, and vendor lots.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/search">
                    <Search className="h-5 w-5" />
                    Browse Listings
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/host">
                    List Your Asset
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>

              {/* Micro-proof row */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Verified listings
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Secure payments
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Document workflows
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  24/7 support
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — Choose Your Path */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <PathCard
                icon={<Building2 className="h-8 w-8" />}
                title="I'm a Host / Seller"
                description="List your food truck, trailer, or kitchen to earn rental income or sell outright."
                cta="Start Listing"
                href="/host"
                accent="primary"
              />
              <PathCard
                icon={<Users className="h-8 w-8" />}
                title="I'm a Renter / Buyer"
                description="Find verified assets to rent for events or buy for your business."
                cta="Start Browsing"
                href="/search"
                accent="emerald"
              />
            </div>
          </div>
        </section>

        {/* SECTION 3 — Host/Seller Flow */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                How Hosting Works
              </h2>
              <p className="text-muted-foreground">5 steps to start earning</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="space-y-4">
                <FlowStep
                  number={1}
                  title="Create your listing"
                  bullets={['Add photos, pricing, and availability', 'Choose rent, sale, or both']}
                />
                <FlowStep
                  number={2}
                  title="Set availability & rules"
                  bullets={['Block dates, set minimum stays', 'Define required documents']}
                />
                <FlowStep
                  number={3}
                  title="Receive requests"
                  bullets={['Get notified instantly', 'Review renter profiles']}
                />
                <FlowStep
                  number={4}
                  title="Review docs & approve"
                  bullets={['Verify licenses, insurance, permits', 'Accept or decline with one click']}
                />
                <FlowStep
                  number={5}
                  title="Get paid securely"
                  bullets={['Funds held until rental starts', 'Direct deposit via Stripe']}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — Renter/Buyer Flow */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                How Renting & Buying Works
              </h2>
              <p className="text-muted-foreground">5 steps to get started</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="space-y-4">
                <FlowStep
                  number={1}
                  title="Search verified listings"
                  bullets={['Filter by city, category, price', 'See requirements upfront']}
                  accent="emerald"
                />
                <FlowStep
                  number={2}
                  title="Compare options"
                  bullets={['Review photos, amenities, reviews', 'Check availability calendar']}
                  accent="emerald"
                />
                <FlowStep
                  number={3}
                  title="Request booking or inquire"
                  bullets={['Rentals: select dates and submit', 'Sales: message the seller']}
                  accent="emerald"
                />
                <FlowStep
                  number={4}
                  title="Upload documents"
                  bullets={['Submit required licenses/permits', 'Host reviews and approves']}
                  accent="emerald"
                />
                <FlowStep
                  number={5}
                  title="Confirm & operate"
                  bullets={['Coordinate pickup/delivery', 'Complete your rental or purchase']}
                  accent="emerald"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — Rentals vs Sales Comparison */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Rentals vs Sales
              </h2>
              <p className="text-muted-foreground">Purpose-built workflows for each model</p>
            </div>

            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-card border border-border font-semibold text-foreground rounded-tl-lg">
                      Feature
                    </th>
                    <th className="text-left p-4 bg-primary/5 border border-border font-semibold text-primary">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Rentals
                      </div>
                    </th>
                    <th className="text-left p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-border font-semibold text-emerald-700 dark:text-emerald-400 rounded-tr-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Sales
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  <ComparisonRow label="Transaction type" rental="Time-based access" sale="One-time purchase" />
                  <ComparisonRow label="Request flow" rental="Booking with dates" sale="Inquiry to seller" />
                  <ComparisonRow label="Host approval" rental="Required before start" sale="Confirmation-based" />
                  <ComparisonRow label="Payment timing" rental="Held until rental starts" sale="Escrow until delivery" />
                  <ComparisonRow label="Document verification" rental="Supported" sale="Optional" />
                  <ComparisonRow label="Fulfillment" rental="Pickup, delivery, on-site" sale="Freight or local pickup" isLast />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 6 — Trust Layer */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <Shield className="h-7 w-7" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Built for trust, not chaos.
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Every transaction is protected by verification, secure payments, and clear communication.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <TrustCard icon={<BadgeCheck />} title="Verified accounts" desc="Stripe Identity verification" />
              <TrustCard icon={<CreditCard />} title="Secure payments" desc="Stripe-powered processing" />
              <TrustCard icon={<FileCheck />} title="Document requirements" desc="Hosts define what's needed" />
              <TrustCard icon={<Clock />} title="Status tracking" desc="Real-time booking updates" />
              <TrustCard icon={<Headphones />} title="Dispute support" desc="Resolution assistance" />
              <TrustCard icon={<MessageSquare />} title="Messaging history" desc="All communication logged" />
            </div>
          </div>
        </section>

        {/* SECTION 7 — Host Tools (Small, supply-only) */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Free tools to help hosts earn more
              </h2>
              <p className="text-muted-foreground mb-8">
                AI-powered utilities to price, list, and launch smarter.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <ToolMiniCard
                  icon={<CircleDollarSign />}
                  title="Price Pilot"
                  desc="Get pricing guidance"
                />
                <ToolMiniCard
                  icon={<FileText />}
                  title="Listing Studio"
                  desc="Write better listings"
                />
                <ToolMiniCard
                  icon={<Truck />}
                  title="Permit Path"
                  desc="Find permit requirements"
                />
              </div>

              <Button variant="outline" asChild>
                <Link to="/tools" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Explore Host Tools
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 8 — Final CTA */}
        <section className="py-20 bg-foreground text-primary-foreground">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-primary-foreground/80 mb-8">
                Join the marketplace built for mobile food businesses.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white gap-2" asChild>
                  <Link to="/search">
                    <Search className="h-5 w-5" />
                    Browse Listings
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2"
                  asChild
                >
                  <Link to="/host">
                    List Your Asset
                    <ArrowRight className="h-5 w-5" />
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

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  href: string;
  accent: 'primary' | 'emerald';
}

const PathCard = ({ icon, title, description, cta, href, accent }: PathCardProps) => {
  const accentClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20 hover:border-primary/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400',
  };

  return (
    <Link
      to={href}
      className={cn(
        'block bg-card border-2 rounded-2xl p-6 transition-all hover:shadow-lg group',
        accent === 'primary' ? 'border-primary/20 hover:border-primary/40' : 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
      )}
    >
      <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-4', accentClasses[accent])}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <span className={cn(
        'inline-flex items-center gap-1 font-medium group-hover:gap-2 transition-all',
        accent === 'primary' ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
      )}>
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
};

interface FlowStepProps {
  number: number;
  title: string;
  bullets: string[];
  accent?: 'primary' | 'emerald';
}

const FlowStep = ({ number, title, bullets, accent = 'primary' }: FlowStepProps) => {
  const accentClasses = {
    primary: 'bg-primary text-primary-foreground',
    emerald: 'bg-emerald-600 text-white',
  };

  return (
    <div className="flex gap-4 items-start">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0', accentClasses[accent])}>
        {number}
      </div>
      <div className="flex-1 bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <ul className="space-y-1">
          {bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface ComparisonRowProps {
  label: string;
  rental: string;
  sale: string;
  isLast?: boolean;
}

const ComparisonRow = ({ label, rental, sale, isLast }: ComparisonRowProps) => (
  <tr>
    <td className={cn('p-4 border border-border text-foreground font-medium', isLast && 'rounded-bl-lg')}>
      {label}
    </td>
    <td className="p-4 border border-border text-muted-foreground bg-primary/5">{rental}</td>
    <td className={cn('p-4 border border-border text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30', isLast && 'rounded-br-lg')}>
      {sale}
    </td>
  </tr>
);

interface TrustCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const TrustCard = ({ icon, title, desc }: TrustCardProps) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

interface ToolMiniCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const ToolMiniCard = ({ icon, title, desc }: ToolMiniCardProps) => (
  <div className="bg-card border border-border rounded-xl p-4 text-center">
    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </div>
);

export default HowItWorks;
