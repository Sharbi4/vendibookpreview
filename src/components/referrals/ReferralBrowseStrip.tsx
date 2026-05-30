import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Low-key contextual strip shown at the bottom of browse pages
 * for logged-in users. Guests do not see it.
 */
export function ReferralBrowseStrip() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="w-full border-t border-border/60 bg-muted/40">
      <div className="container py-4 text-center text-sm text-muted-foreground">
        Know someone with a food truck or kitchen to list? You could earn $150.{' '}
        <Link
          to="/referral?source=browse_strip"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Learn about referrals
        </Link>
      </div>
    </div>
  );
}

export default ReferralBrowseStrip;
