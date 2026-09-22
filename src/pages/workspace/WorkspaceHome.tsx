import DashboardNextSteps from '@/components/workspace/DashboardNextSteps';
import FeaturedPromotionBanner from '@/components/workspace/FeaturedPromotionBanner';
import FeaturedBadge from '@/components/listing/FeaturedBadge';
import { canBoostListing } from '@/lib/listings/publicVisibility';
import { isListingFeatured } from '@/lib/featured';
import { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Inbox,
  List,
  MessageCircle,
  Receipt,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useConversations } from '@/hooks/useConversations';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { useNotifications } from '@/hooks/useNotifications';
import { useFavorites } from '@/hooks/useFavorites';
import { useHandoffTasks } from '@/hooks/useHandoffTasks';
import { useVideoWalkthroughs } from '@/hooks/useVideoWalkthroughs';
import { formatWalkthroughTime } from '@/lib/videoWalkthroughs';

const money = (cents: number | null | undefined) =>
  cents == null
    ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const price = (listing: { mode?: string | null; price_sale?: number | null; price_daily?: number | null }) => {
  const fmt = (value?: number | null) =>
    value == null
      ? null
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  if (listing.mode === 'sale') return fmt(listing.price_sale) ?? 'Price not set';
  const daily = fmt(listing.price_daily);
  return daily ? `${daily}/day` : 'Rate not set';
};

type Task = {
  id: string;
  label: string;
  hint: string;
  to: string;
  icon: typeof AlertTriangle;
  tone?: 'warn' | 'neutral';
};

export default function WorkspaceHome() {
  const [routeParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { listings, isLoading: listingsLoading } = useHostListings();
  const { bookings: buyerBookings } = useShopperBookings();
  const { bookings: sellerBookings } = useHostBookings();
  const { transactions } = useUserTransactions(user?.id);
  const { conversations } = useConversations();
  const { isReady: paypalReady } = useMyPayPalConnection();
  const { unreadCount: notificationUnread } = useNotifications(user?.id);
  const { favorites } = useFavorites();
  const { walkthroughs } = useVideoWalkthroughs();
  const { data: handoffTasks } = useHandoffTasks();

  const name = profile?.full_name?.trim() || 'there';
  const firstName = name.split(' ')[0];

  const drafts = listings.filter((l) => l.status === 'draft');
  const live = listings.filter((l) => l.status === 'published');
  const pendingSellerBookings = sellerBookings.filter((b) => b.status === 'pending');
  const pendingBuyerBookings = buyerBookings.filter((b) => b.status === 'pending');
  const disputes = transactions.filter((t) => t.dispute_status && t.dispute_status !== 'none');
  const unread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const upcomingWalkthroughs = walkthroughs.filter((w) => ['scheduled','rescheduled'].includes(w.status) && +new Date(w.ends_at) > Date.now()).sort((a,b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  const isSeller = listings.length > 0 || sellerBookings.length > 0;
  const isBuyer = buyerBookings.length > 0 || transactions.some((t) => t.role === 'buyer');

  const tasks = useMemo(() => {
    const items: Task[] = [];
    (handoffTasks ?? []).forEach((t) =>
      items.push({ id: t.id, label: t.label, hint: t.hint, to: t.to, icon: ShieldCheck, tone: t.tone }),
    );
    upcomingWalkthroughs.forEach((w) => items.push({ id:`walkthrough-${w.id}`, label:`Video walkthrough ${formatWalkthroughTime(w.starts_at)}`, hint:w.listing?.title || 'Scheduled walkthrough', to:`/walkthrough/${w.id}`, icon:Video }));
    if (pendingSellerBookings.length)
      items.push({
        id: 'booking-requests',
        label: `${pendingSellerBookings.length} booking request${pendingSellerBookings.length === 1 ? '' : 's'} waiting on you`,
        hint: 'Approve, decline, or message the renter.',
        to: '/dashboard/activity?filter=requests',
        icon: CalendarDays,
      });
    if (drafts.length)
      items.push({
        id: 'drafts',
        label: `${drafts.length} listing draft${drafts.length === 1 ? '' : 's'}`,
        hint: 'Pick up where you left off.',
        to: '/dashboard/listings?status=draft',
        icon: FileText,
      });
    if (disputes.length)
      items.push({
        id: 'disputes',
        label: `${disputes.length} payment${disputes.length === 1 ? '' : 's'} under dispute`,
        hint: 'Respond with your evidence.',
        to: '/dashboard/payments',
        icon: AlertTriangle,
        tone: 'warn',
      });
    if (pendingBuyerBookings.length)
      items.push({
        id: 'buyer-pending',
        label: `${pendingBuyerBookings.length} request${pendingBuyerBookings.length === 1 ? '' : 's'} awaiting a host reply`,
        hint: 'Message the host if you need it sooner.',
        to: '/dashboard/activity?filter=rentals',
        icon: CalendarDays,
      });
    if (unread)
      items.push({
        id: 'messages',
        label: `${unread} unread message${unread === 1 ? '' : 's'}`,
        hint: 'Fast replies convert more buyers and renters.',
        to: '/dashboard/inbox',
        icon: MessageCircle,
      });
    if (!profile?.full_name || !profile?.avatar_url)
      items.push({
        id: 'profile',
        label: 'Add your profile details',
        hint: 'Add a name and photo so people know who they’re working with.',
        to: '/dashboard/account',
        icon: FileText,
      });
    return items.sort((a,b) => Number(b.tone === 'warn') - Number(a.tone === 'warn'));
  }, [
    handoffTasks,
    pendingSellerBookings.length,
    drafts.length,
    isSeller,
    paypalReady,
    disputes.length,
    pendingBuyerBookings.length,
    unread,
    profile?.full_name,
    profile?.avatar_url,
    walkthroughs,
  ]);

  const recentActivity = useMemo(
    () =>
      [
        ...transactions.map((t) => ({
          id: `t-${t.id}`,
          title: t.listing?.title || 'Vendibook payment',
          detail: `${t.role === 'buyer' ? 'Purchase' : 'Sale'} · ${t.payment_status || 'recorded'}`,
          date: t.captured_at || t.created_at,
          amount: money(t.gross_amount_cents),
          icon: Receipt,
        })),
        ...buyerBookings.map((b) => ({
          id: `bb-${b.id}`,
          title: b.listing?.title || 'Rental request',
          detail: `You requested · ${b.status}`,
          date: b.created_at,
          amount: null,
          icon: CalendarDays,
        })),
        ...sellerBookings.map((b) => ({
          id: `sb-${b.id}`,
          title: b.listing?.title || 'Booking request',
          detail: `Incoming request · ${b.status}`,
          date: b.created_at,
          amount: null,
          icon: CalendarDays,
        })),
        ...walkthroughs.map((w) => ({ id:`vw-${w.id}`, title:w.listing?.title||'Video walkthrough', detail:`Video walkthrough · ${w.status}`, date:w.created_at, amount:null, icon:Video })),
      ]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 3),
    [transactions, buyerBookings, sellerBookings, walkthroughs],
  );

  const sellerEarnings = transactions.filter((t) => t.role === 'seller');
  const buyerPayments = transactions.filter((t) => t.role === 'buyer');

  // Older links and emails used /dashboard?view=…&tab=… — keep them working by
  // handing those deep links to the previous dashboard, query string intact.
  if (routeParams.get('tab') || routeParams.get('view')) {
    return <Navigate to={`/dashboard/classic?${routeParams.toString()}`} replace />;
  }

  const leadListing = live[0] || listings[0] || null;
  const otherListings = listings.filter((l) => l.id !== leadListing?.id).slice(0, 3);
  const leadFeatured =
    !!leadListing?.featured_enabled &&
    (!leadListing?.featured_expires_at || new Date(leadListing.featured_expires_at) > new Date());

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading v2-greeting flex-wrap">
          <div>
            <p className="v2-eyebrow">Overview</p>
            <h1>Welcome back, {firstName}.</h1>
            <p>Your listings, conversations, and next steps.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link to="/dashboard/listings/new" className="v2-btn">
                <List />
                Create a listing
              </Link>
              <Link to="/search" className="v2-btn-outline">
                <Search />
                Explore listings
              </Link>
            </div>
          </div>
        </header>

        {!listingsLoading && live.length > 0 && <FeaturedPromotionBanner listings={listings} />}

        <DashboardNextSteps tasks={tasks} />

        {listingsLoading && !listings.length && (
          <section className="v2-panel">
            <div className="v2-panel-head">
              <div className="v2-skeleton h-5 w-40" />
            </div>
            <div className="space-y-3 p-5">
              <div className="v2-skeleton h-44 w-full" />
              <div className="v2-skeleton h-16 w-full" />
            </div>
          </section>
        )}

        {leadListing && (
          <section className="v2-panel">
            <div className="v2-panel-head">
              <div>
                <h2>My listings</h2>
                <p>
                  {live.length} live · {drafts.length} draft{drafts.length === 1 ? '' : 's'}
                </p>
              </div>
              <Link to="/dashboard/listings" className="v2-btn-quiet">
                View all
              </Link>
            </div>

            <article className="v2-lead-listing">
              <div className="v2-lead-media">
                {leadListing.cover_image_url ? (
                  <img src={leadListing.cover_image_url} alt={leadListing.title} loading="lazy" />
                ) : (
                  <ImageIcon aria-label="No listing image yet" />
                )}
              </div>
              <div className="v2-lead-body">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`v2-status ${leadListing.status === 'published' ? 'is-ok' : ''}`}>
                    {leadListing.status === 'published' ? 'Live' : leadListing.status}
                  </span>
                  {leadFeatured && <FeaturedBadge listing={leadListing} compact showDaysLeft />}
                  {leadListing.status === 'published' && !paypalReady && (
                    <span className="v2-status is-warn">Online payments not enabled</span>
                  )}
                </div>
                <h3>{leadListing.title?.trim() || 'Untitled listing'}</h3>
                <p>
                  {[leadListing.city, leadListing.state].filter(Boolean).join(', ') ||
                    'Location not set'}
                  {leadListing.mode ? ` · ${leadListing.mode === 'sale' ? 'For sale' : 'For rent'}` : ''}
                </p>
                <strong className="v2-price">{price(leadListing)}</strong>
                {leadListing.status === 'published' && typeof leadListing.view_count === 'number' && (
                  <div className="v2-metrics">
                    <span>
                      <strong>{leadListing.view_count}</strong> views
                    </span>
                  </div>
                )}
                <div className="v2-listing-actions">
                  <Link className="v2-btn v2-btn-sm" to={leadListing.status === 'draft' ? `/dashboard/listings/${leadListing.id}/edit` : `/listing/${leadListing.id}`}>
                    {leadListing.status === 'draft' ? 'Finish listing' : 'View listing'}
                  </Link>
                  <Link className="v2-btn-outline v2-btn-sm" to={`/edit-listing/${leadListing.id}`}>
                    Edit
                  </Link>
                  {canBoostListing(leadListing as never) && !leadFeatured && <Link
                    className="v2-btn v2-btn-sm"
                    to={`/dashboard/listings?boost=${leadListing.id}`}
                  >
                    Boost listing
                  </Link>}
                </div>
              </div>
            </article>

            {otherListings.map((listing) => (
              <div className="v2-activity-row flex-wrap" key={listing.id}>
                <span className="v2-activity-thumb">
                  {listing.cover_image_url ? (
                    <img src={listing.cover_image_url} alt="" loading="lazy" />
                  ) : (
                    <ImageIcon />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <Link to={`/edit-listing/${listing.id}`} className="block truncate font-semibold">{listing.title?.trim() || 'Untitled listing'}</Link>
                  <small>
                    {[listing.city, listing.state].filter(Boolean).join(', ') || 'Location not set'}{' '}
                    · {listing.status === 'published' ? 'Live' : listing.status}
                  </small>
                </span>
                <strong>{price(listing)}</strong>
                {isListingFeatured(listing as never) ? <FeaturedBadge listing={listing} compact /> : canBoostListing(listing as never) && <Link className="v2-btn v2-btn-sm" to={`/dashboard/listings?boost=${listing.id}`}>Boost listing</Link>}
              </div>
            ))}
          </section>
        )}

        {!listingsLoading && listings.length === 0 && !isBuyer && (
          <section className="v2-panel v2-empty">
            <h2>Start where it makes sense for you</h2>
            <p>Browse the marketplace, or list a truck, trailer, kitchen, or vendor space.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link to="/search" className="v2-btn">
                Browse listings
              </Link>
              <Link to="/dashboard/listings/new" className="v2-btn-outline">
                List an asset
              </Link>
            </div>
          </section>
        )}

        <div className="v2-two-column">
          <section className="v2-panel">
            <div className="v2-panel-head">
              <div>
                <h2>Recent activity</h2>
                <p>Your latest marketplace updates.</p>
              </div>
              <Link to="/dashboard/activity" className="v2-btn-quiet">
                View all
              </Link>
            </div>
            {recentActivity.length ? (
              recentActivity.map((item) => (
                <Link className="v2-activity-row" to="/dashboard/activity" key={item.id}>
                  <span className="v2-activity-icon">
                    <item.icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="truncate">{item.title}</strong>
                    <small>
                      {item.detail} · {new Date(item.date).toLocaleDateString()}
                    </small>
                  </span>
                  {item.amount && <strong>{item.amount}</strong>}
                </Link>
              ))
            ) : (
              <div className="v2-empty">
                <p>Your activity will appear here.</p>
                <Link to="/search" className="v2-btn-quiet">
                  Find something to buy or rent
                </Link>
              </div>
            )}
          </section>

          <section className="v2-panel">
            <div className="v2-panel-head">
              <div>
                <h2>Transactions</h2>
                <p>Track purchases, sales, and payment status.</p>
              </div>
              <Link to="/dashboard/payments" className="v2-btn-quiet">
                Open payments
              </Link>
            </div>
            <div className="v2-snapshot">
              <div>
                <strong>{sellerEarnings.length}</strong>
                <span>Seller transactions</span>
              </div>
              <div>
                <strong>{buyerPayments.length}</strong>
                <span>Buyer transactions</span>
              </div>
            </div>
          </section>
        </div>

        <section className="v2-panel">
          <div className="v2-panel-head">
            <div>
              <h2>Inbox</h2>
              <p>{unread ? `${unread} unread` : 'Your latest conversations.'}</p>
            </div>
            <Link to="/dashboard/messages" className="v2-btn-quiet">
              Open messages
            </Link>
          </div>
          {conversations.length ? (
            conversations.slice(0, 2).map((conversation) => {
              const other =
                conversation.host_id === user?.id ? conversation.shopper : conversation.host;
              return (
                <Link
                  className="v2-activity-row"
                  to={`/dashboard/messages/${conversation.id}`}
                  key={conversation.id}
                >
                  <span className="v2-activity-icon">
                    <Inbox />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="truncate">
                      {other?.full_name || conversation.listing?.title || 'Conversation'}
                    </strong>
                    <small className="truncate">
                      {conversation.last_message?.message || 'No messages yet'}
                    </small>
                  </span>
                  {(conversation.unread_count ?? 0) > 0 && (
                    <span className="v2-status">{conversation.unread_count} new</span>
                  )}
                </Link>
              );
            })
          ) : (
            <div className="v2-empty">
              <p>No conversations yet.</p>
              <Link to="/search" className="v2-btn-quiet">
                Message a host or seller
              </Link>
            </div>
          )}
        </section>

        <nav aria-label="Account shortcuts" className="grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard/notifications" className="v2-panel flex items-center gap-3 p-4 hover:border-orange-200">
            <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1"><strong className="block text-sm">Updates</strong><small className="text-muted-foreground">{notificationUnread ? `${notificationUnread} unread` : 'You’re all caught up'}</small></span><ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/dashboard/saved" className="v2-panel flex items-center gap-3 p-4 hover:border-orange-200">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1"><strong className="block text-sm">Your shortlist</strong><small className="text-muted-foreground">{favorites.length ? `${favorites.length} saved listings to compare` : 'Save listings as you browse'}</small></span><ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </WorkspaceShell>
  );
}
