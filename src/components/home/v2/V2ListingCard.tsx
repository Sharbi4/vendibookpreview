import FeaturedBadge from '@/components/listing/FeaturedBadge';
import ListingFinancingBadge from '@/components/listing/ListingFinancingBadge';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { SmartImage } from '@/components/ui/SmartImage';
import { formatListingPriceLabel } from '@/lib/listings/rentalPricing';
import { isListingFeatured } from '@/lib/featured';
import { CATEGORY_LABELS } from '@/types/listing';

export interface V2CardListing {
  id: string;
  title: string;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  mode?: string | null;
  status?: string | null;
  price_sale?: number | null;
  price_daily?: number | null;
  price_hourly?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  image_urls?: string[] | null;
  featured_enabled?: boolean | null;
  featured_expires_at?: string | null;
}

export default function V2ListingCard({
  listing,
  priority = false,
}: {
  listing: V2CardListing;
  priority?: boolean;
}) {
  const image = Array.isArray(listing.image_urls) ? listing.image_urls[0] : null;
  const price = formatListingPriceLabel(listing as never);
  const place = [listing.city, listing.state].filter(Boolean).join(', ');
  const category =
    (listing.category && CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS]) ||
    null;
  const featured = isListingFeatured(listing as never);
  const financingEnabled = useEquinoxFinancingEnabled(listing);

  return (
    <Link to={`/listing/${listing.id}`} className="v2-home-card">
      <span className="v2-home-card-media">
        <SmartImage
          src={image}
          alt={listing.title}
          aspect="4/3"
          priority={priority}
          radiusClass="rounded-none"
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 300px"
        />
        {featured ? <span className="absolute left-3 top-3 z-10"><FeaturedBadge listing={listing} variant="card" compact /></span> : null}
        {listing.mode ? (
          <em className="v2-home-chip is-mode">{listing.mode === 'rent' ? 'For rent' : 'For sale'}</em>
        ) : null}
      </span>
      <span className="v2-home-card-body">
        <strong>{listing.title}</strong>
        {place ? (
          <small>
            <MapPin aria-hidden="true" />
            {place}
          </small>
        ) : null}
        {financingEnabled ? <span className="flex flex-wrap gap-1.5"><ListingFinancingBadge listingId={listing.id} asLink={false} /></span> : null}
        <span className="v2-home-card-foot">
          <b>{price}</b>
          {category ? <i>{category}</i> : null}
        </span>
      </span>
    </Link>
  );
}
