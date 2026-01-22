import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Building, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  Users, 
  AlertTriangle,
  HandshakeIcon,
  Search,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import affirmLogo from '@/assets/affirm-logo-new.png';
import afterpayLogo from '@/assets/afterpay-logo-new.png';
import stripeLogo from '@/assets/stripe-wordmark-blurple.png';

const Payments = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Secure Payments & Buyer Protection | Vendibook"
        description="Secure Stripe-powered payments, protected holds, and flexible checkout options for food truck rentals and purchases. Buy Now Pay Later with Affirm and Afterpay."
        canonical="/payments"
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Secure Transactions
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Secure Payments, Protected Transactions, Flexible Checkout
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Vendibook is built to keep transactions safe, trackable, and fair—with Stripe-powered payments, protected holds, and flexible checkout options for both rentals and purchases.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="dark-shine" asChild>
                  <Link to="/search">
                    <Search className="h-4 w-4 mr-2" />
                    Start Your Search
                  </Link>
                </Button>
                <Button size="lg" variant="dark-shine" asChild>
                  <Link to="/list">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create a Free Listing
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                List in minutes — no monthly fees.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Buying & Selling */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Buying & Selling Assets
                  </h2>
                  <p className="text-muted-foreground">
                    Food Trucks • Trailers • Equipment
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-8 text-lg">
                Buying a food truck is a major investment. Vendibook reduces risk with a protected payment hold and a clear in-app confirmation flow—so you're not handing money to a stranger.
              </p>

              {/* Payment Methods */}
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  How you can pay (Purchases)
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* BNPL */}
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex gap-2">
                          <img src={affirmLogo} alt="Affirm" className="h-5 w-auto dark:invert" />
                          <span className="text-muted-foreground">/</span>
                          <img src={afterpayLogo} alt="Afterpay" className="h-5 w-auto dark:invert" />
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground mb-1">Buy Now, Pay Later</h4>
                      <p className="text-sm text-muted-foreground">
                        Split the purchase into manageable payments (available on eligible checkouts).
                      </p>
                    </CardContent>
                  </Card>

                  {/* ACH */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-medium text-foreground mb-1">ACH / Bank Transfer</h4>
                      <p className="text-sm text-muted-foreground">
                        Best for high-value purchases (secure + low fees).
                      </p>
                    </CardContent>
                  </Card>

                  {/* Cards */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-medium text-foreground mb-1">Credit & Debit Cards</h4>
                      <p className="text-sm text-muted-foreground">
                        Visa, Mastercard, American Express, Discover.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Protection Hold */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  The Vendibook Protection Hold (Sales)
                </h3>
                <p className="text-muted-foreground mb-6">
                  A simple 3-step process that protects both sides:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          1
                        </div>
                        <h4 className="font-medium text-foreground">Funds are secured</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When you click Buy, payment is placed into a secure holding state—not sent directly to the seller.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          2
                        </div>
                        <h4 className="font-medium text-foreground">Verify & inspect</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Meet, inspect the asset, and exchange keys/documents with confidence.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          3
                        </div>
                        <h4 className="font-medium text-foreground">Mutual confirmation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Funds are released only after both parties confirm the sale is complete in the app.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* VendiBook Freight + BNPL */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  VendiBook Freight — Financing Available
                </h3>
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1">
                        <p className="text-muted-foreground mb-3">
                          Shipping a food truck across the country? VendiBook Freight coordinates nationwide delivery — and you can finance the total (including freight) with Affirm or Afterpay at checkout.
                        </p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Freight costs included in your BNPL payment plan</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Split the full purchase + shipping into manageable payments</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Available on eligible checkouts across 48 contiguous states</span>
                          </li>
                        </ul>
                      </div>
                      <div className="flex flex-col items-center gap-3 p-4 bg-background rounded-xl border border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Finance with</p>
                        <div className="flex items-center gap-4">
                          <img src={affirmLogo} alt="Affirm" className="h-6 md:h-7 object-contain dark:invert" />
                          <img src={afterpayLogo} alt="Afterpay" className="h-5 md:h-6 object-contain dark:invert" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CTA for Sales */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center p-6 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground">Selling? Reach serious buyers nationwide.</p>
                <Button variant="dark-shine" asChild>
                  <Link to="/sell-my-food-truck">
                    Create a For-Sale Listing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="dark-shine" asChild>
                  <Link to="/search?mode=sale">
                    Browse Assets For Sale
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Rentals & Bookings */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Rentals & Bookings
                  </h2>
                  <p className="text-muted-foreground">
                    Kitchens • Vendor Lots • Short-Term Trucks
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-8 text-lg">
                Cash flow matters. Vendibook gives renters flexible checkout and gives hosts access to more qualified renters.
              </p>

              {/* BNPL for Rentals */}
              <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex gap-3 items-center">
                      <img src={affirmLogo} alt="Affirm" className="h-6 w-auto dark:invert" />
                      <span className="text-muted-foreground">/</span>
                      <img src={afterpayLogo} alt="Afterpay" className="h-6 w-auto dark:invert" />
                    </div>
                    <Badge>Buy Now, Pay Later</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    If eligible, choose Affirm or Afterpay at checkout and split your total over time.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground text-sm">For Renters</p>
                        <p className="text-sm text-muted-foreground">
                          Spread out costs so you can start earning sooner
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground text-sm">For Hosts</p>
                        <p className="text-sm text-muted-foreground">
                          Reach more renters, while payouts follow the Vendibook schedule
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 24-Hour Safety Window */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  The 24-Hour Safety Window (Rentals)
                </h3>
                <Card className="bg-background">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm">Payment collected at booking</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">held securely</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-sm">host payout starts 24 hours after the booking ends</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      (when no issues are reported)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA for Rentals */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Button variant="dark-shine" asChild>
                  <Link to="/search?mode=rent">
                    <Search className="h-4 w-4 mr-2" />
                    Find a Rental
                  </Link>
                </Button>
                <Button variant="dark-shine" asChild>
                  <Link to="/list">
                    Create a Rental Listing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Resolution Guarantee */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Resolution Guarantee
                  </h2>
                </div>
              </div>

              <p className="text-lg text-muted-foreground mb-8">
                If something goes wrong, we step in fast.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h4 className="font-medium text-foreground">Immediate pause</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reported issues can pause payouts during review
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium text-foreground">Evidence-based review</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Photos, messages, and booking details
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-emerald-500" />
                      <h4 className="font-medium text-foreground">Target timeline</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We aim to resolve claims within 5 business days, depending on evidence completeness
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Button variant="dark-shine" asChild>
                  <Link to="/help/buyer-protection">
                    <HandshakeIcon className="h-4 w-4 mr-2" />
                    Learn How Protection Works
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/50 to-background">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to buy, book, or list—confidently?
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <Button size="lg" variant="dark-shine" asChild>
                  <Link to="/search">
                    <Search className="h-4 w-4 mr-2" />
                    Start Your Search
                  </Link>
                </Button>
                <Button size="lg" variant="dark-shine" asChild>
                  <Link to="/list">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create a Free Listing
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                List For Sale • List For Rent
              </p>

              {/* Stripe Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Powered by</span>
                <img src={stripeLogo} alt="Stripe" className="h-6 w-auto" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Payments;
