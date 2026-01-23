import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  DollarSign,
  MapPin,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  FileCheck,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Learn More | Vendibook - Sell, Rent & List Mobile Food Assets"
        description="Learn how to sell, rent, or list vendor lots on Vendibook. Verified accounts, secure payments, and nationwide freight."
      />
      <Header />

      <main className="flex-1">
        {/* ==================== HERO ==================== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Vendibook Works
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                The secure marketplace for mobile food assets. Sell, rent, or list vendor lots with verified users and protected payments.
              </p>

              {/* Trust Badges - Simplified */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verified Users
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Secure Payments
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
                  <Truck className="h-4 w-4 text-primary" />
                  Nationwide Freight
                </div>
              </div>

              <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                <Link to="/list">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ==================== THREE OPTIONS ==================== */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Sell Card */}
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                    <DollarSign className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Sell</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Sell food trucks, trailers, and equipment locally or nationwide.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      In-person or secure online payment
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Optional freight coordination
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Free to list, 12.9% on online sales
                    </li>
                  </ul>
                  <Button variant="dark-shine" className="w-full gap-2" asChild>
                    <Link to="/list?mode=sale">
                      Sell an Asset
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Rent Card */}
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                    <CalendarDays className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Rent</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Monetize downtime by renting your assets to verified operators.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      We verify renter documents
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Set your own availability
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      12.9% host commission
                    </li>
                  </ul>
                  <Button variant="dark-shine" className="w-full gap-2" asChild>
                    <Link to="/list?mode=rent">
                      Rent Out an Asset
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Vendor Lots Card */}
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Vendor Lots</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    List your parking lot or space for food truck vendors.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Hourly or daily booking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Define amenities & rules
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      Passive income from space
                    </li>
                  </ul>
                  <Button variant="dark-shine" className="w-full gap-2" asChild>
                    <Link to="/list">
                      List a Vendor Lot
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS - 3 STEPS ==================== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Three Simple Steps
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto mb-4">
                    1
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Create Listing</h3>
                  <p className="text-sm text-muted-foreground">
                    Add photos, set your price, and describe your asset.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Connect with Buyers</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified users reach out. Review requests and approve.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Complete the Deal</h3>
                  <p className="text-sm text-muted-foreground">
                    Get paid securely. We handle the details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== KEY FEATURES ==================== */}
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Why Choose Vendibook
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Verified Users</h3>
                    <p className="text-sm text-muted-foreground">
                      Identity verification reduces fraud and builds trust.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Document Review</h3>
                    <p className="text-sm text-muted-foreground">
                      We verify renter documents so you don't have to.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Secure Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Online checkout with clear records and protection.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Nationwide Freight</h3>
                    <p className="text-sm text-muted-foreground">
                      Sell to buyers across the 48 contiguous states.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FREE TOOLS ==================== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Free Tools
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Resources to Help You Succeed
              </h2>
              <p className="text-muted-foreground mb-8">
                Pricing guidance, permit research, and listing tips — all free.
              </p>
              <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                <Link to="/tools">
                  <Sparkles className="h-4 w-4" />
                  Explore Free Tools
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ==================== FINAL CTA ==================== */}
        <section className="py-20 bg-foreground text-primary-foreground">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg opacity-90 mb-8">
                Create your first listing in minutes.
              </p>
              <Button size="lg" variant="dark-shine" className="gap-2" asChild>
                <Link to="/list">
                  Create a Listing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
