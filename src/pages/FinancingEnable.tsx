import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';

const PANEL =
  'rounded-2xl border-2 border-white/12 bg-[linear-gradient(140deg,#101014_0%,#08080a_60%,#15151b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-5 sm:p-6';

type SaleListing = { id: string; title: string; status: string | null };

/**
 * Campaign deep-link target: routes a seller straight to the financing opt-in
 * for their for-sale listing. Signed out -> auth with return path preserved.
 */
export default function FinancingEnable() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState<SaleListing[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const back = `${location.pathname}${location.search}`;
      navigate(`/auth?redirect=${encodeURIComponent(back)}`, { replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('listings')
        .select('id, title, status')
        .eq('host_id', user.id)
        .eq('mode', 'sale')
        .order('created_at', { ascending: false });
      if (!active) return;
      const rows: SaleListing[] = data ?? [];
      if (rows.length === 1) {
        navigate(`/listings/${rows[0].id}/payments-financing${location.search}`, { replace: true });
        return;
      }
      setListings(rows);
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, navigate, location.pathname, location.search]);

  if (authLoading || listings === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Turn on financing options | Vendibook" description="Enable Equinox Funding financing options on your for-sale listings." noindex />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <EquinoxFundingLogo className="h-5" />
          <h1 className="text-2xl font-semibold">Turn on financing options</h1>
        </div>

        {listings.length === 0 ? (
          <section className={PANEL}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Financing options apply to for-sale listings. Once you have equipment listed for
              sale, you can offer buyers the option to apply with Equinox Funding.
            </p>
            <div className="mt-5 flex gap-2 flex-wrap">
              <Button asChild>
                <Link to="/list/start">
                  <Plus className="h-4 w-4 mr-1.5" /> Create a for-sale listing
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/financing">Learn how financing works</Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className={PANEL}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose which listing should show financing options to buyers. Financing is optional
              and turning it on never unpublishes or changes your listing.
            </p>
            <ul className="mt-5 space-y-2">
              {listings.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/listings/${l.id}/payments-financing${location.search}`}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-white/10 bg-black/40 px-4 py-3 hover:border-white/25 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{l.title}</span>
                      <span className="block text-xs text-muted-foreground capitalize">{l.status ?? 'draft'}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
