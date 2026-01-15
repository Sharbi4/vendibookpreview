import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Truck,
  Building2,
  MapPin,
  Caravan,
  Shield,
  FileCheck,
  CreditCard,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  BadgeCheck,
  FileText,
  Lock,
  DollarSign,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  Package,
  MapPinned,
  ShoppingCart,
} from 'lucide-react';

const HostOnboarding = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-vendibook-cream via-white to-vendibook-orange-light py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Turn your food truck, trailer, kitchen, or lot into a{' '}
                <span className="text-primary">revenue-generating asset.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Vendibook is the marketplace where verified operators rent and buy mobile food
                businesses — with built-in trust, compliance, and secure workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8">
                  <Link to="/create-listing">
                    List Your Asset
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link to="/how-it-works">See How It Works</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Who This Is For
              </h2>
              <p className="text-muted-foreground text-lg">
                Built for real operators — not hobbyists.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <OwnerTypeCard
                icon={<Truck className="h-8 w-8" />}
                title="Food Truck Owners"
                benefits={[
                  'Rent during downtime',
                  'Sell fully equipped trucks',
                  'Control who rents and when',
                ]}
              />
              <OwnerTypeCard
                icon={<Caravan className="h-8 w-8" />}
                title="Food Trailer Owners"
                benefits={[
                  'List short-term or long-term',
                  'Set delivery or pickup rules',
                  'Reduce idle inventory',
                ]}
              />
              <OwnerTypeCard
                icon={<Building2 className="h-8 w-8" />}
                title="Ghost Kitchen Operators"
                benefits={[
                  'Monetize unused hours',
                  'Rent compliant kitchen space',
                  'Screen operators in advance',
                ]}
              />
              <OwnerTypeCard
                icon={<MapPin className="h-8 w-8" />}
                title="Vendor Lot Owners"
                benefits={[
                  'Rent parking or vending space',
                  'Set rules and requirements',
                  'Avoid informal agreements',
                ]}
              />
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-16 md:py-20 bg-vendibook-cream">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Most rentals still happen in DMs. That's risky.
                </h2>
              </div>

              <div className="grid md:grid-cols-5 gap-4 mb-12">
                <ProblemCard icon={<MessageSquare />} label="Facebook groups" />
                <ProblemCard icon={<MessageSquare />} label="Text messages" />
                <ProblemCard icon={<XCircle />} label="No verification" />
                <ProblemCard icon={<XCircle />} label="No documentation" />
                <ProblemCard icon={<Clock />} label="Last-minute cancellations" />
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-3 bg-primary/10 text-primary px-6 py-3 rounded-full">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold text-lg">
                    Vendibook replaces chaos with structure.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How Vendibook Works for Hosts
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <StepCard
                step={1}
                title="Create a Listing"
                items={[
                  'Choose rent or sale',
                  'Select category',
                  'Set pricing, availability, rules',
                ]}
              />
              <StepCard
                step={2}
                title="Set Your Requirements"
                items={[
                  'Required documents',
                  'Insurance',
                  'Experience',
                  'Deadlines you control',
                ]}
              />
              <StepCard
                step={3}
                title="Review & Approve"
                items={[
                  'See booking requests',
                  'Review documents',
                  'Approve or decline',
                ]}
              />
            </div>

            <div className="text-center mt-10">
              <div className="inline-flex items-center gap-2 bg-secondary text-foreground px-6 py-3 rounded-full font-medium">
                <Shield className="h-5 w-5 text-primary" />
                No auto-rentals. You stay in control.
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-16 md:py-20 bg-vendibook-cream">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Makes Vendibook Different
              </h2>
              <p className="text-muted-foreground text-lg">
                We built Vendibook to protect hosts first.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <XCircle className="h-6 w-6 text-destructive" />
                    Traditional Marketplaces
                  </h3>
                  <ul className="space-y-4">
                    <ComparisonItem negative text="Anyone can message you" />
                    <ComparisonItem negative text="No proof of experience" />
                    <ComparisonItem negative text="No insurance enforcement" />
                    <ComparisonItem negative text="No accountability" />
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    Vendibook
                  </h3>
                  <ul className="space-y-4">
                    <ComparisonItem text="Verified accounts" />
                    <ComparisonItem text="Required documents" />
                    <ComparisonItem text="Booking approvals" />
                    <ComparisonItem text="Stripe-powered payouts" />
                    <ComparisonItem text="Clear records" />
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Document Requirements */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  You decide who's qualified — before they rent.
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-6">Hosts choose required documents:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DocumentBadge icon={<FileText />} label="Driver's license" />
                    <DocumentBadge icon={<FileCheck />} label="Food handler / SafeServe" />
                    <DocumentBadge icon={<Shield />} label="Insurance" />
                    <DocumentBadge icon={<FileText />} label="Business license" />
                    <DocumentBadge icon={<Users />} label="Work history" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Hosts choose when documents are due
                      </h4>
                      <p className="text-muted-foreground">
                        Set deadlines before booking, after approval, or on your timeline
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        No approval until requirements are met
                      </h4>
                      <p className="text-muted-foreground">
                        Renters must upload required docs before you approve
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rental Types */}
        <section className="py-16 md:py-20 bg-vendibook-cream">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Rental Types Explained
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <RentalTypeCard
                icon={<Package className="h-8 w-8" />}
                title="Mobile Assets"
                subtitle="Food trucks & trailers"
                features={['Pickup or delivery', 'Host-defined rules', 'Optional delivery fees']}
              />
              <RentalTypeCard
                icon={<MapPinned className="h-8 w-8" />}
                title="Static Locations"
                subtitle="Ghost kitchens & vendor lots"
                features={['On-site only', 'Fixed addresses', 'Access instructions built in']}
              />
              <RentalTypeCard
                icon={<ShoppingCart className="h-8 w-8" />}
                title="Sales"
                subtitle="One-time purchases"
                features={['Direct inquiries', 'No booking calendar', 'Sell fully equipped']}
              />
            </div>
          </div>
        </section>

        {/* Payments */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Get paid securely. On your terms.
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <PaymentFeature
                icon={<CreditCard />}
                title="Stripe Connect onboarding"
                description="Quick setup, secure payments"
              />
              <PaymentFeature
                icon={<BadgeCheck />}
                title="Verified payouts"
                description="No payouts without verification"
              />
              <PaymentFeature
                icon={<TrendingUp />}
                title="Ready for scale"
                description="Grow with confidence"
              />
              <PaymentFeature
                icon={<DollarSign />}
                title="Clean records"
                description="Every payment documented"
              />
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="py-16 md:py-20 bg-vendibook-cream">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                We don't just list assets — we help hosts succeed.
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Access our growing library of resources designed specifically for mobile food
                operators.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <ResourceTag label="Pricing guidance" />
                <ResourceTag label="Compliance tips" />
                <ResourceTag label="Food truck operations" />
                <ResourceTag label="Growth strategies" />
              </div>

              <Button asChild variant="outline" size="lg">
                <Link to="/help">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Host Resources
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Vendibook is built alongside real operators and launching city-by-city.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <ValueCard
                icon={<Users className="h-8 w-8" />}
                title="Host-first design"
                description="Every feature is built with your needs in mind"
              />
              <ValueCard
                icon={<FileCheck className="h-8 w-8" />}
                title="Real compliance workflows"
                description="Enforce document requirements and deadlines"
              />
              <ValueCard
                icon={<Shield className="h-8 w-8" />}
                title="Marketplace accountability"
                description="Verified accounts and secure transactions"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-vendibook-cream to-vendibook-orange-light">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                If you already own the asset,
                <br />
                <span className="text-primary">Vendibook helps you earn from it.</span>
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button asChild size="lg" className="text-lg px-8">
                  <Link to="/create-listing">
                    List Your Asset
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link to="/how-it-works">See How Vendibook Works</Link>
                </Button>
              </div>
              <p className="text-muted-foreground">Free to list. No obligation.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// Sub-components

interface OwnerTypeCardProps {
  icon: React.ReactNode;
  title: string;
  benefits: string[];
}

const OwnerTypeCard = ({ icon, title, benefits }: OwnerTypeCardProps) => (
  <Card className="card-hover">
    <CardContent className="p-6">
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            {benefit}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

interface ProblemCardProps {
  icon: React.ReactNode;
  label: string;
}

const ProblemCard = ({ icon, label }: ProblemCardProps) => (
  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border">
    <div className="text-destructive">{icon}</div>
    <span className="text-sm text-center text-muted-foreground">{label}</span>
  </div>
);

interface StepCardProps {
  step: number;
  title: string;
  items: string[];
}

const StepCard = ({ step, title, items }: StepCardProps) => (
  <Card className="relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
    <CardContent className="p-6 pt-8">
      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

interface ComparisonItemProps {
  text: string;
  negative?: boolean;
}

const ComparisonItem = ({ text, negative }: ComparisonItemProps) => (
  <li className="flex items-center gap-3">
    {negative ? (
      <XCircle className="h-5 w-5 text-destructive shrink-0" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
    )}
    <span className={negative ? 'text-muted-foreground' : 'text-foreground'}>{text}</span>
  </li>
);

interface DocumentBadgeProps {
  icon: React.ReactNode;
  label: string;
}

const DocumentBadge = ({ icon, label }: DocumentBadgeProps) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
    <div className="text-primary">{icon}</div>
    <span className="text-sm font-medium text-foreground">{label}</span>
  </div>
);

interface RentalTypeCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
}

const RentalTypeCard = ({ icon, title, subtitle, features }: RentalTypeCardProps) => (
  <Card className="card-hover">
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <ul className="space-y-2 text-left">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

interface PaymentFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PaymentFeature = ({ icon, title, description }: PaymentFeatureProps) => (
  <div className="text-center">
    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
      {icon}
    </div>
    <h4 className="font-semibold text-foreground mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

interface ResourceTagProps {
  label: string;
}

const ResourceTag = ({ label }: ResourceTagProps) => (
  <div className="px-4 py-2 rounded-full bg-white border border-border text-sm text-foreground">
    {label}
  </div>
);

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValueCard = ({ icon, title, description }: ValueCardProps) => (
  <Card className="card-hover">
    <CardContent className="p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default HostOnboarding;
