import { ArrowUpRight } from 'lucide-react';
import { ApproveFinancingLogo } from '@/components/brand/ProviderLogos';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

/** Official banner plus readable compact layout for narrow purchase cards. */
export function ApproveListingBanner() {
  return (
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer"
      aria-label="Learn about APPROVE financing — opens in a new tab"
      className="approve-listing-banner">
      <img src="/images/partners/approve-financing-horizontal.png" width={728} height={90}
        alt="Fast, flexible financing available. Learn more with APPROVE."
        loading="lazy" className="approve-banner-art" />
      <span className="approve-banner-compact" aria-hidden="true">
        <span className="approve-banner-message"><strong>Flexible equipment financing</strong><span>Explore your options <ArrowUpRight size={14} /></span></span>
        <ApproveFinancingLogo className="approve-banner-logo" />
      </span>
    </a>
  );
}
