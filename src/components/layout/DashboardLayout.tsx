import { useState } from 'react';
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
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import MobileMenu from './MobileMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
  mode: 'host' | 'shopper';
  onModeChange: (mode: 'host' | 'shopper') => void;
  isHost: boolean;
}

export const DashboardLayout = ({ children, mode, onModeChange, isHost }: DashboardLayoutProps) => {
  const { user, profile, signOut, isVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Airbnb-style Navigation Config based on mode
  const navigation = mode === 'host' ? [
    { title: 'Overview', icon: LayoutGrid, href: '/dashboard?view=host', tab: null },
    { title: 'Listings', icon: Truck, href: '/host/listings', tab: null },
    { title: 'Booking Manager', icon: CalendarDays, href: '/host/bookings', tab: null },
    { title: 'Reporting', icon: BarChart3, href: '/host/reporting', tab: null },
    { title: 'Messages', icon: MessageSquare, href: '/messages', tab: null },
  ] : [
    { title: 'Bookings', icon: CalendarDays, href: '/dashboard', tab: null },
    { title: 'Favorites', icon: Heart, href: '/favorites', tab: null },
    { title: 'Messages', icon: MessageSquare, href: '/messages', tab: null },
  ];

  // Active state logic
  const isActive = (href: string, tab: string | null) => {
    const currentPath = location.pathname;
    const currentTab = new URLSearchParams(location.search).get('tab');
    
    if (tab) {
      return currentPath === '/dashboard' && currentTab === tab;
    }
    
    if (href === '/dashboard' && !tab) {
      return currentPath === '/dashboard' && !currentTab;
    }
    
    return currentPath === href.split('?')[0] && !href.includes('?');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-8" />
          <span className="font-semibold text-lg text-foreground">Vendibook</span>
        </Link>
      </div>

      {/* User Profile */}
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
            <p className="text-sm text-muted-foreground">
              {mode === 'host' ? 'Hosting' : 'Guest'}
            </p>
          </div>
        </div>
        
        {/* Mode Switcher - Only for Hosts */}
        {isHost && (
          <div id="mode-switch-container" className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => onModeChange('shopper')}
              className={cn(
                "flex-1 text-sm font-medium py-2.5 transition-all",
                mode === 'shopper' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Kitchen Pro
            </button>
            <button
              onClick={() => onModeChange('host')}
              className={cn(
                "flex-1 text-sm font-medium py-2.5 transition-all",
                mode === 'host' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Host / Seller
            </button>
          </div>
        )}
      </div>

      {/* Nav Links - Clean Airbnb Style */}
      <ScrollArea className="flex-1">
        <div className="py-3">
          {navigation.map((item) => {
            const active = isActive(item.href, item.tab);
            return (
              <Link
                key={item.title}
                to={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm transition-colors relative",
                  active 
                    ? "text-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {/* Active indicator - left border */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full" />
                )}
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>

        {/* Additional Host Links */}
        {mode === 'host' && (
          <div className="border-t border-border py-3">
            <Link
              to="/verify-identity"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm transition-colors",
                location.pathname === '/verify-identity'
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Shield className="h-5 w-5" />
              Identity Verification
            </Link>
          </div>
        )}

        {/* Settings Section */}
        <div className="border-t border-border py-3">
          <Link
            to="/account"
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 px-6 py-3 text-sm transition-colors",
              location.pathname === '/account'
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Settings className="h-5 w-5" />
            My Account
          </Link>
        </div>
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={vendibookFavicon} alt="Vendibook" className="h-7 w-7" />
            </Link>
          </div>
          {/* Mode Toggle - Center */}
          {isHost && (
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => onModeChange('shopper')}
                className={cn(
                  "text-xs font-medium px-4 py-1.5 transition-all",
                  mode === 'shopper' 
                    ? "bg-foreground text-background" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Kitchen Pro
              </button>
              <button
                onClick={() => onModeChange('host')}
                className={cn(
                  "text-xs font-medium px-4 py-1.5 transition-all",
                  mode === 'host' 
                    ? "bg-foreground text-background" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Host / Seller
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsAccountMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>




      <MobileMenu
        isOpen={isAccountMenuOpen}
        onClose={() => setIsAccountMenuOpen(false)}
        user={user}
        profile={profile}
        isVerified={isVerified}
        isAdmin={false}
        onSignOut={handleSignOut}
        onNavigate={navigate}
      />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-background shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header Bar */}
          <div className="hidden lg:flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background">
            <div />
            {/* Mode Toggle - Center */}
            {isHost && (
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => onModeChange('shopper')}
                  className={cn(
                    "text-sm font-medium px-5 py-2 transition-all",
                    mode === 'shopper' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Kitchen Pro
                </button>
                <button
                  onClick={() => onModeChange('host')}
                  className={cn(
                    "text-sm font-medium px-5 py-2 transition-all",
                    mode === 'host' 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Host / Seller
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <Link to="/account">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-foreground text-sm">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav - Airbnb Style - Changes based on mode */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {mode === 'host' ? (
            <>
              {/* Host Mode Navigation */}
              <Link 
                to="/dashboard?view=host" 
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors relative",
                  location.pathname === '/dashboard' && location.search.includes('view=host') ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/dashboard' && location.search.includes('view=host') && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <LayoutGrid className="h-6 w-6" />
                <span className="text-[10px] font-medium">Overview</span>
              </Link>
              <Link 
                to="/host/listings" 
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors relative",
                  location.pathname === '/host/listings' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/host/listings' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <Truck className="h-6 w-6" />
                <span className="text-[10px] font-medium">Listings</span>
              </Link>
              <Link 
                to="/host/bookings" 
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors relative",
                  location.pathname === '/host/bookings' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/host/bookings' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <CalendarDays className="h-6 w-6" />
                <span className="text-[10px] font-medium">Manager</span>
              </Link>
              <Link 
                to="/messages" 
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors relative",
                  location.pathname === '/messages' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/messages' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <MessageSquare className="h-6 w-6" />
                <span className="text-[10px] font-medium">Inbox</span>
              </Link>
              <Link 
                to="/account" 
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors relative",
                  location.pathname === '/account' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/account' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <User className="h-6 w-6" />
                <span className="text-[10px] font-medium">Profile</span>
              </Link>
            </>
          ) : (
            <>
              {/* Shopper Mode Navigation */}
              <Link 
                to="/search" 
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-colors relative",
                  location.pathname === '/search' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/search' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <Search className="h-6 w-6" />
                <span className="text-[10px] font-medium">Explore</span>
              </Link>
              <Link 
                to="/favorites" 
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-colors relative",
                  location.pathname === '/favorites' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/favorites' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <Heart className="h-6 w-6" />
                <span className="text-[10px] font-medium">Favorites</span>
              </Link>
              <Link 
                to="/dashboard" 
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-colors relative",
                  location.pathname === '/dashboard' && !location.search.includes('view=host') ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/dashboard' && !location.search.includes('view=host') && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <CalendarDays className="h-6 w-6" />
                <span className="text-[10px] font-medium">Bookings</span>
              </Link>
              <Link 
                to="/messages" 
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-colors relative",
                  location.pathname === '/messages' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/messages' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <MessageSquare className="h-6 w-6" />
                <span className="text-[10px] font-medium">Inbox</span>
              </Link>
              <Link 
                to="/account" 
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-colors relative",
                  location.pathname === '/account' ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                {location.pathname === '/account' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-600 rounded-full" />
                )}
                <User className="h-6 w-6" />
                <span className="text-[10px] font-medium">Profile</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
