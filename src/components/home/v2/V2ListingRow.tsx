import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import V2ListingCard, { type V2CardListing } from './V2ListingCard';

interface Props {
  title: string;
  subtitle?: string;
  listings: V2CardListing[];
  viewAllHref: string;
  viewAllLabel?: string;
  isLoading?: boolean;
  priority?: boolean;
  featured?: boolean;
  /** Two rows under one header; cards read left to right, top row first. */
  rows?: 1 | 2;
}

export default function V2ListingRow({
  title,
  subtitle,
  listings,
  viewAllHref,
  viewAllLabel = 'View all',
  isLoading = false,
  priority = false,
  featured = false,
  rows = 1,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  if (!isLoading && listings.length === 0) return null;

  // The rail fills column by column, so interleave the halves to keep the
  // newest listings across the top row and the rest on the row below.
  const ordered = rows === 2
    ? (() => {
        const top = listings.slice(0, Math.ceil(listings.length / 2));
        const bottom = listings.slice(top.length);
        return top.flatMap((l, i) => (bottom[i] ? [l, bottom[i]] : [l]));
      })()
    : listings;

  const move = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: railRef.current.clientWidth * 0.82 * direction, behavior: 'smooth' });
  };

  return (
    <section className={`v2-home-section${featured ? ' is-featured' : ''}`}>
      <header className="v2-home-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="v2-home-section-actions">
          <div className="v2-home-rail-buttons" aria-label={`${title} carousel controls`}>
            <Button type="button" variant="outline" size="icon" onClick={() => move(-1)} aria-label={`Previous ${title}`}><ArrowLeft /></Button>
            <Button type="button" variant="outline" size="icon" onClick={() => move(1)} aria-label={`Next ${title}`}><ArrowRight /></Button>
          </div>
          <Link to={viewAllHref} className="v2-home-link">{viewAllLabel}<ArrowRight aria-hidden="true" /></Link>
        </div>
      </header>

      <div className={`v2-home-rail${rows === 2 ? ' is-two-rows' : ''}`} ref={railRef}>
        {isLoading
          ? Array.from({ length: rows === 2 ? 8 : 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[268px] rounded-[16px]" />
            ))
          : ordered.map((listing, i) => (
              <V2ListingCard key={listing.id} listing={listing} priority={priority && i < 2} />
            ))}
      </div>
    </section>
  );
}
