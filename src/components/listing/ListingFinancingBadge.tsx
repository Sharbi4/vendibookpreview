import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ListingFinancingBadge({ listingId, asLink = true }: { listingId: string; asLink?: boolean }) {
  const className = "relative z-10 inline-flex items-center gap-1 rounded-full bg-[#1b1714]/[0.05] px-2.5 py-1 text-[11px] font-medium text-[#1b1714]/70";
  const content = <><Banknote className="h-3 w-3" aria-hidden="true" />Financing available</>;
  return asLink ? (
    <Link to={`/financing?listing_id=${listingId}`} onClick={e => e.stopPropagation()} className={className + " hover:bg-[#1b1714]/[0.09] transition-colors"}>{content}</Link>
  ) : <span className={className}>{content}</span>;
}
