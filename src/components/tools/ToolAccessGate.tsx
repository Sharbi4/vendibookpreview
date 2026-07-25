import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useToolAccess } from '@/hooks/useToolAccess';
import { TOOLS } from '@/lib/tools/catalog';
import { useAuth } from '@/contexts/AuthContext';
import { ToolSamplePreview } from '@/components/tools/previews/ToolSamplePreview';
import { UnlockLadder } from '@/components/monetization/UnlockLadder';
import { useEffect } from 'react';
import { trackLeadEvent } from '@/lib/leadTracking';

interface Props {
  slug: string;
  children: ReactNode;
}

/**
 * Route-level access gate. Locked users see the real sample of what the
 * tool produces, then the full unlock ladder (one-time / weekly pass /
 * subscription — cheapest first, "Best value" marked). Never a single
 * expensive tier and never an empty preview.
 */
export default function ToolAccessGate({ slug, children }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const { bySlug, isLoading } = useToolAccess();
  const tool = TOOLS.find((t) => t.slug === slug);
  const access = bySlug[slug];

  useEffect(() => {
    if (!authLoading && !isLoading && tool && !access?.unlocked) {
      trackLeadEvent('tool_preview_viewed', { tool_slug: slug, surface: 'tool_gate' });
    }
  }, [authLoading, isLoading, tool, access?.unlocked, slug]);

  if (authLoading || isLoading || !tool) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (access?.unlocked) return <>{children}</>;

  const returnTo = encodeURIComponent(tool.href);
  const signInHref = `/auth?returnTo=${returnTo}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="dash-glass rounded-lg p-6 md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border-[1.5px] border-orange-500/40 bg-orange-500/[0.08]">
              <Lock className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl leading-tight">
                {tool.name}
              </h1>
              <p className="text-sm text-muted-foreground">{tool.tagline}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                What you'll get
              </p>
              <ToolSamplePreview toolSlug={slug} />
            </div>
            <div>
              {!user ? (
                <div className="rounded-lg border-[1.5px] border-white/12 bg-white/[0.03] p-5 text-center">
                  <p className="mb-4 text-sm text-foreground/80">Sign in to unlock {tool.name}.</p>
                  <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Link to={signInHref}>Sign in to continue <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              ) : (
                <UnlockLadder
                  toolSlug={slug}
                  surface="tool_gate"
                  headline="Choose how to unlock"
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
