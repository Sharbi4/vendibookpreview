import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Attempt {
  id: string;
  payment_record_id: string;
  attempt_number: number | null;
  status: string;
  failure_category: string | null;
  failure_code: string | null;
  failure_message_safe: string | null;
  created_at: string;
}

interface Record_ {
  id: string;
  reference: string;
  buyer_email: string | null;
  gross_amount_cents: number;
  currency: string;
  payment_status: string;
}

interface Receipt {
  payment_record_id: string;
  status: string;
  attempt_count: number | null;
}

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

/**
 * Admin recovery console for checkouts that failed after an order existed.
 * Every action is served by the audited `admin-order-ops` edge function.
 */
const FailedPaymentAttemptsPanel = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [records, setRecords] = useState<Record<string, Record_>>({});
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-order-ops', {
      body: { action: 'list_failed_attempts', limit: 50 },
    });
    setLoading(false);
    if (error) {
      toast.error('Could not load failed payment attempts.');
      return;
    }
    const payload = data as { attempts?: Attempt[]; records?: Record_[]; receipts?: Receipt[] };
    setAttempts(payload.attempts ?? []);
    setRecords(Object.fromEntries((payload.records ?? []).map((r) => [r.id, r])));
    setReceipts(Object.fromEntries((payload.receipts ?? []).map((r) => [r.payment_record_id, r])));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: 'reconcile' | 'resend_receipt', orderId: string) => {
    setBusy(`${action}:${orderId}`);
    const { data, error } = await supabase.functions.invoke('admin-order-ops', {
      body: { action, order_id: orderId },
    });
    setBusy(null);
    if (error) {
      toast.error(action === 'reconcile' ? 'Reconciliation failed.' : 'Receipt could not be resent.');
      return;
    }
    const payload = data as { outcome?: string; sent?: boolean; reason?: string };
    toast.success(
      action === 'reconcile'
        ? payload.outcome === 'capture_applied'
          ? 'A capture was found and applied.'
          : 'Checked with PayPal — no capture exists for this order.'
        : payload.sent
          ? 'Receipt resent.'
          : `Receipt not sent: ${payload.reason ?? 'unknown reason'}`,
    );
    void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Failed payment attempts
          </CardTitle>
          <CardDescription>
            Orders where a charge did not complete. Reconciling never charges the buyer — it only
            re-reads PayPal's record of the order.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No failed attempts. Every recent checkout completed cleanly.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Buyer</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Failure</th>
                  <th className="px-3 py-2 text-left">Receipt</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const rec = records[a.payment_record_id];
                  const receipt = receipts[a.payment_record_id];
                  return (
                    <tr key={a.id} className="border-b border-border/60">
                      <td className="px-3 py-3">
                        <div className="font-medium">{rec?.reference ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          Attempt {a.attempt_number ?? 1} · {new Date(a.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{rec?.buyer_email ?? '—'}</td>
                      <td className="px-3 py-3 text-right">
                        {rec ? money(rec.gross_amount_cents, rec.currency) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={a.failure_category === 'terminal' ? 'destructive' : 'secondary'}>
                          {a.failure_category === 'terminal' ? 'Terminal' : 'Retryable'}
                        </Badge>
                        <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                          {a.failure_message_safe ?? a.failure_code ?? a.status}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {receipt ? `${receipt.status} (${receipt.attempt_count ?? 0})` : 'not sent'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy !== null}
                            onClick={() => void run('reconcile', a.payment_record_id)}
                          >
                            {busy === `reconcile:${a.payment_record_id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Reconcile'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy !== null}
                            onClick={() => void run('resend_receipt', a.payment_record_id)}
                          >
                            {busy === `resend_receipt:${a.payment_record_id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FailedPaymentAttemptsPanel;
