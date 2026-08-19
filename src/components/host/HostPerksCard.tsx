import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Layers,
  Headphones,
  Rocket,
  LifeBuoy,
  Check,
  Lock,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';

interface Perk {
  key: string;
  label: string;
  description: string;
  requires: HostTier;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const PERKS: Perk[] = [
  {
    key: 'analytics',
    label: 'Advanced analytics',
    description: 'Traffic sources, attribution, and competitor pricing.',
    requires: 'pro',
    icon: BarChart3,
    href: '/host/analytics',
  },
  {
    key: 'bulk',
    label: 'Bulk operations table',
    description: 'Manage prices, pauses, and publishing across many listings.',
    requires: 'pro',
    icon: Layers,
    href: '/host/listings',
  },
  {
    key: 'placement',
    label: 'Priority placement',
    description: 'Your active listings surface higher in search.',
    requires: 'pro',
    icon: Rocket,
    href: '/host/listings',
  },
  {
    key: 'support',
    label: 'Priority support',
    description: 'Front-of-line responses from the Vendibook support team.',
    requires: 'pro',
    icon: Headphones,
    href: '/help',
  },
  {
    key: 'concierge',
    label: 'Dedicated concierge',
    description: 'A named specialist to help with launches, permits, and payouts.',
    requires: 'premium',
    icon: LifeBuoy,
    href: '/concierge',
  },
];

export function HostPerksCard({ className = '' }: { className?: string }) {
  const { tier, isLoading, hasAtLeast } = useHostEntitlements();
  if (isLoading) return null;

  return (
    <Card className={`rounded-2xl border border-border shadow-sm bg-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded">
              <Crown className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            Your host perks
          </span>
          <Badge variant="outline" className="capitalize">
            {tier === 'free' ? 'Free host' : `Host ${tier}`}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {PERKS.map((perk) => {
          const unlocked = hasAtLeast(perk.requires);
          const Icon = perk.icon;
          return (
            <div
              key={perk.key}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                unlocked ? 'border-border bg-muted/20' : 'border-dashed border-border bg-muted/10 opacity-80'
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground">{perk.label}</div>
                  {unlocked ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] px-1.5 py-0"
                    >
                      <Check className="h-3 w-3 mr-0.5" /> Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 capitalize text-muted-foreground"
                    >
                      <Lock className="h-3 w-3 mr-0.5" />
                      {perk.requires}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{perk.description}</p>
              </div>
              {unlocked ? (
                <Button asChild size="sm" variant="ghost" className="shrink-0">
                  <Link to={perk.href}>
                    Open
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link to="/pricing">Upgrade</Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default HostPerksCard;
