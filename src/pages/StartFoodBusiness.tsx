import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ShieldCheck,
  CreditCard,
  Truck,
  Building2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Star,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';

const StartFoodBusiness = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Launch Your Food Business | Vendibook"
        description="Start your food business today. Find food trucks, trailers, commercial kitchens, and vendor spaces. Sign up free and browse verified listings."
        type="website"
      />

      <Header />

      <main className="flex-1">
        {/* Hero Section — warm background consistent with homepage */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden">
          {/* Warm cream-to-peach base */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FFFAF6 0%, #FFF5EE 30%, #FFEFE4 50%, #FFF5EE 70%, #FFFAF6 100%)' }} />

          {/* Animated warm shine sweep */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, transparent 0%, transparent 30%, rgba(255,255,255,0.9) 42%, rgba(255,237,220,0.5) 50%, rgba(255,255,255,0.9) 58%, transparent 70%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
          />

          {/* Decorative orbs */}
          <motion.div
            className="absolute w-[35rem] h-[35rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255, 200, 160, 0.25), transparent 60%)', filter: 'blur(90px)' }}
            animate={{ x: ['-10%', '50%', '10%', '-10%'], y: ['-5%', '20%', '-10%', '-5%'] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[25rem] h-[25rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255, 120, 70, 0.1), transparent 60%)', filter: 'blur(80px)' }}
            animate={{ x: ['40%', '-20%', '30%', '40%'], y: ['10%', '-5%', '25%', '10%'] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />

          <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left — Copy */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
                  Launch Your{' '}
                  <span className="gradient-text-warm">Food Business</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                  Find verified food trucks, trailers, commercial kitchens, and vendor spaces — all in one place. Sign up free and start browsing.
                </p>

                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Free to browse
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    No hidden fees
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Verified hosts
                  </div>
                </div>

                {/* Already signed in CTA */}
                {user && (
                  <div className="flex gap-3">
                    <Button asChild variant="dark-shine" size="lg" className="rounded-xl">
                      <Link to="/search">
                        <Search className="mr-2 h-5 w-5" />
                        Browse Listings
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-xl">
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </div>
                )}
              </motion.div>

              {/* Right — Sign Up Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              >
                {!user ? (
                  <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-2xl border border-border/40">
                    <AuthFormPanel mode={authMode} setMode={setAuthMode} />
                  </div>
                ) : (
                  <div className="glass-premium rounded-3xl p-8 shadow-2xl border border-border/40 text-center">
                    <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">You're signed in!</h3>
                    <p className="text-muted-foreground mb-6">Start exploring verified listings near you.</p>
                    <Button asChild variant="dark-shine" size="lg" className="w-full rounded-xl">
                      <Link to="/search">
                        <Search className="mr-2 h-5 w-5" />
                        Browse Listings
                      </Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Category Tiles */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What are you looking for?
              </h2>
              <p className="text-muted-foreground text-lg">
                Browse by category to find exactly what you need.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <CategoryTile
                icon={<Truck className="h-8 w-8" />}
                title="Food Trucks"
                description="Mobile kitchens ready to roll"
                href="/search?category=food_truck"
              />
              <CategoryTile
                icon={<Truck className="h-8 w-8" />}
                title="Food Trailers"
                description="Towable cooking spaces"
                href="/search?category=food_trailer"
              />
              <CategoryTile
                icon={<Building2 className="h-8 w-8" />}
                title="Shared Kitchens"
                description="Commercial kitchen space"
                href="/search?category=ghost_kitchen"
              />
              <CategoryTile
                icon={<MapPin className="h-8 w-8" />}
                title="Vendor Spaces"
                description="Prime vending locations"
                href="/search?category=vendor_lot"
              />
            </div>
          </div>
        </section>

        {/* Trust Row */}
        <section className="py-12 border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">Secure payments</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">Verified hosts</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">Escrow protection</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How it works
              </h2>
              <p className="text-muted-foreground text-lg">
                From search to confirmation in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StepCard
                step={1}
                icon={<Search className="h-6 w-6" />}
                title="Search & filter"
                description="Browse listings by category, location, price, and availability."
              />
              <StepCard
                step={2}
                icon={<CalendarCheck className="h-6 w-6" />}
                title="Request & verify"
                description="Submit your request, upload required documents, and message the host."
              />
              <StepCard
                step={3}
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Confirm & pay"
                description="Once approved, pay securely and get instant confirmation."
              />
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What renters are saying
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <TestimonialCard
                quote="Found the perfect taco trailer for my pop-up event. The booking process was seamless."
                author="Maria G."
                role="Event Organizer, Austin"
                rating={5}
              />
              <TestimonialCard
                quote="I was nervous about renting a food truck for the first time, but the verification process gave me confidence."
                author="Devon L."
                role="First-time Renter, LA"
                rating={5}
              />
              <TestimonialCard
                quote="The document requirements were clear from the start. No surprises. Exactly what I needed."
                author="Chris W."
                role="Food Truck Operator, Miami"
                rating={5}
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FFFAF6 0%, #FFEFE4 50%, #FFFAF6 100%)' }} />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of food entrepreneurs on Vendibook.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="dark-shine" size="lg" className="text-lg px-8 rounded-xl">
                <Link to="/search">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Listings
                </Link>
              </Button>
              {!user && (
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 rounded-xl"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Sign Up Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// Sub-components

const CategoryTile = ({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) => (
  <Link to={href}>
    <Card className="group hover:shadow-lg transition-all duration-300 border border-border/40 h-full">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </Link>
);

const StepCard = ({ step, icon, title, description }: { step: number; icon: React.ReactNode; title: string; description: string }) => (
  <div className="text-center">
    <div className="relative inline-block mb-4">
      <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center">
        {icon}
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        {step}
      </span>
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const TestimonialCard = ({ quote, author, role, rating }: { quote: string; author: string; role: string; rating: number }) => (
  <Card className="border border-border/40">
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

export default StartFoodBusiness;
