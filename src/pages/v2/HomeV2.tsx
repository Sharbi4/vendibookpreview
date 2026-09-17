import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, List, MessageCircle, Search, ShieldCheck, UserRound } from 'lucide-react';
import WorkspaceShell from '@/components/v2/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function HomeV2() {
  const { user, profile, isVerified } = useAuth();
  const { listings, stats } = useHostListings();
  const { bookings: buyerBookings, stats: buyerStats } = useShopperBookings();
  const { bookings: sellerBookings, stats: sellerStats } = useHostBookings();
  const { count: unreadMessages } = useUnreadMessageCount();
  const name = profile?.full_name || user?.email || 'there';
  const firstName = name.split(' ')[0];
  const seller = listings.length > 0 || sellerBookings.length > 0;
  const buyer = buyerBookings.length > 0;
  const profileComplete = Boolean(profile?.full_name && profile?.avatar_url);
  const recent = [...buyerBookings.map((b) => ({ id: `b-${b.id}`, title: b.listing?.title || 'Rental request', date: b.created_at, status: b.status })), ...sellerBookings.map((b) => ({ id: `s-${b.id}`, title: b.listing?.title || 'Booking request', date: b.created_at, status: b.status }))].sort((a,b) => +new Date(b.date) - +new Date(a.date)).slice(0,4);
  const actions = [sellerStats.pending > 0 ? `${sellerStats.pending} booking request${sellerStats.pending === 1 ? '' : 's'} waiting for your reply` : null, buyerStats.pending > 0 ? `${buyerStats.pending} booking request${buyerStats.pending === 1 ? '' : 's'} awaiting a host response` : null, unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}` : null].filter(Boolean) as string[];
  return <WorkspaceShell><div className="v2-page-stack">
    <header className="v2-page-heading v2-greeting"><div><p className="v2-eyebrow">Your workspace</p><h1>Good to see you, {firstName}.</h1><p>Everything you buy, rent, list, and sell—together.</p></div><Avatar className="h-16 w-16"><AvatarImage src={profile?.avatar_url || undefined} alt={name} /><AvatarFallback>{firstName[0]?.toUpperCase()}</AvatarFallback></Avatar></header>
    <section><h2>Quick actions</h2><div className="v2-quick-grid"><Link className="v2-quick-action" to="/list"><List /><span><strong>List an asset</strong><small>Create a free listing</small></span><ArrowRight /></Link><Link className="v2-quick-action" to="/search"><Search /><span><strong>Browse marketplace</strong><small>Find your next truck or space</small></span><ArrowRight /></Link><Link className="v2-quick-action" to="/dashboard-v2/messages"><MessageCircle /><span><strong>Messages</strong><small>{unreadMessages ? `${unreadMessages} unread` : 'Open your inbox'}</small></span><ArrowRight /></Link></div></section>
    {actions.length > 0 && <section><div className="v2-section-head"><div><h2>Action required</h2><p>Items that genuinely need your attention.</p></div></div><div className="v2-card divide-y">{actions.map((item) => <Link to="/dashboard-v2/activity" className="v2-row" key={item}><Circle />{item}<ArrowRight /></Link>)}</div></section>}
    <div className="v2-two-column"><section><div className="v2-section-head"><div><h2>Recent activity</h2><p>Your latest marketplace updates.</p></div><Button asChild variant="ghost" size="sm"><Link to="/dashboard-v2/activity">View all</Link></Button></div><div className="v2-card">{recent.length ? recent.map((item) => <Link key={item.id} to="/dashboard-v2/activity" className="v2-activity-row"><span><strong>{item.title}</strong><small>{new Date(item.date).toLocaleDateString()}</small></span><span className="v2-status">{item.status}</span></Link>) : <div className="v2-empty"><p>No activity yet.</p><Link to="/search">Explore the marketplace</Link></div>}</div></section>
    {(seller || buyer) && <section><div className="v2-section-head"><div><h2>Your marketplace</h2><p>A concise view of what’s active.</p></div></div><div className="v2-card v2-snapshot">{seller && <><div><strong>{stats.published}</strong><span>Live listings</span></div><div><strong>{sellerStats.pending}</strong><span>Seller requests</span></div></>}{buyer && <><div><strong>{buyerStats.approved}</strong><span>Upcoming rentals</span></div><div><strong>{buyerStats.pending}</strong><span>Buyer requests</span></div></>}</div></section>}</div>
    {(!profileComplete || !isVerified || seller) && <section><div className="v2-section-head"><div><h2>Finish setting up</h2><p>Optional steps that strengthen your marketplace profile.</p></div></div><div className="v2-card divide-y"><Link to="/dashboard-v2/account" className="v2-check-row">{profileComplete ? <CheckCircle2 /> : <UserRound />}<span><strong>Complete public profile</strong><small>Add your name and profile photo.</small></span><ArrowRight /></Link><Link to="/verify-identity" className="v2-check-row">{isVerified ? <CheckCircle2 /> : <ShieldCheck />}<span><strong>Verify identity</strong><small>Optional trust signal; never required to transact.</small></span><ArrowRight /></Link>{seller && <div className="v2-paypal-setup"><div><strong>Get ready to get paid</strong><small>Connect a PayPal Business account when seller onboarding is available.</small></div><SellerPayPalConnect showWhenDisabled /></div>}<Link to="/sms" className="v2-check-row"><MessageCircle /><span><strong>SMS notifications</strong><small>Optional alerts for time-sensitive updates.</small></span><ArrowRight /></Link></div></section>}
  </div></WorkspaceShell>;
}