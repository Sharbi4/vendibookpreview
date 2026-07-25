import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useToolAccess } from '@/hooks/useToolAccess';
import { TOOLS } from '@/lib/tools/catalog';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  slug: string;
  children: ReactNode;
}

/**
 * Route-level access gate. Wraps a tool page and — for locked users —
 * renders a compact upsell block linking to the tool preview and pricing.
 * Reads from the same catalog as useToolAccess so grandfathering, one-time
 * purchases, and subscription tiers all resolve consistently.
 */
export default function ToolAccessGate({ slug, children }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const { bySlug, isLoading } = useToolAccess();
  const tool = TOOLS.find((t) => t.slug === slug);
  const access = bySlug[slug];

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
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="dash-glass rounded-lg p-8 md:p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-md bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-orange-400" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-3">{tool.name} is a Pro tool</h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">{tool.tagline}</p>

          <div className="grid gap-3 sm:grid-cols-2 max-w-md mx-auto mb-8 text-left">
            {tool.bullets.slice(0, 4).map((b) => (
              <div key={b} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-orange-400">•</span><span>{b}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!user ? (
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link to={signInHref}>Sign in to continue <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Link to="/pricing">Get all tools with Pro <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                {tool.unlockProductSlug && (
                  <Button asChild size="lg" variant="outline">
                    <Link to={`/tools/${tool.slug}/preview`}>
                      Unlock this tool{tool.unlockPrice ? ` — ${tool.unlockPrice}` : ''}
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
