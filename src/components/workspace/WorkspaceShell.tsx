import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Compass,
  CreditCard,
  Heart,
  Home,
  Inbox,
  List,
  Plus,
  Search,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import logo from '@/assets/vendibook-wordmark-light.png';
import { cn } from '@/lib/utils';

/** One workspace. No buyer/seller persona switch. */
const desktopNav = [
  ['Home', '/dashboard', Home],
  ['Listings', '/dashboard/listings', List],
  ['Transactions', '/dashboard/transactions', ShoppingBag],
  ['Messages', '/dashboard/messages', Inbox],
  ['Notifications', '/dashboard/notifications', Bell],
  ['Saved', '/dashboard/saved', Heart],
  ['Payments', '/dashboard/payments', CreditCard],
  ['Account', '/dashboard/account', Settings],
] as const;

const mobileNav = [
  ['Home', '/dashboard', Home],
  ['Explore', '/search', Compass],
  ['Listings', '/dashboard/listings', List],
  ['Messages', '/dashboard/messages', Inbox],
  ['Account', '/dashboard/account', Settings],
] as const;

const isMobileDestinationActive = (to: string, pathname: string) => {
  if (to === '/dashboard') return pathname === '/dashboard';
  if (to === '/search') return pathname.startsWith('/search');
  if (to === '/dashboard/listings') return pathname.startsWith('/dashboard/listings');
  if (to === '/dashboard/messages') return pathname.startsWith('/dashboard/messages');

  return [
    '/dashboard/account',
    '/dashboard/profile',
    '/dashboard/notifications',
    '/dashboard/payments',
    '/dashboard/seller-setup',
  ].some((path) => pathname.startsWith(path));
};

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications(user?.id);
  const { count: unreadMessages } = useUnreadMessageCount();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      });
    }
  }, [isLoading, user, navigate, location.pathname, location.search]);

  if (isLoading || !user) return <div className="v2-loading">Loading your workspace…</div>;

  const name = profile?.full_name || user.email || 'Your account';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="v2-workspace">
      <aside className="v2-sidebar">
        <Link to="/" className="v2-logo-link" aria-label="Vendibook homepage">
          <img src={logo} alt="Vendibook" className="v2-logo" />
        </Link>
        <nav className="v2-desktop-nav" aria-label="Workspace navigation">
          {desktopNav.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => cn('v2-nav-link', isActive && 'is-active')}
            >
              <Icon />
              {label}
              {label === 'Messages' && unreadMessages > 0 && (
                <span className="v2-count">{unreadMessages}</span>
              )}
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="v2-count">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard/profile" className="v2-sidebar-profile">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>
            <span className="truncate">{name}</span>
            <small>View profile</small>
          </span>
        </Link>
      </aside>

      <div className="v2-main-column">
        <header className="v2-topbar">
          <Link to="/" className="md:hidden" aria-label="Vendibook homepage">
            <img src={logo} alt="Vendibook" className="h-6 w-auto" />
          </Link>
          <form action="/search" className="v2-search">
            <Search />
            <input
              name="q"
              aria-label="Search the marketplace"
              placeholder="Search trucks, trailers, kitchens…"
            />
          </form>
          <div className="flex items-center gap-1.5">
            <Link className="v2-icon-action" to="/dashboard/messages" aria-label="Messages">
              <Inbox />
              {unreadMessages > 0 && <span className="v2-alert-dot" />}
            </Link>
            <Link
              className="v2-icon-action"
              to="/dashboard/notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell />
              {unreadCount > 0 && <span className="v2-alert-dot" />}
            </Link>
            <Link to="/list" className="v2-btn v2-btn-sm ml-1 hidden sm:inline-flex">
              <Plus />
              List an asset
            </Link>
          </div>
        </header>
        <main className="v2-content">
          {location.pathname !== '/dashboard' && (
            <Link to="/dashboard" className="v2-dashboard-back">
              <ArrowLeft />
              Back to dashboard
            </Link>
          )}
          {children}
        </main>
      </div>

      <nav className="v2-mobile-nav" aria-label="Workspace navigation">
        <div className="v2-mobile-nav-inner">
          {mobileNav.map(([label, to, Icon]) => {
            const isActive = isMobileDestinationActive(to, location.pathname);

            return (
              <NavLink
                key={to}
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className={cn('v2-mobile-link', isActive && 'is-active')}
              >
                <span className="v2-mobile-icon">
                  <Icon />
                  {label === 'Messages' && unreadMessages > 0 && <span className="v2-mobile-alert-dot" />}
                </span>
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
