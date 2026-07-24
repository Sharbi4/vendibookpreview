import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, Loader2, Search, Heart, MessageSquare, ShieldAlert, ShoppingBag, Inbox } from 'lucide-react';
import PermitsTab from './PermitsTab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShopperBookingCard from './ShopperBookingCard';
import BuyerSalesSection from './BuyerSalesSection';
import { BuyerOffersSection } from './BuyerOffersSection';
import { DiscoveryHeroCard, DiscoveryGrid } from './DiscoveryGrid';
import BecomeHostCard from './BecomeHostCard';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';
import { CommandHeader } from './CommandHeader';
import { CommandStatCard } from './CommandStatCard';
import { SectionReveal, Reveal } from './SectionReveal';
import ActionRequiredStack, { ActionItem } from './shared/ActionRequiredStack';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useAuth } from '@/contexts/AuthContext';

const Section = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <section>
    {title && (
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">
        {title}
      </h2>
    )}
    {children}
  </section>
);

const ShopperDashboard = () => {
  const { bookings, isLoading, stats, cancelBooking, refetch } = useShopperBookings();
  const { hasRole, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const isHost = hasRole('host');
  const firstName = profile?.full_name?.split(' ')[0];

  if (searchParams.get('tab') === 'permits') {
    return (
      <div className="max-w-[1320px] mx-auto">
        <PermitsTab />
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const approvedBookings = bookings.filter((b) => b.status === 'approved');
  const pastBookings = bookings.filter((b) =>
    ['declined', 'cancelled', 'completed'].includes(b.status),
  );

  /* ── Empty state ── */
  if (!isLoading && bookings.length === 0) {
    return (
      <div className="max-w-[1320px] mx-auto">
        <SectionReveal className="space-y-10 sm:space-y-12">
          <Reveal>
            <CommandHeader
              name={firstName}
              context="Nothing booked yet. Let's find your next rental."
              actions={[
                { icon: Search, label: 'Search', href: '/search' },
                { icon: Heart, label: 'Favorites', href: '/favorites' },
                { icon: MessageSquare, label: 'Messages', href: '/messages' },
              ]}
            />
          </Reveal>
          <Reveal>
            <div id="discovery-hero">
              <DiscoveryHeroCard />
            </div>
          </Reveal>
          <Reveal>
            <DiscoveryGrid />
          </Reveal>
          {!isHost && (
            <Reveal>
              <div id="become-host-card">
                <BecomeHostCard />
              </div>
            </Reveal>
          )}
        </SectionReveal>
      </div>
    );
  }

  /* ── Context line ── */
  const contextLine =
    stats.pending > 0
      ? `${stats.pending} request${stats.pending > 1 ? 's' : ''} awaiting host reply.`
      : stats.approved > 0
      ? `${stats.approved} confirmed booking${stats.approved > 1 ? 's' : ''}. You're ready to roll.`
      : 'Nothing pressing. Browse to find your next rental.';

  return (
    <div className="max-w-[1320px] mx-auto">
      <SectionReveal className="space-y-10 sm:space-y-12">
        {/* Header */}
        <Reveal>
          <CommandHeader
            name={firstName}
            context={contextLine}
            actions={[
              { icon: Search, label: 'Browse', href: '/search' },
              { icon: Heart, label: 'Favorites', href: '/favorites' },
              { icon: MessageSquare, label: 'Messages', href: '/messages' },
            ]}
          />
        </Reveal>

        {/* Metrics */}
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <CommandStatCard label="Bookings" value={stats.total} />
            <CommandStatCard
              label="Pending"
              value={stats.pending}
              accent={stats.pending > 0}
              hint={stats.pending > 0 ? 'Awaiting host' : 'All clear'}
            />
            <CommandStatCard
              label="Approved"
              value={stats.approved}
              hint={stats.approved > 0 ? 'Ready to go' : 'None yet'}
            />
            <CommandStatCard label="Declined" value={stats.declined} />
          </div>
        </Reveal>

        {/* Referral */}
        <Reveal>
          <ReferralPanel />
        </Reveal>

        {/* Bookings */}
        <Reveal>
          <Section title="My bookings">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="w-full justify-start gap-6 h-auto p-0 bg-transparent border-b border-border rounded-none mb-6">
                <TabsTrigger
                  value="pending"
                  className="relative flex items-center gap-2 pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors text-sm font-medium"
                >
                  Pending
                  {stats.pending > 0 && (
                    <span className="text-[10px] font-semibold text-primary tabular-nums">
                      {stats.pending}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="relative flex items-center gap-2 pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors text-sm font-medium"
                >
                  Approved
                  {stats.approved > 0 && (
                    <span className="text-[10px] font-semibold text-foreground tabular-nums">
                      {stats.approved}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors text-sm font-medium"
                >
                  Past
                </TabsTrigger>
              </TabsList>

              {[
                { v: 'pending', list: pendingBookings, icon: Clock, empty: 'No pending requests' },
                { v: 'approved', list: approvedBookings, icon: CheckCircle2, empty: 'No confirmed bookings' },
                { v: 'past', list: pastBookings, icon: Calendar, empty: 'No past bookings' },
              ].map(({ v, list, icon: Icon, empty }) => (
                <TabsContent key={v} value={v} className="animate-fade-in">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : list.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card py-16 text-center">
                      <Icon className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">{empty}</p>
                      <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                        They'll appear here when the time comes.
                      </p>
                      {v === 'pending' && (
                        <Button
                          asChild
                          size="sm"
                          className="bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                        >
                          <Link to="/search">Browse listings</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {list.map((booking, index) => (
                        <div
                          key={booking.id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          <ShopperBookingCard
                            booking={booking}
                            onCancel={cancelBooking}
                            onPaymentInitiated={refetch}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Section>
        </Reveal>

        {/* Offers */}
        <Reveal>
          <Section title="My offers">
            <BuyerOffersSection />
          </Section>
        </Reveal>

        {/* Purchases */}
        <Reveal>
          <Section title="Purchases">
            <BuyerSalesSection />
          </Section>
        </Reveal>
      </SectionReveal>
    </div>
  );
};

export default ShopperDashboard;
