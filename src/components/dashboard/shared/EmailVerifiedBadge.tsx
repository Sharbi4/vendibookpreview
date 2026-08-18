import { Link } from 'react-router-dom';
import { MailCheck, MailWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerifiedBadgeProps {
  className?: string;
  /** Compact variant for tight spaces like the mobile greeting row. */
  compact?: boolean;
}

/**
 * Instant email-verification status badge. Verified users see a calm success
 * chip; unverified users see an amber action chip that links to the account
 * page where they can resend the confirmation email.
 */
const EmailVerifiedBadge = ({ className, compact }: EmailVerifiedBadgeProps) => {
  const { user } = useAuth();
  const confirmed = !!user?.email_confirmed_at;

  if (confirmed) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium',
          compact ? 'gap-1 px-1.5 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-[11px]',
          className,
        )}
        title="Email verified"
      >
        <MailCheck className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.2} aria-hidden="true" />
        {compact ? 'Verified' : 'Email verified'}
      </span>
    );
  }

  return (
    <Link
      to="/account"
      className={cn(
        'inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-400 font-medium hover:bg-amber-500/15 transition-colors',
        compact ? 'gap-1 px-1.5 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-[11px]',
        className,
      )}
      title="Email not verified — verify it in your account"
    >
      <MailWarning className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.2} aria-hidden="true" />
      {compact ? 'Verify email' : 'Verify email'}
    </Link>
  );
};

export default EmailVerifiedBadge;
