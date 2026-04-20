import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Award,
  MapPin,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatLastActive } from '@/hooks/useActivityTracker';

interface SellerTrustPanelProps {
  hostId: string;
  hostName: string | null;
  isVerified: boolean;
  memberSince?: string;
  lastActiveAt?: string;
  city?: string | null;
  state?: string | null;
  averageRating?: number;
  reviewCount?: number;
  isRental: boolean;
}

/**
 * Commercial-grade "Why buy from this seller" panel.
 * Dense info grid styled like Amazon/Best Buy seller info card.
 */
export const SellerTrustPanel = ({
  hostId,
  hostName,
  isVerified,
  memberSince,
  lastActiveAt,
  city,
  state,
  averageRating,
  reviewCount,
  isRental,
}: SellerTrustPanelProps) => {
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const yearsActive = memberYear ? new Date().getFullYear() - memberYear : 0;
  const locationStr = [city, state].filter(Boolean).join(', ');
  const isActiveNow =
    lastActiveAt && formatLastActive(lastActiveAt) === 'Active now';

  const stats = [
    {
      icon: Award,
      label: averageRating ? `${averageRating.toFixed(1)} / 5` : 'New',
      sub: reviewCount ? `${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'No reviews yet',
      iconColor: 'text-amber-400',
    },
    {
      icon: Clock,
      label: isActiveNow ? 'Active now' : 'Responds quickly',
      sub: 'Typically within 1 hour',
      iconColor: isActiveNow ? 'text-emerald-400' : 'text-foreground/70',
    },
    {
      icon: TrendingUp,
      label: yearsActive >= 1 ? `${yearsActive}+ year${yearsActive > 1 ? 's' : ''}` : 'New seller',
      sub: memberYear ? `On Vendibook since ${memberYear}` : 'Recently joined',
      iconColor: 'text-foreground/70',
    },
    {
      icon: MapPin,
      label: locationStr || 'United States',
      sub: isRental ? 'Listing location' : 'Ships from',
      iconColor: 'text-foreground/70',
    },
  ];

  return (
    <section
      className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 md:p-5"
      aria-labelledby="seller-trust-heading"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-border/50">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {isRental ? 'Hosted by' : 'Sold by'}
          </p>
          <h3
            id="seller-trust-heading"
            className="text-lg font-semibold text-foreground truncate flex items-center gap-2"
          >
            {hostName || 'Vendibook Seller'}
            {isVerified && (
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Verified" />
            )}
          </h3>
          {isVerified && (
            <Badge
              variant="outline"
              className="mt-1.5 text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
            >
              ID Verified
            </Badge>
          )}
        </div>
        <Link
          to={`/profile/${hostId}`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border/60 hover:border-primary/40"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          View shop
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="rounded-lg bg-background/50 border border-border/40 p-3 hover:border-border transition-colors"
            >
              <Icon className={`h-4 w-4 mb-1.5 ${s.iconColor}`} />
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                {s.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Trust footer */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          Secure payments via Stripe
        </span>
        <span className="flex items-center gap-1">
          <Award className="h-3 w-3 text-amber-400" />
          Vendibook buyer protection
        </span>
      </div>
    </section>
  );
};

export default SellerTrustPanel;
