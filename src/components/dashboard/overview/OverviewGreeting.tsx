import IdentityChip from '@/components/dashboard/shared/IdentityChip';

interface Props {
  firstName?: string;
  persona: 'Buying' | 'Hosting';
  isVerified: boolean;
}

/**
 * Compact one-line greeting used at the top of the Overview.
 * Keeps the KPI row above the fold on tablet+.
 */
const OverviewGreeting = ({ firstName, persona, isVerified }: Props) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[rgb(var(--dash-text-1))] truncate">
        {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
      </h1>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="hidden sm:inline text-[12px] font-medium text-[rgb(var(--dash-text-2))]">
        {persona}
      </span>
      <IdentityChip verified={isVerified} />
    </div>
  </div>
);

export default OverviewGreeting;
