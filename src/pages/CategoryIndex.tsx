import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, ArrowRight, Tag, Info } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CITY_DATA, getCityStateSlug } from '@/data/cityData';
import { SPECIALTY_DEFS, specialtyOrFilter, specialtyBrowseLinks, specialtyVehicleHref, SPECIALTY_VEHICLE_LABELS, type SpecialtyKey } from '@/lib/listings/specialty';
import BrowseByBusinessType from '@/components/marketplace/BrowseByBusinessType';

export type CategoryKey = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_space';
export type ModeFilter = 'rent' | 'sale' | 'any';

export interface CategoryIndexSection {
  heading: string;
  paragraphs: string[];
  links?: { href: string; label: string }[];
}

export interface CategoryIndexConfig {
  path: string;
  category: CategoryKey;
  /** Multi-category pages (e.g. the national rental hub shows trucks + trailers). */
  categories?: CategoryKey[];
  mode: ModeFilter;
  /** Optional city filter. When listings are short, page falls back to state then nationwide. */
  city?: { name: string; stateCode: string };
  /** Optional state filter (used when no city is set). Falls back to nationwide if short. */
  state?: { name: string; code: string };
  h1: string;
  title: string;
  description: string;
  intro: string;
  /** One-line intent clarification rendered directly under the intro. */
  clarification?: string;
  /** Mid-page content sections rendered after the inventory grid. */
  sections?: CategoryIndexSection[];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
  /** Overrides the default seller cross-link strip. */
  sellerCta?: { heading: string; body: string; ctaLabel: string; ctaHref: string };
  /** Specialty collection (coffee / ice cream). Filters inventory to the
   *  specialty and disables geographic fallback tiers so unrelated listings
   *  are never shown as specialty matches. */
  specialty?: SpecialtyKey;
  /** Breadcrumb parent between Home and the page (specialty hubs). */
  breadcrumbParent?: { name: string; href: string };
  /** Overrides the hero search CTA href. */
  searchHrefOverride?: string;
  /** Absolute https URL used for og:image / twitter:image (per-category social preview). */
  ogImage?: string;
  /** Render the cross-category "Browse by business type" navigation band (Phase 6). */
  businessTypeNav?: boolean;
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

const MIN_TIER = 6;

// States with a live state-level page, for breadcrumb parent links.
const STATE_NAME_BY_CODE: Record<string, string> = {
  TX: 'Texas', AZ: 'Arizona', GA: 'Georgia', FL: 'Florida', MI: 'Michigan',
  OH: 'Ohio', NC: 'North Carolina', OR: 'Oregon', CA: 'California',
};
const STATE_SALE_PAGE_CODES: Record<CategoryKey, Set<string>> = {
  food_truck: new Set(['TX', 'AZ', 'GA', 'FL', 'MI', 'OH', 'NC', 'OR', 'CA']),
  food_trailer: new Set(['TX', 'GA', 'FL', 'MI', 'OH', 'AZ']),
  ghost_kitchen: new Set(),
  vendor_space: new Set(),
};
const STATE_RENT_PAGE_CODES = new Set(['TX', 'FL', 'CA']);

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

const baseSelect = 'id, title, description, cover_image_url, price_daily, price_weekly, price_sale, mode, category, city, state, address';

const baseQuery = (categories: CategoryKey[], mode: ModeFilter, limit: number, orFilter?: string) => {
  let q = supabase
    .from('listings')
    .select(baseSelect)
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
    .in('category', categories as any[])
    .not('published_at', 'is', null)
    .not('title', 'ilike', 'demo%')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (mode !== 'any') q = q.eq('mode', mode);
  if (orFilter) q = q.or(orFilter);
  return q;
};

const CategoryIndex = ({ config }: { config: CategoryIndexConfig }) => {
  const [primary, setPrimary] = useState<ListingRow[]>([]);
  const [stateFallback, setStateFallback] = useState<ListingRow[]>([]);
  const [nationwideFallback, setNationwideFallback] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = config.categories ?? [config.category];
  const multiCategory = categories.length > 1;

  useEffect(() => {
    if (config.specialty) {
      trackEvent({ category: 'SEO', action: 'specialty_hub_viewed', label: config.path });
    } else if (config.mode === 'rent') {
      trackEvent({
        category: 'SEO',
        action: config.city ? 'rental_city_index_viewed' : config.state ? 'rental_state_viewed' : 'rental_hub_viewed',
        label: config.path,
      });
    }
  }, [config.mode, config.path, config.city, config.state, config.specialty]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPrimary([]);
      setStateFallback([]);
      setNationwideFallback([]);

      // Tier 1: city OR state OR specialty OR all
      const specialtyFilter = config.specialty ? specialtyOrFilter(config.specialty) : undefined;
      let q1 = baseQuery(categories, config.mode, 48, specialtyFilter);
      if (config.city) {
        q1 = q1.or(`city.ilike.${config.city.name},address.ilike.%${config.city.name}%`);
      } else if (config.state) {
        q1 = q1.or(`state.eq.${config.state.code},state.ilike.${config.state.name}`);
      }
      const { data: d1 } = await q1;
      const primaryRows = (d1 as ListingRow[]) || [];
      if (cancelled) return;
      setPrimary(primaryRows);

      const excludeIds = new Set(primaryRows.map((r) => r.id));

      // Specialty pages never fall back to unrelated inventory — only real
      // specialty matches may appear on the collection.
      if (!config.specialty) {
        // Tier 2: state fallback (only when city is set AND primary is thin)
        if (config.city && primaryRows.length < MIN_TIER) {
          let q2 = baseQuery(categories, config.mode, 24);
          q2 = q2.or(`state.eq.${config.city.stateCode},state.ilike.${config.city.stateCode}`);
          const { data: d2 } = await q2;
          const stateRows = ((d2 as ListingRow[]) || []).filter((r) => !excludeIds.has(r.id));
          if (cancelled) return;
          setStateFallback(stateRows);
          stateRows.forEach((r) => excludeIds.add(r.id));
        }

        // Tier 3: nationwide fallback (when primary + state still thin, or state-only page is thin)
        const tier2Count = config.city && primaryRows.length < MIN_TIER ? -1 : 0;
        const enoughSoFar = primaryRows.length + (tier2Count === -1 ? MIN_TIER : 0);
        if (enoughSoFar < MIN_TIER) {
          const q3 = baseQuery(categories, config.mode, 24);
          const { data: d3 } = await q3;
          const natRows = ((d3 as ListingRow[]) || []).filter((r) => !excludeIds.has(r.id));
          if (cancelled) return;
          setNationwideFallback(natRows);
        }
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [config.category, config.mode, config.city?.name, config.state?.code, config.specialty, categories.join(',')]);

  const canonical = config.path;
  const totalListings = primary.length + stateFallback.length + nationwideFallback.length;

  const cityLinks = Object.values(CITY_DATA).slice(0, 12);
  const dbCategorySlug =
    config.category === 'food_truck' ? 'food-trucks'
      : config.category === 'food_trailer' ? 'food-trailers'
      : config.category === 'ghost_kitchen' ? 'commercial-kitchens'
      : 'vendor-spaces';

  // Breadcrumb hierarchy: Home → National category → State → City.
  const crumbCategoryPlural = multiCategory ? 'Food Trucks & Food Trailers' : `${categoryLabel(config.category)}s`;
  const crumbNationalLabel = config.mode === 'any'
    ? crumbCategoryPlural
    : `${crumbCategoryPlural} ${config.mode === 'sale' ? 'for Sale' : 'for Rent'}`;
  const crumbNationalPath =
    config.mode === 'rent'
      ? (config.category === 'food_trailer' ? '/food-trailers-for-rent' : '/food-trucks-for-rent')
      : config.mode === 'sale'
        ? (config.category === 'food_trailer' ? '/food-trailers-for-sale' : '/food-trucks-for-sale')
        : (config.category === 'food_truck' ? '/food-trucks'
          : config.category === 'food_trailer' ? '/food-trailers'
          : config.category === 'ghost_kitchen' ? '/shared-kitchens' : '/vendor-spaces');

  const cityStateName = config.city ? STATE_NAME_BY_CODE[config.city.stateCode] : undefined;
  const cityStateSlug = cityStateName ? cityStateName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined;
  const statePageExists = !!(config.city && config.city.stateCode && cityStateSlug && (
    config.mode === 'sale'
      ? STATE_SALE_PAGE_CODES[config.category]?.has(config.city.stateCode)
      : config.mode === 'rent' && config.category === 'food_truck'
        ? STATE_RENT_PAGE_CODES.has(config.city.stateCode)
        : false
  ));

  const crumbs: { name: string; href?: string }[] = [{ name: 'Home', href: '/' }];
  if (config.breadcrumbParent) {
    crumbs.push(config.breadcrumbParent);
  } else if (config.city || config.state) {
    crumbs.push({ name: crumbNationalLabel, href: crumbNationalPath });
  }
  if (statePageExists && cityStateName && cityStateSlug) {
    crumbs.push({ name: cityStateName, href: `${crumbNationalPath}/${cityStateSlug}` });
  }
  crumbs.push({ name: config.h1 });

  // Schemas
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `https://vendibook.com${c.href ?? canonical}`,
    })),
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const allForItemList = [...primary, ...stateFallback, ...nationwideFallback].slice(0, 30);
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: allForItemList.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://vendibook.com/listing/${l.id}`,
      name: l.title,
    })),
  };

  // Thin-page guard. A collection page is only indexable when it has real
  // on-topic inventory in its primary tier — nationwide fallback rows keep the
  // page useful for a visitor but do not make a specialty/state/city page
  // worth indexing on its own. This applies to every hub, including specialty
  // hubs and the coffee/ice-cream vehicle landing pages.
  const noindex = !loading && (primary.length === 0 || totalListings === 0);


  const cityLabel = config.city ? `${config.city.name}, ${config.city.stateCode}` : null;
  const stateLabel = config.city ? config.city.stateCode : config.state?.name ?? null;

  const renderCard = (l: ListingRow) => {
    const cityState = [l.city, l.state].filter(Boolean).join(', ');
    return (
      <li key={l.id}>
        <Link
          to={`/listing/${l.id}`}
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
            {config.specialty && (l.category === 'food_truck' || l.category === 'food_trailer') && (
              <Link
                to={specialtyVehicleHref(config.specialty, l.category === 'food_truck' ? 'truck' : 'trailer')}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {SPECIALTY_VEHICLE_LABELS[config.specialty][l.category === 'food_truck' ? 'truck' : 'trailer']}
                <ArrowRight className="h-3 w-3" />
              </Link>
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
  };

  const renderTier = (heading: string, items: ListingRow[], sub?: string) =>
    items.length === 0 ? null : (
      <section className="space-y-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">{heading}</h2>
          {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(renderCard)}
        </ul>
      </section>
    );

  const labelPlural = config.specialty
    ? SPECIALTY_DEFS[config.specialty].pluralTitle
    : multiCategory
      ? 'Food Trucks & Food Trailers'
      : categoryLabel(config.category) + 's';
  const catPluralLower = config.specialty
    ? SPECIALTY_DEFS[config.specialty].pluralLower
    : multiCategory
      ? 'food trucks & food trailers'
      : categoryLabel(config.category).toLowerCase() + 's';
  const intentLabel = config.mode === 'sale' ? 'for sale' : config.mode === 'rent' ? 'for rent' : '';

  const searchHref = config.searchHrefOverride ?? (multiCategory
    ? `/search?mode=${config.mode}`
    : `/search?category=${config.category}${config.mode !== 'any' ? `&mode=${config.mode}` : ''}`);

  const sellerCta = config.sellerCta ?? (config.mode === 'rent'
    ? {
        heading: multiCategory
          ? 'Have a food truck or trailer available for rent?'
          : `Have a ${categoryLabel(config.category).toLowerCase()} available for rent?`,
        body: 'List free on Vendibook — set your own daily, weekly, or monthly rates and terms, and receive booking requests from verified operators.',
        ctaLabel: multiCategory ? 'List My Food Truck for Rent' : `List Your ${categoryLabel(config.category)} for Rent`,
        ctaHref: config.category === 'ghost_kitchen' ? '/rent-my-commercial-kitchen' : '/rent-out-my-food-truck',
      }
    : {
        heading: `Have a ${categoryLabel(config.category).toLowerCase()} to sell?`,
        body: 'List free on Vendibook — photos, video, equipment, offers, and optional secure transaction tools.',
        ctaLabel: `List Your ${categoryLabel(config.category)} Free`,
        ctaHref: config.category === 'food_trailer' ? '/sell-food-trailer' : '/sell-my-food-truck',
      });

  const primaryHeading = config.city
    ? `${catPluralLower.charAt(0).toUpperCase() + catPluralLower.slice(1)}${intentLabel ? ` ${intentLabel}` : ''} in ${cityLabel}`
    : config.state
      ? `${catPluralLower.charAt(0).toUpperCase() + catPluralLower.slice(1)}${intentLabel ? ` ${intentLabel}` : ''} in ${config.state.name}`
      : `${primary.length} ${catPluralLower}${intentLabel ? ` ${intentLabel}` : ''} available`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={config.title}
        description={config.description}
        canonical={canonical}
        image={config.ogImage}
        noindex={noindex}
      />
      <JsonLd schema={[breadcrumbSchema, faqSchema, ...(totalListings > 0 ? [itemListSchema] : [])]} />
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-10 space-y-10">
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((c, i) => (
                <BreadcrumbItem key={`${c.name}-${i}`}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {c.href ? (
                    <BreadcrumbLink asChild><Link to={c.href}>{c.name}</Link></BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{c.name}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <header className="space-y-4 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {config.h1}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {config.intro}
            </p>
            {config.clarification && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed rounded-xl border border-border bg-card px-4 py-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{config.clarification}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="dark-shine">
                <Link to={searchHref}>
                  Search {catPluralLower} {intentLabel}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={sellerCta.ctaHref}>{sellerCta.ctaLabel}</Link>
              </Button>
            </div>
            {config.specialty && (
              <div className="flex flex-wrap gap-2 pt-1">
                {specialtyBrowseLinks(config.specialty).map((l) => (
                  <Button key={l.href} asChild variant="outline" size="sm">
                    <Link to={l.href}>{l.label}</Link>
                  </Button>
                ))}
              </div>
            )}
          </header>

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
                {config.related.map((r) => (
                  <Button key={r.href} asChild variant="outline" size="sm">
                    <Link to={r.href}>{r.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {renderTier(primaryHeading, primary)}
              {stateFallback.length > 0 && renderTier(
                `More ${catPluralLower}${intentLabel ? ` ${intentLabel}` : ''} across ${stateLabel ?? 'nearby states'}`,
                stateFallback,
                config.city
                  ? `${cityLabel} inventory is still growing — these listings across ${stateLabel} are nearby options.`
                  : undefined,
              )}
              {nationwideFallback.length > 0 && renderTier(
                `Additional ${catPluralLower}${intentLabel ? ` ${intentLabel}` : ''} available nationwide`,
                nationwideFallback,
                'Vendibook ships and connects across the US — these listings are open to buyers from other states.',
              )}
            </div>
          )}

          {/* Editorial / commercial sections (SEO rental hub, state pages, etc.) */}
          {config.sections?.map((s) => (
            <section key={s.heading} className="space-y-3 max-w-3xl">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed">{p}</p>
              ))}
              {s.links && s.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.links.map((l) => (
                    <Link
                      key={l.href + l.label}
                      to={l.href}
                      className="inline-block px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Related categories */}
          <section aria-labelledby="related-heading" className="space-y-3">
            <h2 id="related-heading" className="text-xl font-semibold text-foreground">
              Related on Vendibook
            </h2>
            <ul className="flex flex-wrap gap-2">
              {config.related.map((r) => (
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

          {/* Seller cross-link strip */}
          <section className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{sellerCta.heading}</h2>
              <p className="text-sm text-muted-foreground">
                {sellerCta.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="dark-shine">
                <Link to={sellerCta.ctaHref}>
                  {sellerCta.ctaLabel}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={config.mode === 'rent' ? '/how-it-works-host' : '/how-it-works-seller'}>
                  {config.mode === 'rent' ? 'Learn How Renting Works' : 'Learn How Selling Works'}
                </Link>
              </Button>
            </div>
          </section>

          {/* City links (hidden on specialty hubs — those links are not specialty-filtered) */}
          {!config.specialty && (
          <section aria-labelledby="cities-heading" className="space-y-3">
            <h2 id="cities-heading" className="text-xl font-semibold text-foreground">
              Browse {catPluralLower} by city
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {cityLinks.map((c) => {
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
          )}

          {/* Cross-specialty navigation (national hubs + specialty pages) */}
          {config.businessTypeNav && <BrowseByBusinessType exclude={config.specialty} />}

          {/* FAQ */}
          <section aria-labelledby="faq-heading" className="space-y-4 max-w-3xl">
            <h2 id="faq-heading" className="text-2xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {config.faqs.map((f) => (
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
