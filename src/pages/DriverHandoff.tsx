import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handoffOps } from '@/hooks/useHandoff';
import DeliveryModePanel from '@/components/delivery/DeliveryModePanel';

/**
 * Independent driver view. No Vendibook account required.
 * The token is the only credential and it is scoped to a single delivery
 * session — it can never read buyer/seller account data.
 */
export default function DriverHandoff() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await handoffOps<any>({ action: 'driver_resolve', driver_token: token });
      setState(data);
      setConsent(!!data?.session?.location_consent);
      setDenied(null);
    } catch (err) {
      setDenied(err instanceof Error ? err.message : 'This delivery link is not valid.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const active = state?.session && !['completed', 'cancelled'].includes(state.session.status);

  // Location streaming lives in DeliveryModePanel, which only shares location
  // while the driver has explicitly started the delivery.


  const run = async (name: string, payload: Record<string, unknown>, success?: string) => {
    setBusy(name);
    try {
      await handoffOps({ ...payload, driver_token: token });
      if (success) toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Link unavailable</h1>
        <p className="mt-2 text-muted-foreground">{denied}</p>
        <p className="mt-2 text-sm text-muted-foreground">Ask the seller to send you a new delivery link.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-10">
      <SEO title="Delivery · Vendibook" description="Document a Vendibook delivery." noindex />
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Vendibook delivery</p>
      <h1 className="mt-1 text-2xl font-semibold">{state?.listing?.title ?? 'Scheduled delivery'}</h1>
      {state?.listing?.city && (
        <p className="text-sm text-muted-foreground">{state.listing.city}, {state.listing.state}</p>
      )}
      <Badge variant="outline" className="mt-3">{String(state?.session?.status ?? '').replace(/_/g, ' ')}</Badge>

      <div className="mt-6">
        <DeliveryModePanel
          driverToken={token}
          sessionIdOverride={state?.session?.id ?? null}
          sessionOverride={state?.session ?? null}
          onChanged={load}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        <Truck className="mr-1 inline h-3 w-3" />
        The buyer and seller complete the condition walkthrough and acknowledgment in their Vendibook accounts.
      </p>


      {state?.handoff?.status === 'completed' && (
        <p className="mt-6 flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> This handoff is documented. Thanks for driving.
        </p>
      )}
    </div>
  );
}
