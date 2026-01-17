import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  FileCheck,
  Headphones,
  AlertTriangle,
  BadgeCheck,
  Lightbulb,
  Calculator,
  FileText,
  Star,
} from 'lucide-react';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';

const HostOnboarding = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="List Your Food Truck, Trailer, or Kitchen | Vendibook"
        description="Earn from your mobile food asset. Set your own pricing, choose your renters, and get paid securely with Vendibook's trusted marketplace."
        type="website"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify([generateOrganizationSchema(), generateWebSiteSchema()])
      }} />
      
      <Header />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative bg-gradient-to-br from-vendibook-cream via-white to-vendibook-orange-light py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Earn from your food truck, trailer, kitchen, lot, or equipment
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Set availability, set requirements, approve renters, and get paid securely. Vendibook handles the rest.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button asChild size="lg" variant="gradient-premium" className="text-lg px-8 py-6">
                  <Link to="/list">
                    Start Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/how-it-works">See How It Works</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free to list · No monthly fees · You stay in control</p>
            </div>
          </div>
        </section>

        {/* 2. Value Props (Earnings / Benefits) */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why hosts choose Vendibook
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to rent or sell your asset — with none of the headaches.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <ValuePropCard
                icon={<Calendar className="h-6 w-6" />}
                title="Set your availability"
                description="Block dates, set minimum rental periods, and control when your asset is available."
              />
              <ValuePropCard
                icon={<DollarSign className="h-6 w-6" />}
                title="Flexible pricing"
                description="Daily and weekly rates, delivery fees, and seasonal adjustments — all on your terms."
              />
              <ValuePropCard
                icon={<Users className="h-6 w-6" />}
                title="Reach verified renters"
                description="Connect with serious operators who are ready to rent or buy through our marketplace."
              />
              <ValuePropCard
                icon={<CreditCard className="h-6 w-6" />}
                title="Secure payments"
                description="Stripe-powered payouts deposited directly to your bank. No chasing payments."
              />
              <ValuePropCard
                icon={<FileCheck className="h-6 w-6" />}
                title="Document requirements"
                description="Require licenses, insurance, or certifications before approving any booking."
              />
              <ValuePropCard
                icon={<Headphones className="h-6 w-6" />}
                title="24/7 support"
                description="Our team is here to help with disputes, questions, and anything you need."
              />
            </div>
          </div>
        </section>

        {/* 3. Trust & Safety (Icon Row) */}
        <section className="py-12 md:py-16 bg-vendibook-cream">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Built for trust and safety
              </h2>
              <p className="text-muted-foreground">
                Every transaction is protected by our marketplace guarantees.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-4xl mx-auto">
              <TrustBadge icon={<BadgeCheck />} label="Identity verification" />
              <TrustBadge icon={<CreditCard />} label="Secure payments" />
              <TrustBadge icon={<AlertTriangle />} label="Dispute handling" />
              <TrustBadge icon={<FileCheck />} label="Document checks" />
              <TrustBadge icon={<Headphones />} label="24/7 support" />
            </div>
          </div>
        </section>

        {/* 4. AI Tools for Hosts */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Free for all hosts</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  AI-powered tools to help you succeed
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  From pricing recommendations to marketing copy, our tools help you create better listings and earn more.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <ToolHighlight
                  icon={<Calculator className="h-5 w-5" />}
                  title="Price Pilot"
                  description="Get market-based pricing recommendations for your asset."
                />
                <ToolHighlight
                  icon={<FileText className="h-5 w-5" />}
                  title="Listing Studio"
                  description="Generate compelling descriptions that convert browsers to bookers."
                />
                <ToolHighlight
                  icon={<Lightbulb className="h-5 w-5" />}
                  title="Permit Path"
                  description="Find required licenses and permits for your location."
                />
              </div>

              <div className="text-center">
                <Button asChild variant="outline" size="lg">
                  <Link to="/tools">
                    Explore Host Tools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. How Listing Works */}
        <section className="py-16 md:py-20 bg-vendibook-cream">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How it works
              </h2>
              <p className="text-muted-foreground text-lg">
                From listing to payout in four simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <StepCard
                step={1}
                title="Create listing"
                description="Add photos, set pricing, define your rules and requirements."
              />
              <StepCard
                step={2}
                title="Get verified"
                description="Complete identity verification to build trust with renters."
              />
              <StepCard
                step={3}
                title="Accept bookings"
                description="Review requests, check documents, and approve qualified renters."
              />
              <StepCard
                step={4}
                title="Get paid"
                description="Receive secure payouts directly to your bank account."
              />
            </div>
          </div>
        </section>

        {/* 6. Testimonials / Social Proof */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Trusted by hosts nationwide
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <TestimonialCard
                quote="Finally, a platform that understands food truck operators. The document requirements feature alone saves me hours of back-and-forth."
                author="Marcus T."
                role="Food Truck Owner, Austin"
                rating={5}
              />
              <TestimonialCard
                quote="I was skeptical at first, but the secure payments and verification process made me feel confident renting out my trailer."
                author="Sarah K."
                role="Trailer Owner, Phoenix"
                rating={5}
              />
              <TestimonialCard
                quote="The AI pricing tool helped me realize I was undercharging. Increased my rates by 30% and still getting bookings."
                author="James R."
                role="Ghost Kitchen Operator, LA"
                rating={5}
              />
            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-vendibook-cream to-vendibook-orange-light">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Ready to start earning?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join hundreds of operators who trust Vendibook to connect them with verified renters and buyers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button asChild size="lg" variant="gradient-premium" className="text-lg px-8 py-6">
                  <Link to="/create-listing">
                    Start Listing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/tools">Explore Host Tools</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free to list · No subscription required</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// Sub-components

interface ValuePropCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValuePropCard = ({ icon, title, description }: ValuePropCardProps) => (
  <Card className="card-hover border-0 shadow-sm">
    <CardContent className="p-6">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
}

const TrustBadge = ({ icon, label }: TrustBadgeProps) => (
  <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white border border-border text-center">
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-sm font-medium text-foreground">{label}</span>
  </div>
);

interface ToolHighlightProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ToolHighlight = ({ icon, title, description }: ToolHighlightProps) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

interface StepCardProps {
  step: number;
  title: string;
  description: string;
}

const StepCard = ({ step, title, description }: StepCardProps) => (
  <div className="text-center">
    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto mb-4">
      {step}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

const TestimonialCard = ({ quote, author, role, rating }: TestimonialCardProps) => (
  <Card className="card-hover">
    <CardContent className="p-6">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-foreground mb-4 italic">"{quote}"</p>
      <div>
        <p className="font-semibold text-foreground">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </CardContent>
  </Card>
);

export default HostOnboarding;
