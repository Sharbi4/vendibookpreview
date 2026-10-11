import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Loader2,
  ShoppingBag,
  Calendar,
  Heart,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Sparkle,
  Compass,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBuyerSaleTransactions } from '@/hooks/useSaleTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useFavorites } from '@/hooks/useFavorites';
import { SectionHeader, JourneyCard } from '@/components/journey';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const OPEN_SALE_STATES = new Set(['pending', 'pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed', 'disputed']);
const OPEN_BOOKING_STATES = new Set(['pending', 'approved', 'confirmed', 'in_progress']);

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  helper,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number | string;
  href: string;
  helper?: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 hover:border-border transition-colors flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />
      </div>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {helper && <div className="text-[11px] text-muted-foreground/80 mt-1">{helper}</div>}
      </div>
    </Link>
  );
}

const BuyerDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { transactions, isLoading: txLoading } = useBuyerSaleTransactions(user?.id);
  const { bookings, isLoading: bookingsLoading } = useShopperBookings();
  const { favorites, isLoading: favLoading } = useFavorites();

  // Purchased buyer services (monetization purchases) — count active/completed
  const { data: purchasedServices = [] } = useQuery({
    queryKey: ['buyer-purchased-services', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_purchases')
        .select('id, product_slug, status, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data ?? [];
    },
  });

  const openPurchases = useMemo(
    () => (transactions ?? []).filter((t: any) => OPEN_SALE_STATES.has(t.status)),
    [transactions],
  );
  const openBookings = useMemo(
    () => (bookings ?? []).filter((b: any) => OPEN_BOOKING_STATES.has(b.status)),
    [bookings],
  );

  const nextAction = useMemo(() => {
    // Highest-priority buyer action across surfaces
    const awaitingConfirm = openPurchases.find((t: any) => t.status === 'paid' || t.status === 'seller_confirmed');
    if (awaitingConfirm) {
      return {
        title: 'Confirm your purchase received',
        body: 'The seller marked your order paid. Confirm receipt to release payout and close the sale.',
        href: `/transaction/${awaitingConfirm.id}`,
        cta: 'Open transaction',
      };
    }
    const pendingCash = openPurchases.find((t: any) => t.status === 'pending_cash');
    if (pendingCash) {
      return {
        title: 'Complete your cash pickup',
        body: 'Coordinate handoff and confirm details when the seller is ready.',
        href: `/transaction/${pendingCash.id}`,
        cta: 'View next steps',
      };
    }
    const upcomingBooking = openBookings[0];
    if (upcomingBooking) {
      return {
        title: 'Rental in progress',
        body: 'Review pickup instructions, compliance docs, and messaging with your host.',
        href: `/transactions?tab=bookings`,
        cta: 'Open bookings',
      };
    }
    return {
      title: 'Discover verified trucks and trailers',
      body: 'Browse marketplace listings ready to book, rent, or purchase with buyer protection.',
      href: '/search',
      cta: 'Browse marketplace',
    };
  }, [openPurchases, openBookings]);

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/buyer" replace />;

  const loading = txLoading || bookingsLoading || favLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Buyer dashboard — Vendibook"
        description="Track purchases, rentals, favorites, and buyer services from one buyer command center."
      />
      <Header />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pt-8 pb-16 md:pt-12">
        <SectionHeader
          eyebrow="Buyer"
          title="Your buyer command center"
          description="Every purchase, rental, saved listing, and buyer service in one place."
        />

        {/* Next best action */}
        <JourneyCard className="mt-6 md:mt-8 p-5 md:p-6 bg-gradient-to-br from-primary/10 via-card/60 to-card/40">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkle className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Next action</Badge>
              </div>
              <h2 className="mt-1 text-base md:text-lg font-semibold text-foreground">{nextAction.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{nextAction.body}</p>
            </div>
            <Button asChild className="md:shrink-0">
              <Link to={nextAction.href}>
                {nextAction.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </JourneyCard>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={ShoppingBag}
            label="Open purchases"
            value={loading ? '—' : openPurchases.length}
            href="/transactions?tab=purchases"
            helper={`${(transactions ?? []).length} total`}
          />
          <StatCard
            icon={Calendar}
            label="Active rentals"
            value={loading ? '—' : openBookings.length}
            href="/transactions?tab=bookings"
            helper={`${(bookings ?? []).length} total`}
          />
          <StatCard
            icon={Heart}
            label="Saved listings"
            value={loading ? '—' : favorites.length}
            href="/favorites"
          />
          <StatCard
            icon={ShieldCheck}
            label="Buyer services"
            value={purchasedServices.length}
            href="/buyer/services"
            helper="Your purchased services"
          />
        </div>

        {/* Two-column secondary content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Open purchases list */}
          <JourneyCard className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
              </div>
              <Link to="/transactions" className="text-xs text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="py-10 grid place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : openPurchases.length === 0 && openBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No active purchases or rentals yet.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/search">
                    <Compass className="mr-2 h-4 w-4" aria-hidden />
                    Explore listings
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {openPurchases.slice(0, 4).map((t: any) => (
                  <li key={t.id} className="py-3 flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        Purchase • ${((t.amount ?? 0) / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {String(t.status).replace(/_/g, ' ')}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/transaction/${t.id}`}>
                        Open
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  </li>
                ))}
                {openBookings.slice(0, 4).map((b: any) => (
                  <li key={b.id} className="py-3 flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Calendar className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        Rental request
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {String(b.status).replace(/_/g, ' ')}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/transactions?tab=bookings">
                        Open
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>

          {/* Buyer services + recommendations */}
          <JourneyCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">Buyer services</h3>
            </div>
            {purchasedServices.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Buy with more confidence — financing options, inspection partners, and payment protection on every purchase.
              </p>
            ) : (
              <ul className="space-y-2 mb-4">
                {purchasedServices.map((s: any) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
                  >
                    <span className="text-foreground truncate">{String(s.product_slug).replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground capitalize">{s.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/buyer/services">
                Explore buyer services
                <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </JourneyCard>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BuyerDashboard;
