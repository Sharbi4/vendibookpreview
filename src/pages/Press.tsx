import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Building2, Download, Mail, MapPin, Phone,
  Truck, Container, RefreshCw, Banknote, Calculator, Newspaper,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

const CANONICAL = 'https://vendibook.com/press';

const Press = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vendibook',
    url: 'https://vendibook.com',
    logo: 'https://vendibook.com/favicon.png',
    description:
      'Vendibook is the marketplace for mobile food businesses — buy, sell, rent, and finance food trucks, food trailers, and commercial kitchen space.',
    address: { '@type': 'PostalAddress', addressLocality: 'Tucson', addressRegion: 'AZ', addressCountry: 'US' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'media relations',
      email: 'support@vendibook.com',
      telephone: '+1-725-755-9598',
    },
  };

  return (
    <div className="sale-light min-h-screen bg-background flex flex-col">
      <SEO
        title="Press & Media | Vendibook"
        description="Media resources for Vendibook, the marketplace for mobile food businesses. Company background, marketplace data, brand assets, and press contact."
        canonical="/press"
      />
      <JsonLd schema={jsonLd} />
      <Header />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-12 md:pt-20 pb-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Press &amp; Media</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-5">
          Press &amp; <span className="text-highlighter">Media Resources</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Everything a journalist, blogger, or industry publisher needs to cover Vendibook:
          who we are, what the marketplace does, original pricing research, and how to reach us.
        </p>
      </section>

      {/* Boilerplate */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">About Vendibook</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-4">Company boilerplate</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Vendibook is the marketplace for mobile food businesses. Based in Tucson, Arizona,
              Vendibook connects buyers, sellers, renters, and hosts across the mobile food
              economy — food trucks, food trailers, concession trailers, specialty builds, and
              commercial kitchen space — with secure payments, optional equipment financing,
              identity verification, and pricing intelligence powered by real marketplace data.
            </p>
            <p>
              Sellers list equipment for free, buyers can purchase online with payment protection
              or pay in person, and entrepreneurs can rent food trucks, trailers, and commissary
              kitchens by the day. PricePilot, Vendibook's valuation tool, estimates equipment
              values from live marketplace comparables.
            </p>
          </div>
        </div>
      </section>

      {/* What the marketplace covers */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">Marketplace</p>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-6">What Vendibook covers</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Truck, label: 'Food trucks for sale', href: '/food-trucks-for-sale', desc: 'New and used food trucks listed by verified sellers nationwide.' },
            { icon: Container, label: 'Food trailers for sale', href: '/food-trailers-for-sale', desc: 'Concession trailers, specialty builds, and towable kitchens.' },
            { icon: RefreshCw, label: 'Food truck & trailer rentals', href: '/food-trucks-for-rent', desc: 'Daily and weekly rentals for events, pop-ups, and market testing.' },
            { icon: Banknote, label: 'Equipment financing', href: '/financing', desc: 'Third-party financing pathways for qualified buyers.' },
            { icon: Calculator, label: 'PricePilot valuation tool', href: '/tools/pricepilot', desc: 'Data-driven price estimates from real marketplace comparables.' },
            { icon: Building2, label: 'Commissary & kitchen space', href: '/shared-kitchens', desc: 'Licensed commercial kitchen space listed by hosts.' },
          ].map(({ icon: Icon, label, href, desc }) => (
            <Link
              key={href}
              to={href}
              className="flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <Icon className="h-6 w-6 text-cta-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Original research */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">Original research</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-4">
            Food truck &amp; trailer pricing data
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Vendibook publishes live asking-price statistics computed from active marketplace
            listings — median prices, typical ranges, state-by-state breakdowns, and specialty
            category pricing. Journalists and publishers may cite these figures with attribution
            to "Vendibook marketplace data" and a link to the report.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="cta">
              <Link to="/food-truck-prices">
                <BarChart3 className="h-4 w-4" /> View the pricing report
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link to="/tools/pricepilot">About PricePilot</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Brand assets */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">Brand assets</p>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-6">Logo &amp; brand</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 flex flex-col items-center justify-center text-center">
            <img src={vendibookFavicon} alt="Vendibook logo" className="h-20 w-20 rounded-2xl mb-4" />
            <p className="font-semibold text-foreground mb-1">Vendibook mark</p>
            <p className="text-sm text-muted-foreground mb-4">PNG, suitable for articles and listings</p>
            <a
              href={vendibookFavicon}
              download="vendibook-logo.png"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cta-primary hover:underline"
            >
              <Download className="h-4 w-4" /> Download PNG
            </a>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <p className="font-semibold text-foreground mb-3">Usage notes</p>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>Write the name as <strong className="text-foreground">Vendibook</strong> — one word, capital V.</li>
              <li>Attribute marketplace statistics to "Vendibook marketplace data".</li>
              <li>Do not alter logo colors or proportions.</li>
              <li>For print or broadcast assets, contact us and we'll provide source files.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <div className="rounded-3xl border border-border/60 bg-muted/30 p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-cta-primary mb-3">Media contact</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-4">
            <span className="inline-flex items-center gap-2"><Newspaper className="h-6 w-6 text-cta-primary" /> Working on a story?</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            We respond to media inquiries during support hours (Mon–Fri, 9am–5pm Arizona time).
            For data requests, interviews, or marketplace questions:
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="cta">
              <a href="mailto:support@vendibook.com?subject=Media%20inquiry">
                <Mail className="h-4 w-4" /> support@vendibook.com
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <a href="tel:+17257559598"><Phone className="h-4 w-4" /> (725) 755-9598</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6 inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> Vendibook · Tucson, Arizona
          </p>
          <div className="mt-6">
            <Link to="/what-is-vendibook" className="inline-flex items-center gap-1 text-sm font-semibold text-cta-primary hover:underline">
              More about the marketplace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Press;
