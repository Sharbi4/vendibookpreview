import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FileCheck,
  MessageCircle,
  CheckCircle2,
  Truck,
  Building2,
  MapPin,
  Star,
  Clock,
  CalendarCheck,
} from 'lucide-react';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';

// Food truck images
// Browse page uses commercial/professional trailers
import trailerStealthSilver from '@/assets/trailer-stealth-silver.jpg';
import trailerWhiteEvent from '@/assets/trailer-white-event.jpg';
import trailerOrangeGrill from '@/assets/trailer-orange-grill.jpg';

const Browse = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Browse Food Trucks, Trailers & Kitchens | Vendibook"
        description="Find verified food trucks, trailers, ghost kitchens, and vendor lots. Book or buy with confidence—requirements upfront, secure workflows, and 24/7 support."
        type="website"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ 
        __html: JSON.stringify([generateOrganizationSchema(), generateWebSiteSchema()])
      }} />
      
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-vendibook-cream via-white to-primary/5 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_50%)]" />
          {/* Background image collage */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-3 h-full">
              <img src={trailerStealthSilver} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={trailerWhiteEvent} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={trailerOrangeGrill} alt="" className="w-full h-full object-cover" aria-hidden="true" />
            </div>
          </div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Find verified trucks, trailers, kitchens, and vendor lots
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Book or buy with confidence. Requirements upfront, secure workflows, and real-time status tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button asChild size="lg" variant="gradient-premium" className="text-lg px-8 py-6">
                  <Link to="/search">
                    <Search className="mr-2 h-5 w-5" />
                    Search Listings
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/how-it-works">Learn More</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free to browse · No hidden fees · Pay only when you book</p>
            </div>
          </div>
        </section>

        {/* Category Tiles */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
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
                title="Ghost Kitchens"
                description="Commercial kitchen space"
                href="/search?category=ghost_kitchen"
              />
              <CategoryTile
                icon={<MapPin className="h-8 w-8" />}
                title="Vendor Lots"
                description="Prime vending locations"
                href="/search?category=vendor_lot"
              />
            </div>
          </div>
        </section>

        {/* Why Book Here - Trust Layer */}
        <section className="py-12 md:py-16 bg-vendibook-cream">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Why book on Vendibook?
              </h2>
              <p className="text-muted-foreground">
                Every transaction is protected by our marketplace guarantees.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
              <TrustBadge icon={<ShieldCheck />} label="Verified hosts" />
              <TrustBadge icon={<CreditCard />} label="Secure payments" />
              <TrustBadge icon={<FileCheck />} label="Requirements upfront" />
              <TrustBadge icon={<MessageCircle />} label="Direct messaging" />
            </div>
          </div>
        </section>

        {/* How It Works - 3 Steps */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How booking works
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

        {/* Popular Cities - SEO */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Popular cities
              </h2>
              <p className="text-muted-foreground text-lg">
                Find listings near you or explore new markets.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {['Los Angeles', 'Houston', 'Phoenix', 'Austin', 'Miami', 'Atlanta', 'Dallas', 'San Diego', 'Denver', 'Portland'].map((city) => (
                <Link
                  key={city}
                  to={`/search?q=${encodeURIComponent(city)}`}
                  className="px-4 py-2 rounded-full bg-background border border-border text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What renters are saying
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <TestimonialCard
                quote="Found the perfect taco trailer for my pop-up event. The booking process was seamless, and the host was super responsive."
                author="Maria G."
                role="Event Organizer, Austin"
                rating={5}
              />
              <TestimonialCard
                quote="I was nervous about renting a food truck for the first time, but the verification process gave me confidence the host was legit."
                author="Devon L."
                role="First-time Renter, LA"
                rating={5}
              />
              <TestimonialCard
                quote="The document requirements were clear from the start. No surprises. I knew exactly what I needed before booking."
                author="Chris W."
                role="Food Truck Operator, Miami"
                rating={5}
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-vendibook-cream to-vendibook-orange-light">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Ready to find your next asset?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Browse hundreds of verified listings and book with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="gradient-premium" className="text-lg px-8 py-6">
                  <Link to="/search">
                    <Search className="mr-2 h-5 w-5" />
                    Search Listings
                    <ArrowRight className="ml-2 h-5 w-5" />
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

// Sub-components

interface CategoryTileProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const CategoryTile = ({ icon, title, description, href }: CategoryTileProps) => (
  <Link to={href}>
    <Card className="card-hover border-0 shadow-sm h-full">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </Link>
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

interface StepCardProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const StepCard = ({ step, icon, title, description }: StepCardProps) => (
  <div className="text-center">
    <div className="relative inline-block mb-4">
      <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
        {icon}
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
        {step}
      </span>
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

export default Browse;
