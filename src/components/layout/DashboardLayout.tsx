import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarDays,
  MessageSquare,
  Heart,
  Settings,
  LogOut,
  Menu,
  BarChart3,
  Truck,
  User,
  Search,
  Shield,
  Megaphone,
  ChefHat,
  Gift,
  FileCheck,
  ShoppingBag,
  DollarSign,
  Bell,
  Sparkles as _s,
  Wrench,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useReferralEarnings } from '@/hooks/useReferralEarnings';
import { useDashboardPersona } from '@/hooks/useDashboardPersona';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ConciergeInbox } from '@/components/concierge/ConciergeInbox';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import AppDropdownMenu from './AppDropdownMenu';
import IdentityChip from '@/components/dashboard/shared/IdentityChip';
import DashboardMobileTabs from '@/components/dashboard/overview/DashboardMobileTabs';
import GoProButton from '@/components/dashboard/GoProButton';
import SidebarUpgradeCard from '@/components/dashboard/SidebarUpgradeCard';
import VerifyReminderModal from '@/components/dashboard/VerifyReminderModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface DashboardLayoutProps {
  children: React.ReactNode;
  mode: 'host' | 'shopper';
  onModeChange: (mode: 'host' | 'shopper') => void;
  isHost: boolean;
}

type NavItem = {
  title: string;
  icon: any;
  href: string;
  tab: string | null;
  badge?: React.ReactNode;
};

type NavSection = {
  id: string;
  label?: string;
  items: NavItem[];
};

export const DashboardLayout = ({ children, mode, onModeChange, isHost }: DashboardLayoutProps) => {
  const { user, profile, signOut, isVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { count: unreadMessageCount } = useUnreadMessageCount();
  const { earned: referralEarned } = useReferralEarnings();
  const { hasGhostKitchen } = useDashboardPersona();

  const messagesBadge =
    unreadMessageCount > 0 ? (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
      </span>
    ) : null;

  const referralBadge =
    referralEarned > 0 ? (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
        ${Math.round(referralEarned)}
      </span>
    ) : null;

  const sections: NavSection[] = mode === 'host'
    ? [
        {
          id: 'workspace',
          label: 'Workspace',
          items: [
            { title: 'Overview', icon: LayoutGrid, href: '/dashboard?view=host', tab: null },
            { title: 'Listings', icon: Truck, href: '/host/listings', tab: null },
            { title: 'Sales & Transactions', icon: DollarSign, href: '/dashboard?view=host&tab=sales', tab: 'sales' },
            { title: 'Booking Manager', icon: CalendarDays, href: '/host/bookings', tab: null },
            { title: 'Insights & Reporting', icon: BarChart3, href: '/dashboard?view=host&tab=insights', tab: 'insights' },
            { title: 'Promote & Upgrades', icon: Megaphone, href: '/dashboard?view=host&tab=promote', tab: 'promote' },
            { title: 'Membership', icon: CreditCard, href: '/dashboard?view=host&tab=membership', tab: 'membership' },
            { title: 'Permits', icon: FileCheck, href: '/dashboard?view=host&tab=permits', tab: 'permits' },
            ...(hasGhostKitchen ? [{ title: 'Kitchen', icon: ChefHat, href: '/dashboard?view=host&tab=kitchen', tab: 'kitchen' }] : []),
            { title: 'Messages', icon: MessageSquare, href: '/messages', tab: null, badge: messagesBadge },
            { title: 'Notifications', icon: Bell, href: '/dashboard?view=host&tab=notifications', tab: 'notifications' },
            { title: 'Refer & Earn', icon: Gift, href: '/referral/dashboard?source=sidebar', tab: null, badge: referralBadge },
          ],
        },
        {
          id: 'account',
          label: 'Account',
          items: [
            { title: 'Profile & Account', icon: User, href: '/account', tab: null },
            { title: 'Payouts', icon: Banknote, href: '/dashboard?view=host&tab=payouts', tab: 'payouts' },
            { title: 'Notification Settings', icon: Settings, href: '/notification-preferences', tab: null },
            { title: 'Identity Verification', icon: Shield, href: '/verify-identity', tab: null },
          ],
        },
      ]
    : [
        {
          id: 'workspace',
          label: 'Workspace',
          items: [
            { title: 'Overview', icon: LayoutGrid, href: '/dashboard?view=shopper', tab: null },
            { title: 'Orders & Transactions', icon: ShoppingBag, href: '/dashboard?view=shopper&tab=orders', tab: 'orders' },
            { title: 'Bookings & Rentals', icon: CalendarDays, href: '/dashboard?view=shopper&tab=bookings', tab: 'bookings' },
            { title: 'Favorites', icon: Heart, href: '/dashboard?view=shopper&tab=favorites', tab: 'favorites' },
            { title: 'Messages', icon: MessageSquare, href: '/messages', tab: null, badge: messagesBadge },
            { title: 'Notifications', icon: Bell, href: '/dashboard?view=shopper&tab=notifications', tab: 'notifications' },
            { title: 'Refer & Earn', icon: Gift, href: '/dashboard?view=shopper&tab=referral', tab: 'referral', badge: referralBadge },
            { title: 'Premium Tools', icon: Wrench, href: '/dashboard?view=shopper&tab=tools', tab: 'tools' },
            { title: 'Permits', icon: FileCheck, href: '/dashboard?view=shopper&tab=permits', tab: 'permits' },
          ],
        },
        {
          id: 'account',
          label: 'Account',
          items: [
            { title: 'Profile & Account', icon: User, href: '/account', tab: null },
            { title: 'Membership & Billing', icon: CreditCard, href: '/account/subscription', tab: null },
            { title: 'Identity Verification', icon: Shield, href: '/verify-identity', tab: null },
          ],
        },
      ];

  const isActive = (href: string, tab: string | null) => {
    const currentPath = location.pathname;
    const currentTab = new URLSearchParams(location.search).get('tab');
    if (tab) return currentPath === '/dashboard' && currentTab === tab;
    if (href.startsWith('/dashboard') && !tab) {
      return currentPath === '/dashboard' && !currentTab;
    }
    return currentPath === href.split('?')[0] && !href.includes('?');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const ModeSwitch = ({ small = false }: { small?: boolean }) => (
    <div className={cn('flex border border-border rounded-lg overflow-hidden', small ? '' : '')}>
      <button
        onClick={() => onModeChange('shopper')}
        className={cn(
          'flex-1 font-medium transition-all',
          small ? 'text-xs px-4 py-1.5' : 'text-sm py-2.5',
          mode === 'shopper' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        Buying
      </button>
      <button
        onClick={() => onModeChange('host')}
        className={cn(
          'flex-1 font-medium transition-all',
          small ? 'text-xs px-4 py-1.5' : 'text-sm py-2.5',
          mode === 'host' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        Hosting
      </button>
    </div>
  );

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-8" />
          <span className="font-semibold text-lg text-foreground">Vendibook</span>
        </Link>
      </div>

      {/* User Profile + Identity chip */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-foreground font-medium text-lg">
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{mode === 'host' ? 'Hosting' : 'Buying'}</span>
              <IdentityChip verified={isVerified} prominent={!isVerified} />
            </div>
          </div>
        </div>

        {isHost && (
          <div id="mode-switch-container">
            <ModeSwitch />
          </div>
        )}
      </div>

      {/* Nav sections */}
      <ScrollArea className="flex-1">
        {sections.map((section, sIdx) => (
          <div key={section.id}>
            {section.id === 'account' && <SidebarUpgradeCard />}
            <div className={cn('py-3', sIdx > 0 && 'border-t border-border')}>
            {section.label && (
              <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href, item.tab);
              return (
                <Link
                  key={item.title}
                  to={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    'group flex items-center gap-3 px-6 py-2.5 text-[14px] transition-colors duration-150 relative',
                    active
                      ? 'text-foreground font-semibold bg-white/[0.03]'
                      : 'text-muted-foreground font-medium hover:text-foreground hover:bg-white/[0.03]',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary shadow-[0_0_12px_-2px_rgba(255,81,36,0.9)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <item.icon className={cn('h-[18px] w-[18px]', active && 'text-primary')} strokeWidth={active ? 2.2 : 1.75} />
                  <span className="flex-1">{item.title}</span>
                  {item.badge}
                </Link>
              );
            })}
            </div>
          </div>
        ))}
      </ScrollArea>


      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-0 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  );

  // Flatten items for icon rail (workspace section only)
  const railItems = sections.find((s) => s.id === 'workspace')?.items ?? [];

  return (
    <div className="dashboard-shell min-h-screen flex flex-col bg-background">
      {/* Mobile Header — only real mobile, tablets get the icon rail */}
      <header className="md:hidden sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4 gap-2">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent onLinkClick={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/" aria-label="Vendibook home">
              <img src={vendibookFavicon} alt="Vendibook" className="h-7 w-7" />
            </Link>
          </div>
          {isHost && <ModeSwitch small />}
          <div className="flex items-center gap-2">
            {user && <ConciergeInbox userId={user.id} />}
            <NotificationCenter />
            <AppDropdownMenu variant="light" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Full sidebar — lg+ */}
        <aside className="hidden lg:flex lg:w-64 flex-col border-r border-white/5 bg-background shrink-0">
          <SidebarContent />
        </aside>

        {/* Icon rail — md → lg only. Persistent, no hamburger required. */}
        <TooltipProvider delayDuration={100}>
          <aside className="hidden md:flex lg:hidden w-16 flex-col items-center border-r border-white/5 bg-background shrink-0 py-3 gap-1">
            <Link to="/" className="mb-2" aria-label="Vendibook home">
              <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-8" />
            </Link>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              aria-label="Expand sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent onLinkClick={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="w-8 h-px bg-white/10 my-1" />
            {railItems.map((item) => {
              const active = isActive(item.href, item.tab);
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      aria-label={item.title}
                      className={cn(
                        'relative h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                        active
                          ? 'text-primary bg-white/[0.04]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_-2px_rgba(255,81,36,0.9)]" />
                      )}
                      <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.75} />
                      {item.badge && (
                        <span className="absolute -top-0.5 -right-0.5">{item.badge}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </aside>
        </TooltipProvider>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="hidden md:flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-white/5 bg-background">
            <div />
            {isHost && <div className="w-[240px]"><ModeSwitch /></div>}
            <div className="flex items-center gap-3">
              {user && <ConciergeInbox userId={user.id} />}
              <NotificationCenter />
              <AppDropdownMenu variant="light" />
            </div>
          </div>
          <div className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-6 overflow-auto">
            {/* Mobile-only tab pills — every tab discoverable without opening a menu */}
            <DashboardMobileTabs mode={mode} />
            {children}
          </div>
        </main>
      </div>


      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-white/5 z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {(mode === 'host'
            ? [
                { to: '/dashboard?view=host', match: (p: string, s: string) => p === '/dashboard' && s.includes('view=host') && !s.includes('tab='), icon: LayoutGrid, label: 'Overview' },
                { to: '/host/listings', match: (p: string) => p === '/host/listings', icon: Truck, label: 'Listings' },
                { to: '/host/bookings', match: (p: string) => p === '/host/bookings', icon: CalendarDays, label: 'Manager' },
                { to: '/messages', match: (p: string) => p === '/messages', icon: MessageSquare, label: 'Inbox', badge: messagesBadge },
                { to: '/account', match: (p: string) => p === '/account', icon: User, label: 'Profile' },
              ]
            : [
                { to: '/search', match: (p: string) => p === '/search', icon: Search, label: 'Explore' },
                { to: '/dashboard?view=shopper&tab=orders', match: (p: string, s: string) => p === '/dashboard' && s.includes('tab=orders'), icon: ShoppingBag, label: 'Orders' },
                { to: '/dashboard?view=shopper', match: (p: string, s: string) => p === '/dashboard' && !s.includes('tab='), icon: CalendarDays, label: 'Bookings' },
                { to: '/messages', match: (p: string) => p === '/messages', icon: MessageSquare, label: 'Inbox', badge: messagesBadge },
                { to: '/account', match: (p: string) => p === '/account', icon: User, label: 'Profile' },
              ]
          ).map((item) => {
            const active = item.match(location.pathname, location.search);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 transition-colors relative',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground',
                )}
              >
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(255,81,36,0.8)]" />}
                <div className="relative">
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.75} />
                  {item.badge}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>

            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
