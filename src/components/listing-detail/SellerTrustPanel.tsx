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
      className="rounded-2xl ring-1 ring-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 md:p-7"
      aria-labelledby="seller-trust-heading"
    >
      {/* Header — open layout, no inner box */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
            {isRental ? 'Hosted by' : 'Sold by'}
          </p>
          <h3
            id="seller-trust-heading"
            className="text-xl font-semibold text-foreground truncate flex items-center gap-2 tracking-tight"
          >
            {hostName || 'Vendibook Seller'}
            {isVerified && (
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Verified" />
            )}
          </h3>
          {isVerified && (
            <Badge
              variant="outline"
              className="mt-2 text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            >
              ID Verified
            </Badge>
          )}
        </div>
        <Link
          to={`/profile/${hostId}`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90 hover:text-foreground transition-colors px-3.5 py-2 rounded-full ring-1 ring-white/10 hover:ring-white/25 bg-white/[0.03]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          View shop
        </Link>
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-white/[0.06] -mx-5 md:-mx-7 mb-6" />

      {/* Stats grid — tile-less, generous spacing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="min-w-0">
              <Icon className={`h-4 w-4 mb-2 ${s.iconColor}`} />
              <p className="text-sm font-semibold text-foreground leading-snug">
                {s.label}
              </p>
              <p className="text-[11px] text-muted-foreground/90 mt-1 leading-snug">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-white/[0.06] -mx-5 md:-mx-7 mt-6 mb-4" />

      {/* Trust footer — inline, no framed box */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/90">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Secure payments via PayPal
        </span>
        <span className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-amber-400" />
          Vendibook buyer protection
        </span>
      </div>
    </section>
  );
};

export default SellerTrustPanel;
