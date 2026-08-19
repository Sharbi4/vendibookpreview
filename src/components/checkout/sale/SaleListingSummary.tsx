import { MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SaleListingSummaryProps {
  listingId: string;
  title: string;
  imageUrl?: string | null;
  price: number;
  locationLabel?: string;
  conditionLabel?: string | null;
  sellerName?: string;
  sellerVerified?: boolean;
  /** True when the buyer negotiated a price via an accepted offer. */
  isAgreedPrice?: boolean;
}

/** Compact listing identity row that opens the checkout — never a second hero. */
const SaleListingSummary = ({
  listingId,
  title,
  imageUrl,
  price,
  locationLabel,
  conditionLabel,
  sellerName,
  sellerVerified,
  isAgreedPrice,
}: SaleListingSummaryProps) => (
  <div className="flex items-start gap-4">
    <Link
      to={`/listing/${listingId}`}
      className="shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-muted"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
      ) : null}
    </Link>

    <div className="min-w-0 flex-1">
      <Link
        to={`/listing/${listingId}`}
        className="block text-[15px] sm:text-base font-semibold text-foreground leading-snug line-clamp-2 hover:underline underline-offset-2"
      >
        {title}
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {locationLabel ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </span>
        ) : null}
        {conditionLabel ? <span className="capitalize">{conditionLabel.replace(/_/g, ' ')}</span> : null}
        {sellerName ? (
          <span className="inline-flex items-center gap-1">
            {sellerName}
            {sellerVerified ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : null}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          ${price.toLocaleString()}
        </span>
        {isAgreedPrice ? (
          <span className="text-xs font-medium text-primary">Agreed offer price</span>
        ) : null}
      </div>
    </div>
  </div>
);

export default SaleListingSummary;
