import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, ArrowRight } from 'lucide-react';

/**
 * Post-publish education for sellers: buyer financing (Equinox Funding) is a
 * marketplace-level benefit on every published for-sale listing. Nothing for
 * the seller to enable.
 */
export const PostPublishFinancingCallout: React.FC<{ listingId?: string; className?: string }> = ({
  listingId,
  className = '',
}) => (
  <div
    className={`rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-left ${className}`}
  >
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700">
        <Landmark className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">
          Buyers can finance this listing
        </p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Qualified buyers can apply for equipment financing through Equinox Funding right from your
          listing — nothing to set up. Your asking price doesn&apos;t change, and you&apos;re paid the
          full sale price when the purchase closes. Financing is provided by Equinox Funding, not
          Vendibook.
        </p>
        <Link
          to={listingId ? `/financing?listing_id=${listingId}` : '/financing'}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline underline-offset-4"
        >
          See how financing works
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  </div>
);

export default PostPublishFinancingCallout;
