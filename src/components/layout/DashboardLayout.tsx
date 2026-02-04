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
  CreditCard,
  Truck,
  ShoppingBag,
  User,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
  mode: 'host' | 'shopper';
  onModeChange: (mode: 'host' | 'shopper') => void;
  isHost: boolean;
}

export const DashboardLayout = ({ children, mode, onModeChange, isHost }: DashboardLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Navigation Config based on mode
  const navigation = [
    {
      title: mode === 'host' ? 'Management' : 'Activity',
      items: mode === 'host' ? [
        { title: 'Overview', icon: LayoutGrid, href: '/dashboard', tab: null },
        { title: 'Listings', icon: Truck, href: '/dashboard?tab=inventory', tab: 'inventory' },
        { title: 'Reservations', icon: CalendarDays, href: '/dashboard?tab=bookings', tab: 'bookings' },
        { title: 'Inbox', icon: MessageSquare, href: '/messages', tab: null },
      ] : [
        { title: 'Trips', icon: CalendarDays, href: '/dashboard', tab: null },
        { title: 'Favorites', icon: Heart, href: '/favorites', tab: null },
        { title: 'Inbox', icon: MessageSquare, href: '/messages', tab: null },
      ]
    },
    {
      title: 'Account',
      items: [
        { title: 'Wallet', icon: CreditCard, href: '/transactions', tab: null },
        { title: 'Settings', icon: Settings, href: '/account', tab: null },
      ]
    }
  ];

  // Active state logic
  const isActive = (href: string, tab: string | null) => {
    const currentPath = location.pathname;
    const currentTab = new URLSearchParams(location.search).get('tab');
    
    // If this item has a tab, check for tab match
    if (tab) {
      return currentPath === '/dashboard' && currentTab === tab;
    }
    
    // For dashboard with no tab (overview), check we're on dashboard with no tab param
    if (href === '/dashboard' && !tab) {
      return currentPath === '/dashboard' && !currentTab;
    }
    
    // For other pages, exact path match
    return currentPath === href.split('?')[0] && !href.includes('?');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className="px-4 mb-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-8" />
          <span className="font-semibold text-lg text-foreground">Vendibook</span>
        </Link>
      </div>

      {/* User Profile Snippet */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        {/* Mode Switcher - Only for Hosts */}
        {isHost && (
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => onModeChange('shopper')}
              className={cn(
                "flex-1 text-xs font-medium py-2 rounded-md transition-all",
                mode === 'shopper' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buying
            </button>
            <button
              onClick={() => onModeChange('host')}
              className={cn(
                "flex-1 text-xs font-medium py-2 rounded-md transition-all",
                mode === 'host' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hosting
            </button>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6">
          {navigation.map((group, i) => (
            <div key={i}>
              <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.tab);
                  return (
                    <Link
                      key={item.title}
                      to={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        active 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 pt-4 mt-auto border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent onLinkClick={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/">
              <img src={vendibookFavicon} alt="Vendibook" className="h-7 w-7" />
            </Link>
          </div>
          <span className="font-medium text-foreground">
            {mode === 'host' ? 'Vendor Console' : 'My Dashboard'}
          </span>
          <NotificationCenter />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-card/50 shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Desktop Top Bar */}
          <div className="hidden md:flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">
                {mode === 'host' ? 'Vendor Console' : 'My Activity'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link to="/help">Help & Support</Link>
              </Button>
              <NotificationCenter />
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          <Link 
            to="/dashboard" 
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
              location.pathname === '/dashboard' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link 
            to="/search" 
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
              location.pathname === '/search' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">Browse</span>
          </Link>
          <Link 
            to="/messages" 
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
              location.pathname === '/messages' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-medium">Inbox</span>
          </Link>
          <Link 
            to="/account" 
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
              location.pathname === '/account' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium">Account</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
