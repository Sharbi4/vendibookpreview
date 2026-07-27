import { Link } from 'react-router-dom';
import { Check, ShieldCheck, MessageSquare, Camera, Handshake, Tag, ArrowRight, Star, Calendar } from 'lucide-react';
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

export interface SellerLandingProps {
  /** Asset focus: shapes copy throughout the page. */
  asset: 'food truck' | 'food trailer' | 'concession trailer';
  /** Plural label for the asset. */
  assetPlural: string;
  /** Route path (must start with /). */
  path: string;
  title: string;
  description: string;
  h1: string;
  subheadline: string;
  /** Primary listing destination — defaults to /list. */
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  /** Secondary destination — typically the matching marketplace page. */
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
  /** Optional crawl-friendly link to the matching for-rent page. */
  rentBrowseHref?: string;
  /** Optional intro copy override above the hero CTAs. */
  introOverride?: string;
}

const TRUST_BULLETS = [
  'Free to list',
  'Buyer offers and messaging',
  'Optional secure transaction support',
  'Verified users through Stripe Identity',
  'Photos, video, and equipment details',
  'Rent while you wait to sell',
];

const FAQ_DATA = (asset: string): { q: string; a: string }[] => [
  {
    q: `Where can I sell my ${asset}?`,
    a: `Vendibook is a marketplace built specifically for ${asset}s, food trailers, concession trailers, carts, and mobile kitchens. You can create a free listing in minutes and reach buyers actively shopping for mobile food assets.`,
  },
  {
    q: `What is the best way to sell a ${asset}?`,
    a: `Strong listings include clear exterior and interior photos, a short video walkthrough, equipment specs (hood, fryer, generator, refrigeration, water tanks), permits or inspection status if known, an asking price, and whether you are open to offers or rentals. The more complete your listing, the more serious the inquiries.`,
  },
  {
    q: 'Is it free to list?',
    a: 'Yes — creating a listing on Vendibook is free. Optional paid boosts and featured placement are available if you want extra visibility.',
  },
  {
    q: 'Can buyers make offers?',
    a: 'Yes. Buyers can submit offers directly through your listing, and you can accept, decline, or counter inside Vendibook.',
  },
  {
    q: `Can I upload a video of my ${asset}?`,
    a: `Yes. Video walkthroughs significantly improve buyer confidence and tend to drive faster, more serious inquiries.`,
  },
  {
    q: `Can I rent my ${asset} while trying to sell it?`,
    a: `Yes — eligible owners can list for sale and rent at the same time. You can earn rental revenue from chefs, caterers, and food entrepreneurs while you wait for the right buyer.`,
  },
  {
    q: 'Does Vendibook verify users?',
    a: 'Yes. Buyers and sellers can verify their identity through Stripe Identity, and verified badges appear on profiles and listings.',
  },
  {
    q: 'Does Vendibook offer secure transaction tools?',
    a: 'Yes. Optional payment protection-style secure transaction support is available where the transaction type supports it, including identity verification, offer tracking, and reviews after completed sales.',
  },
  {
    q: 'What should I include in my listing?',
    a: 'Exterior photos, interior kitchen photos, equipment list and condition, dimensions, generator/power info, refrigeration, sinks/water tanks, hood and fire-suppression status, permits/inspection status if known, asking price, whether offers and rentals are accepted, and a video walkthrough.',
  },
  {
    q: 'Can Vendibook help match my listing with buyers?',
    a: 'Vendibook may help match strong listings with interested buyers and renters through buyer inquiries, social outreach, and relevant marketplace conversations. We do not guarantee leads or sales — strong photos, accurate specs, and fair pricing remain the biggest drivers of inquiries.',
  },
  {
    q: 'Can I sell a concession trailer, coffee trailer, BBQ trailer, or mobile kitchen?',
    a: 'Yes. Vendibook supports food trucks, food trailers, concession trailers, BBQ trailers, coffee and dessert trailers, food carts, commissary equipment, and mobile kitchens.',
  },
];

const SellerLandingPage = ({
  asset,
  assetPlural,
  path,
  title,
  description,
  h1,
  subheadline,
  primaryCtaHref = '/list',
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  rentBrowseHref,
  introOverride,
}: SellerLandingProps) => {
  const faqs = FAQ_DATA(asset);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
      { '@type': 'ListItem', position: 2, name: h1, item: `https://vendibook.com${path}` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={title} description={description} canonical={path} />
      <JsonLd schema={[breadcrumbSchema, faqSchema]} />
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-10 space-y-14">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{h1}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero */}
          <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-background p-8 md:p-14 space-y-6">
            <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(60%_50%_at_80%_0%,hsl(var(--primary)/0.12),transparent_70%)]" />
            <div className="relative max-w-3xl space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                <Tag className="h-3.5 w-3.5 text-primary" />
                {asset.charAt(0).toUpperCase() + asset.slice(1)} marketplace
              </span>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                {h1}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {introOverride ?? subheadline}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" variant="dark-shine">
                  <Link to={primaryCtaHref}>
                    {primaryCtaLabel ?? `List Your ${asset.charAt(0).toUpperCase() + asset.slice(1)} Free`}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={secondaryCtaHref}>{secondaryCtaLabel}</Link>
                </Button>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
                {TRUST_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </header>

          {/* Why sellers use Vendibook */}
          <section aria-labelledby="why-heading" className="space-y-6">
            <div className="max-w-3xl space-y-2">
              <h2 id="why-heading" className="text-2xl md:text-3xl font-semibold text-foreground">
                Why owners sell {assetPlural} on Vendibook
              </h2>
              <p className="text-muted-foreground">
                Vendibook is built specifically for the mobile food economy — not a generic
                classifieds site. Every part of the listing flow is designed for {assetPlural},
                concession trailers, carts, and mobile kitchens.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Tag, t: 'Free to list', d: `Create a full listing for your ${asset} with photos, video, specs, and price at no cost.` },
                { icon: MessageSquare, t: 'Built-in buyer chat', d: 'Answer questions, negotiate, and share documents — all inside Vendibook.' },
                { icon: Handshake, t: 'Offers, not just price tags', d: 'Buyers can submit offers. Accept, decline, or counter in a few taps.' },
                { icon: ShieldCheck, t: 'Verified users', d: 'Buyers and sellers can verify identity through Stripe Identity.' },
                { icon: Camera, t: 'Photos, video, and specs', d: 'Show the kitchen, hood, generator, fridge, and water tanks — not just a side shot.' },
                { icon: Star, t: 'Reviews after sales', d: 'Build a trusted seller profile through reviews on completed transactions.' },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-border bg-card p-5 space-y-2">
                  <c.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{c.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Sell, rent, or both */}
          <section aria-labelledby="hybrid-heading" className="rounded-2xl border border-border bg-card p-8 md:p-10 space-y-5">
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wide">Sell or rent while you wait</span>
            </div>
            <h2 id="hybrid-heading" className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl">
              Don't let your {asset} sit idle while you wait for the right buyer
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">
              Vendibook lets eligible owners list for sale, rent, or both. Generate interest from
              buyers while also offering rental availability to chefs, caterers, and food
              entrepreneurs who need a mobile kitchen. You stay in control of the calendar.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                'Rental calendar and booking requests',
                'Renter instructions and equipment rules',
                'Maintenance and usage notes',
                'Optional deposit and security tools',
                'In-platform renter communication',
                'Switch off rentals anytime',
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {rentBrowseHref && (
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link to={rentBrowseHref}>
                    Browse {assetPlural} for rent <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </section>

          {/* Get discovered */}
          <section aria-labelledby="discover-heading" className="space-y-6">
            <div className="max-w-3xl space-y-2">
              <h2 id="discover-heading" className="text-2xl md:text-3xl font-semibold text-foreground">
                Get discovered by buyers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Vendibook is actively building demand from buyers, renters, and food entrepreneurs
                across search, social, marketplace outreach, and direct matching. Strong listings
                may be surfaced in relevant buyer conversations, featured areas, social posts, and
                local discovery pages.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { t: 'Search visibility', d: 'Listings appear in Vendibook search, category, and city pages.' },
                { t: 'Featured and boosted listings', d: 'Optional paid boosts move strong listings to the top of relevant pages.' },
                { t: 'Buyer matching', d: 'Vendibook may share well-built listings with buyers actively asking for what you have.' },
                { t: 'Social sharing tools', d: 'Built-in Share Kit creates polished images for Instagram, Facebook, and Marketplace.' },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
                  <h3 className="font-semibold text-foreground">{c.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Listing quality checklist */}
          <section aria-labelledby="checklist-heading" className="space-y-5">
            <div className="max-w-3xl space-y-2">
              <h2 id="checklist-heading" className="text-2xl md:text-3xl font-semibold text-foreground">
                Listing quality checklist
              </h2>
              <p className="text-muted-foreground">
                Listings with this information sell faster — and rank better in Vendibook search.
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                'Clear exterior photos',
                'Interior kitchen photos',
                'Full equipment list and condition',
                'Hood, fire-suppression, fryer, grill, smoker',
                'Generator, power, and electrical setup',
                'Refrigeration and freezer details',
                'Sinks, water tanks, plumbing',
                'Overall dimensions and weight',
                'Permits / inspection status if known',
                'Honest asking price',
                'Whether offers are accepted',
                'Whether rentals are allowed',
                'Short video walkthrough',
                'Year, make, model, and mileage',
                'Recent service or upgrades',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Secure transaction tools */}
          <section aria-labelledby="secure-heading" className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-8 md:p-10 space-y-5">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wide">Optional secure transaction</span>
            </div>
            <h2 id="secure-heading" className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl">
              Close the deal with confidence
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">
              When you and your buyer want extra protection, Vendibook supports optional secure
              transaction tools where available — including identity verification through Stripe
              Identity, offer tracking, supporting documents, and reviews after the sale. Use them
              when it makes sense, or keep your sale fully off-platform if you prefer.
            </p>
          </section>

          {/* Equipment types */}
          <section aria-labelledby="types-heading" className="space-y-4">
            <h2 id="types-heading" className="text-2xl md:text-3xl font-semibold text-foreground">
              What you can sell on Vendibook
            </h2>
            <ul className="flex flex-wrap gap-2">
              {[
                'Food trucks',
                'Food trailers',
                'Concession trailers',
                'BBQ trailers',
                'Coffee trailers',
                'Dessert trailers',
                'Food carts',
                'Mobile kitchens',
                'Commissary equipment',
                'Catering trailers',
              ].map((t) => (
                <li key={t} className="inline-block px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground">
                  {t}
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq-heading" className="space-y-4 max-w-3xl">
            <h2 id="faq-heading" className="text-2xl md:text-3xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="rounded-xl border border-border bg-card p-4 group">
                  <summary className="cursor-pointer font-medium text-foreground list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Closing CTA */}
          <section className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Ready to list your {asset}?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create a free listing in minutes — photos, price, equipment, and offers all in one place.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" variant="dark-shine">
                <Link to={primaryCtaHref}>{primaryCtaLabel ?? `List Your ${asset.charAt(0).toUpperCase() + asset.slice(1)} Free`}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-foreground/30 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground">
                <Link to={secondaryCtaHref}>{secondaryCtaLabel}</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SellerLandingPage;
