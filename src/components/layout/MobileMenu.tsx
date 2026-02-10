import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Search, MessageSquare, 
  User, Heart, LogOut, PlusCircle, HelpCircle, 
  Settings, ShieldCheck, CalendarDays, Globe, LayoutDashboard, Store, ExternalLink, Truck
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import AirbnbMenuItem from '@/components/ui/AirbnbMenuItem';

type MobileMenuProfile = {
  avatar_url?: string | null;
  full_name?: string | null;
  first_name?: string | null;
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
  profile: MobileMenuProfile | null;
  isVerified: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

const MobileMenu = ({
  isOpen,
  onClose,
  user,
  profile,
  isVerified,
  isAdmin,
  onSignOut,
  onNavigate,
}: MobileMenuProps) => {
  const location = useLocation();
  const isAuthenticated = Boolean(user?.id);
  
  // Context-aware: detect if user is on dashboard pages
  const isDashboardContext = location.pathname.startsWith('/dashboard') || 
                             location.pathname.startsWith('/host/') ||
                             location.pathname.startsWith('/messages');

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNav = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await onSignOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - z-[90] to sit above header's backdrop-blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[90] lg:hidden"
            onClick={onClose}
          />

          {/* Menu Drawer - z-[100] to ensure it's always on top */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] bg-background z-[100] lg:hidden shadow-2xl flex flex-col"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              {isAuthenticated ? (
                <button 
                  onClick={() => handleNav(`/profile/${user?.id}`)}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-lg">
                      {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-base font-semibold text-foreground">
                      {profile?.first_name || profile?.full_name?.split(' ')[0] || 'User'}
                    </p>
                    <p className="text-sm text-muted-foreground">View profile</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <img src={vendibookFavicon} alt="Vendibook" className="h-8 w-auto" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Welcome</p>
                    <p className="text-xs text-muted-foreground">Sign in to get started</p>
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable Content - Context-Aware Navigation */}
            <div className="flex-1 overflow-y-auto">
              {isAuthenticated && isDashboardContext ? (
                /* DASHBOARD CONTEXT: Global/Escape actions only - no redundant dashboard links */
                <>
                  {/* Return to Public Site */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Home} 
                      label="Return to Home" 
                      subtext="Exit dashboard"
                      onClick={() => handleNav('/')} 
                    />
                    <AirbnbMenuItem 
                      icon={Search} 
                      label="Browse Listings" 
                      onClick={() => handleNav('/search')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Storefront - Primary action for hosts */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Store} 
                      label="View My Storefront" 
                      subtext="See your public profile"
                      onClick={() => handleNav(`/u/${user?.id}`)} 
                      highlight
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Account & Support */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={User} 
                      label="Account Settings" 
                      onClick={() => handleNav('/account')} 
                    />
                    <AirbnbMenuItem 
                      icon={HelpCircle} 
                      label="Help Center" 
                      onClick={() => handleNav('/help')} 
                    />
                    {isAdmin && (
                      <AirbnbMenuItem 
                        icon={Settings} 
                        label="Admin Dashboard" 
                        onClick={() => handleNav('/admin')} 
                      />
                    )}
                  </div>
                </>
              ) : isAuthenticated ? (
                /* PUBLIC PAGE CONTEXT: Full navigation for logged-in users */
                <>
                  {/* Primary Actions */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={LayoutDashboard} 
                      label="Go to Dashboard" 
                      subtext="Manage your listings & bookings"
                      onClick={() => handleNav('/dashboard?view=host')} 
                      highlight
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Core Navigation */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Heart} 
                      label="Favorites" 
                      onClick={() => handleNav('/favorites')} 
                    />
                    <AirbnbMenuItem 
                      icon={CalendarDays} 
                      label="My Bookings" 
                      onClick={() => handleNav('/transactions?tab=bookings')} 
                    />
                    <AirbnbMenuItem 
                      icon={MessageSquare} 
                      label="Messages" 
                      onClick={() => handleNav('/messages')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Hosting Section */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={PlusCircle} 
                      label="Create a Listing" 
                      subtext="Rent or sell your assets"
                      onClick={() => handleNav('/list')} 
                      highlight
                    />
                    <AirbnbMenuItem 
                      icon={Truck} 
                      label="Become a Host" 
                      subtext="Learn how hosting works"
                      onClick={() => handleNav('/how-it-works-host')} 
                    />
                    <AirbnbMenuItem 
                      icon={Store} 
                      label="View My Storefront" 
                      onClick={() => handleNav(`/u/${user?.id}`)} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Account & Support */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={User} 
                      label="Account Settings" 
                      onClick={() => handleNav('/account')} 
                    />
                    <AirbnbMenuItem 
                      icon={HelpCircle} 
                      label="Help Center" 
                      onClick={() => handleNav('/help')} 
                    />
                    {!isVerified && (
                      <AirbnbMenuItem 
                        icon={ShieldCheck} 
                        label="Verify Identity" 
                        onClick={() => handleNav('/verify-identity')} 
                      />
                    )}
                    {isAdmin && (
                      <AirbnbMenuItem 
                        icon={Settings} 
                        label="Admin Dashboard" 
                        onClick={() => handleNav('/admin')} 
                      />
                    )}
                  </div>
                </>
              ) : (
                /* LOGGED OUT: Minimal navigation */
                <>
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Home} 
                      label="Home" 
                      onClick={() => handleNav('/')} 
                    />
                    <AirbnbMenuItem 
                      icon={Search} 
                      label="Explore Listings" 
                      onClick={() => handleNav('/search')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={PlusCircle} 
                      label="Become a Host" 
                      subtext="Start earning today"
                      onClick={() => handleNav('/how-it-works-host')} 
                    />
                    <AirbnbMenuItem 
                      icon={HelpCircle} 
                      label="Help Center" 
                      onClick={() => handleNav('/help')} 
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-border">
              {isAuthenticated ? (
                <div className="py-2">
                  <AirbnbMenuItem 
                    icon={LogOut} 
                    label="Log out" 
                    onClick={handleSignOut} 
                  />
                </div>
              ) : (
                <div className="p-4">
                  <Button
                    variant="dark-shine"
                    className="w-full rounded-xl h-12 text-base"
                    onClick={() => handleNav('/auth')}
                  >
                    Sign Up / Login
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
