import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardRow {
  rank: number;
  referrer_id: string;
  display_name: string;
  qualified_count: number;
  is_me: boolean;
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" aria-hidden />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-400" aria-hidden />;
  if (rank === 3) return <Award className="h-4 w-4 text-orange-500" aria-hidden />;
  return <span className="text-xs font-mono text-muted-foreground w-4 text-center">{rank}</span>;
};

export const ReferralLeaderboardCard = ({ limit = 10 }: { limit?: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["referral-leaderboard", limit],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_referral_leaderboard", { p_limit: limit });
      if (error) throw error;
      return (data as LeaderboardRow[]) ?? [];
    },
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const top = rows.filter((r) => r.rank <= limit);
  const meRow = rows.find((r) => r.is_me);
  const meOutsideTop = meRow && meRow.rank > limit ? meRow : null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
            Top Referrers This Month
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Qualified referrals since the 1st. Resets monthly.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Be the first on the board this month — share your link to get started.
        </div>
      ) : (
        <ol className="space-y-1.5">
          {top.map((r) => (
            <li
              key={r.referrer_id}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm border",
                r.is_me
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/30 border-transparent",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 flex items-center justify-center">{RANK_ICON(r.rank)}</span>
                <span className="truncate">
                  {r.display_name}
                  {r.is_me && (
                    <Badge className="ml-2 text-[10px] uppercase tracking-wide" variant="secondary">
                      You
                    </Badge>
                  )}
                </span>
              </div>
              <span className="tabular-nums font-medium">{r.qualified_count}</span>
            </li>
          ))}
        </ol>
      )}

      {meOutsideTop && (
        <>
          <div className="my-3 h-px bg-border" />
          <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                {meOutsideTop.rank}
              </span>
              <span className="truncate">
                {meOutsideTop.display_name}
                <Badge className="ml-2 text-[10px] uppercase tracking-wide" variant="secondary">
                  You
                </Badge>
              </span>
            </div>
            <span className="tabular-nums font-medium">{meOutsideTop.qualified_count}</span>
          </div>
        </>
      )}
    </Card>
  );
};

export default ReferralLeaderboardCard;
