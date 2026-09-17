import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Compass,
  CreditCard,
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
import { Button } from '@/components/ui/button';
import logo from '@/assets/vendibook-wordmark-light.png';
import { cn } from '@/lib/utils';

/** One workspace. No buyer/seller persona switch. */
const desktopNav = [
  ['Home', '/dashboard', Home],
  ['Listings', '/dashboard/listings', List],
  ['Activity', '/dashboard/activity', ShoppingBag],
  ['Inbox', '/dashboard/inbox', Inbox],
  ['Payments', '/dashboard/payments', CreditCard],
  ['Account', '/dashboard/account', Settings],
] as const;

const mobileNav = [
  ['Home', '/dashboard', Home],
  ['Explore', '/search', Compass],
  ['Listings', '/dashboard/listings', List],
  ['Activity', '/dashboard/activity', ShoppingBag],
  ['Account', '/dashboard/account', Settings],
] as const;

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
        <Link to="/dashboard" className="v2-logo-link">
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
              {label === 'Inbox' && unreadMessages > 0 && (
                <span className="v2-count">{unreadMessages}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard/account" className="v2-sidebar-profile">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>
            <span className="truncate">{name}</span>
            <small>View account</small>
          </span>
        </Link>
      </aside>

      <div className="v2-main-column">
        <header className="v2-topbar">
          <Link to="/dashboard" className="md:hidden">
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
            <Link className="v2-icon-action" to="/dashboard/inbox" aria-label="Inbox">
              <Inbox />
              {unreadMessages > 0 && <span className="v2-alert-dot" />}
            </Link>
            <Link
              className="v2-icon-action"
              to="/notification-preferences"
              aria-label="Notifications"
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
        <main className="v2-content">{children}</main>
      </div>

      <nav className="v2-mobile-nav" aria-label="Workspace navigation">
        {mobileNav.map(([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => cn('v2-mobile-link', isActive && 'is-active')}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
