import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { btn } from '@/components/workspace/selling/buttons';
import { cn } from '@/lib/utils';

/**
 * Shown when a seller has no live listing under the account they're signed in
 * with. The most common cause is signing in with a second email or Google
 * account: listings stay with the account that created them.
 */
export default function DifferentAccountNotice({
  returnTo = '/dashboard/listings',
  className,
}: {
  returnTo?: string;
  className?: string;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const switchAccount = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      navigate(`/auth?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  };

  return (
    <div
      role="note"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-[#E2DBD0] bg-[#FCFAF7] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className,
      )}
    >
      <p className="text-[13px] leading-5 text-[#3D3A36]">
        <span className="font-semibold text-[#1C1B1A]">Don’t see a listing you published?</span>{' '}
        You’re signed in as <span className="font-semibold text-[#1C1B1A] [overflow-wrap:anywhere]">{user.email ?? 'this account'}</span>.
        Listings stay with the email or Google account used to create them. Sign in with that one to see and boost it.
      </p>
      <button type="button" onClick={switchAccount} disabled={busy} className={cn(btn.outlineMd, 'self-start sm:self-auto')}>
        {busy ? 'Signing out…' : 'Switch account'}
      </button>
    </div>
  );
}
