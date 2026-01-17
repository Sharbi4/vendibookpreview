import { MapPin, Star, Shield, CreditCard, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/hooks/useUserProfile';

interface ProfileStatsRowProps {
  stats: UserStats | null;
  isVerified: boolean;
  stripeConnected?: boolean;
  isHost?: boolean;
}

const ProfileStatsRow = ({ stats, isVerified, stripeConnected, isHost }: ProfileStatsRowProps) => {
  const statItems = [
    {
      label: 'Listings',
      value: stats?.totalListings || 0,
      icon: MapPin,
    },
    {
      label: 'Reviews',
      value: stats?.totalReviewsReceived || 0,
      subValue: stats?.averageRating ? `${stats.averageRating.toFixed(1)} avg` : undefined,
      icon: Star,
    },
    {
      label: 'Verified',
      value: isVerified ? 'Yes' : 'No',
      icon: isVerified ? CheckCircle2 : Shield,
      highlight: isVerified,
    },
  ];

  // For hosts, show payouts status instead of verified (since verified is in header)
  if (isHost) {
    statItems[2] = {
      label: 'Payouts',
      value: stripeConnected ? 'Enabled' : 'Off',
      icon: CreditCard,
      highlight: stripeConnected,
    };
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              'text-center p-3 rounded-lg bg-muted/50 border border-border/50',
              item.highlight && 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            )}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Icon 
                className={cn(
                  'h-4 w-4',
                  item.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                )} 
              />
            </div>
            <p 
              className={cn(
                'text-lg font-bold',
                item.highlight ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
              )}
            >
              {item.value}
            </p>
            {item.subValue && (
              <p className="text-xs text-muted-foreground">{item.subValue}</p>
            )}
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
};

export default ProfileStatsRow;
