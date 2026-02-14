import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd, { generateItemListSchema, generateCityCategoryBreadcrumbSchema } from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  getCityFromStateSlug,
  CATEGORY_SLUG_MAP,
  CATEGORY_LABELS_PLURAL,
  CATEGORY_TO_SLUG,
  getCityStateSlug,
  CITY_DATA,
} from '@/data/cityData';

interface CategoryCityPageProps {
  mode: 'rent' | 'buy';
}

interface ListingRow {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  mode: string;
  category: string;
  address: string | null;
  status: string;
  instant_book: boolean | null;
}

const CategoryCityPage = ({ mode }: CategoryCityPageProps) => {
  const { categorySlug, cityStateSlug } = useParams<{ categorySlug: string; cityStateSlug: string }>();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const city = cityStateSlug ? getCityFromStateSlug(cityStateSlug) : null;
  const dbCategory = categorySlug ? CATEGORY_SLUG_MAP[categorySlug] : null;
  const categoryLabel = dbCategory ? CATEGORY_LABELS_PLURAL[dbCategory] : null;
  const modeLabel = mode === 'rent' ? 'for Rent' : 'for Sale';
  const dbMode = mode === 'buy' ? 'sale' : 'rent';

  useEffect(() => {
    const fetchListings = async () => {
      if (!city || !dbCategory) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('listings')
        .select('id, title, description, cover_image_url, price_daily, price_weekly, price_sale, mode, category, address, status, instant_book')
        .eq('status', 'published')
        .eq('category', dbCategory as any)
        .eq('mode', dbMode)
        .or(`city.eq.${city.name},address.ilike.%${city.name}%`)
        .limit(50);

      setListings(data || []);
      setIsLoading(false);
    };

    fetchListings();
  }, [city?.name, dbCategory, dbMode]);

  if (!city || !categoryLabel || !dbCategory) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Page not found</h1>
          <Button variant="dark-shine" asChild>
            <Link to="/search">Browse all listings</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const seoTitle = `${categoryLabel} ${modeLabel} in ${city.name}, ${city.stateCode} | Vendibook`;
  const metaDescription = `Browse ${categoryLabel.toLowerCase()} ${modeLabel.toLowerCase()} in ${city.name}, ${city.stateCode}. Book instantly on Vendibook — the marketplace for food trucks, trailers, kitchens, and vendor spaces.`;
  const canonicalPath = `/${mode}/${categorySlug}/${cityStateSlug}`;

  const seoIntro = city.seoIntros?.[dbCategory] || '';

  // Related categories for internal linking
  const otherCategories = Object.entries(CATEGORY_SLUG_MAP)
    .filter(([, dbCat]) => dbCat !== dbCategory)
    .map(([slug, dbCat]) => ({
      slug,
      label: CATEGORY_LABELS_PLURAL[dbCat],
      url: `/${mode}/${slug}/${cityStateSlug}`,
    }));

  // Other cities for same category (pick 5)
  const otherCities = Object.values(CITY_DATA)
    .filter((c) => c.slug !== city.slug)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      stateCode: c.stateCode,
      url: `/${mode}/${categorySlug}/${getCityStateSlug(c)}`,
    }));

  // Schema
  const itemListSchema = generateItemListSchema(
    listings.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      cover_image_url: l.cover_image_url,
      mode: l.mode as 'rent' | 'sale',
      category: l.category,
      price_daily: l.price_daily,
      price_weekly: l.price_weekly,
      price_sale: l.price_sale,
      status: l.status,
    })),
    { mode: dbMode as any, category: dbCategory, location: `${city.name}, ${city.stateCode}` }
  );

  const breadcrumbSchema = generateCityCategoryBreadcrumbSchema(mode, categorySlug!, categoryLabel, cityStateSlug!, city.name, city.stateCode);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={seoTitle} description={metaDescription} canonical={canonicalPath} />
      <JsonLd schema={[itemListSchema, breadcrumbSchema]} />
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-10 space-y-8">
          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/search?mode=${dbMode}`}>{mode === 'rent' ? 'For Rent' : 'For Sale'}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/search?mode=${dbMode}&category=${dbCategory}`}>{categoryLabel}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{city.name}, {city.stateCode}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* H1 */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {categoryLabel} {modeLabel} in {city.name}, {city.stateCode}
            </h1>
            {seoIntro && (
              <p className="text-muted-foreground text-base md:text-lg max-w-3xl leading-relaxed">
                {seoIntro}
              </p>
            )}
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((l) => {
                const price = l.mode === 'rent' ? (l.price_daily || l.price_weekly) : l.price_sale;
                const priceLabel = l.mode === 'rent' ? (l.price_daily ? '/day' : '/week') : '';
                const locationShort = l.address?.split(',').slice(-2).join(',').trim();

                return (
                  <Link
                    key={l.id}
                    to={`/listing/${l.id}`}
                    className="group rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow bg-card"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      <img
                        src={l.cover_image_url || '/placeholder.svg'}
                        alt={`${l.title} - ${categoryLabel?.slice(0, -1)} ${modeLabel} in ${city.name}, ${city.stateCode}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {l.instant_book && (
                        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                          ⚡ Instant
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-1.5">
                      <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {l.title}
                      </h3>
                      {locationShort && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {locationShort}
                        </p>
                      )}
                      {price != null && (
                        <p className="text-base font-bold text-foreground">
                          ${price.toLocaleString()}{priceLabel}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <p className="text-lg text-muted-foreground">
                No {categoryLabel.toLowerCase()} {modeLabel.toLowerCase()} in {city.name} yet.
              </p>
              <p className="text-muted-foreground">
                Be the first to list — or browse other cities below.
              </p>
              <Button variant="dark-shine" asChild>
                <Link to="/list">List Your Asset <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          )}

          {/* Internal Linking: Related Categories */}
          <section className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground">
              More in {city.name}, {city.stateCode}
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={cat.url}
                  className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {cat.label} {modeLabel}
                </Link>
              ))}
              {mode === 'rent' && (
                <Link
                  to={`/buy/${categorySlug}/${cityStateSlug}`}
                  className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {categoryLabel} for Sale
                </Link>
              )}
              {mode === 'buy' && (
                <Link
                  to={`/rent/${categorySlug}/${cityStateSlug}`}
                  className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {categoryLabel} for Rent
                </Link>
              )}
            </div>
          </section>

          {/* Internal Linking: Other Cities */}
          <section className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {categoryLabel} {modeLabel} in Other Cities
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.map((c: any) => (
                <Link
                  key={c.name}
                  to={c.url}
                  className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {c.name}, {c.stateCode}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryCityPage;
