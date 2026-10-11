import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingCheckoutSummaryProps {
  imageUrl?: string | null;
  title: string;
  /** e.g. "Food trailer" — only render when the listing really has it. */
  typeLabel?: string | null;
  location?: string | null;
  /** Seller / host display name, already privacy-formatted by the caller. */
  counterpartyLabel?: string | null;
  /** Headline price or rate, pre-formatted. */
  priceLabel?: string | null;
  priceNote?: string | null;
  /** Fulfillment / date summary rows. */
  meta?: { label: string; value: string }[];
  /** Money breakdown or any other node rendered under the listing block. */
  children?: ReactNode;
  className?: string;
}

/** Sticky rail content: real listing imagery and real, server-derived values. */
const ListingCheckoutSummary = ({
  imageUrl,
  title,
  typeLabel,
  location,
  counterpartyLabel,
  priceLabel,
  priceNote,
  meta,
  children,
  className,
}: ListingCheckoutSummaryProps) => (
  <div className={cn('v2-checkout-summary', className)}>
    <div className="v2-checkout-summary-listing">
      {imageUrl ? (
        <img src={imageUrl} alt={title} loading="lazy" className="v2-checkout-summary-media" />
      ) : (
        <div className="v2-checkout-summary-media is-empty" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="v2-checkout-summary-title">{title}</p>
        {typeLabel ? <p className="v2-checkout-summary-type">{typeLabel}</p> : null}
        {location ? (
          <p className="v2-checkout-summary-loc">
            <MapPin aria-hidden />
            {location}
          </p>
        ) : null}
      </div>
    </div>

    {(priceLabel || counterpartyLabel) && (
      <div className="v2-checkout-summary-price">
        {priceLabel ? (
          <div>
            <strong>{priceLabel}</strong>
            {priceNote ? <small>{priceNote}</small> : null}
          </div>
        ) : null}
        {counterpartyLabel ? <span>{counterpartyLabel}</span> : null}
      </div>
    )}

    {meta?.length ? (
      <dl className="v2-checkout-summary-meta">
        {meta.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    ) : null}

    {children}
  </div>
);

export default ListingCheckoutSummary;
