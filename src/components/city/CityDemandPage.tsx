import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Shield, 
  BadgeCheck,
  CreditCard,
  Bell,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, ListingCategory } from '@/types/listing';
import type { CityData } from '@/data/cityData';
import { trackEvent, trackSearchStarted } from '@/lib/analytics';
import { CategoryGuide, CategoryTooltip } from '@/components/categories/CategoryGuide';

interface CityDemandPageProps {
  city: CityData;
}

export function CityDemandPage({ city }: CityDemandPageProps) {
  const navigate = useNavigate();
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  // Store city preference and track view
  useEffect(() => {
    localStorage.setItem('user_home_city', city.slug);
    localStorage.setItem('default_search_location', city.name);
    trackEvent({ category: 'City Pages', action: 'city_demand_page_viewed', label: city.slug });
  }, [city.slug, city.name]);

  // Fetch featured listings for this city
  useEffect(() => {
    async function fetchListings() {
      try {
        const { data } = await supabase
          .from('listings')
          .select('id, title, cover_image_url, category, price_daily, address')
          .eq('status', 'published')
          .or(`city.eq.${city.name},address.ilike.%${city.name}%`)
          .limit(6);
        
        setFeaturedListings(data || []);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setIsLoadingListings(false);
      }
    }
    fetchListings();
  }, [city.name]);

  const handleSearch = (category?: string) => {
    const params = new URLSearchParams({
      location: city.name,
    });
    if (category) {
      params.set('category', category);
    }
    trackSearchStarted(city.name);
    navigate(`/search?${params.toString()}`);
  };

  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail) return;

    try {
      await supabase.from('availability_alerts').insert({
        email: alertEmail,
        zip_code: city.name,
        mode: 'rent',
      });
      setAlertSubmitted(true);
      trackEvent({ category: 'Activation', action: 'alerts_enabled', label: city.slug, metadata: { email: alertEmail } });
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 py-20 lg:py-28">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <MapPin className="h-4 w-4" />
                {city.name}, {city.state}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                {city.demandHeadline}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                {city.demandSubheadline}
              </p>

              <Button size="lg" onClick={() => handleSearch()} className="text-lg px-8">
                <Search className="mr-2 h-5 w-5" />
                Search listings
              </Button>
            </div>
          </div>
        </section>

        {/* Category Guide */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">What's available?</h2>
            <p className="text-muted-foreground mb-8">Find exactly what you need in {city.name}.</p>
            
            {/* Mobile: Accordion, Desktop: Compact cards */}
            <div className="md:hidden">
              <CategoryGuide variant="accordion" mode="browse" citySlug={city.slug} />
            </div>
            <div className="hidden md:block">
              <CategoryGuide variant="compact" mode="browse" citySlug={city.slug} />
            </div>
          </div>
        </section>

        {/* Trust Row */}
        <section className="py-12 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-600" />
                <span className="text-foreground font-medium">Secure payments</span>
              </div>
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-6 w-6 text-primary" />
                <span className="text-foreground font-medium">Verified hosts</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-amber-600" />
                <span className="text-foreground font-medium">Escrow protection</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Featured in {city.name}</h2>
                <p className="text-muted-foreground">Popular rentals near you.</p>
              </div>
              <Button variant="outline" onClick={() => handleSearch()}>
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {isLoadingListings ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : featuredListings.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredListings.map((listing) => (
                  <Link key={listing.id} to={`/listing/${listing.id}`}>
                    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                      <div className="relative h-48">
                        <img
                          src={listing.cover_image_url || '/placeholder.svg'}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <CategoryTooltip category={listing.category as ListingCategory} side="bottom">
                          <span className="absolute top-3 left-3 px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-xs font-medium cursor-help">
                            {CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS]}
                          </span>
                        </CategoryTooltip>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{listing.address}</p>
                        {listing.price_daily && (
                          <p className="text-primary font-semibold">${listing.price_daily}/day</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No listings yet in {city.name}</h3>
                <p className="text-muted-foreground mb-4">Be the first to know when assets become available.</p>
                <Button variant="outline" onClick={() => setAlertSubmitted(false)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Get alerts
                </Button>
              </Card>
            )}
          </div>
        </section>

        {/* Save Search / Get Alerts */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <Bell className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Get notified of new listings</h2>
              <p className="text-muted-foreground mb-6">
                We'll email you when new assets become available in {city.name}.
              </p>
              
              {alertSubmitted ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <BadgeCheck className="h-5 w-5" />
                  <span className="font-medium">Alerts enabled! We'll notify you.</span>
                </div>
              ) : (
                <form onSubmit={handleAlertSubmit} className="flex gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Bell className="mr-2 h-4 w-4" />
                    Get alerts
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Find the perfect rental in {city.name}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Browse verified listings from trusted hosts.
            </p>
            <Button size="lg" onClick={() => handleSearch()} className="text-lg px-8">
              <Search className="mr-2 h-5 w-5" />
              Search listings
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CityDemandPage;
