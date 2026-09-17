import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import V2ListingCard, { type V2CardListing } from './V2ListingCard';

interface Props {
  title: string;
  subtitle?: string;
  listings: V2CardListing[];
  viewAllHref: string;
  viewAllLabel?: string;
  isLoading?: boolean;
  priority?: boolean;
}

export default function V2ListingRow({
  title,
  subtitle,
  listings,
  viewAllHref,
  viewAllLabel = 'View all',
  isLoading = false,
  priority = false,
}: Props) {
  if (!isLoading && listings.length === 0) return null;

  return (
    <section className="v2-home-section">
      <header className="v2-home-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <Link to={viewAllHref} className="v2-home-link">
          {viewAllLabel}
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <div className="v2-home-rail">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[268px] rounded-[16px]" />
            ))
          : listings.map((listing, i) => (
              <V2ListingCard key={listing.id} listing={listing} priority={priority && i < 2} />
            ))}
      </div>
    </section>
  );
}
