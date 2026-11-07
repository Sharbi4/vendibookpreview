import { ArrowUpRight } from 'lucide-react';
import { ApproveListingBanner } from './ApproveListingBanner';
import { ApproveFinancingLogo } from '@/components/brand/ProviderLogos';
import { approveApplicationUrl, type ApproveEquipment } from '@/lib/financing/approveApplication';
import { trackFinancingApplyClick } from '@/lib/analytics';

/** A native link opens the hosted application even if the plugin is unavailable. */
export function ApproveApplicationButton({ listing }: { listing: ApproveEquipment }) {
  return (
    <div className="approve-application-stack sm:col-span-2">
    <a href={approveApplicationUrl(listing)} target="_blank" rel="noopener noreferrer"
      aria-label="Apply with APPROVE — opens financing application in a new tab"
      className="approve-premium-cta"
      onClick={() => trackFinancingApplyClick('listing_panel', listing.id)}>
      <span>Apply with</span>
      <ApproveFinancingLogo className="approve-cta-logo" />
      <ArrowUpRight className="approve-cta-arrow" aria-hidden="true" />
    </a>
    <ApproveListingBanner />
    </div>
  );
}
