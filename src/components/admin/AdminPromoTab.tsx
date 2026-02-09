import { useAdminPromo } from '@/hooks/useAdminPromo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, ExternalLink, Trophy, DollarSign, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

const AdminPromoTab = () => {
  const { rewards, entries, winners, isLoading, verifyEntry, overrideReward } = useAdminPromo();

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const pendingEntries = entries?.filter(e => e.status === 'pending') || [];
  const verifiedEntries = entries?.filter(e => e.status === 'verified') || [];

  return (
    <Tabs defaultValue="rewards" className="space-y-4">
      <TabsList>
        <TabsTrigger value="rewards" className="relative">
          <DollarSign className="h-4 w-4 mr-1" />
          Listing Rewards
          {rewards && rewards.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">{rewards.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="entries" className="relative">
          <Users className="h-4 w-4 mr-1" />
          Contest Entries
          {pendingEntries.length > 0 && (
            <Badge className="ml-2 h-5 px-1.5 bg-amber-500">{pendingEntries.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="winners">
          <Trophy className="h-4 w-4 mr-1" />
          Winners
        </TabsTrigger>
      </TabsList>

      {/* Listing Rewards */}
      <TabsContent value="rewards" className="space-y-3">
        {!rewards || rewards.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No listing rewards yet.</CardContent></Card>
        ) : (
          rewards.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {(r as any).profiles?.full_name || (r as any).profiles?.display_name || r.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Listing: {(r as any).listings?.title || r.listing_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Days Active: {r.active_days_count}/14 · Published: {format(new Date(r.published_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      r.payout_status === 'paid' ? 'default' :
                      r.payout_status === 'eligible' ? 'secondary' :
                      r.payout_status === 'disqualified' ? 'destructive' : 'outline'
                    }>
                      {r.payout_status}
                    </Badge>
                    {r.payout_status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => overrideReward.mutate({ rewardId: r.id, action: 'approve' })}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => overrideReward.mutate({ rewardId: r.id, action: 'disqualify' })}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Disqualify
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {r.stripe_transfer_id && (
                  <p className="text-xs text-muted-foreground mt-1">Transfer: {r.stripe_transfer_id}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Contest Entries */}
      <TabsContent value="entries" className="space-y-3">
        {!entries || entries.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No contest entries yet.</CardContent></Card>
        ) : (
          entries.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {(e as any).profiles?.full_name || (e as any).profiles?.display_name || e.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Listing: {(e as any).listings?.title || e.listing_id}
                    </p>
                    <a href={e.facebook_post_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      Facebook Post <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(e.submitted_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      e.status === 'verified' ? 'default' :
                      e.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {e.status}
                    </Badge>
                    {e.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline"
                          onClick={() => verifyEntry.mutate({ entryId: e.id, status: 'verified' })}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => verifyEntry.mutate({ entryId: e.id, status: 'rejected', notes: 'Facebook post not valid' })}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Winners */}
      <TabsContent value="winners" className="space-y-3">
        {!winners || winners.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-amber-500/50" />
              <p>No winner selected yet.</p>
              <p className="text-xs">Drawing date: March 15, 2025 at 1:00 PM ET</p>
            </CardContent>
          </Card>
        ) : (
          winners.map((w: any) => (
            <Card key={w.id} className="border-amber-500/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      {(w as any).profiles?.full_name || w.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Selected: {format(new Date(w.selected_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant={w.payout_status === 'paid' ? 'default' : 'outline'}>
                    {w.payout_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};

export default AdminPromoTab;
