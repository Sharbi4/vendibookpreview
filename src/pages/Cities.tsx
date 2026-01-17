import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ShieldCheck, CreditCard, FileText, Headphones, Truck, ChefHat, Building2, MapPinned } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CITY_DATA } from '@/data/cityData';
import { 
  trackCitiesPageViewed, 
  trackCityCardBrowseClicked, 
  trackCityCardListClicked 
} from '@/lib/analytics';
import TrustModal from '@/components/trust/TrustModal';
import { trustTiles, TrustTile } from '@/components/trust/trustContent';

const CITIES = Object.values(CITY_DATA);

const CATEGORY_LINKS = [
  { label: 'Food Trucks', href: '/search?category=food_truck', icon: Truck },
  { label: 'Food Trailers', href: '/search?category=food_trailer', icon: ChefHat },
  { label: 'Vendor Lots', href: '/search?category=vendor_lot', icon: MapPinned },
  { label: 'Ghost Kitchens', href: '/search?category=ghost_kitchen', icon: Building2 },
];

const TRUST_ITEMS = [
  { id: 'identity-verified', icon: ShieldCheck, label: 'Verified Users' },
  { id: 'secure-payments', icon: CreditCard, label: 'Secure Payments' },
  { id: 'required-documents', icon: FileText, label: 'Document Workflows' },
  { id: 'support-24-7', icon: Headphones, label: '24/7 Support' },
];

const Cities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trustModalOpen, setTrustModalOpen] = useState(false);
  const [activeTile, setActiveTile] = useState<TrustTile | null>(null);

  useEffect(() => {
    trackCitiesPageViewed();
  }, []);

  const filteredCities = CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBrowseClick = (citySlug: string) => {
    trackCityCardBrowseClicked(citySlug);
  };

  const handleListClick = (citySlug: string) => {
    trackCityCardListClicked(citySlug);
  };

  const handleTrustClick = (tileId: string) => {
    const tile = trustTiles.find(t => t.id === tileId);
    if (tile) {
      setActiveTile(tile);
      setTrustModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
          <div className="container text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <MapPin className="h-4 w-4" />
              4 Launch Markets
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Explore Vendibook by city
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Browse listings or list your asset in our launch markets.
            </p>
            
            {/* Search Input */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search a city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>
        </section>

        {/* City Grid */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredCities.map((city) => (
                <Card key={city.slug} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{city.name}</h3>
                        <p className="text-sm text-muted-foreground">{city.state}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {city.stats.activeListings} listings
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {city.tagline}
                    </p>
                    
                    <div className="text-xs text-muted-foreground mb-4">
                      <span className="font-medium text-foreground">${city.stats.avgDailyRate}</span> avg/day
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        asChild 
                        className="flex-1"
                        onClick={() => handleBrowseClick(city.slug)}
                      >
                        <Link to={`/${city.slug}/browse`}>Browse</Link>
                      </Button>
                      <Button 
                        asChild 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleListClick(city.slug)}
                      >
                        <Link to={`/${city.slug}/list`}>List</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCities.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No cities found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            )}
          </div>
        </section>

        {/* Popular Categories */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <h2 className="text-lg font-semibold text-foreground text-center mb-6">
              Browse by category
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {CATEGORY_LINKS.map((cat) => (
                <Button
                  key={cat.href}
                  asChild
                  variant="outline"
                  className="gap-2"
                >
                  <Link to={cat.href}>
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Row */}
        <section className="py-12">
          <div className="container">
            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              {TRUST_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTrustClick(item.id)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Whether you're looking to rent or list, we've got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/search">Browse listings</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/list">List your asset</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Trust Modal */}
      <TrustModal
        tile={activeTile}
        open={trustModalOpen}
        onOpenChange={setTrustModalOpen}
      />

      <Footer />
    </div>
  );
};

export default Cities;
