import { useState } from 'react';
import { RefreshCw, Phone, CheckCircle, AlertCircle, Ticket, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSyncToZendesk } from '@/hooks/useSyncToZendesk';

const ZendeskContactSync = () => {
  const { syncContacts, isContactSyncing } = useSyncToZendesk();
  const [status, setStatus] = useState<'all' | 'new' | 'contacted' | 'matched' | 'closed'>('all');
  const [syncAs, setSyncAs] = useState<'both' | 'users' | 'tickets'>('both');
  const [lastResult, setLastResult] = useState<{
    users_created: number;
    users_updated: number;
    tickets_created: number;
    failed: number;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    const result = await syncContacts({
      status: status === 'all' ? undefined : status,
      sync_as: syncAs,
      limit: 100,
    });

    if (result) {
      setLastResult({
        users_created: result.users_created,
        users_updated: result.users_updated,
        tickets_created: result.tickets_created,
        failed: result.failed,
        message: result.message,
      });
    }
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Sync Call Contacts to Zendesk
        </CardTitle>
        <CardDescription>
          Sync leads and call contacts from the concierge queue to Zendesk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status-filter">Contact Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="new">New Only</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-type">Sync As</Label>
            <Select value={syncAs} onValueChange={(v) => setSyncAs(v as typeof syncAs)}>
              <SelectTrigger id="sync-type">
                <SelectValue placeholder="Select sync type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Users + Tickets</SelectItem>
                <SelectItem value="users">Users Only</SelectItem>
                <SelectItem value="tickets">Tickets Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={isContactSyncing}
          className="w-full sm:w-auto"
          variant="dark-shine"
        >
          {isContactSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing Contacts...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Contacts Now
            </>
          )}
        </Button>

        {lastResult && (
          <div className={`p-4 rounded-xl ${lastResult.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              {lastResult.failed > 0 ? (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${lastResult.failed > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {lastResult.message}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Users className="h-3.5 w-3.5" />
                    {lastResult.users_created} users created
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Users className="h-3.5 w-3.5" />
                    {lastResult.users_updated} users updated
                  </span>
                  <span className="flex items-center gap-1 text-purple-600">
                    <Ticket className="h-3.5 w-3.5" />
                    {lastResult.tickets_created} tickets created
                  </span>
                  {lastResult.failed > 0 && (
                    <span className="text-red-600">
                      ✗ {lastResult.failed} failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This syncs leads from the concierge queue to Zendesk. Contacts will be created as users and/or tickets based on your selection.
        </p>
      </CardContent>
    </Card>
  );
};

export default ZendeskContactSync;
