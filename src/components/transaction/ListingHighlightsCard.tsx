/**
 * ListingHighlightsCard — the compact "Good to Know" / "Before You Buy" /
 * "Booking Details" panel shown on the listing detail page (spec §4).
 *
 * Progressive disclosure: 2–4 short bullets + one text link.
 * Visually secondary to the price/CTA (smaller muted text, hairline top
 * border, no accent colors, no icons other than an optional small info dot).
 * The bullets are derived from the listing itself by `buildListingHighlights`
 * so irrelevant items never render (no deposit → no deposit line, etc.).
 */
import * as React from 'react';
import { buildListingHighlights, type HighlightsListing } from '@/lib/transactionTerms';
import { linkifyFreight } from '@/components/shared/FreightLink';

interface Props {
  listing: HighlightsListing;
  onOpenDetails?: () => void;
  className?: string;
}

export const ListingHighlightsCard: React.FC<Props> = ({
  listing,
  onOpenDetails,
  className,
}) => {
  const { heading, bullets, linkLabel } = buildListingHighlights(listing);
  if (!bullets.length) return null;

  return (
    <section
      aria-label={heading}
      data-testid="listing-highlights"
      className={
        'border-t border-border/60 pt-3 mt-3 ' + (className ?? '')
      }
    >
      <h3 className="text-sm font-medium text-foreground mb-1.5">
        {heading}
      </h3>
      <ul className="space-y-1 text-[13px] leading-relaxed text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="mt-[7px] h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
            <span>{linkifyFreight(b)}</span>
          </li>
        ))}
      </ul>
      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-2 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          aria-label={`${linkLabel} for ${listing.title ?? 'this listing'}`}
        >
          {linkLabel}
        </button>
      )}
    </section>
  );
};

export default ListingHighlightsCard;
