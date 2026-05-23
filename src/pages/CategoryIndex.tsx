import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, ArrowRight, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CITY_DATA, getCityStateSlug } from '@/data/cityData';

export type CategoryKey = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_space';
export type ModeFilter = 'rent' | 'sale' | 'any';

export interface CategoryIndexConfig {
  path: string;
  category: CategoryKey;
  mode: ModeFilter;
  /** Optional city filter — when set, listings are restricted to this city. */
  city?: { name: string; stateCode: string };
  h1: string;
  title: string;
  description: string;
  intro: string;
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
}

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  mode: string;
  category: string;
  city: string | null;
  state: string | null;
  address: string | null;
}

const formatPrice = (l: ListingRow): string => {
  if (l.mode === 'sale' && l.price_sale) return `$${Number(l.price_sale).toLocaleString()}`;
  if (l.price_daily) return `$${Number(l.price_daily).toLocaleString()}/day`;
  if (l.price_weekly) return `$${Number(l.price_weekly).toLocaleString()}/week`;
  return 'Contact for price';
};

const categoryLabel = (c: CategoryKey): string =>
  c === 'food_truck' ? 'Food Truck'
    : c === 'food_trailer' ? 'Food Trailer'
    : c === 'ghost_kitchen' ? 'Shared Kitchen'
    : 'Vendor Space';

const CategoryIndex = ({ config }: { config: CategoryIndexConfig }) => {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('listings')
        .select('id, title, description, cover_image_url, price_daily, price_weekly, price_sale, mode, category, city, state, address')
        .eq('status', 'published')
        .eq('category', config.category as any)
        .not('published_at', 'is', null)
        .not('title', 'ilike', 'demo%')
        .order('updated_at', { ascending: false })
        .limit(48);
      if (config.mode !== 'any') q = q.eq('mode', config.mode);
      if (config.city) {
        q = q.or(`city.ilike.${config.city.name},address.ilike.%${config.city.name}%`);
      }
      const { data } = await q;
      if (!cancelled) {
        setListings((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [config.category, config.mode, config.city?.name]);


  const canonical = config.path;
  const totalListings = listings.length;

  // City links derived from CITY_DATA (top 12)
  const cityLinks = Object.values(CITY_DATA).slice(0, 12);
  const dbCategorySlug =
    config.category === 'food_truck' ? 'food-trucks'
      : config.category === 'food_trailer' ? 'food-trailers'
      : config.category === 'ghost_kitchen' ? 'commercial-kitchens'
      : 'vendor-spaces';

  // Schemas
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
      { '@type': 'ListItem', position: 2, name: config.h1, item: `https://vendibook.com${canonical}` },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listings.slice(0, 30).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://vendibook.com/listing/${l.id}`,
      name: l.title,
    })),
  };

  // noindex thin empty pages
  const noindex = !loading && totalListings === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={config.title}
        description={config.description}
        canonical={canonical}
        noindex={noindex}
      />
      <JsonLd schema={[breadcrumbSchema, faqSchema, ...(totalListings > 0 ? [itemListSchema] : [])]} />
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-10 space-y-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{config.h1}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <header className="space-y-4 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {config.h1}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {config.intro}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="dark-shine">
                <Link to={`/search?category=${config.category}${config.mode !== 'any' ? `&mode=${config.mode}` : ''}`}>
                  Open advanced search
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/list">List your {categoryLabel(config.category).toLowerCase()}</Link>
              </Button>
            </div>
          </header>

          {/* Listings */}
          <section aria-labelledby="listings-heading" className="space-y-4">
            <h2 id="listings-heading" className="text-2xl font-semibold text-foreground">
              {loading ? 'Loading listings…' : totalListings > 0
                ? `${totalListings} ${categoryLabel(config.category).toLowerCase()}${totalListings === 1 ? '' : 's'} available`
                : `No ${categoryLabel(config.category).toLowerCase()} listings yet`}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : totalListings === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  No active listings in this category right now. Browse related categories or list yours.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {config.related.map(r => (
                    <Button key={r.href} asChild variant="outline" size="sm">
                      <Link to={r.href}>{r.label}</Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map(l => {
                  const cityState = [l.city, l.state].filter(Boolean).join(', ');
                  const href = `/listing/${l.id}`;
                  return (
                    <li key={l.id}>
                      <Link
                        to={href}
                        className="group block h-full rounded-xl border border-border bg-card overflow-hidden hover:border-primary transition-colors"
                      >
                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                          {l.cover_image_url ? (
                            <img
                              src={l.cover_image_url}
                              alt={`${l.title}${cityState ? ` in ${cityState}` : ''} on Vendibook`}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {l.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {categoryLabel(l.category as CategoryKey)}
                            </span>
                            <span className="uppercase tracking-wide">
                              {l.mode === 'sale' ? 'For Sale' : 'For Rent'}
                            </span>
                            {cityState && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {cityState}
                              </span>
                            )}
                          </div>
                          {l.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {l.description}
                            </p>
                          )}
                          <div className="pt-1 flex items-center justify-between">
                            <span className="font-semibold text-foreground">{formatPrice(l)}</span>
                            <span className="text-xs text-primary inline-flex items-center gap-1">
                              View <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Related categories */}
          <section aria-labelledby="related-heading" className="space-y-3">
            <h2 id="related-heading" className="text-xl font-semibold text-foreground">
              Related on Vendibook
            </h2>
            <ul className="flex flex-wrap gap-2">
              {config.related.map(r => (
                <li key={r.href}>
                  <Link
                    to={r.href}
                    className="inline-block px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* City links */}
          <section aria-labelledby="cities-heading" className="space-y-3">
            <h2 id="cities-heading" className="text-xl font-semibold text-foreground">
              Browse {categoryLabel(config.category).toLowerCase()}s by city
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {cityLinks.map(c => {
                const cityState = getCityStateSlug(c);
                const href = config.mode === 'sale'
                  ? `/buy/${dbCategorySlug}/${cityState}`
                  : `/rent/${dbCategorySlug}/${cityState}`;
                return (
                  <li key={c.slug}>
                    <Link
                      to={href}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Browse {categoryLabel(config.category).toLowerCase()}s in {c.name}, {c.stateCode}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq-heading" className="space-y-4 max-w-3xl">
            <h2 id="faq-heading" className="text-2xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {config.faqs.map(f => (
                <details key={f.q} className="rounded-lg border border-border bg-card p-4 group">
                  <summary className="cursor-pointer font-medium text-foreground list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryIndex;
