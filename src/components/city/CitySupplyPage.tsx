import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Shield, 
  CreditCard, 
  Users,
  Star,
  CheckCircle2,
  Zap,
  BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import type { CityData } from '@/data/cityData';
import { ASSET_TYPES } from '@/data/cityData';
import { trackEvent } from '@/lib/analytics';
import { CategoryGuide } from '@/components/categories/CategoryGuide';

// City pages use diverse commercial trailers
import trailerStealthSilver from '@/assets/trailer-stealth-silver.jpg';
import trailerWeddingFlowers from '@/assets/trailer-wedding-flowers.jpg';
import vendorRedStand from '@/assets/vendor-red-stand.jpg';

interface CitySupplyPageProps {
  city: CityData;
  assetType?: keyof typeof ASSET_TYPES;
}

const HOW_IT_WORKS = [
  { step: 1, title: 'Create your listing', desc: 'Add photos, set your price, define availability.' },
  { step: 2, title: 'Get verified', desc: 'Build trust with identity and asset verification.' },
  { step: 3, title: 'Accept bookings', desc: 'Review requests or enable instant booking.' },
  { step: 4, title: 'Get paid', desc: 'Secure payments via PayPal. Funds release after confirmation.' },
];

const FAQS = [
  {
    q: 'How much does it cost to list?',
    a: 'Listing is free. We charge a small platform fee only when you complete a booking.',
  },
  {
    q: 'How do I get paid?',
    a: 'Payments are processed securely through PayPal. Funds are released after the booking is confirmed by both parties.',
  },
  {
    q: 'What if something goes wrong?',
    a: 'Our dispute resolution process protects both hosts and renters. We hold funds in payment protection until confirmation.',
  },
  {
    q: 'Do I need insurance?',
    a: 'We recommend hosts maintain appropriate insurance. Some asset types may require proof of insurance.',
  },
];

export function CitySupplyPage({ city, assetType }: CitySupplyPageProps) {
  const navigate = useNavigate();
  
  // Store city preference
  useEffect(() => {
    localStorage.setItem('user_home_city', city.slug);
    trackEvent({ category: 'City Pages', action: 'city_supply_page_viewed', label: city.slug, metadata: { assetType: assetType || 'all' } });
  }, [city.slug, assetType]);

  const handleStartListing = () => {
    navigate('/list');
  };

  const headline = assetType 
    ? `List your ${ASSET_TYPES[assetType].label.toLowerCase()} in ${city.name}`
    : city.supplyHeadline;

  const assetLabel = assetType ? ASSET_TYPES[assetType].label.toLowerCase() : null;
  const seoTitle = assetType
    ? `${ASSET_TYPES[assetType].label}s in ${city.name} | List & Rent on Vendibook`
    : `Food Trucks, Trailers & Shared Kitchens in ${city.name} | Vendibook`;
  const seoDescription = assetType
    ? `Browse and list ${assetLabel}s in ${city.name}, ${city.state}. Rent, buy, or list mobile food assets on Vendibook.`
    : `Browse food trucks, trailers, shared kitchens, and vendor spaces in ${city.name}. Rent, buy, or list mobile food assets on Vendibook.`;
  const canonicalPath = assetType ? `/${city.slug}/list-${assetType}` : `/${city.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalPath}
        ogTitle={seoTitle}
        ogDescription={seoDescription}
        twitterTitle={seoTitle}
        twitterDescription={seoDescription}
      />
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-foreground/[0.04] via-background to-foreground/[0.02] py-20 lg:py-28">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          {/* Background image collage */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-3 h-full">
              <img src={trailerStealthSilver} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={trailerWeddingFlowers} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              <img src={vendorRedStand} alt="" className="w-full h-full object-cover" aria-hidden="true" />
            </div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 text-foreground text-sm font-medium mb-6">
                <MapPin className="h-4 w-4" />
                {city.name}, {city.state}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                {headline}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                {city.supplySubheadline}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" onClick={handleStartListing} className="text-lg px-8">
                  Start listing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/how-it-works">Learn more</Link>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground/50" />
                  <span>{city.stats.activeListings}+ active listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-foreground/50" />
                  <span>${city.stats.avgDailyRate}/day avg rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-foreground/50" />
                  <span>{city.stats.hostsEarning}+ hosts earning</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You Can List */}
        {!assetType && (
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">What you can list</h2>
              <p className="text-muted-foreground mb-8">Choose the asset type that fits your business.</p>
              
              {/* Mobile: Accordion, Desktop: Compact cards */}
              <div className="md:hidden">
                <CategoryGuide variant="accordion" mode="list" citySlug={city.slug} />
              </div>
              <div className="hidden md:block">
                <CategoryGuide variant="compact" mode="list" citySlug={city.slug} />
              </div>
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
            <p className="text-muted-foreground mb-8">Four simple steps to start earning.</p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map(({ step, title, desc }) => (
                <div key={step} className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-foreground text-background font-bold text-sm">
                      {step}
                    </span>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Layer */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Built for trust</h2>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Secure payments</h3>
                <p className="text-sm text-muted-foreground">Funds held in payment protection until confirmation.</p>
              </div>
              
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                  <BadgeCheck className="h-7 w-7 text-foreground/60" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Verified users</h3>
                <p className="text-sm text-muted-foreground">Identity verification builds trust.</p>
              </div>
              
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Fast payouts</h3>
                <p className="text-sm text-muted-foreground">Get paid directly to your bank.</p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Button variant="link" className="text-foreground/60" asChild>
                <Link to="/how-it-works">
                  Learn more about our trust & safety features
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Hosts love Vendibook</h2>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { name: 'Marcus T.', quote: 'Listed my food truck and had my first booking within a week. The process was seamless.' },
                { name: 'Sarah L.', quote: 'Finally a platform that understands the food truck business. Great support team.' },
                { name: 'James R.', quote: 'The payment protection system gives me peace of mind. I know I will get paid.' },
              ].map((testimonial, i) => (
                <Card key={i} className="bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-foreground/30 text-foreground/30" />
                      ))}
                    </div>
                    <p className="text-foreground mb-4">&quot;{testimonial.quote}&quot;</p>
                    <p className="text-sm text-muted-foreground">— {testimonial.name}, {city.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Local SEO: city-specific marketplace sections */}
        {!assetType && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
                Food trucks, trailers & kitchens in {city.name}
              </h2>
              <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                Whether you're launching a new concept or scaling, find the mobile food assets {city.name} operators rely on.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                {[
                  { title: `Rent a food truck in ${city.name}`, desc: `Browse food trucks available for short-term and long-term rental across ${city.name}, ${city.state}.`, href: `/search?category=food_truck&city=${city.slug}`, cta: 'Browse food trucks' },
                  { title: `Buy a food truck in ${city.name}`, desc: `Compare used and turnkey food trucks for sale from verified ${city.name} sellers.`, href: `/search?category=food_truck&intent=sale&city=${city.slug}`, cta: 'Shop food trucks for sale' },
                  { title: `Shared kitchens & commissaries in ${city.name}`, desc: `Find commissary kitchen access, prep space, and shared commercial kitchens required for mobile vendor permits.`, href: `/search?category=ghost_kitchen&city=${city.slug}`, cta: 'Find shared kitchens' },
                  { title: `List your ${city.name} food truck or kitchen`, desc: `Reach buyers and renters across ${city.state}. Free to list — pay only when a booking completes.`, href: '/list', cta: 'Start a listing' },
                  { title: `${city.name} food business startup resources`, desc: `Permit checklists, startup cost ranges, and step-by-step guides for launching a mobile food business.`, href: '/tools/startup-guide', cta: 'Open the startup guide' },
                  { title: `Food truck permits in ${city.name}`, desc: `Look up local mobile vendor permit requirements, fees, and inspections with PermitPath.`, href: '/tools/permitpath', cta: 'Check permits' },
                ].map((block) => (
                  <Card key={block.title} className="bg-card border hover:border-foreground/20 transition-colors">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{block.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{block.desc}</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={block.href}>{block.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}



        {/* FAQ */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Common questions</h2>
              
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent>{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-background mb-4">
              Ready to start earning in {city.name}?
            </h2>
            <p className="text-background/60 mb-8 max-w-xl mx-auto">
              Create your listing in minutes. It is free to list.
            </p>
            <Button size="lg" onClick={handleStartListing} className="text-lg px-8 bg-background text-foreground hover:bg-background/90">
              Start listing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-xs text-muted-foreground mt-6">
              <Link to="/tools" className="hover:text-background/70 text-background/50 transition-colors">
                Explore Host Tools →
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CitySupplyPage;
