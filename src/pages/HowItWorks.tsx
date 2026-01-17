import { Link } from 'react-router-dom';
import {
  UserPlus,
  Search,
  FileText,
  CheckCircle2,
  Shield,
  CreditCard,
  MessageSquare,
  Truck,
  Building2,
  ShoppingCart,
  Calendar,
  Users,
  Lock,
  BadgeCheck,
  ArrowRight,
  BookOpen,
  ChefHat,
  MapPin,
  FileCheck,
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AIToolsSection from '@/components/home/AIToolsSection';
import { cn } from '@/lib/utils';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section - GRADIENT */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          {/* Orange Gradient Background - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/8 via-[#FF5124]/5 to-amber-200/4" />
          
          {/* Decorative orbs - subtle orange hints */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-[#FF5124]/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5124]/4 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 left-1/4 w-64 h-64 bg-amber-300/5 rounded-full blur-2xl" />
          </div>
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm bg-primary/5 border-primary/20 text-primary animate-fade-in">
                The trusted marketplace for mobile food businesses
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-slide-up">
                Vendibook is the marketplace for{' '}
                <span className="text-gradient">mobile food businesses</span> and spaces.
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Rent or buy food trucks, food trailers, ghost kitchens, and vendor lots — with built-in trust, compliance, and secure workflows.
              </p>

              <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.15s' }}>
                Vendibook replaces fragmented DMs, spreadsheets, and risky transactions with a verified marketplace built for real operators.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Button size="lg" className="gap-2 text-base px-8" asChild>
                  <Link to="/search">
                    <Search className="h-5 w-5" />
                    Browse Listings
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
                  <Link to="/create-listing">
                    List Your Space or Equipment
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Who Vendibook Is For - NATURAL */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Who Vendibook Is For
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Two sides, one marketplace. Built for trust on both ends.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <AudienceCard
                title="For Hosts & Sellers"
                icon={<Building2 className="h-8 w-8" />}
                users={['Food truck owners', 'Trailer owners', 'Ghost kitchen operators', 'Property owners with vendor lots']}
                benefits={[
                  'Monetize underused assets',
                  'Control who rents with approval workflows',
                  'Set rules, requirements, and pricing',
                  'Get paid securely via Stripe',
                ]}
                accentColor="primary"
                learnMoreLink="/host"
              />
              <AudienceCard
                title="For Renters & Buyers"
                icon={<Users className="h-8 w-8" />}
                users={['Food entrepreneurs', 'Event vendors', 'Pop-up operators', 'Expanding brands']}
                benefits={[
                  'Discover verified listings',
                  'Book with confidence',
                  'Know requirements upfront',
                  'Avoid last-minute surprises',
                ]}
                accentColor="emerald"
              />
            </div>
          </div>
        </section>

        {/* How Vendibook Works - Step by Step - GRADIENT */}
        <section className="py-20 relative overflow-hidden">
          {/* Orange Gradient Background - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/6 via-[#FF5124]/4 to-amber-100/3" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-20 w-80 h-80 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#FF5124]/4 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="container relative z-10">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 bg-primary/5 border-primary/20 text-primary">
                Step by Step
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How Vendibook Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From signup to success — here's exactly how it works.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 hidden md:block" />

                <div className="space-y-8">
                  <WorkflowStep
                    number={1}
                    title="Create an Account"
                    description="Sign up as a host, renter, or both. Simple onboarding with clear role selection gets you started in minutes."
                    icon={<UserPlus className="h-6 w-6" />}
                    highlights={['Simple onboarding', 'Clear role selection', 'Free to join']}
                  />
                  <WorkflowStep
                    number={2}
                    title="List or Search"
                    description="Hosts create listings for rent or sale with pricing, availability, and requirements. Renters search by city, category, and mode."
                    icon={<Search className="h-6 w-6" />}
                    highlights={['Food trucks & trailers', 'Ghost kitchens', 'Vendor lots']}
                    isDouble
                    leftContent={
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">Hosts can:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Set daily/weekly pricing</li>
                          <li>• Define availability windows</li>
                          <li>• Require specific documents</li>
                        </ul>
                      </div>
                    }
                    rightContent={
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">Renters can:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Search by location</li>
                          <li>• Filter by category</li>
                          <li>• Compare options easily</li>
                        </ul>
                      </div>
                    }
                  />
                  <WorkflowStep
                    number={3}
                    title="Request a Booking or Inquiry"
                    description="Rentals use booking requests with date selection. Sales use direct inquiries. No guessing, no DMs, no confusion."
                    icon={<MessageSquare className="h-6 w-6" />}
                    highlights={['Structured requests', 'Clear communication', 'No back-and-forth']}
                  />
                  <WorkflowStep
                    number={4}
                    title="Verification & Approval"
                    description="Hosts define what documents are required. Renters upload securely. Hosts approve or decline with full context and control."
                    icon={<FileCheck className="h-6 w-6" />}
                    highlights={['Document uploads', 'Host approval', 'Full transparency']}
                  />
                  <WorkflowStep
                    number={5}
                    title="Confirm & Operate"
                    description="Clear expectations, clear timelines. Everyone knows what's required and when. Use the platform for all coordination."
                    icon={<CheckCircle2 className="h-6 w-6" />}
                    highlights={['Secure payments', 'Clear timelines', 'Platform messaging']}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rent vs Sale - NATURAL */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Rent vs Sale
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Vendibook supports both models with purpose-built workflows.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <ComparisonCard
                title="Rentals"
                icon={<Calendar className="h-8 w-8" />}
                color="primary"
                features={[
                  'Time-based access',
                  'Booking requests with dates',
                  'Host approval required',
                  'Pickup, delivery, or on-site use',
                  'Document verification supported',
                  'Recurring revenue opportunity',
                ]}
              />
              <ComparisonCard
                title="Sales"
                icon={<ShoppingCart className="h-8 w-8" />}
                color="emerald"
                features={[
                  'One-time purchase',
                  'Direct inquiry to seller',
                  'No booking calendar',
                  'Escrow-protected payments',
                  'Buyer & seller confirmation',
                  'Secure fund release',
                ]}
              />
            </div>
          </div>
        </section>

        {/* Trust & Safety - GRADIENT */}
        <section className="py-20 relative overflow-hidden">
          {/* Orange Gradient Background - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/7 via-[#FF5124]/4 to-amber-200/3" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#FF5124]/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#FF5124]/4 rounded-full blur-3xl" />
          </div>
          <div className="container relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Built for trust, not chaos.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Vendibook is designed to protect both sides — not just facilitate a transaction.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <TrustFeatureCard
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Verified Host Accounts"
                description="Identity verification through Stripe ensures real people behind every listing."
              />
              <TrustFeatureCard
                icon={<CreditCard className="h-6 w-6" />}
                title="Stripe-Powered Payouts"
                description="Secure payment processing with escrow protection for sales."
              />
              <TrustFeatureCard
                icon={<FileText className="h-6 w-6" />}
                title="Document Workflows"
                description="Hosts set requirements. Renters upload. Everyone stays compliant."
              />
              <TrustFeatureCard
                icon={<Truck className="h-6 w-6" />}
                title="Category-Aware Rules"
                description="Mobile assets vs static locations — each has purpose-built workflows."
              />
              <TrustFeatureCard
                icon={<Clock className="h-6 w-6" />}
                title="Transparent Status"
                description="Real-time booking statuses keep everyone on the same page."
              />
              <TrustFeatureCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="Communication History"
                description="All messages logged in one place. No lost DMs or texts."
              />
            </div>
          </div>
        </section>

        {/* Booking, Compliance & Documents - NATURAL */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                Core Differentiator
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Compliance That Actually Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No surprises after approval. Requirements are clear from day one.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Hosts decide what's required
                    </h3>
                    <ul className="space-y-3">
                      {[
                        "Driver's license / Government ID",
                        'Food Handler / SafeServe certification',
                        'Commercial liability insurance',
                        'Business license',
                        'Health department permit',
                        'Work history / experience proof',
                      ].map((doc, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Hosts choose when docs are due
                    </h3>
                    <div className="space-y-4">
                      <DeadlineOption
                        title="Before Booking Request"
                        description="Must upload before submitting request"
                        color="amber"
                      />
                      <DeadlineOption
                        title="Before Approval"
                        description="Can request, but host can't approve until uploaded"
                        color="blue"
                      />
                      <DeadlineOption
                        title="After Approval, By Deadline"
                        description="Documents due by a set time before start"
                        color="emerald"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-center text-foreground font-medium">
                    <Zap className="h-5 w-5 inline-block mr-2 text-primary" />
                    Renters see all requirements upfront — no surprises after approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vendi AI Suite Section */}
        <AIToolsSection />

        {/* Why Vendibook Is Different - GRADIENT */}
        <section className="py-20 relative overflow-hidden">
          {/* Orange-Yellow Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-200/25 via-yellow-100/20 to-amber-200/15" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-80 h-80 bg-amber-300/25 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl" />
          </div>
          <div className="container relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Vendibook Is Different
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From chaos to clarity. From risk to reliability.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center gap-2">
                    <CircleX className="h-5 w-5" />
                    The Old Way
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Informal Facebook groups',
                      'Scattered text messages & DMs',
                      'Manual spreadsheets',
                      'Verbal agreements',
                      'Cash transactions',
                      'No accountability',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
                    <CircleCheck className="h-5 w-5" />
                    The Vendibook Way
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Structured, searchable listings',
                      'Clear rules & requirements',
                      'Built-in document verification',
                      'Secure payment processing',
                      'Marketplace accountability',
                      'Professional workflows',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Learning Center - NATURAL */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                <BookOpen className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                More than a marketplace — a resource hub.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                We don't just connect people — we help them succeed.
              </p>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <ResourceCard icon={<ChefHat />} title="Running a food truck" />
                <ResourceCard icon={<DollarSign />} title="How to price rentals" />
                <ResourceCard icon={<FileText />} title="Compliance guidance" />
                <ResourceCard icon={<MapPin />} title="Event preparation" />
                <ResourceCard icon={<TrendingUp />} title="Growth strategies" />
                <ResourceCard icon={<Lock />} title="Safety best practices" />
              </div>

              <Button variant="outline" size="lg" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Visit the Vendibook Blog
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-br from-foreground via-foreground to-foreground/95 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,81,36,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,81,36,0.1),transparent_50%)]" />

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Ready to build or grow your mobile food business?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Built for operators. Designed for trust. Ready to scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white gap-2 text-base px-8" asChild>
                  <Link to="/search">
                    <Search className="h-5 w-5" />
                    Browse Listings
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2 text-base px-8"
                  asChild
                >
                  <Link to="/create-listing">
                    List on Vendibook
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

interface AudienceCardProps {
  title: string;
  icon: React.ReactNode;
  users: string[];
  benefits: string[];
  accentColor: 'primary' | 'emerald';
  learnMoreLink?: string;
}

const AudienceCard = ({ title, icon, users, benefits, accentColor, learnMoreLink }: AudienceCardProps) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm card-hover">
      <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4', colorClasses[accentColor])}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-4">{title}</h3>

      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Includes:</p>
        <div className="flex flex-wrap gap-2">
          {users.map((user, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {user}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Benefits:</p>
        <ul className="space-y-2">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {learnMoreLink && (
        <Link 
          to={learnMoreLink} 
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Learn more
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
};

interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights: string[];
  isDouble?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const WorkflowStep = ({ number, title, description, icon, highlights, isDouble, leftContent, rightContent }: WorkflowStepProps) => {
  return (
    <div className="flex gap-6 items-start relative">
      <div className="flex-shrink-0 z-10">
        <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg">
          {number}
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>

        <p className="text-muted-foreground mb-4">{description}</p>

        {isDouble && leftContent && rightContent && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-xl">
            {leftContent}
            {rightContent}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {highlights.map((h, i) => (
            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary text-xs">
              {h}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ComparisonCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'primary' | 'emerald';
  features: string[];
}

const ComparisonCard = ({ title, icon, color, features }: ComparisonCardProps) => {
  const colorClasses = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/20',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4', colorClasses[color].bg, colorClasses[color].text)}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className={cn('h-4 w-4 shrink-0', colorClasses[color].text)} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

interface TrustFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TrustFeatureCard = ({ icon, title, description }: TrustFeatureCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm card-hover">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

interface DeadlineOptionProps {
  title: string;
  description: string;
  color: 'amber' | 'blue' | 'emerald';
}

const DeadlineOption = ({ title, description, color }: DeadlineOptionProps) => {
  const colorClasses = {
    amber: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  };

  return (
    <div className={cn('p-3 rounded-lg border', colorClasses[color])}>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  );
};

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
}

const ResourceCard = ({ icon, title }: ResourceCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 card-hover cursor-pointer">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
  );
};

export default HowItWorks;
