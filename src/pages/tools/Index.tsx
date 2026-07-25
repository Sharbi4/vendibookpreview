import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Crown, Flame } from 'lucide-react';
import { TOOLS } from '@/lib/tools/catalog';
import { useToolAccess } from '@/hooks/useToolAccess';
import ToolTile from '@/components/tools/ToolTile';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Vendibook Premium Tools',
  description:
    'The operator toolkit for mobile food businesses — pricing, permits, listings, marketing, and market research.',
  url: 'https://vendibook.com/tools',
};

const ToolsIndex = () => {
  usePageTracking();
  const access = useToolAccess();

  return (
    <>
      <SEO
        title="Vendibook Premium Tools | Pricing, Permits, Marketing & Market Research"
        description="The operator toolkit for food-truck and trailer owners: PermitPath, PricePilot, Listing Studio, Marketing Studio, Concept Lab, Market Radar, and BuildKit."
        canonical="/tools"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 80% at 80% 0%, hsl(var(--brand-ember) / 0.12), transparent 60%), radial-gradient(50% 60% at 0% 100%, hsl(var(--brand-ember) / 0.06), transparent 60%)',
              }}
            />
            <div className="container relative py-16 md:py-24">
              <div className="max-w-2xl">
                <Badge className="bg-[hsl(var(--brand-ember)/0.15)] text-[hsl(var(--brand-ember))] border-[hsl(var(--brand-ember)/0.35)] gap-1">
                  <Flame className="h-3 w-3" /> Vendibook Premium Tools
                </Badge>
                <h1 className="mt-4 text-4xl md:text-5xl font-semibold text-foreground leading-tight">
                  The operator toolkit for mobile food businesses.
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Price competitively, get permitted, and market smarter — all from one dashboard.
                  PermitPath and the Startup Guide are free forever. Growth unlocks the rest.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" variant="glass-cta" asChild>
                    <Link to="/tools/permitpath">
                      Start with PermitPath — free
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/pricing">
                      <Crown className="h-4 w-4 mr-1.5" /> Compare plans
                    </Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> No credit card for free tools</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 7-day payment protection on unlocks</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Included with Growth &amp; Operator</span>
                </div>
              </div>
            </div>
          </section>

          {/* Grid */}
          <section className="container py-12 md:py-16">
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {TOOLS.map((t) => (
                <ToolTile key={t.slug} tool={t} access={access.bySlug[t.slug]} />
              ))}
            </div>
          </section>

          {/* Pricing anchor */}
          <section className="border-t border-border bg-card/40">
            <div className="container py-14 md:py-16 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                One subscription unlocks the entire toolkit.
              </h2>
              <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
                Every paid tool is included in Growth or Operator. Free tools stay free — no card needed.
              </p>

              <div className="mt-6">
                <Button size="lg" variant="glass-cta" asChild>
                  <Link to="/pricing">
                    <Crown className="h-4 w-4 mr-1.5" /> View plans
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ToolsIndex;
