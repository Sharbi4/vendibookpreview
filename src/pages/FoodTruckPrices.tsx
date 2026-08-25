import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Calculator, TrendingUp, Truck, Container,
  MapPin, Banknote, Tag, ChevronDown, RefreshCw, Download, Newspaper,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import {
  computeMarketStats, fetchPricingRows, formatUsd, formatUsdCompact,
  snapshotLabel, MIN_SAMPLE, PRICE_MIN_USD, PRICE_MAX_USD,
  type MarketStats, type GroupStats, type PricingRow,
} from '@/lib/market-data/foodTruckPrices';
import { buildPriceDistributionSvg, downloadSvg } from '@/lib/market-data/shareChart';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const CANONICAL = 'https://vendibook.com/food-truck-prices';
const YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const Section = ({
  id, eyebrow, title, intro, children, className,
}: {
  id?: string; eyebrow?: string; title: string; intro?: string;
  children: React.ReactNode; className?: string;
}) => (
  <section id={id} className={cn('max-w-5xl mx-auto px-4 py-12 md:py-16', className)}>
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">{eyebrow}</p>
    )}
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">{title}</h2>
    {intro && <p className="text-muted-foreground leading-relaxed max-w-3xl mb-8">{intro}</p>}
    {!intro && <div className="mb-8" />}
    {children}
  </section>
);

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-3xl border border-border/60 bg-card p-5 md:p-6 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
    <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{value}</p>
    {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const NotEnoughData = ({ label, sample }: { label: string; sample?: number }) => (
  <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-6 text-center">
    <p className="font-semibold text-foreground mb-1">{label}</p>
    <p className="text-sm text-muted-foreground">
      Not enough marketplace data yet{typeof sample === 'number' ? ` (${sample} listing${sample === 1 ? '' : 's'} — we publish statistics at ${MIN_SAMPLE}+)` : ''}.
      Check back as Vendibook inventory grows.
    </p>
  </div>
);

const Bar = ({ pct, className }: { pct: number; className?: string }) => (
  <div className="h-3 rounded-full bg-muted overflow-hidden" role="presentation">
    <div
      className={cn('h-full rounded-full bg-cta-primary transition-all duration-700', className)}
      style={{ width: `${Math.max(pct, 2)}%` }}
    />
  </div>
);

const FaqItem = ({ q, a }: { q: string; a: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground"
      >
        {q}
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-5 text-muted-foreground leading-relaxed">{a}</div>}
    </div>
  );
};

const InventoryCard = ({ row }: { row: PricingRow }) => (
  <Link
    to={`/listing/${row.id}`}
    onClick={() => trackEvent({ category: 'SEO', action: 'price_report_listing_click', label: row.id })}
    className="group rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="aspect-[4/3] overflow-hidden bg-muted">
      <img
        src={row.cover_image_url || '/placeholder.svg'}
        alt={row.title}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="p-4">
      <p className="font-semibold text-foreground line-clamp-2 mb-1">{row.title}</p>
      <p className="text-lg font-bold text-cta-primary">{formatUsd(row.price_sale)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {row.category === 'food_truck' ? 'Food truck' : 'Food trailer'}
        {row.state ? ` · ${row.state}` : ''} · Asking price
      </p>
    </div>
  </Link>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const FoodTruckPrices = () => {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPricingRows()
      .then((rows) => {
        if (cancelled) return;
        setStats(computeMarketStats(rows));
        trackEvent({ category: 'SEO', action: 'price_report_viewed', label: '/food-truck-prices' });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, []);

  const snapshot = stats ? snapshotLabel(stats.fetchedAt) : snapshotLabel(new Date());

  const trailerDiscountPct = useMemo(() => {
    if (!stats?.trucks.sufficient || !stats.trailers.sufficient) return null;
    if (!stats.trucks.median) return null;
    return Math.round(
      ((stats.trucks.median - stats.trailers.median) / stats.trucks.median) * 100,
    );
  }, [stats]);

  const topBand = useMemo(
    () => (stats ? [...stats.bands].sort((a, b) => b.count - a.count)[0] : null),
    [stats],
  );

  const handleDownloadChart = () => {
    if (!stats) return;
    const svg = buildPriceDistributionSvg({
      title: `What Price Range Are Most Food Trucks Listed In? (${YEAR})`,
      subtitle: `Share of ${stats.totalListings} food trucks & trailers listed on Vendibook`,
      bands: stats.bands.map((b) => ({ label: b.label, count: b.count, pct: b.pct })),
      snapshot,
    });
    downloadSvg(svg, `vendibook-food-truck-prices-${YEAR}.svg`);
    trackEvent({ category: 'SEO', action: 'price_report_chart_downloaded', label: '/food-truck-prices' });
  };

  const title = `Food Truck Prices & Cost Calculator (${YEAR}) | Vendibook`;
  const description =
    `See what food trucks and trailers cost in ${YEAR} using real Vendibook marketplace data. Compare prices, explore cost factors, and estimate your truck with PricePilot.`;

  const faqs = useMemo(() => {
    if (!stats) return [];
    const o = stats.overall;
    return [
      {
        q: `How much does a food truck cost in ${YEAR}?`,
        a: `Based on ${o.n} food trucks and trailers currently listed on Vendibook, the median asking price is ${formatUsd(o.median)} and the typical range (middle 50% of listings) runs ${formatUsd(o.p25)} to ${formatUsd(o.p75)}. Food trucks specifically carry a median asking price of ${formatUsd(stats.trucks.median)} across ${stats.trucks.n} listings.`,
      },
      {
        q: 'How much does a used food truck cost?',
        a: `Most food trucks and trailers listed on Vendibook are used equipment, and the overall median asking price of ${formatUsd(o.median)} largely reflects the used market. Used prices vary most with age, mileage or tow wear, and installed kitchen equipment — compare live listings to see what similar units are asking today.`,
      },
      {
        q: 'Are food trailers cheaper than food trucks?',
        a: stats.trucks.sufficient && stats.trailers.sufficient
          ? `On Vendibook, yes. Food trailers currently list at a median of ${formatUsd(stats.trailers.median)} versus ${formatUsd(stats.trucks.median)} for food trucks — about ${trailerDiscountPct ?? ''}% less. Trailers skip the engine and drivetrain, but you'll need a tow vehicle, and a heavily built-out trailer can still cost more than a basic truck.`
          : 'We do not yet have enough listings in both categories to publish a reliable comparison.',
      },
      {
        q: 'What makes a food truck more expensive?',
        a: 'The biggest price drivers are the vehicle platform (chassis, engine, mileage), size, the installed cooking line, hood and fire-suppression system, refrigeration, generator and electrical system, overall condition, and whether the build is permitted-ready for your area. A new turnkey build can cost several times an older used unit.',
      },
      {
        q: 'How much should I spend on my first food truck?',
        a: `There is no single right number — it depends on your menu, market, and whether you buy used or build new. On Vendibook, the middle half of all food truck and trailer listings fall between ${formatUsd(o.p25)} and ${formatUsd(o.p75)}. Many first-time operators start with a used trailer to keep upfront costs lower, then upgrade as revenue grows.`,
      },
      {
        q: 'Can I finance a food truck?',
        a: 'Yes — many Vendibook buyers finance equipment through third-party lenders. Terms depend on the lender, your credit, and the equipment; Vendibook does not guarantee rates or approval. See our financing page for current options.',
      },
      {
        q: 'How much is my food truck worth?',
        a: 'Use PricePilot, Vendibook\'s valuation tool, to estimate your food truck or trailer\'s market value from real marketplace comparables — then list it on Vendibook when you\'re ready to sell.',
      },
    ];
  }, [stats, trailerDiscountPct]);

  const jsonLd = useMemo(() => {
    const schemas: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `Food Truck Prices: How Much Does a Food Truck Cost in ${YEAR}?`,
        description,
        dateModified: new Date().toISOString().slice(0, 10),
        author: { '@type': 'Organization', name: 'Vendibook', url: 'https://vendibook.com' },
        publisher: { '@type': 'Organization', name: 'Vendibook', url: 'https://vendibook.com' },
        mainEntityOfPage: CANONICAL,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
          { '@type': 'ListItem', position: 2, name: 'Food Truck Prices', item: CANONICAL },
        ],
      },
    ];
    if (faqs.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }
    return schemas;
  }, [faqs, description]);

  return (
    <div className="sale-light min-h-screen bg-background flex flex-col">
      <SEO title={title} description={description} canonical="/food-truck-prices" type="article" />
      <JsonLd schema={jsonLd} />
      <Header />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-10 md:pt-16 pb-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Food Truck Prices</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-5">
          Food Truck Prices:{' '}
          <span className="text-highlighter">How Much Does a Food Truck Cost in {YEAR}?</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
          Explore real food truck and trailer listing prices from the Vendibook marketplace,
          compare equipment types, and estimate the cost of your next mobile food business.
        </p>

        {stats ? (
          <>
            <p className="text-base md:text-lg text-foreground font-medium mb-8 max-w-3xl">
              Vendibook analyzed {stats.totalListings} food truck{stats.totalListings === 1 ? '' : 's'} and
              trailer{stats.totalListings === 1 ? '' : 's'} listed across {stats.statesRepresented} states to
              understand what mobile food equipment costs in {YEAR}.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Median listing price" value={formatUsd(stats.overall.median)} sub={`${stats.totalListings} listings analyzed`} />
              <StatCard label="Average listing price" value={formatUsd(stats.overall.mean)} sub="Asking prices" />
              <StatCard label="Typical range" value={`${formatUsdCompact(stats.overall.p25)}–${formatUsdCompact(stats.overall.p75)}`} sub="Middle 50% of listings" />
              <StatCard label="States represented" value={String(stats.statesRepresented)} sub={`Updated ${snapshot}`} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border border-border/60 bg-card p-6 animate-pulse">
                <div className="h-3 w-20 bg-muted rounded mb-3" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}
        {failed && (
          <p className="text-muted-foreground mt-4">
            Live marketplace data is temporarily unavailable — the guide below still applies.
          </p>
        )}
      </section>

      {stats && (
        <>
          {/* Key findings — citation-friendly */}
          <Section
            id="key-findings"
            eyebrow="Key findings"
            title={`Vendibook Food Truck Market Data — ${snapshot}`}
            intro="The headline numbers from live Vendibook marketplace listings. Figures below are advertised asking prices, not completed sale prices."
          >
            <ul className="grid md:grid-cols-2 gap-4">
              {[
                stats.trucks.sufficient && `Median food truck listing price: ${formatUsd(stats.trucks.median)} (${stats.trucks.n} trucks analyzed)`,
                stats.trailers.sufficient && `Median food trailer listing price: ${formatUsd(stats.trailers.median)} (${stats.trailers.n} trailers analyzed)`,
                trailerDiscountPct !== null && `Food trailers listed about ${trailerDiscountPct}% lower than food trucks at the median`,
                topBand && topBand.count > 0 && `The most common listing price band is ${topBand.label} (${topBand.pct}% of listings)`,
                `${stats.statesRepresented} states represented in the current dataset`,
              ]
                .filter(Boolean)
                .map((finding) => (
                  <li
                    key={finding as string}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4"
                  >
                    <BarChart3 className="h-5 w-5 text-cta-primary shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{finding}</span>
                  </li>
                ))}
            </ul>
          </Section>

          {/* Calculator / dual path */}
          <Section
            id="calculator"
            eyebrow="Interactive tool"
            title="Estimate a Food Truck's Price with PricePilot"
            intro="PricePilot is Vendibook's pricing intelligence tool. It estimates an equipment value range from real marketplace comparables — the same data behind this report — instead of generic national averages."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm flex flex-col">
                <Calculator className="h-8 w-8 text-cta-primary mb-4" />
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">Buying a food truck?</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                  Estimate what trucks or trailers like the one you're considering typically cost,
                  based on comparable Vendibook listings. Estimates are informational ranges, not appraisals.
                </p>
                <Button
                  asChild variant="cta" className="w-full sm:w-auto"
                  onClick={() => trackEvent({ category: 'SEO', action: 'price_report_calculator_click', label: 'buyer' })}
                >
                  <Link to="/tools/pricepilot">Estimate food truck cost <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm flex flex-col">
                <Tag className="h-8 w-8 text-cta-primary mb-4" />
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">Selling a food truck?</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                  Estimate your food truck or trailer's market value with PricePilot, then list it on
                  Vendibook when you're ready to reach verified buyers.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild variant="cta"
                    onClick={() => trackEvent({ category: 'SEO', action: 'price_report_seller_click', label: 'pricepilot' })}
                  >
                    <Link to="/tools/pricepilot">Estimate my food truck value</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link to="/sell-my-food-truck">List my food truck</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Truck vs trailer */}
          <Section
            id="truck-vs-trailer"
            eyebrow="Equipment type"
            title="Food Truck vs. Food Trailer Cost"
            intro="Trucks bundle the kitchen and the vehicle; trailers skip the drivetrain but need a tow vehicle. Here's how current asking prices compare."
          >
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Truck, label: 'Food trucks', g: stats.trucks, href: '/food-trucks-for-sale' },
                { icon: Container, label: 'Food trailers', g: stats.trailers, href: '/food-trailers-for-sale' },
              ].map(({ icon: Icon, label, g, href }) =>
                g.sufficient ? (
                  <div key={label} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="h-6 w-6 text-cta-primary" />
                      <h3 className="text-lg font-bold tracking-tight text-foreground">{label}</h3>
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground mb-1">{formatUsd(g.median)}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Median asking price · {g.n} listings · typical range {formatUsdCompact(g.p25)}–{formatUsdCompact(g.p75)}
                    </p>
                    <Bar pct={Math.round((g.median / Math.max(stats.trucks.median, stats.trailers.median)) * 100)} />
                    <Link to={href} className="inline-flex items-center gap-1 text-sm font-semibold text-cta-primary mt-4 hover:underline">
                      Browse {label.toLowerCase()} for sale <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <NotEnoughData key={label} label={label} sample={g.n} />
                ),
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              Why the gap? A food truck's price includes the chassis, engine, and mileage, while a
              trailer's price reflects the build-out alone. Within both categories, the biggest value
              drivers are size, cooking equipment, hood and fire suppression, refrigeration, the
              generator and electrical system, age, and condition.
            </p>
          </Section>

          {/* Price distribution */}
          <Section
            id="price-distribution"
            eyebrow="Distribution"
            title="What Price Range Are Most Food Trucks Listed In?"
            intro={`Share of the ${stats.totalListings} analyzed listings in each asking-price band.`}
          >
            <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm space-y-5">
              {stats.bands.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-foreground">{b.label}</span>
                    <span className="text-muted-foreground">{b.count} listings · {b.pct}%</span>
                  </div>
                  <Bar pct={b.pct} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={handleDownloadChart}
              >
                <Download className="h-4 w-4" /> Download chart for articles &amp; social
              </Button>
              <p className="text-xs text-muted-foreground">
                Free to republish with attribution — the file includes "Source: Vendibook Marketplace Data".
              </p>
            </div>
          </Section>

          {/* By state */}
          <Section
            id="by-state"
            eyebrow="Geography"
            title="Food Truck Prices by State"
            intro={`We only publish a state median once at least ${MIN_SAMPLE} listings are available — smaller samples are aggregated so no one is misled by a tiny dataset.`}
          >
            <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left">
                      <th className="px-5 py-4 font-semibold text-foreground">State</th>
                      <th className="px-5 py-4 font-semibold text-foreground">Median listing price</th>
                      <th className="px-5 py-4 font-semibold text-foreground">Typical range</th>
                      <th className="px-5 py-4 font-semibold text-foreground">Listings analyzed</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {stats.states.filter((s) => s.sufficient).map((s) => (
                      <tr key={s.state} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-4 font-medium text-foreground">{s.stateName}</td>
                        <td className="px-5 py-4 text-foreground">{formatUsd(s.median)}</td>
                        <td className="px-5 py-4 text-muted-foreground">{formatUsdCompact(s.p25)}–{formatUsdCompact(s.p75)}</td>
                        <td className="px-5 py-4 text-muted-foreground">{s.n}</td>
                        <td className="px-5 py-4 text-right">
                          {s.href && (
                            <Link to={s.href} className="inline-flex items-center gap-1 font-semibold text-cta-primary hover:underline whitespace-nowrap">
                              View food trucks for sale in {s.stateName} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {stats.states.filter((s) => !s.sufficient).length > 0 &&
                `${stats.states.filter((s) => !s.sufficient).length} additional states have inventory but fewer than ${MIN_SAMPLE} listings — not enough data to publish a reliable median yet.`}
            </p>
          </Section>

          {/* New vs used + specialty — threshold gated */}
          <Section
            id="new-vs-used"
            eyebrow="Condition & specialty"
            title="New vs. Used, and Specialty Builds"
            intro="Some breakdowns need more listings before the numbers are meaningful. We show honest gaps rather than shaky averages."
          >
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {stats.newUnits.sufficient ? (
                <StatCard label="New units — median" value={formatUsd(stats.newUnits.median)} sub={`${stats.newUnits.n} listings`} />
              ) : (
                <NotEnoughData label="New food truck prices" sample={stats.newUnits.n} />
              )}
              {stats.usedUnits.sufficient ? (
                <StatCard label="Used units — median" value={formatUsd(stats.usedUnits.median)} sub={`${stats.usedUnits.n} listings`} />
              ) : (
                <NotEnoughData label="Used food truck prices" sample={stats.usedUnits.n} />
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                {stats.coffee.sufficient ? (
                  <StatCard label="Coffee trucks & trailers — median" value={formatUsd(stats.coffee.median)} sub={`${stats.coffee.n} listings`} />
                ) : (
                  <NotEnoughData label="Coffee truck prices" sample={stats.coffee.n} />
                )}
                <Link to="/coffee-trucks-trailers-for-sale" className="inline-flex items-center gap-1 text-sm font-semibold text-cta-primary hover:underline">
                  Browse coffee trucks & trailers for sale <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-4">
                {stats.iceCream.sufficient ? (
                  <StatCard label="Ice cream trucks & trailers — median" value={formatUsd(stats.iceCream.median)} sub={`${stats.iceCream.n} listings`} />
                ) : (
                  <NotEnoughData label="Ice cream truck prices" sample={stats.iceCream.n} />
                )}
                <Link to="/ice-cream-trucks-trailers-for-sale" className="inline-flex items-center gap-1 text-sm font-semibold text-cta-primary hover:underline">
                  Browse ice cream trucks & trailers for sale <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Section>

          {/* Inventory */}
          {stats.inventory.length > 0 && (
            <Section
              id="inventory"
              eyebrow="Live inventory"
              title="Food Trucks & Trailers for Sale Right Now"
              intro="The latest published listings behind these numbers — every card shows a real, current asking price."
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {stats.inventory.map((row) => <InventoryCard key={row.id} row={row} />)}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="cta">
                  <Link to="/food-trucks-for-sale">Browse food trucks for sale</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to="/food-trailers-for-sale">Browse food trailers for sale</Link>
                </Button>
              </div>
            </Section>
          )}

          {/* Financing */}
          <Section id="financing" eyebrow="Financing" title="What Would a Food Truck Cost Per Month?">
            <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
              <Banknote className="h-10 w-10 text-cta-primary shrink-0" />
              <div className="flex-1">
                <p className="text-foreground leading-relaxed mb-2">
                  Many buyers finance food trucks and trailers through third-party equipment lenders,
                  spreading the cost into monthly payments. Monthly cost depends on the lender, your
                  credit profile, down payment, and term length.
                </p>
                <p className="text-sm text-muted-foreground">
                  Vendibook does not set rates and cannot guarantee approval — any estimate from a
                  lender will state its own assumptions.
                </p>
              </div>
              <Button
                asChild variant="cta" className="shrink-0"
                onClick={() => trackEvent({ category: 'SEO', action: 'price_report_financing_click', label: '/financing' })}
              >
                <Link to="/financing">Explore food truck financing <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </Section>

          {/* Methodology */}
          <Section id="methodology" eyebrow="Methodology" title="How Vendibook Calculates Food Truck Prices">
            <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Source.</strong> All statistics on this page are computed
                from food trucks and food trailers actively listed for sale on the Vendibook marketplace.
                This snapshot reflects {stats.totalListings} qualifying listings across {stats.statesRepresented} states,
                recomputed from live listings each time the page loads. Last updated: {snapshot}.
              </p>
              <p>
                <strong className="text-foreground">Asking prices, not sale prices.</strong> Figures represent
                advertised listing (asking) prices. Final negotiated transaction prices may differ.
              </p>
              <p>
                <strong className="text-foreground">Inclusion criteria.</strong> A listing must be published,
                active, and carry a plausible asking price to qualify. We exclude demo/test listings, listings
                without pricing, and price outliers outside {formatUsd(PRICE_MIN_USD)}–{formatUsd(PRICE_MAX_USD)}
                (a range chosen to filter placeholder values and data-entry errors without excluding
                legitimate high-end equipment).
              </p>
              <p>
                <strong className="text-foreground">Minimum sample sizes.</strong> We never publish a median or
                range from fewer than {MIN_SAMPLE} listings. Categories below that threshold show an honest
                "not enough marketplace data yet" state instead of a misleading average.
              </p>
              <p>
                <strong className="text-foreground">PricePilot estimates.</strong> The PricePilot tool combines
                these marketplace comparables with equipment attributes (type, size, condition, and installed
                systems) to produce an estimated value range. Estimates are informational and are not formal
                appraisals.
              </p>
            </div>
          </Section>

          {/* About the data — citation block */}
          <Section id="about-the-data" eyebrow="Cite this data" title="About the Data">
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-6 md:p-8">
              <p className="text-foreground leading-relaxed mb-4">
                Source: Vendibook marketplace listing data, {snapshot}. Prices represent advertised asking
                prices unless otherwise stated. Analysis excludes listings without valid pricing, demo
                listings, and price outliers.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Journalists, lenders, builders, and publishers may reference these figures with attribution
                to "Vendibook marketplace data" and a link to this page. Questions: support@vendibook.com.
              </p>
              <Link
                to="/press"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cta-primary hover:underline"
              >
                <Newspaper className="h-4 w-4" /> Press &amp; media resources
              </Link>
            </div>
          </Section>

          {/* FAQ */}
          <Section id="faq" eyebrow="FAQ" title="Food Truck Price Questions, Answered">
            <div className="space-y-3">
              {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={renderFaqAnswer(f.q, f.a)} />)}
            </div>
          </Section>

          {/* Related */}
          <Section eyebrow="Keep exploring" title="Related Vendibook Resources" className="pb-20">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { href: '/tools/pricepilot', label: 'PricePilot cost calculator', icon: Calculator },
                { href: '/food-trucks-for-sale', label: 'Food trucks for sale', icon: Truck },
                { href: '/food-trailers-for-sale', label: 'Food trailers for sale', icon: Container },
                { href: '/food-trucks-for-rent', label: 'Rent a food truck instead', icon: RefreshCw },
                { href: '/financing', label: 'Food truck financing', icon: Banknote },
                { href: '/tools/food-truck-startup-costs-2026', label: `${YEAR} startup cost guide`, icon: TrendingUp },
                { href: '/sell-my-food-truck', label: 'Sell my food truck', icon: Tag },
                { href: '/coffee-trucks-trailers-for-sale', label: 'Coffee trucks & trailers', icon: MapPin },
                { href: '/ice-cream-trucks-trailers-for-sale', label: 'Ice cream trucks & trailers', icon: MapPin },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 font-semibold text-foreground hover:border-cta-primary/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-cta-primary shrink-0" />
                  {label}
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Fallback editorial content if data fails — keeps page useful & crawlable */}
      {!stats && !failed && (
        <div className="max-w-5xl mx-auto px-4 pb-16 text-muted-foreground" aria-hidden>
          <p>Loading live marketplace data…</p>
        </div>
      )}
      {failed && (
        <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
          <Section title="What Drives Food Truck Prices?" className="py-0">
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              Food truck and trailer prices depend on the vehicle platform, size, installed cooking
              equipment, hood and fire suppression, refrigeration, power systems, age, and condition.
              Use PricePilot to estimate a specific unit from real marketplace comparables.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button asChild variant="cta"><Link to="/tools/pricepilot">Open PricePilot</Link></Button>
              <Button asChild variant="outline" className="rounded-2xl"><Link to="/food-trucks-for-sale">Browse food trucks for sale</Link></Button>
            </div>
          </Section>
        </div>
      )}

      <Footer />
    </div>
  );
};

/** FAQ answers are stored as strings for schema; render links inline for a few. */
function renderFaqAnswer(question: string, answer: string): React.ReactNode {
  if (question.startsWith('Can I finance')) {
    return (
      <>
        Yes — many Vendibook buyers finance equipment through third-party lenders. Terms depend on the
        lender, your credit, and the equipment; Vendibook does not guarantee rates or approval.{' '}
        <Link to="/financing" className="font-semibold text-cta-primary hover:underline">
          Explore food truck financing
        </Link>.
      </>
    );
  }
  if (question.startsWith('How much is my food truck worth')) {
    return (
      <>
        Use{' '}
        <Link to="/tools/pricepilot" className="font-semibold text-cta-primary hover:underline">PricePilot</Link>,
        Vendibook's valuation tool, to estimate your food truck or trailer's market value from real
        marketplace comparables — then{' '}
        <Link to="/sell-my-food-truck" className="font-semibold text-cta-primary hover:underline">list it on Vendibook</Link>{' '}
        when you're ready to sell.
      </>
    );
  }
  return answer;
}

export default FoodTruckPrices;
