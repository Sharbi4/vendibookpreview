import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';

interface Connection {
  environment: string;
  status: 'active' | 'needs_reconnect' | 'revoked';
  location_name: string | null;
  business_name: string | null;
  connected_at: string;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('square-seller-oauth', { body });
  if (error) {
    const parsed = await parseEdgeError(error);
    throw new Error(parsed?.message || 'Square is unavailable right now. Please try again.');
  }
  return data;
}

/**
 * Hosts connect their own Square account so renters pay them directly by
 * card. Vendibook's service fee is taken automatically as an app fee; the
 * host never shares a password or token with Vendibook.
 */
export default function SellerSquareConnect() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [environment, setEnvironment] = useState<string>('sandbox');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    call({ action: 'status' })
      .then((d) => {
        setAvailable(Boolean(d?.available));
        setEnvironment(d?.environment ?? 'sandbox');
        setConnection(d?.connection ?? null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await call({ action: 'start', return_path: '/dashboard/payments/setup' });
      window.location.assign(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Square? Renters won’t be able to pay for new bookings until you reconnect.')) return;
    setBusy(true);
    setError(null);
    try {
      await call({ action: 'disconnect' });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const active = connection?.status === 'active';

  return (
    <section className="v2-panel" aria-labelledby="square-connect-title">
      <div className="v2-panel-head">
        <div>
          <p className="v2-eyebrow">Rental payments · Square</p>
          <h2 id="square-connect-title">Get paid for rentals by card</h2>
        </div>
        <span className={`v2-status ${active ? 'is-ok' : connection?.status === 'needs_reconnect' ? 'is-alert' : 'is-warn'}`}>
          {loading ? 'Checking…' : active ? 'Connected' : connection?.status === 'needs_reconnect' ? 'Reconnect needed' : 'Not connected'}
        </span>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Renters pay by card at checkout and the money goes straight to your Square account. Vendibook&apos;s
          service fee, any sales tax and the refundable deposit are taken out automatically at payment, so
          there&apos;s nothing to invoice. Square charges its standard card processing fee on your side.
        </p>
        {active ? (
          <p className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Paying out to {connection?.business_name || 'your Square account'}
            {connection?.location_name ? ` · ${connection.location_name}` : ''}
          </p>
        ) : null}
        {environment === 'sandbox' && available ? (
          <p className="text-xs">Test mode: Square sandbox accounts only. No real money moves.</p>
        ) : null}
        {!loading && !available ? (
          <p className="text-xs">Square connections are being set up and will open here soon.</p>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {active ? (
            <Button variant="outline" onClick={disconnect} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Disconnect
            </Button>
          ) : (
            <Button onClick={connect} disabled={busy || loading || !available}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {connection?.status === 'needs_reconnect' ? 'Reconnect Square' : 'Connect Square'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
