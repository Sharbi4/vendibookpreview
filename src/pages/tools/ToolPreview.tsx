import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Crown, Flame, Lock, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getToolBySlug } from '@/lib/tools/catalog';
import { useToolAccess } from '@/hooks/useToolAccess';
import { toast } from 'sonner';
import { startMonetizationCheckout } from '@/lib/monetization/products';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';

const tierLabel = (t: string) =>
  t === 'starter' ? 'Starter' : t === 'pro' ? 'Growth' : t === 'premium' ? 'Operator' : 'Free';


const ToolPreview = () => {
  const { slug } = useParams<{ slug: string }>();
  const tool = slug ? getToolBySlug(slug) : undefined;
  const nav = useNavigate();
  const access = useToolAccess();

  if (!tool) return <Navigate to="/tools" replace />;
  const acc = access.bySlug[tool.slug];

  const startCheckout = async () => {
    if (!tool.unlockProductSlug) {
      nav('/pricing');
      return;
    }
    try {
      const paths = buildCheckoutReturnPaths(tool.unlockProductSlug);
      const { url } = await startMonetizationCheckout({
        productSlug: tool.unlockProductSlug,
        successPath: paths.successPath,
        cancelPath: paths.cancelPath,
      });
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error('Could not start checkout. Please try again.');
    }
  };

  const openTool = () => nav(tool.href);

  const proAnchor = useMemo(() => {
    if (tool.minTier === 'premium') return 'Or included with Premium';
    if (tool.minTier === 'pro') return 'Or included with Pro';
    return null;
  }, [tool.minTier]);

  const Icon = tool.icon;

  return (
    <>
      <SEO
        title={`${tool.name} — Preview | Vendibook Premium Tools`}
        description={tool.tagline}
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="container max-w-6xl px-4 pt-6">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          <section className="container max-w-6xl px-4 py-8 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start">
              {/* Left: pitch */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${tool.flame ? 'bg-[hsl(var(--brand-ember)/0.12)] border-[hsl(var(--brand-ember)/0.35)]' : 'bg-card'}`}>
                    <Icon className={`h-5 w-5 ${tool.flame ? 'text-[hsl(var(--brand-ember))]' : 'text-foreground'}`} />
                  </span>
                  {tool.flame && (
                    <Badge className="bg-[hsl(var(--brand-ember)/0.15)] text-[hsl(var(--brand-ember))] border-[hsl(var(--brand-ember)/0.35)] gap-1">
                      <Flame className="h-3 w-3" /> Most-used tool
                    </Badge>
                  )}
                  {acc?.unlocked && (
                    <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-500">
                      <Check className="h-3 w-3" /> Unlocked
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                  {tool.name}
                </h1>
                <p className="mt-3 text-lg text-muted-foreground max-w-lg">
                  {tool.tagline}
                </p>

                <ul className="mt-6 space-y-3">
                  {tool.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[0.95rem] text-foreground">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--brand-ember)/0.12)] text-[hsl(var(--brand-ember))]">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 rounded-lg border border-border bg-card/60 p-5">
                  {acc?.unlocked ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-500">
                        <ShieldCheck className="h-4 w-4" />
                        {acc.reason === 'grandfathered' ? 'Founding member — free access'
                          : acc.reason === 'subscription' ? `Included with your ${access.hostLabel} plan`
                          : acc.reason === 'purchase' ? 'You own this tool'
                          : 'Free forever'}
                      </div>
                      <Button size="lg" variant="glass-cta" onClick={openTool} className="w-full sm:w-auto">
                        Open {tool.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">One-time unlock</div>
                          <div className="text-2xl font-semibold text-foreground">{tool.unlockPrice ?? 'Custom'}</div>
                        </div>
                        {proAnchor && (
                          <div className="text-sm text-muted-foreground">
                            <Crown className="inline h-3.5 w-3.5 mr-1 text-[hsl(var(--brand-ember))]" />
                            {proAnchor}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {tool.unlockProductSlug && (
                          <Button size="lg" variant="glass-cta" onClick={startCheckout} className="flex-1">
                            Unlock {tool.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        )}
                        <Button size="lg" variant="outline" asChild className="flex-1">
                          <Link to="/pricing">
                            <Crown className="mr-1.5 h-4 w-4" /> Go {tierLabel(tool.minTier)} to unlock all
                          </Link>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> Payment protection — refund within 7 days if the tool doesn't help.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: real screenshot */}
              <figure className="relative rounded-xl overflow-hidden border border-border shadow-2xl bg-card/80">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-background/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                    vendibook.com{tool.href}
                  </span>
                </div>
                <img
                  src={tool.screenshot}
                  alt={`${tool.name} — preview screenshot`}
                  className="w-full h-auto block"
                  loading="eager"
                />
                <figcaption className="sr-only">Live screenshot from the {tool.name} product page.</figcaption>
              </figure>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ToolPreview;
