import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Search, MessageSquare, 
  User, Heart, LogOut, PlusCircle, HelpCircle, 
  Settings, ShieldCheck, CalendarDays, Bell, Globe, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import AirbnbMenuItem from '@/components/ui/AirbnbMenuItem';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Menu Drawer - Right Side Slide */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] bg-background z-50 md:hidden shadow-2xl flex flex-col"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              {user ? (
                <button 
                  onClick={() => handleNav(`/profile/${user.id}`)}
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

            {/* Scrollable Content - Airbnb Style */}
            <div className="flex-1 overflow-y-auto">
              {user && (
                <>
                  {/* Core Navigation */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Heart} 
                      label="Wishlists" 
                      onClick={() => handleNav('/favorites')} 
                    />
                    <AirbnbMenuItem 
                      icon={CalendarDays} 
                      label="Trips" 
                      onClick={() => handleNav('/transactions?tab=bookings')} 
                    />
                    <AirbnbMenuItem 
                      icon={MessageSquare} 
                      label="Messages" 
                      onClick={() => handleNav('/messages')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Profile & Notifications */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={User} 
                      label="Profile" 
                      onClick={() => handleNav(`/profile/${user.id}`)} 
                    />
                    <AirbnbMenuItem 
                      icon={Bell} 
                      label="Notifications" 
                      onClick={() => {}} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Account Settings */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={LayoutDashboard} 
                      label="Dashboard" 
                      onClick={() => handleNav('/dashboard')} 
                    />
                    <AirbnbMenuItem 
                      icon={Globe} 
                      label="Language & currency" 
                      onClick={() => {}} 
                    />
                    <AirbnbMenuItem 
                      icon={HelpCircle} 
                      label="Help Center" 
                      onClick={() => handleNav('/help')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  {/* Hosting Section */}
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={PlusCircle} 
                      label="List with Vendibook" 
                      subtext="Rent or sell your assets"
                      onClick={() => handleNav('/how-it-works-host')} 
                      highlight
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
              )}

              {!user && (
                <>
                  <div className="py-2">
                    <AirbnbMenuItem 
                      icon={Home} 
                      label="Home" 
                      onClick={() => handleNav('/')} 
                    />
                    <AirbnbMenuItem 
                      icon={Search} 
                      label="Explore" 
                      onClick={() => handleNav('/search')} 
                    />
                  </div>

                  <div className="h-px bg-border mx-4" />

                  <div className="py-2">
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
              {user ? (
                <div className="py-2">
                  <AirbnbMenuItem 
                    icon={LogOut} 
                    label="Log out" 
                    onClick={handleSignOut} 
                  />
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-12 text-base"
                    onClick={() => handleNav('/auth')}
                  >
                    Log in
                  </Button>
                  <Button
                    variant="dark-shine"
                    className="w-full rounded-xl h-12 text-base"
                    onClick={() => handleNav('/auth?tab=signup')}
                  >
                    Sign up
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
