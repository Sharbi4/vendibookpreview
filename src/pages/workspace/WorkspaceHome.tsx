import { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Inbox,
  List,
  MessageCircle,
  Receipt,
  Search,
} from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useConversations } from '@/hooks/useConversations';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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

type Task = { id: string; label: string; hint: string; to: string; icon: typeof AlertTriangle };

export default function WorkspaceHome() {
  const { user, profile } = useAuth();
  const { listings, isLoading: listingsLoading } = useHostListings();
  const { bookings: buyerBookings } = useShopperBookings();
  const { bookings: sellerBookings } = useHostBookings();
  const { transactions } = useUserTransactions(user?.id);
  const { conversations } = useConversations();
  const { status: paypalStatus, isReady: paypalReady, connection } = useMyPayPalConnection();

  const name = profile?.full_name || user?.email || 'there';
  const firstName = name.split(' ')[0];

  const drafts = listings.filter((l) => l.status === 'draft');
  const live = listings.filter((l) => l.status === 'published');
  const pendingSellerBookings = sellerBookings.filter((b) => b.status === 'pending');
  const pendingBuyerBookings = buyerBookings.filter((b) => b.status === 'pending');
  const disputes = transactions.filter((t) => t.dispute_status && t.dispute_status !== 'none');
  const unread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  const isSeller = listings.length > 0 || sellerBookings.length > 0;
  const isBuyer = buyerBookings.length > 0 || transactions.some((t) => t.role === 'buyer');

  const tasks = useMemo(() => {
    const items: Task[] = [];
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
        label: `${drafts.length} unfinished listing${drafts.length === 1 ? '' : 's'}`,
        hint: 'Finish and publish to start getting inquiries.',
        to: '/dashboard/listings?status=draft',
        icon: FileText,
      });
    if (isSeller && paypalStatus === 'action_required')
      items.push({
        id: 'paypal-action',
        label: 'PayPal needs your attention',
        hint: 'Resolve the issue on your PayPal account so you can receive payments.',
        to: '/dashboard/payments',
        icon: AlertTriangle,
      });
    if (isSeller && !paypalReady && paypalStatus !== 'action_required')
      items.push({
        id: 'paypal-connect',
        label: 'Accept secure online payments',
        hint: 'Connect PayPal to let qualified buyers pay through Vendibook.',
        to: '/dashboard/payments',
        icon: CreditCard,
      });
    if (disputes.length)
      items.push({
        id: 'disputes',
        label: `${disputes.length} payment${disputes.length === 1 ? '' : 's'} under dispute`,
        hint: 'Respond with your evidence.',
        to: '/dashboard/payments',
        icon: AlertTriangle,
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
        label: 'Finish your profile',
        hint: 'A name and photo build trust with buyers and hosts.',
        to: '/dashboard/account',
        icon: FileText,
      });
    return items;
  }, [
    pendingSellerBookings.length,
    drafts.length,
    isSeller,
    paypalStatus,
    paypalReady,
    disputes.length,
    pendingBuyerBookings.length,
    unread,
    profile?.full_name,
    profile?.avatar_url,
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
      ]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 5),
    [transactions, buyerBookings, sellerBookings],
  );

  const sellerEarnings = transactions.filter((t) => t.role === 'seller');
  const buyerPayments = transactions.filter((t) => t.role === 'buyer');

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading v2-greeting">
          <div>
            <p className="v2-eyebrow">Your workspace</p>
            <h1>Good to see you, {firstName}.</h1>
            <p>Everything you buy, rent, list, and sell — in one place.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/list">
                  <List />
                  List an asset
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/search">
                  <Search />
                  Browse the marketplace
                </Link>
              </Button>
            </div>
          </div>
          <Avatar className="hidden h-16 w-16 sm:flex">
            <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
            <AvatarFallback>{firstName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </header>

        {tasks.length > 0 && (
          <section>
            <div className="v2-section-head">
              <div>
                <h2>Needs your attention</h2>
                <p>Only real tasks from your account appear here.</p>
              </div>
            </div>
            <div className="v2-card divide-y">
              {tasks.map((task) => (
                <Link className="v2-row" to={task.to} key={task.id}>
                  <task.icon />
                  <span>
                    <strong>{task.label}</strong>
                    <small>{task.hint}</small>
                  </span>
                  <ArrowRight />
                </Link>
              ))}
            </div>
          </section>
        )}

        {(isSeller || listings.length > 0) && (
          <section>
            <div className="v2-section-head">
              <div>
                <h2>My listings</h2>
                <p>
                  {live.length} live · {drafts.length} draft{drafts.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/listings">View all</Link>
              </Button>
            </div>
            <div className="v2-listing-grid">
              {listings.slice(0, 3).map((listing) => (
                <article className="v2-listing-card" key={listing.id}>
                  <div className="v2-listing-image">
                    {listing.cover_image_url ? (
                      <img src={listing.cover_image_url} alt={listing.title} loading="lazy" />
                    ) : (
                      <ImageIcon aria-label="No listing image yet" />
                    )}
                    <span className="v2-listing-status">{listing.status}</span>
                  </div>
                  <div className="v2-listing-body">
                    <div>
                      <h2>{listing.title}</h2>
                      <p>
                        {listing.city}
                        {listing.state ? `, ${listing.state}` : ''}
                      </p>
                    </div>
                    <strong className="v2-price">{price(listing)}</strong>
                    <div className="v2-listing-actions">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/listing/${listing.id}`}>View</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/edit-listing/${listing.id}`}>Edit</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/dashboard/listings?boost=${listing.id}`}>Promote</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!listingsLoading && listings.length === 0 && !isBuyer && (
          <section className="v2-card v2-empty">
            <h2>Start where it makes sense for you</h2>
            <p>Browse the marketplace, or list a truck, trailer, kitchen, or vendor space.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/search">Browse listings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/list">List an asset</Link>
              </Button>
            </div>
          </section>
        )}

        <div className="v2-two-column">
          <section>
            <div className="v2-section-head">
              <div>
                <h2>Recent activity</h2>
                <p>Purchases, sales, rentals, and booking requests.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/activity">View all</Link>
              </Button>
            </div>
            <div className="v2-card divide-y">
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
                  <p>Nothing here yet.</p>
                  <Link to="/search">Find something to buy or rent</Link>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="v2-section-head">
              <div>
                <h2>Money</h2>
                <p>Recorded marketplace payments and payment setup.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/payments">Open payments</Link>
              </Button>
            </div>
            <div className="v2-card">
              <div className="v2-snapshot">
                <div>
                  <strong>{sellerEarnings.length}</strong>
                  <span>Sales &amp; rental payments received</span>
                </div>
                <div>
                  <strong>{buyerPayments.length}</strong>
                  <span>Payments you made</span>
                </div>
              </div>
              <Link className="v2-row" to="/dashboard/payments">
                <CreditCard />
                <span>
                  <strong>
                    {paypalReady
                      ? 'PayPal connected — ready to receive payments'
                      : paypalStatus === 'action_required'
                        ? 'PayPal action required'
                        : connection
                          ? 'PayPal setup in progress'
                          : 'PayPal not connected'}
                  </strong>
                  <small>
                    {paypalReady
                      ? connection?.paypal_email || 'Your connected PayPal Business account'
                      : 'Connect PayPal to let qualified buyers pay through Vendibook.'}
                  </small>
                </span>
                <ArrowRight />
              </Link>
            </div>
          </section>
        </div>

        <section>
          <div className="v2-section-head">
            <div>
              <h2>Inbox</h2>
              <p>{unread ? `${unread} unread` : 'Your latest conversations.'}</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/inbox">Open inbox</Link>
            </Button>
          </div>
          <div className="v2-card divide-y">
            {conversations.length ? (
              conversations.slice(0, 4).map((conversation) => {
                const other =
                  conversation.host_id === user?.id ? conversation.shopper : conversation.host;
                return (
                  <Link
                    className="v2-activity-row"
                    to={`/messages/${conversation.id}`}
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
                <Link to="/search">Message a host or seller</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
