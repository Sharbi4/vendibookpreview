import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Search, LayoutGrid, MessageSquare, 
  User, Heart, LogOut, PlusCircle, HelpCircle, 
  Settings, ShieldCheck, Receipt, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
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
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.first_name || profile?.full_name?.split(' ')[0] || 'User'}
                    </p>
                    <p className="text-xs text-primary">View Profile</p>
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 px-4">
              {/* Primary Navigation */}
              <div className="space-y-1">
                <MobileNavLink
                  icon={Home}
                  label="Home"
                  path="/"
                  activePath={location.pathname}
                  onClick={handleNav}
                />
                <MobileNavLink
                  icon={Search}
                  label="Explore"
                  path="/search"
                  activePath={location.pathname}
                  onClick={handleNav}
                />
              </div>

              {user && (
                <>
                  <Separator className="my-4" />
                  
                  {/* Account Section */}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-3">
                    Account
                  </p>
                  <div className="space-y-1">
                    <MobileNavLink
                      icon={LayoutGrid}
                      label="Dashboard"
                      path="/dashboard"
                      activePath={location.pathname}
                      onClick={handleNav}
                    />
                    <MobileNavLink
                      icon={MessageSquare}
                      label="Messages"
                      path="/messages"
                      activePath={location.pathname}
                      onClick={handleNav}
                    />
                    <MobileNavLink
                      icon={Receipt}
                      label="Transactions"
                      path="/transactions"
                      activePath={location.pathname}
                      onClick={handleNav}
                    />
                    <MobileNavLink
                      icon={Heart}
                      label="Wishlist"
                      path="/favorites"
                      activePath={location.pathname}
                      onClick={handleNav}
                    />
                  </div>

                  <Separator className="my-4" />

                  {/* Host Section */}
                  <div className="space-y-1">
                    <MobileNavLink
                      icon={PlusCircle}
                      label="Host an Asset"
                      path="/list"
                      activePath={location.pathname}
                      onClick={handleNav}
                      highlight
                    />
                    <MobileNavLink
                      icon={User}
                      label="Account Settings"
                      path="/account"
                      activePath={location.pathname}
                      onClick={handleNav}
                    />
                    {!isVerified && (
                      <MobileNavLink
                        icon={ShieldCheck}
                        label="Verify Identity"
                        path="/verify-identity"
                        activePath={location.pathname}
                        onClick={handleNav}
                      />
                    )}
                    {isAdmin && (
                      <MobileNavLink
                        icon={Settings}
                        label="Admin Dashboard"
                        path="/admin"
                        activePath={location.pathname}
                        onClick={handleNav}
                      />
                    )}
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {/* Quick Links */}
              <div className="space-y-1">
                <MobileNavLink
                  icon={HelpCircle}
                  label="Help Center"
                  path="/help"
                  activePath={location.pathname}
                  onClick={handleNav}
                />
                <MobileNavLink
                  icon={Wrench}
                  label="Tools"
                  path="/tools"
                  activePath={location.pathname}
                  onClick={handleNav}
                />
              </div>
            </div>

            {/* Footer Actions - Thumb Zone */}
            <div className="border-t border-border p-4 bg-muted/30">
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Log out
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => handleNav('/auth')}
                  >
                    Log in
                  </Button>
                  <Button
                    variant="dark-shine"
                    className="flex-1 rounded-xl"
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

// Helper for Consistent Links
interface MobileNavLinkProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  activePath: string;
  onClick: (path: string) => void;
  highlight?: boolean;
}

const MobileNavLink = ({ icon: Icon, label, path, activePath, onClick, highlight }: MobileNavLinkProps) => {
  const isActive = path === '/' ? activePath === '/' : activePath.startsWith(path);
  
  return (
    <button
      onClick={() => onClick(path)}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-primary/10 text-primary font-semibold' 
          : highlight 
            ? 'bg-gradient-to-r from-primary/5 to-transparent text-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
      <span className="text-sm">{label}</span>
      {highlight && !isActive && (
        <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          NEW
        </span>
      )}
    </button>
  );
};

export default MobileMenu;
