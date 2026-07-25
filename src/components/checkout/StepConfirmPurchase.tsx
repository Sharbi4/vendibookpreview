import { ShieldCheck, MapPin, BadgeCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepConfirmPurchaseProps {
  listing: {
    title: string;
    cover_image_url?: string | null;
    image_urls?: string[] | null;
    city?: string | null;
    state?: string | null;
    category?: string | null;
    condition?: string | null;
    year?: number | null;
  };
  priceSale: number;
  sellerName?: string;
  sellerVerified?: boolean;
  specSummary?: string | null;
  onContinue: () => void;
  onBack?: () => void;
}

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const StepConfirmPurchase = ({
  listing,
  priceSale,
  sellerName,
  sellerVerified,
  specSummary,
  onContinue,
  onBack,
}: StepConfirmPurchaseProps) => {

  const cover =
    listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg';
  const location = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Here's what you're buying
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Take one more look before we continue.
        </p>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-border/70">
        <div className="aspect-[16/10] bg-muted">
          <img
            src={cover}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-semibold text-foreground line-clamp-2">
                {listing.title}
              </h3>
              {location && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">Purchase price</div>
              <div
                className="font-display text-2xl font-bold text-primary"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {money(priceSale)}
              </div>
            </div>
          </div>

          {(listing.year || listing.condition || listing.category || specSummary) && (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-sm">
              {listing.year ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Year</dt>
                  <dd className="font-medium text-foreground">{listing.year}</dd>
                </div>
              ) : null}
              {listing.condition ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Condition</dt>
                  <dd className="font-medium text-foreground capitalize">
                    {String(listing.condition).replace(/_/g, ' ')}
                  </dd>
                </div>
              ) : null}
              {listing.category ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Category</dt>
                  <dd className="font-medium text-foreground capitalize">
                    {String(listing.category).replace(/_/g, ' ')}
                  </dd>
                </div>
              ) : null}
              {specSummary ? (
                <div className="col-span-full">
                  <dt className="text-xs text-muted-foreground">Specs</dt>
                  <dd className="font-medium text-foreground">{specSummary}</dd>
                </div>
              ) : null}
            </dl>
          )}

          {sellerName && (
            <div className="flex items-center gap-2 pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground">Sold by</div>
              <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {sellerName}
                {sellerVerified && (
                  <span
                    title="Identity verified"
                    className="inline-flex items-center gap-0.5 text-primary text-xs font-semibold"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Your payment is protected. We hold funds until the item is confirmed
          delivered — no cost to you.
        </p>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full">
        Looks right — choose delivery
      </Button>
    </div>
  );
};

export default StepConfirmPurchase;
