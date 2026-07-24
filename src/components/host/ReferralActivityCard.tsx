import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import { useMyReferrals } from '@/hooks/useReferral';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const STATUS_VARIANT: Record<string, { label: string; className: string }> = {
  signed_up: { label: 'Signed up', className: 'bg-muted text-foreground/80 border-border' },
  qualified: { label: 'Qualified', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  rewarded: { label: 'Rewarded', className: 'bg-primary/15 text-primary border-primary/30' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

/**
 * Shows the host's referral history: who signed up with their code, current
 * status, and pending reward amounts. Read-only companion to ReferAHostCard.
 */
export function ReferralActivityCard() {
  const { user } = useAuth();
  const { data: referrals = [], isLoading } = useMyReferrals();

  if (!user) return null;

  return (
    <Card className="rounded-2xl border border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-orange-500" />
          Referral activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your referrals…
          </div>
        ) : referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No referrals yet. Share your link above — hosts who subscribe to Starter or
            higher earn you a $50 credit.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {referrals.slice(0, 8).map((r) => {
              const meta = STATUS_VARIANT[r.status] ?? STATUS_VARIANT.signed_up;
              const reward = Number(r.referrer_reward_amount ?? 0);
              return (
                <li key={r.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      Referral · {r.code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.qualified_at ? ' · qualified' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {reward > 0 && (
                      <span className="text-xs font-semibold text-foreground">
                        ${reward.toFixed(0)}
                      </span>
                    )}
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
