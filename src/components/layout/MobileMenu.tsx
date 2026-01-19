import { useLocation } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  LogOut,
  X,
  ChevronRight,
  BookOpen,
  HelpCircle,
  MessagesSquare,
  Plus,
  FileQuestion,
  Wrench,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  
  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Slide-out Menu */}
      <div 
        className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] bg-background z-50 md:hidden shadow-2xl animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <img 
                src={vendibookFavicon} 
                alt="Vendibook" 
                className="h-8 w-auto"
              />
              <span className="font-semibold text-foreground">Vendibook</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* User greeting (if logged in) */}
          {user && profile && (
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {(profile.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    Hi, {profile.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </p>
                  {isVerified && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* Primary Actions */}
            <div className="px-5 pb-4 space-y-2">
              <Button
                variant="default"
                className="w-full justify-start gap-3 h-12 rounded-xl text-base font-medium"
                onClick={() => handleNavigation('/search')}
              >
                <Search className="h-5 w-5" />
                Search
              </Button>
            </div>

            {/* Account Section */}
            {user && (
              <div className="px-5 pt-6">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Account
                </p>
                <nav className="space-y-0.5">
                  <MenuLink
                    to="/dashboard"
                    icon={LayoutDashboard}
                    label="Dashboard"
                    isActive={isActive('/dashboard')}
                    onClick={() => handleNavigation('/dashboard')}
                  />
                  <MenuLink
                    to="/messages"
                    icon={MessageSquare}
                    label="Messages"
                    isActive={isActive('/messages')}
                    onClick={() => handleNavigation('/messages')}
                  />
                  <MenuLink
                    to="/transactions"
                    icon={Receipt}
                    label="Transactions"
                    isActive={isActive('/transactions')}
                    onClick={() => handleNavigation('/transactions')}
                  />
                  <MenuLink
                    to="/account"
                    icon={User}
                    label="My Account"
                    isActive={isActive('/account')}
                    onClick={() => handleNavigation('/account')}
                  />
                  {isAdmin && (
                    <MenuLink
                      to="/admin"
                      icon={ShieldCheck}
                      label="Admin Dashboard"
                      isActive={isActive('/admin')}
                      onClick={() => handleNavigation('/admin')}
                      accent
                    />
                  )}
                </nav>
              </div>
            )}

            {/* Quick Links */}
            <div className="px-5 pt-6">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Links
              </p>
              <nav className="space-y-0.5">
                <MenuLink
                  to="/list"
                  icon={Plus}
                  label="Create a Listing"
                  isActive={isActive('/list')}
                  onClick={() => handleNavigation('/list')}
                />
                <MenuLink
                  to="/how-it-works"
                  icon={BookOpen}
                  label="Learn More"
                  isActive={isActive('/how-it-works')}
                  onClick={() => handleNavigation('/how-it-works')}
                />
                <MenuLink
                  to="/help"
                  icon={HelpCircle}
                  label="Help Center"
                  isActive={isActive('/help')}
                  onClick={() => handleNavigation('/help')}
                />
                <MenuLink
                  to="/faq"
                  icon={FileQuestion}
                  label="FAQ"
                  isActive={isActive('/faq')}
                  onClick={() => handleNavigation('/faq')}
                />
                <MenuLink
                  to="/contact"
                  icon={MessagesSquare}
                  label="Chat With Us"
                  isActive={isActive('/contact')}
                  onClick={() => handleNavigation('/contact')}
                />
                <MenuLink
                  to="/tools"
                  icon={Wrench}
                  label="Tools"
                  isActive={isActive('/tools')}
                  onClick={() => handleNavigation('/tools')}
                />
              </nav>
            </div>

            {/* Verify Identity (if not verified) */}
            {user && !isVerified && (
              <div className="px-5 pt-6">
                <button
                  onClick={() => handleNavigation('/verify-identity')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/50">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Verify Identity</p>
                    <p className="text-xs text-muted-foreground">Build trust with hosts</p>
                  </div>
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-4">
            {user ? (
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="flex items-center gap-3 w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={() => handleNavigation('/auth')}
                >
                  Sign In
                </Button>
                <Button
                  variant="gradient"
                  className="w-full h-11 rounded-xl"
                  onClick={() => handleNavigation('/list')}
                >
                  Create a Listing
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Menu Link Component
interface MenuLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  accent?: boolean;
}

const MenuLink = ({ to, icon: Icon, label, isActive, onClick, accent }: MenuLinkProps) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center gap-3 w-full h-12 px-3 rounded-lg transition-colors text-left
      ${isActive 
        ? 'bg-primary/10 text-primary font-medium' 
        : 'hover:bg-muted text-foreground'
      }
      ${accent ? 'text-primary' : ''}
    `}
  >
    {isActive && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
    )}
    <Icon className={`h-5 w-5 ${isActive || accent ? 'text-primary' : 'text-muted-foreground'}`} />
    <span className="flex-1 text-sm">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
  </button>
);

export default MobileMenu;
