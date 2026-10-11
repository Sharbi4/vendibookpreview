import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Truck, Building2, Warehouse, Search, ArrowRight, ArrowUpRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd, { generateLocalBusinessSchema, generateCityServiceSchema } from '@/components/JsonLd';
import { generateBreadcrumbSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { excludeTestListings, isExcludedTestListingTitle } from '@/lib/excludeTestListings';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { getCityFromSlug, ASSET_TYPES } from '@/data/cityData';
import type { Listing } from '@/types/listing';

interface DynamicCityPageProps {
  mode?: 'rent' | 'sale';
  category?: 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot';
}

const CATEGORY_TILES = [
  { key: 'food_truck', label: 'Food Trucks', icon: Truck, description: 'Fully-equipped mobile kitchens' },
  { key: 'food_trailer', label: 'Food Trailers', icon: Warehouse, description: 'Towable commercial kitchens' },
  { key: 'ghost_kitchen', label: 'Shared Kitchens', icon: Building2, description: 'Commercial kitchen space' },
  { key: 'vendor_lot', label: 'Vendor Spaces', icon: MapPin, description: 'Prime vending locations' },
] as const;

const DynamicCityPage = ({ mode, category }: DynamicCityPageProps) => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? getCityFromSlug(citySlug) : null;

  // Live inventory for this city — never fabricated counts.
  const { data: cityListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['city-listings', city?.slug, category ?? 'all', mode ?? 'all'],
    enabled: Boolean(city),
    staleTime: 60_000,
    queryFn: async () => {
      if (!city) return [] as Listing[];

      // Keep Houston's landing page on the same search-listings query as Browse
      // so its Texas-area inclusion stays centralized server-side.
      if (city.slug === 'houston') {
        const { data, error } = await supabase.functions.invoke('search-listings', {
          body: {
            query: `${city.name}, ${city.state}`,
            category,
            mode,
            page: 1,
            page_size: 12,
            sort_by: 'newest',
          },
        });
        if (error) throw error;
        const rows = (((data as { listings?: Listing[] } | null)?.listings ?? []) as Listing[])
          .filter((listing) => !isExcludedTestListingTitle(listing.title));
        return filterPubliclyVisible(rows) as unknown as Listing[];
      }

      let query = excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .is('deleted_at', null)
          .eq('moderation_status', 'clear')
          .eq('state', city.state)
          .ilike('city', city.name)
      );
      if (category) query = query.eq('category', category);
      if (mode) query = query.eq('mode', mode);

      const { data, error } = await query.order('published_at', { ascending: false }).limit(12);
      if (error) throw error;
      return filterPubliclyVisible(data ?? []) as unknown as Listing[];
    },
  });

  if (!city) {
    // Invalid city slug - redirect to homepage
    return <Navigate to="/" replace />;
  }

  const categoryLabel = category
    ? ASSET_TYPES[category.replace('_', '-') as keyof typeof ASSET_TYPES]?.label
    : null;

  const modeLabel = mode === 'sale' ? 'for Sale' : mode === 'rent' ? 'for Rent' : '';

  const pageTitle = categoryLabel
    ? `${categoryLabel}s ${modeLabel} in ${city.name}, ${city.state}`
    : `Food Trucks & Mobile Kitchens ${modeLabel} in ${city.name}, ${city.state}`;

  const pageDescription = categoryLabel
    ? `Browse ${categoryLabel.toLowerCase()}s ${modeLabel.toLowerCase()} in ${city.name}, ${city.state}. Compare listings, message owners, and buy or rent on Vendibook.`
    : `Browse food trucks, food trailers, shared kitchens, and vendor spaces in ${city.name}, ${city.state}. Compare listings, message owners, and buy or rent on Vendibook.`;

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

  const listings = cityListings ?? [];
  const hasListings = listings.length > 0;

  const heading = [
    categoryLabel ? `${categoryLabel}s` : 'Food trucks & mobile kitchens',
    modeLabel,
    `in ${city.name}`,
  ].filter(Boolean).join(' ');

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

      <main className="flex-1 sale-light">
        {/* Hero */}
        <section className="pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="container max-w-5xl">
            <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span className="mx-1.5">/</span>
              <Link to="/cities" className="hover:text-foreground transition-colors">Cities</Link>
              <span className="mx-1.5">/</span>
              <span className="text-foreground">{city.name}</span>
            </nav>

            <span className="inline-flex items-center gap-1.5 rounded-full chip-accent px-3 py-1 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {city.name}, {city.state}
            </span>

            <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.08]">
              {heading}
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {city.tagline}. Compare available equipment and spaces near {city.name}, message the owner
              directly, and complete the deal online or in person.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button size="lg" variant="cta" asChild>
                <Link to={`/search?${searchParams.toString()}`}>
                  <Search className="mr-2 h-4 w-4" />
                  Browse {city.name} listings
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl" asChild>
                <Link to="/list">List your equipment free</Link>
              </Button>
            </div>

            {!listingsLoading && (
              <p className="mt-4 text-sm text-muted-foreground">
                {hasListings
                  ? `${listings.length}${listings.length === 12 ? '+' : ''} live ${listings.length === 1 ? 'listing' : 'listings'} in ${city.name} right now.`
                  : `No live listings in ${city.name} right now — browse nearby inventory or be the first to list.`}
              </p>
            )}
          </div>
        </section>

        {/* Live inventory */}
        <section className="pb-14">
          <div className="container max-w-6xl">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  Available in {city.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Live listings from owners and sellers, updated as they publish.
                </p>
              </div>
              <Link
                to={`/search?${searchParams.toString()}`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {listingsLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}
              </div>
            ) : hasListings ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.slice(0, 6).map((listing) => (
                  <ListingCard key={listing.id} listing={listing} variant="search" />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Nothing is published in {city.name} at the moment. New equipment is added regularly —
                  search nationwide, or list your own truck, trailer, or kitchen for free.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="cta" asChild><Link to="/search">Search nationwide</Link></Button>
                  <Button variant="outline" className="rounded-2xl" asChild><Link to="/list">List free</Link></Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        {!category && (
          <section className="pb-14">
            <div className="container max-w-6xl">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-5">
                Browse by category in {city.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORY_TILES.map((tile) => {
                  const Icon = tile.icon;
                  const tileParams = new URLSearchParams(searchParams);
                  tileParams.set('category', tile.key);
                  return (
                    <Link
                      key={tile.key}
                      to={`/search?${tileParams.toString()}`}
                      className="group rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </span>
                      <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tile.label}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{tile.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Neighborhoods */}
        <section className="pb-14">
          <div className="container max-w-5xl">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-5">
              Popular {city.name} areas
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {city.neighborhoods.map((neighborhood) => {
                const neighborhoodParams = new URLSearchParams(searchParams);
                neighborhoodParams.set('location', `${neighborhood}, ${city.name}, ${city.state}`);
                return (
                  <Link
                    key={neighborhood}
                    to={`/search?${neighborhoodParams.toString()}`}
                    className="rounded-2xl border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {neighborhood}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="pb-14">
          <div className="container max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to={`/${city.slug}/browse`}
                className="group flex items-center justify-between rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span>
                  <span className="block font-semibold text-foreground group-hover:text-primary transition-colors">
                    Rentals in {city.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">Trucks, trailers, and kitchens to rent</span>
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                to={`/${city.slug}/list`}
                className="group flex items-center justify-between rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span>
                  <span className="block font-semibold text-foreground group-hover:text-primary transition-colors">
                    List in {city.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">Publish free in a few minutes</span>
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </section>

        {/* Editorial / SEO content */}
        <section className="pb-16">
          <div className="container max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">
                About {categoryLabel ? `${categoryLabel.toLowerCase()}s` : 'mobile food equipment'} in {city.name}
              </h2>
              <div className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  {city.name}, {city.state} is an active market for mobile food operators. Vendibook lists
                  trucks, trailers, shared kitchens, and vendor spaces from owners across the metro — including{' '}
                  {city.neighborhoods.slice(0, 3).join(', ')} — so you can compare real inventory instead of
                  chasing classified ads.
                </p>
                <p>
                  Every listing shows the owner's details, specs, and photos. Message the owner directly,
                  pay through Vendibook checkout, or settle in person when the seller offers it. Equipment
                  financing is available for eligible buyers through a third-party provider; Vendibook is
                  not the lender.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pb-20">
          <div className="container max-w-4xl">
            <div className="rounded-3xl border border-border bg-card p-8 md:p-10 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Ready to move in {city.name}?
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Search live inventory or publish your own listing free — the 12.9% platform fee applies only
                when a transaction is paid through Vendibook.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="cta" asChild>
                  <Link to={`/search?${searchParams.toString()}`}>Browse listings</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl" asChild>
                  <Link to="/list">List your equipment free</Link>
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

export default DynamicCityPage;
