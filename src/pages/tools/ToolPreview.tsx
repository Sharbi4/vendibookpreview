import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Flame, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getToolBySlug } from '@/lib/tools/catalog';
import { useToolAccess } from '@/hooks/useToolAccess';
import { ToolSamplePreview } from '@/components/tools/previews/ToolSamplePreview';
import { UnlockLadder } from '@/components/monetization/UnlockLadder';
import { trackLeadEvent } from '@/lib/leadTracking';

const ToolPreview = () => {
  const { slug } = useParams<{ slug: string }>();
  const tool = slug ? getToolBySlug(slug) : undefined;
  const nav = useNavigate();
  const access = useToolAccess();

  useEffect(() => {
    if (tool) trackLeadEvent('tool_preview_viewed', { tool_slug: tool.slug, surface: 'preview_page' });
  }, [tool]);

  if (!tool || tool.enabled === false) return <Navigate to="/tools" replace />;
  const acc = access.bySlug[tool.slug];
  const openTool = () => nav(tool.href);
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
            <div className="mb-6 flex items-center gap-3">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border ${tool.flame ? 'bg-[hsl(var(--brand-ember)/0.12)] border-[hsl(var(--brand-ember)/0.35)]' : 'bg-card'}`}>
                <Icon className={`h-5 w-5 ${tool.flame ? 'text-[hsl(var(--brand-ember))]' : 'text-foreground'}`} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                    {tool.name}
                  </h1>
                  {tool.flame && (
                    <Badge className="bg-[hsl(var(--brand-ember)/0.15)] text-[hsl(var(--brand-ember))] border-[hsl(var(--brand-ember)/0.35)] gap-1">
                      <Flame className="h-3 w-3" /> Most-used
                    </Badge>
                  )}
                  {acc?.unlocked && (
                    <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-500">
                      <Check className="h-3 w-3" /> Unlocked
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground max-w-lg">{tool.tagline}</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
              {/* Left: real sample preview */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What you'll get
                </p>
                <ToolSamplePreview toolSlug={tool.slug} />
                <ul className="mt-6 space-y-2.5">
                  {tool.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--brand-ember)/0.12)] text-[hsl(var(--brand-ember))]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: unlock ladder or "Open tool" */}
              <div className="rounded-lg border border-border bg-card/60 p-5">
                {acc?.unlocked ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <ShieldCheck className="h-4 w-4" />
                      {acc.reason === 'grandfathered' ? 'Founding member — free access'
                        : acc.reason === 'subscription' ? `Included with your ${access.hostLabel} plan`
                        : acc.reason === 'purchase' ? 'You own this tool'
                        : 'Free forever'}
                    </div>
                    <Button size="lg" variant="glass-cta" onClick={openTool} className="w-full">
                      Open {tool.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                ) : tool.minTier === 'free' || tool.hasFreeTier ? (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/80">This tool is free — sign in to start using it.</p>
                    <Button asChild size="lg" variant="glass-cta" className="w-full">
                      <Link to={`/auth?returnTo=${encodeURIComponent(tool.href)}`}>
                        Open {tool.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <UnlockLadder
                    toolSlug={tool.slug}
                    surface="preview_page"
                    headline="Choose how to unlock"
                  />
                )}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ToolPreview;

