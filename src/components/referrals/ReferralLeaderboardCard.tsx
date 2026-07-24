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
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-400" aria-hidden />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" aria-hidden />;
  if (rank === 3) return <Award className="h-4 w-4 text-orange-400" aria-hidden />;
  return <span className="text-xs font-mono text-white/50 w-4 text-center">{rank}</span>;
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
    <Card className="p-5 bg-white/[0.03] border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
            Top Referrers This Month
          </h3>
          <p className="text-xs text-white/60 mt-0.5">Qualified referrals since the 1st. Resets monthly.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="text-sm text-white/60 py-6 text-center">
          Be the first on the board this month — share your link to get started.
        </div>
      ) : (
        <ol className="space-y-1.5">
          {top.map((r) => (
            <li
              key={r.referrer_id}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                r.is_me
                  ? "bg-orange-500/10 border border-orange-400/30 text-white"
                  : "bg-white/[0.02] border border-white/5 text-white/80",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 flex items-center justify-center">{RANK_ICON(r.rank)}</span>
                <span className="truncate">
                  {r.display_name}
                  {r.is_me && (
                    <Badge className="ml-2 bg-orange-500/20 text-orange-200 border-orange-400/30 text-[10px] uppercase tracking-wide">
                      You
                    </Badge>
                  )}
                </span>
              </div>
              <span className="tabular-nums font-medium text-white">{r.qualified_count}</span>
            </li>
          ))}
        </ol>
      )}

      {meOutsideTop && (
        <>
          <div className="my-3 h-px bg-white/10" />
          <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-orange-500/10 border border-orange-400/30 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono text-white/70 w-5 text-center">{meOutsideTop.rank}</span>
              <span className="truncate">
                {meOutsideTop.display_name}
                <Badge className="ml-2 bg-orange-500/20 text-orange-200 border-orange-400/30 text-[10px] uppercase tracking-wide">
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
