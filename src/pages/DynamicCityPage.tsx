import { useParams, Navigate, Link } from 'react-router-dom';
import { MapPin, Truck, Building2, Warehouse, Search, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd, { generateLocalBusinessSchema, generateCityServiceSchema } from '@/components/JsonLd';
import { generateBreadcrumbSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CITY_DATA, getCityFromSlug, ASSET_TYPES } from '@/data/cityData';

interface DynamicCityPageProps {
  mode?: 'rent' | 'sale';
  category?: 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot';
}

const DynamicCityPage = ({ mode, category }: DynamicCityPageProps) => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? getCityFromSlug(citySlug) : null;
  
  if (!city) {
    return <Navigate to="/cities" replace />;
  }

  const categoryLabel = category 
    ? ASSET_TYPES[category.replace('_', '-') as keyof typeof ASSET_TYPES]?.label 
    : null;
  
  const modeLabel = mode === 'sale' ? 'for Sale' : mode === 'rent' ? 'for Rent' : '';
  
  const pageTitle = categoryLabel 
    ? `${categoryLabel}s ${modeLabel} in ${city.name}, ${city.state}`
    : `Food Trucks & Mobile Kitchens ${modeLabel} in ${city.name}, ${city.state}`;
  
  const pageDescription = categoryLabel
    ? `Browse ${categoryLabel.toLowerCase()}s ${modeLabel.toLowerCase()} in ${city.name}, ${city.state}. Find the perfect ${categoryLabel.toLowerCase()} for your business.`
    : `Rent or buy food trucks, food trailers, ghost kitchens, and vendor lots in ${city.name}, ${city.state}. ${city.tagline}.`;

  const canonicalPath = category 
    ? `/${city.slug}/${category.replace('_', '-')}${mode ? `/${mode}` : ''}`
    : `/${city.slug}${mode ? `/${mode}` : ''}`;

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Cities', url: '/cities' },
    { name: city.name, url: `/${city.slug}` },
    ...(categoryLabel ? [{ name: categoryLabel + 's', url: canonicalPath }] : []),
  ];

  const searchParams = new URLSearchParams();
  if (city.name) searchParams.set('location', `${city.name}, ${city.state}`);
  if (category) searchParams.set('category', category);
  if (mode) searchParams.set('mode', mode);

  const assetTypes = [
    { 
      key: 'food_truck', 
      label: 'Food Trucks', 
      icon: Truck, 
      description: 'Fully-equipped mobile kitchens',
      count: Math.floor(city.stats.activeListings * 0.4),
    },
    { 
      key: 'food_trailer', 
      label: 'Food Trailers', 
      icon: Warehouse, 
      description: 'Towable commercial kitchens',
      count: Math.floor(city.stats.activeListings * 0.3),
    },
    { 
      key: 'ghost_kitchen', 
      label: 'Ghost Kitchens', 
      icon: Building2, 
      description: 'Commercial kitchen space',
      count: Math.floor(city.stats.activeListings * 0.15),
    },
    { 
      key: 'vendor_lot', 
      label: 'Vendor Lots', 
      icon: MapPin, 
      description: 'Prime vending locations',
      count: Math.floor(city.stats.activeListings * 0.15),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalPath}
      />
      <JsonLd schema={[
        generateLocalBusinessSchema(city.name, city.state),
        ...(category && mode 
          ? [generateCityServiceSchema(city.name, city.state, category, mode)]
          : []
        ),
        generateBreadcrumbSchema(breadcrumbs),
      ]} />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 text-primary mb-4">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">{city.name}, {city.state}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {categoryLabel 
                  ? `${categoryLabel}s ${modeLabel}`
                  : `Mobile Food Assets ${modeLabel}`
                }
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {city.tagline}. {pageDescription}
              </p>
              
              <Button size="lg" asChild className="gap-2">
                <Link to={`/search?${searchParams.toString()}`}>
                  <Search className="h-4 w-4" />
                  Browse {city.name} Listings
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 border-b">
          <div className="container">
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{city.stats.activeListings}+</div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">${city.stats.avgDailyRate}</div>
                <div className="text-sm text-muted-foreground">Avg. Daily Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{city.stats.hostsEarning}+</div>
                <div className="text-sm text-muted-foreground">Active Hosts</div>
              </div>
            </div>
          </div>
        </section>

        {/* Asset Types */}
        {!category && (
          <section className="py-12 container">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Browse by Category
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {assetTypes.map((asset) => {
                const Icon = asset.icon;
                const assetSearchParams = new URLSearchParams(searchParams);
                assetSearchParams.set('category', asset.key);
                
                return (
                  <Link key={asset.key} to={`/search?${assetSearchParams.toString()}`}>
                    <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 group">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{asset.label}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{asset.description}</p>
                        <span className="text-xs text-primary font-medium">{asset.count}+ available</span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Neighborhoods */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Popular {city.name} Neighborhoods
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {city.neighborhoods.map((neighborhood) => {
                const neighborhoodParams = new URLSearchParams(searchParams);
                neighborhoodParams.set('location', `${neighborhood}, ${city.name}, ${city.state}`);
                
                return (
                  <Link 
                    key={neighborhood} 
                    to={`/search?${neighborhoodParams.toString()}`}
                    className="px-4 py-2 rounded-full bg-background border hover:border-primary hover:text-primary transition-colors"
                  >
                    {neighborhood}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Related Links */}
        <section className="py-12 container">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Explore {city.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link to={`/${city.slug}/browse`}>
              <Card className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Browse Rentals
                    </h3>
                    <p className="text-sm text-muted-foreground">Find assets to rent</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
            <Link to={`/${city.slug}/list`}>
              <Card className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      List Your Asset
                    </h3>
                    <p className="text-sm text-muted-foreground">Start earning in {city.name}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl">
            <h2 className="text-xl font-bold text-foreground mb-4">
              About {categoryLabel ? `${categoryLabel}s` : 'Mobile Food Assets'} in {city.name}
            </h2>
            <div className="prose prose-sm text-muted-foreground">
              <p>
                {city.name}, {city.state} has become a thriving hub for mobile food entrepreneurs. 
                With its vibrant food scene and business-friendly environment, {city.name} offers 
                excellent opportunities for food truck operators, trailer owners, and ghost kitchen concepts.
              </p>
              <p>
                Vendibook connects you with verified {categoryLabel?.toLowerCase() || 'mobile food asset'} owners 
                across {city.name}'s most popular areas, including {city.neighborhoods.slice(0, 3).join(', ')}, and more.
                Whether you're launching a new concept or expanding your existing operation, find the perfect 
                {categoryLabel ? ` ${categoryLabel.toLowerCase()}` : ' asset'} for your business.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 container text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to Get Started in {city.name}?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join {city.stats.hostsEarning}+ hosts already earning on Vendibook in {city.name}.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link to={`/search?${searchParams.toString()}`}>Browse Listings</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/list">List Your Asset</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DynamicCityPage;
