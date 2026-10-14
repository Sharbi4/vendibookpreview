import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Compass,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Heart,
  History,
  Home,
  Inbox,
  List,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  Tag,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { ws } from '@/components/workspace/ui/tokens';
import darkLogo from '@/assets/vendibook-wordmark.png';
import logo from '@/assets/vendibook-wordmark-light.png';
import './workspace-navigation.css';
import { cn } from '@/lib/utils';

type NavIcon = typeof Home;
type Badge = 'messages' | 'notifications';
/** `pro` marks a feature included with Vendibook Pro; it gets a small Pro tag. */
interface WorkspaceNavItem { label: string; to: string; icon: NavIcon; badge?: Badge; pro?: boolean }
interface WorkspaceNavSection { label: string; items: WorkspaceNavItem[] }

/** One workspace, grouped by job. No buyer/seller persona switch. */
const WORKSPACE_NAV: WorkspaceNavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Home', to: '/dashboard', icon: Home },
      { label: 'Messages', to: '/dashboard/messages', icon: Inbox, badge: 'messages' },
      { label: 'Notifications', to: '/dashboard/notifications', icon: Bell, badge: 'notifications' },
      { label: 'Activity', to: '/dashboard/activity', icon: History },
    ],
  },
  {
    label: 'Selling',
    items: [
      { label: 'Listings', to: '/dashboard/listings', icon: List },
      { label: 'Offers', to: '/dashboard/offers', icon: Tag },
      { label: 'BuyerMatch', to: '/dashboard/buyermatch', icon: Target, pro: true },
    ],
  },
  {
    label: 'Buying',
    items: [
      { label: 'Saved', to: '/dashboard/saved', icon: Heart },
      { label: 'Invoices', to: '/dashboard/invoices', icon: FileText },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Payouts & payments', to: '/dashboard/payments', icon: CreditCard },
      { label: 'Transactions', to: '/dashboard/transactions', icon: Receipt },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Settings', to: '/dashboard/account', icon: Settings }],
  },
];

const TOOLS: WorkspaceNavItem[] = [
  { label: 'PricePilot', to: '/tools/pricepilot', icon: Gauge, pro: true },
  { label: 'PermitPath', to: '/tools/permitpath', icon: FileCheck2 },
];

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
    '/account',
    '/dashboard/account',
    '/dashboard/profile',
    '/dashboard/notifications',
    '/dashboard/payments',
    '/dashboard/seller-setup',
  ].some((path) => pathname.startsWith(path));
};

/**
 * Unread indicator: orange dot plus the count in readable ink (white on an
 * orange pill fails contrast at this size). Renders nothing at 0, so it clears
 * as soon as the live count does.
 */
function CountBadge({ n, tone, label }: { n: number; tone: 'dark' | 'light'; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto flex items-center gap-1.5" aria-label={`${n} unread ${label}`}>
      <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#FF5124]" />
      <span aria-hidden="true" className={cn('text-[12px] font-semibold tabular-nums', tone === 'dark' ? 'text-white/85' : 'text-[#1C1B1A]')}>
        {n > 99 ? '99+' : n}
      </span>
    </span>
  );
}

/** Plan chip next to the account name. Hidden until the plan is known. */
function PlanBadge({ tone }: { tone: 'dark' | 'light' }) {
  const { tier, isLoading, isPastDue } = useHostEntitlements();
  if (isLoading) return null;
  const paid = tier !== 'free';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.08em]',
        paid
          ? 'bg-[#FF5124]/15 text-[#FF8A66]'
          : tone === 'dark' ? 'bg-white/[0.08] text-white/60' : 'bg-[#F3EEE7] text-[#5E5953]',
        paid && tone === 'light' && 'bg-[#FFEEE7] text-[#B93A12]',
        isPastDue && 'bg-[#FBF1DC] text-[#7A4F00]',
      )}
    >
      {paid ? (isPastDue ? 'Pro · past due' : 'Pro') : 'Free'}
    </span>
  );
}

/** Pro upsell for free accounts only. Goes to the /pricing hub, never straight to consent. */
function ProCard({ onNavigate, tone }: { onNavigate?: () => void; tone: 'dark' | 'light' }) {
  const { tier, isLoading } = useHostEntitlements();
  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  if (isLoading || tier !== 'free') return null;
  return (
    <div className={cn('rounded-xl p-3', tone === 'dark' ? 'bg-white/[0.04] ring-1 ring-inset ring-white/[0.08]' : 'bg-white ring-1 ring-inset ring-[#ECE6DD]')}>
      <p className={cn('flex items-baseline justify-between gap-2 text-[13px] font-semibold', tone === 'dark' ? 'text-white' : 'text-[#1C1B1A]')}>
        Vendibook Pro <span className={cn('text-[12px] font-medium tabular-nums', tone === 'dark' ? 'text-white/50' : 'text-[#8A847B]')}>{pro.labelWithCadence}</span>
      </p>
      <p className={cn('mt-0.5 text-[12px] leading-[17px]', tone === 'dark' ? 'text-white/55' : 'text-[#5E5953]')}>
        BuyerMatch, PricePilot and a monthly Boost credit.
      </p>
      <Button asChild variant="cta" size="sm" className="mt-2.5 !h-8 w-full !rounded-lg text-[12.5px] !font-semibold !shadow-none">
        <Link to="/pricing" onClick={onNavigate}>See Vendibook Pro</Link>
      </Button>
    </div>
  );
}

function SidebarLink({ item, count, onNavigate, variant }: { item: WorkspaceNavItem; count?: number; onNavigate?: () => void; variant: 'sidebar' | 'sheet' }) {
  const Icon = item.icon;
  const { pathname } = useLocation();
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={onNavigate}
      className={({ isActive }) => {
        // Your profile lives under Settings in the menu.
        const active = isActive || (item.to === '/dashboard/account' && pathname.startsWith('/dashboard/profile'));
        return variant === 'sidebar'
          ? cn('ws-side-link', active && 'is-active')
          : cn('workspace-menu-link', active && 'is-active');
      }}
    >
      <Icon aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {item.pro && <span className={cn('ws-pro-tag', variant === 'sheet' && 'is-light')}>Pro</span>}
      {count !== undefined && <CountBadge n={count} label={item.label.toLowerCase()} tone={variant === 'sidebar' ? 'dark' : 'light'} />}
    </NavLink>
  );
}

function NavSections({ counts, onNavigate, variant }: { counts: Record<Badge, number>; onNavigate?: () => void; variant: 'sidebar' | 'sheet' }) {
  const head = variant === 'sidebar' ? 'ws-side-heading' : 'ws-sheet-heading';
  return (
    <>
      {WORKSPACE_NAV.map((section) => (
        <div key={section.label} className="ws-side-section">
          <p className={head}>{section.label}</p>
          {section.items.map((item) => (
            <SidebarLink key={item.to} item={item} variant={variant} onNavigate={onNavigate} count={item.badge ? counts[item.badge] : undefined} />
          ))}
        </div>
      ))}
      <div className="ws-side-section">
        <p className={head}>Tools</p>
        {TOOLS.map((item) => <SidebarLink key={item.to} item={item} variant={variant} onNavigate={onNavigate} />)}
      </div>
    </>
  );
}

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
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
  const counts: Record<Badge, number> = { messages: unreadMessages, notifications: unreadCount };

  return (
    <div className="v2-workspace">
      <aside className="v2-sidebar ws-sidebar">
        <Link to="/" className="ws-side-logo" aria-label="Vendibook homepage">
          <img src={logo} alt="Vendibook" className="v2-logo" />
        </Link>
        {/* Pro sits up top, under the logo. Home carries its own plan panel, so it's skipped there. */}
        {location.pathname !== '/dashboard' && (
          <div className="mb-4 empty:hidden">
            <ProCard tone="dark" />
          </div>
        )}
        <nav className="ws-side-nav" aria-label="Workspace navigation">
          <NavSections counts={counts} variant="sidebar" />
        </nav>
        <div className="ws-side-account">
          <Link to="/dashboard/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/[0.05]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
              <AvatarFallback className="bg-white/10 text-[12px] font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-white">{name}</span>
                <PlanBadge tone="dark" />
              </span>
              <span className="text-[11.5px] text-white/45">View profile</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="v2-main-column">
        <header className="v2-topbar">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="workspace-menu-trigger md:hidden" aria-label="Open dashboard menu">
                <Menu aria-hidden="true" /><span>Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="workspace-mobile-menu">
              <SheetTitle className="text-[#1C1B1A]">Your dashboard</SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-[#5E5953]">
                <span className="truncate">{name}</span>
                <PlanBadge tone="light" />
              </SheetDescription>
              <div className="mt-5 empty:hidden">
                <ProCard tone="light" onNavigate={() => setMenuOpen(false)} />
              </div>
              <nav aria-label="Dashboard menu" className="mt-5 grid gap-0.5">
                <NavSections counts={counts} variant="sheet" onNavigate={() => setMenuOpen(false)} />
                <div className="ws-side-section">
                  <p className="ws-sheet-heading">Marketplace</p>
                  <Link to="/list" onClick={() => setMenuOpen(false)} className="workspace-menu-link"><Plus aria-hidden="true" /><span>List an asset</span></Link>
                  <Link to="/search" onClick={() => setMenuOpen(false)} className="workspace-menu-link"><Compass aria-hidden="true" /><span>Browse marketplace</span></Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="md:hidden" aria-label="Vendibook homepage">
            <img src={darkLogo} alt="Vendibook" className="h-6 w-auto" />
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
            <Link className="v2-icon-action" to="/dashboard/messages" aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}>
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
            <Button asChild variant="cta" className={cn(ws.cta, 'ml-2 hidden !h-9 sm:inline-flex')}>
              <Link to="/list"><Plus aria-hidden="true" />List an asset</Link>
            </Button>
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
          <button
            type="button"
            className="v2-mobile-link"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-label={unreadCount > 0 ? `Menu, ${unreadCount} unread notifications` : 'Menu'}
          >
            <span className="v2-mobile-icon">
              <Menu />
              {unreadCount > 0 && <span className="v2-mobile-alert-dot" />}
            </span>
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
