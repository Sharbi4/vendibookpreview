import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, MapPin, Loader2, Truck, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handoffOps, type FulfillmentSession, type TrackingEvent } from '@/hooks/useHandoff';

interface Props {
  saleId: string | null;
  bookingId: string | null;
  sessions: FulfillmentSession[];
  tracking: TrackingEvent[];
  isSeller: boolean;
  onChange: () => void;
}

export default function DeliveryOps({ saleId, bookingId, sessions, tracking, isSeller, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [driver, setDriver] = useState({ driver_name: '', driver_email: '', driver_phone: '' });
  const [driverUrl, setDriverUrl] = useState<string | null>(null);
  const [trackForm, setTrackForm] = useState({ carrier: '', tracking_number: '', tracking_url: '', status: 'in_transit' });
  const watchRef = useRef<number | null>(null);

  const active = sessions.find((s) => !['completed', 'cancelled'].includes(s.status)) ?? null;

  // Location checkpoints run only while an active, consented session is open.
  useEffect(() => {
    if (!active || !active.location_consent || !navigator.geolocation) return;
    if (!isSeller || active.mode !== 'seller_delivery') return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handoffOps({
          action: 'log_gps',
          fulfillment_session_id: active.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
        }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [active?.id, active?.location_consent, active?.mode, isSeller]);

  const run = async (name: string, payload: Record<string, unknown>, success?: string) => {
    setBusy(name);
    try {
      const result = await handoffOps<any>(payload);
      if (success) toast.success(success);
      onChange();
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const startDelivery = async (mode: 'seller_delivery' | 'third_party_driver') => {
    if (consent && navigator.geolocation) {
      // Ask for the browser permission only after the user opts in.
      await new Promise<void>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => {
            toast.info('Location access was declined. The delivery is still documented without location.');
            resolve();
          },
          { timeout: 10_000 },
        ),
      );
    }
    await run(
      'start',
      {
        action: 'start_fulfillment',
        sale_transaction_id: saleId,
        booking_id: bookingId,
        mode,
        location_consent: consent,
        ...driver,
      },
      'Delivery session started.',
    );
  };

  if (!isSeller && !active && !tracking.length) return null;

  return (
    <div className="space-y-4">
      {isSeller && !active && (
        <Card className="space-y-4 p-4">
          <div>
            <p className="font-medium">Start a delivery session</p>
            <p className="text-sm text-muted-foreground">
              Documents when the delivery started, arrival, and the handoff itself.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span>
              Share my location while this delivery is active. Location is used only to document this delivery and
              stops when the delivery is completed or cancelled. Keep this screen open during the drive — browsers
              stop reporting location when the tab is closed.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy === 'start'} onClick={() => startDelivery('seller_delivery')}>
              {busy === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
              I'm delivering it
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === 'start'}
              onClick={() => startDelivery('third_party_driver')}
            >
              <Link2 className="mr-2 h-4 w-4" /> An independent driver is delivering it
            </Button>
          </div>
        </Card>
      )}

      {active && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Delivery in progress</p>
              <p className="text-sm text-muted-foreground">
                {active.mode === 'third_party_driver' ? 'Independent driver' : 'Seller delivery'} ·{' '}
                {active.status.replace(/_/g, ' ')}
              </p>
            </div>
            <Badge variant="outline" className={active.location_consent ? 'border-emerald-500/30 text-emerald-600' : ''}>
              <MapPin className="mr-1 h-3 w-3" />
              {active.location_consent ? 'Location documented' : 'Location off'}
            </Badge>
          </div>

          {isSeller && active.mode === 'third_party_driver' && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Secure driver link</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Driver name</Label>
                  <Input value={driver.driver_name} onChange={(e) => setDriver({ ...driver, driver_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={driver.driver_email} onChange={(e) => setDriver({ ...driver, driver_email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={driver.driver_phone} onChange={(e) => setDriver({ ...driver, driver_phone: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy === 'link'}
                  onClick={async () => {
                    const r = await run('link', { action: 'create_driver_link', fulfillment_session_id: active.id, ...driver });
                    if (r?.driver_url) setDriverUrl(`${window.location.origin}${r.driver_url}`);
                  }}
                >
                  {busy === 'link' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  Create link
                </Button>
                {driverUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(driverUrl);
                      toast.success('Driver link copied. It expires in 48 hours.');
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy link
                  </Button>
                )}
              </div>
              {driverUrl && (
                <p className="break-all rounded-md bg-foreground/5 p-2 text-xs text-muted-foreground">
                  {driverUrl} — shown once. It expires in 48 hours and can be revoked at any time.
                </p>
              )}
            </div>
          )}

          {isSeller && (
            <div className="flex flex-wrap gap-2">
              {active.status !== 'arrived' && (
                <Button size="sm" variant="outline" disabled={!!busy}
                  onClick={() => run('arrive', { action: 'mark_arrived', fulfillment_session_id: active.id }, 'Arrival recorded.')}>
                  <MapPin className="mr-2 h-4 w-4" /> Mark arrived
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={!!busy}
                onClick={() => run('cancel', { action: 'cancel_fulfillment', fulfillment_session_id: active.id }, 'Delivery session ended.')}>
                <Ban className="mr-2 h-4 w-4" /> End session
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="font-medium">Freight &amp; carrier tracking</p>
        {tracking.length === 0 && <p className="text-sm text-muted-foreground">No tracking has been added yet.</p>}
        {tracking.map((t) => (
          <div key={t.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.carrier ?? 'Carrier'}</span>
              <Badge variant="outline">{t.status.replace(/_/g, ' ')}</Badge>
              {t.tracking_number && <span className="text-muted-foreground">#{t.tracking_number}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(t.event_at).toLocaleString()} · PayPal tracking sync: {t.paypal_sync_status.replace(/_/g, ' ')}
              {t.paypal_debug_id ? ` · debug ${t.paypal_debug_id}` : ''}
            </p>
            {t.paypal_sync_error && <p className="mt-1 text-xs text-destructive">{t.paypal_sync_error}</p>}
            {isSeller && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={busy === `sync-${t.id}`}
                onClick={() => run(`sync-${t.id}`, { action: 'sync_paypal_tracking', tracking_event_id: t.id })}
              >
                Send tracking to PayPal
              </Button>
            )}
          </div>
        ))}

        {isSeller && (
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Carrier" value={trackForm.carrier}
              onChange={(e) => setTrackForm({ ...trackForm, carrier: e.target.value })} />
            <Input placeholder="Tracking number" value={trackForm.tracking_number}
              onChange={(e) => setTrackForm({ ...trackForm, tracking_number: e.target.value })} />
            <Input placeholder="Tracking URL (optional)" value={trackForm.tracking_url}
              onChange={(e) => setTrackForm({ ...trackForm, tracking_url: e.target.value })} />
            <Button
              size="sm"
              disabled={busy === 'track' || !trackForm.carrier}
              onClick={async () => {
                await run('track', {
                  action: 'add_tracking',
                  sale_transaction_id: saleId,
                  booking_id: bookingId,
                  ...trackForm,
                }, 'Tracking added to the evidence record.');
                setTrackForm({ carrier: '', tracking_number: '', tracking_url: '', status: 'in_transit' });
              }}
            >
              Add tracking
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
