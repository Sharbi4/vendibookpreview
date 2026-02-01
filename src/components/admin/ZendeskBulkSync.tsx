import { useState } from 'react';
import { RefreshCw, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSyncToZendesk } from '@/hooks/useSyncToZendesk';

const ZendeskBulkSync = () => {
  const { bulkSync, isBulkSyncing } = useSyncToZendesk();
  const [role, setRole] = useState<'all' | 'host' | 'shopper' | 'admin'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [limit, setLimit] = useState(100);
  const [lastResult, setLastResult] = useState<{
    synced: number;
    failed: number;
    created: number;
    updated: number;
    message: string;
  } | null>(null);

  const handleBulkSync = async () => {
    const result = await bulkSync({
      role: role === 'all' ? undefined : role,
      verified_only: verifiedOnly,
      limit,
    });

    if (result) {
      setLastResult({
        synced: result.synced,
        failed: result.failed,
        created: result.created,
        updated: result.updated,
        message: result.message,
      });
    }
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Zendesk Bulk Sync
        </CardTitle>
        <CardDescription>
          Sync existing Vendibook users to Zendesk for better support management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role-filter">User Type</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger id="role-filter">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="host">Hosts Only</SelectItem>
                <SelectItem value="shopper">Shoppers Only</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Batch Size</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Math.min(500, parseInt(e.target.value) || 100))}
            />
          </div>

          <div className="space-y-2 flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified-only"
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
              />
              <Label htmlFor="verified-only" className="cursor-pointer">
                Verified users only
              </Label>
            </div>
          </div>
        </div>

        <Button
          onClick={handleBulkSync}
          disabled={isBulkSyncing}
          className="w-full sm:w-auto"
          variant="dark-shine"
        >
          {isBulkSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Bulk Sync
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
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-emerald-600">
                    ✓ {lastResult.created} created
                  </span>
                  <span className="text-blue-600">
                    ↻ {lastResult.updated} updated
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
          This will create or update Zendesk users with their Vendibook profile data including name, email, phone, user type, verification status, and booking/listing counts.
        </p>
      </CardContent>
    </Card>
  );
};

export default ZendeskBulkSync;
