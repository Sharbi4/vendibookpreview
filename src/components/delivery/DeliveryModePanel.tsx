import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Pause, Play, CheckCircle2, Loader2, Ban, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { handoffOps, type FulfillmentSession } from '@/hooks/useHandoff';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import { useAuth } from '@/contexts/AuthContext';
import { LOCATION_TRACKING_VERSION } from '@/lib/legal/versions';
import { recordLegalAcceptance } from '@/lib/legal/recordAcceptance';

/** Legacy alias retained for the session's stored consent string. */
export const DELIVERY_LOCATION_CONSENT_VERSION = `location-tracking:${LOCATION_TRACKING_VERSION}`;

interface Props {
  saleTransactionId?: string | null;
  bookingId?: string | null;
  /** One-time driver link token — used instead of a signed-in session. */
  driverToken?: string | null;
  sessionIdOverride?: string | null;
  /** Session row supplied by the driver-link page (no account required). */
  sessionOverride?: Partial<FulfillmentSession> | null;
  onChanged?: () => void;
}

type PermissionState = 'not-requested' | 'granted' | 'denied' | 'unavailable';

export default function DeliveryModePanel({
  saleTransactionId,
  bookingId,
  driverToken,
  sessionIdOverride,
  sessionOverride,
  onChanged,
}: Props) {
  const { session: hookSession, refresh: hookRefresh } = useDeliveryTracking(
    driverToken ? null : saleTransactionId,
    driverToken ? null : bookingId,
  );
  const session = (sessionOverride as FulfillmentSession | null) ?? hookSession;
  const sessionId = sessionIdOverride ?? session?.id ?? null;
  const refresh = onChanged ?? hookRefresh;


  const [consent, setConsent] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('not-requested');
  const [busy, setBusy] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const tracking = !!session?.tracking_active && !session?.tracking_paused;
  const closed = session?.status === 'completed' || session?.status === 'cancelled';

  const run = useCallback(
    async (key: string, payload: Record<string, unknown>, okMessage?: string) => {
      setBusy(key);
      try {
        const res = await handoffOps({ ...payload, driver_token: driverToken ?? undefined });
        if (okMessage) toast.success(okMessage);
        await refresh();
        return res as any;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'That action could not be completed.');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [driverToken, refresh],
  );

  const requestPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setPermission('unavailable');
      return false;
    }
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermission('granted');
          resolve(true);
        },
        () => {
          setPermission('denied');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000 },
      );
    });
  }, []);

  // Stream location only while tracking is genuinely running.
  useEffect(() => {
    if (!tracking || !sessionId || permission !== 'granted') {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 15000) return;
        lastSent.current = now;
        handoffOps({
          action: 'log_gps',
          fulfillment_session_id: sessionId,
          driver_token: driverToken ?? undefined,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
        }).catch(() => {
          /* transient network drops are expected on the road */
        });
      },
      () => setPermission('denied'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [tracking, sessionId, permission, driverToken]);

  if (!session && !sessionId) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        There's no delivery set up for this order yet. Start the delivery from the order's handoff page first.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Truck className="h-4 w-4" /> Delivery mode
        </h2>
        {tracking ? (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Sharing location</Badge>
        ) : session?.tracking_paused ? (
          <Badge variant="outline">Paused</Badge>
        ) : (
          <Badge variant="outline">Not started</Badge>
        )}
      </div>

      {tracking && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-sm">
            <strong>Your location is being shared</strong> with this order&rsquo;s buyer, seller, and Vendibook support
            while the delivery is active.{' '}
            <Link to="/legal/location-tracking" target="_blank" rel="noreferrer" className="underline">
              How this works
            </Link>
          </p>
          <Button size="sm" variant="outline" disabled={!!busy}
            onClick={() => run('end', { action: 'end_tracking', fulfillment_session_id: sessionId }, 'Location sharing stopped.')}>
            <Ban className="mr-2 h-4 w-4" /> Stop sharing
          </Button>
        </div>
      )}

      {!tracking && !closed && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm">
            While this delivery is active, your live location is shared with the buyer on this order only. It stops
            automatically when you mark the delivery delivered or end it. Camera and microphone are never used for
            delivery tracking.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>
              I have read and agree to the{' '}
              <Link to="/legal/location-tracking" target="_blank" rel="noreferrer" className="underline">
                Location &amp; Delivery Tracking Disclosure
              </Link>
              , and I understand my live location will be shared with this order&rsquo;s participants for the duration
              of this delivery.
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            Do not interact with your device while driving. Start and complete steps only when safely stopped.
          </p>
          {permission === 'denied' && (
            <p className="text-sm text-destructive">
              Location is blocked for this site. Allow location in your browser settings, then try again.
            </p>
          )}
          {permission === 'unavailable' && (
            <p className="text-sm text-destructive">
              This device or browser can't share location. Use a phone browser with location enabled.
            </p>
          )}
          <Button
            disabled={!consent || busy === 'start'}
            onClick={async () => {
              const ok = await requestPermission();
              if (!ok) return;
              // Record the acceptance for a signed-in driver. The driver-link
              // path has no account; the edge function still requires the
              // current version to be asserted before tracking can start.
              if (user && !driverToken) {
                await recordLegalAcceptance({
                  userId: user.id,
                  slugs: ['location-tracking'],
                  surface: 'delivery_mode',
                  relatedEntityType: 'delivery',
                  relatedEntityId: sessionId,
                  grantedPermissions: { location: true },
                }).catch(() => undefined);
              }
              await run(
                'start',
                {
                  action: 'start_tracking',
                  fulfillment_session_id: sessionId,
                  location_consent: true,
                  legal_acceptance_version: LOCATION_TRACKING_VERSION,
                  consent_version: DELIVERY_LOCATION_CONSENT_VERSION,
                },
                'Delivery started. The buyer can follow you live.',
              );
            }}
          >
            {busy === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start delivery
          </Button>
        </div>
      )}

      {(tracking || session?.tracking_paused) && !closed && (
        <div className="space-y-3">
          <p className="rounded-lg bg-foreground/5 p-3 text-sm">
            Keep Delivery mode open on your screen while you're on the road. Phone browsers pause location when the
            screen locks or you switch apps, so tracking may go quiet until you come back.
          </p>
          <div className="flex flex-wrap gap-2">
            {tracking ? (
              <Button size="sm" variant="outline" disabled={!!busy}
                onClick={() => run('pause', { action: 'pause_tracking', fulfillment_session_id: sessionId }, 'Tracking paused.')}>
                <Pause className="mr-2 h-4 w-4" /> Pause tracking
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={!!busy}
                onClick={async () => {
                  const ok = await requestPermission();
                  if (!ok) return;
                  await run('resume', { action: 'resume_tracking', fulfillment_session_id: sessionId }, 'Tracking resumed.');
                }}>
                <Play className="mr-2 h-4 w-4" /> Resume tracking
              </Button>
            )}
            {session?.status !== 'arrived' && (
              <Button size="sm" variant="outline" disabled={!!busy}
                onClick={() => run('arrive', { action: 'mark_arrived', fulfillment_session_id: sessionId }, 'Arrival recorded.')}>
                <MapPin className="mr-2 h-4 w-4" /> Mark arrived
              </Button>
            )}
            <Button size="sm" disabled={!!busy}
              onClick={() => run('delivered', { action: 'mark_delivered', fulfillment_session_id: sessionId }, 'Delivery marked delivered.')}>
              {busy === 'delivered' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Mark delivered
            </Button>
            <Button size="sm" variant="ghost" disabled={!!busy}
              onClick={() => run('end', { action: 'end_tracking', fulfillment_session_id: sessionId }, 'Location sharing stopped.')}>
              <Ban className="mr-2 h-4 w-4" /> End tracking
            </Button>
          </div>
        </div>
      )}

      {closed && (
        <p className="text-sm text-muted-foreground">
          This delivery is closed and location sharing has stopped.
        </p>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Marking a delivery delivered records the status only. Payment and payout continue to follow the order's normal
        rules.
      </p>
    </Card>
  );
}
