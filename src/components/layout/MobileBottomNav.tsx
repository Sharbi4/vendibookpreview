import { NavLink, useLocation } from 'react-router-dom';
import { Search, Heart, MessageSquare, LayoutGrid, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Sticky mobile-only bottom navigation bar.
 * Hidden on desktop (md+) and on routes where it would interfere
 * (auth, checkout, listing wizard, messages thread).
 */
const HIDDEN_PATTERNS = [
  /^\/auth/,
  /^\/reset-password/,
  /^\/activation/,
  /^\/checkout\//,
  /^\/book\//,
  /^\/create-listing\//,
  /^\/listing-published/,
  /^\/payment-/,
  /^\/verify-identity/,
  /^\/verification-complete/,
  /^\/messages\/[^/]+$/, // hide on individual conversation thread
  /^\/admin/,
];

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on specific flows
  if (HIDDEN_PATTERNS.some((p) => p.test(location.pathname))) return null;

  const items = [
    { to: '/search', label: 'Search', icon: Search },
    { to: '/favorites', label: 'Saved', icon: Heart },
    { to: '/messages', label: 'Inbox', icon: MessageSquare },
    { to: user ? '/dashboard' : '/list', label: user ? 'Dashboard' : 'List', icon: LayoutGrid },
    { to: user ? '/account' : '/auth', label: user ? 'Account' : 'Sign in', icon: User },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // backdrop-blur on a fixed nav causes mobile scroll flicker (re-rasterizes
        // every frame). Use near-opaque background + own GPU layer instead.
        background: 'hsla(0, 0%, 8%, 0.97)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors no-tap-highlight active:bg-muted/40',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
