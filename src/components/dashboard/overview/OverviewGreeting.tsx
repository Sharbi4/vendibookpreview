import IdentityChip from '@/components/dashboard/shared/IdentityChip';
import EmailVerifiedBadge from '@/components/dashboard/shared/EmailVerifiedBadge';
import ProMemberBadge from '@/components/dashboard/shared/ProMemberBadge';

interface Props {
  firstName?: string;
  /** Kept for API compatibility; not rendered anymore. Identity is owned by the sidebar on desktop. */
  persona: 'Buying' | 'Hosting';
  isVerified: boolean;
}

/**
 * Viewport-aware Overview header.
 * Desktop (sm+): a tiny eyebrow line. No name, no chip, no persona label —
 *   identity is owned by the sidebar profile block.
 * Mobile: a single 14px greeting row with the verify chip inline.
 */
const OverviewGreeting = ({ firstName, isVerified }: Props) => {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      {/* Mobile only — one slim greeting line above the pill tab bar */}
      <div className="sm:hidden flex items-center justify-between gap-2">
        <p className="text-[14px] font-medium text-[rgb(var(--dash-text-1))] truncate">
          {firstName ? `Hi ${firstName}` : 'Hi there'}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <ProMemberBadge />
          <EmailVerifiedBadge compact />
          <IdentityChip verified={isVerified} />
        </div>
      </div>

      {/* Desktop/tablet — tiny eyebrow only */}
      <div className="hidden sm:flex items-center gap-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[rgb(var(--dash-text-2))]">
          Overview · {today}
        </p>
        <ProMemberBadge />
      </div>
    </>
  );
};

export default OverviewGreeting;
