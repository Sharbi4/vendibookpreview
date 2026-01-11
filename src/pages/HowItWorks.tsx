import { Key, Home, FileText, MessageSquare, Truck, ShoppingCart, Package, CreditCard, CheckCircle, Shield, DollarSign, Lock, BadgeCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterSection from '@/components/newsletter/NewsletterSection';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-vendibook-cream to-background">
          <div className="container text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              How Vendibook Works
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Vendibook is a marketplace for mobile business assets. You can rent food trucks and trailers, 
              or buy equipment and vehicles for sale, in one clean, high-trust platform.
            </p>
          </div>
        </section>

        {/* Rent Section */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <Key className="h-8 w-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Rent</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Find and rent mobile food assets for your business
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <StepCard
                number={1}
                title="Browse rentals"
                description="Search by category and city to find food trucks, food trailers, ghost kitchens, and equipment available to rent."
                icon={<Home className="h-6 w-6" />}
              />
              <StepCard
                number={2}
                title="Review the listing details"
                description="Each listing shows what's included, pricing, availability, pickup options, and whether delivery is available. Locations are masked for safety."
                icon={<FileText className="h-6 w-6" />}
              />
              <StepCard
                number={3}
                title="Request your booking"
                description="Select your dates and submit a booking request. Some hosts may require documents such as insurance or permits depending on the asset."
                icon={<MessageSquare className="h-6 w-6" />}
              />
              <StepCard
                number={4}
                title="Confirm, then coordinate pickup or delivery"
                description="After confirmation, you'll receive the full access details and instructions. Use platform messaging for coordination."
                icon={<Truck className="h-6 w-6" />}
              />
              <StepCard
                number={5}
                title="Return and close out"
                description="At the end of the rental period, return the asset based on the listing instructions. If a deposit applies, it's handled according to the host's inspection timeline and policy."
                icon={<CheckCircle className="h-6 w-6" />}
              />
            </div>
          </div>
        </section>

        {/* Buy Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Buy</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Purchase equipment and vehicles for your business
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <StepCard
                number={1}
                title="Browse for sale listings"
                description="Search for food trucks, food trailers, vendor carts, and equipment for sale. Compare condition, photos, and included features."
                icon={<Home className="h-6 w-6" />}
              />
              <StepCard
                number={2}
                title="Choose delivery or pickup"
                description="Sellers may offer local pickup, freight delivery, or seller delivery. If delivery applies, it appears as a line item during checkout."
                icon={<Package className="h-6 w-6" />}
              />
              <StepCard
                number={3}
                title="Add optional transaction services"
                description="Depending on the listing, you may be able to add services like title verification or online notary to increase trust for higher-value purchases."
                icon={<BadgeCheck className="h-6 w-6" />}
              />
              <StepCard
                number={4}
                title="Complete checkout"
                description="Pay through the platform to keep the transaction documented and secure."
                icon={<CreditCard className="h-6 w-6" />}
              />
              <StepCard
                number={5}
                title="Receive your asset"
                description="After payment confirmation, coordinate handoff details through platform messaging and complete delivery or pickup."
                icon={<Truck className="h-6 w-6" />}
              />
            </div>
          </div>
        </section>

        {/* Built for Trust Section */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Built for Trust</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Security and transparency at every step
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <TrustCard
                icon={<Lock className="h-6 w-6" />}
                title="Address masking until confirmed transactions"
                description="Locations remain private until bookings are confirmed"
              />
              <TrustCard
                icon={<DollarSign className="h-6 w-6" />}
                title="Clear line-item totals at checkout"
                description="Transparent pricing with no hidden fees"
              />
              <TrustCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="Platform messaging for coordination"
                description="Secure communication between hosts and guests"
              />
              <TrustCard
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Optional verification and transaction add-ons"
                description="Additional trust services for higher-value sales"
              />
            </div>
          </div>
        </section>

        <NewsletterSection />
      </main>

      <Footer />
    </div>
  );
};

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const StepCard = ({ number, title, description, icon }: StepCardProps) => {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-primary">{icon}</div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

interface TrustCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TrustCard = ({ icon, title, description }: TrustCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
