import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Unlink,
} from 'lucide-react';

type Connection = {
  id: string;
  onboarding_status: 'link_sent' | 'onboarding' | 'ready' | 'action_required' | 'disconnected';
  action_reasons: string[] | null;
  merchant_id: string | null;
  paypal_email: string | null;
  referral_url: string | null;
};

/**
 * Seller PayPal connection (PayPal Complete Payments / Connected Path).
 *
 * States: not connected → Connect PayPal (goes directly to PayPal via Partner
 * Referral) → finishing/returning → Ready or Action Required (with PayPal's
 * exact remediation copy) → Disconnect (with PayPal's exact confirmation copy).
 *
 * Inert unless the server has the seller-onboarding switch on — it renders
 * nothing otherwise, so this section never appears before certification.
 */
export default function SellerPayPalConnect({
  showWhenDisabled = false,
  variant = 'inline',
}: {
  showWhenDisabled?: boolean;
  /** `dark` renders the money-center PayPal Partner module. */
  variant?: 'inline' | 'dark';
}) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const handledReturn = useRef(false);

  const loadConnection = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('seller_paypal_accounts')
      .select('id, onboarding_status, action_reasons, merchant_id, paypal_email, referral_url')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();
    setConnection((data as Connection) ?? null);
    return (data as Connection) ?? null;
  }, [user]);

  const refreshStatus = useCallback(async () => {
    setBusy('refresh');
    try {
      const { data, error } = await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'refresh_status' },
      });
      if (error) throw new Error(error.message);
      await loadConnection();
      if (data?.status === 'ready') {
        toast.success('Your PayPal account is connected and ready to receive payments.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't check your PayPal status. Try again.");
    } finally {
      setBusy(null);
    }
  }, [loadConnection]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let caps: { enabled?: boolean } | null = null;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-seller-onboarding`,
        );
        caps = await res.json().catch(() => null);
      } catch {
        if (!cancelled) setEnabled(false);
        return;
      }
      if (cancelled) return;
      const on = caps?.enabled === true;
      setEnabled(on);
      if (!on) return;

      await loadConnection();

      // Returning from PayPal: refresh status once, then clean the URL.
      const params = new URLSearchParams(window.location.search);
      if (params.get('paypal_return') === '1' && !handledReturn.current) {
        handledReturn.current = true;
        await refreshStatus();
        params.delete('paypal_return');
        const qs = params.toString();
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const connect = async () => {
    setBusy('connect');
    try {
      const { data, error } = await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'create_referral' },
      });
      if (error) throw new Error(error.message);
      if (data?.already_connected) {
        await loadConnection();
        return;
      }
      if (data?.onboarding_url) {
        toast.success('Taking you to PayPal to connect your account…');
        window.location.href = data.onboarding_url as string;
      } else {
        throw new Error("PayPal didn't return a signup link. Please try again.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start PayPal connection.');
      setBusy(null);
    }
  };

  const disconnect = async () => {
    // PayPal's required confirmation copy — exact wording.
    const confirmed = window.confirm(
      'Disconnecting your PayPal account will prevent you from offering PayPal services and products on your website. Do you wish to continue?',
    );
    if (!confirmed) return;
    setBusy('disconnect');
    try {
      const { error } = await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'disconnect' },
      });
      if (error) throw new Error(error.message);
      await loadConnection();
      toast.success('Your PayPal account has been disconnected.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not disconnect PayPal.');
    } finally {
      setBusy(null);
    }
  };

  if (!user || enabled === null || (enabled === false && !showWhenDisabled)) return null;

  const reasons = connection?.action_reasons ?? [];
  const emailUnconfirmed = reasons.includes('primary_email_unconfirmed');
  const notReceivable = reasons.includes('payments_receivable_false');
  const needsPermissions = reasons.includes('oauth_not_active') || reasons.includes('vetting_pending');
  const status = connection?.onboarding_status ?? null;
  const isReady = status === 'ready';

  /** PayPal's exact remediation copy — meaning must not change. */
  const emailWarning = (
    <>
      Attention: Please confirm your email address on{' '}
      <a
        href="https://www.paypal.com/businessprofile/settings"
        target="_blank"
        rel="noreferrer noopener"
      >
        paypal.com/businessprofile/settings
      </a>{' '}
      in order to receive payments! You currently cannot receive payments.
    </>
  );
  const receivableWarning = (
    <>
      Attention: You currently cannot receive payments due to restriction on your PayPal account.
      Please reach out to PayPal Customer Support or connect to{' '}
      <a href="https://www.paypal.com" target="_blank" rel="noreferrer noopener">
        www.paypal.com
      </a>{' '}
      for more information.
    </>
  );

  const statusLabel = !connection
    ? 'Not connected'
    : status === 'ready'
      ? 'Ready to receive payments'
      : status === 'link_sent'
        ? 'Connecting — not finished'
        : status === 'onboarding'
          ? 'Checking status'
          : status === 'disconnected'
            ? 'Disconnected'
            : 'Action required';

  // Real, backend-derived readiness. Nothing is marked complete on guesswork.
  const step = (done: boolean, blocked: boolean) =>
    done ? 'is-done' : blocked ? 'is-blocked' : 'is-pending';
  const checklist: Array<{ label: string; state: string }> = [
    {
      label: 'PayPal Business account connected',
      state: step(Boolean(connection) && status !== 'disconnected', status === 'disconnected'),
    },
    { label: 'Primary email confirmed', state: step(isReady, emailUnconfirmed) },
    { label: 'Payments receivable', state: step(isReady, notReceivable) },
    { label: 'Required permissions granted', state: step(isReady, needsPermissions) },
    { label: 'Online checkout enabled on your listings', state: step(isReady, false) },
  ];

  if (variant === 'dark') {
    return (
      <div className="v2-paypal-panel space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`v2-status ${isReady ? 'is-ok' : connection ? 'is-warn' : ''}`}>
            {isReady ? <CheckCircle2 /> : connection ? <AlertTriangle /> : <CreditCard />}
            {statusLabel}
          </span>
          {isReady && connection?.paypal_email && (
            <span className="v2-paypal-note">{connection.paypal_email}</span>
          )}
        </div>

        <ul className="v2-checklist">
          {checklist.map((item) => (
            <li key={item.label} className={item.state}>
              {item.state === 'is-done' ? (
                <CheckCircle2 />
              ) : item.state === 'is-blocked' ? (
                <AlertTriangle />
              ) : (
                <Circle />
              )}
              {item.label}
            </li>
          ))}
        </ul>

        {!connection && (
          <p className="v2-paypal-note">
            A PayPal <strong>Business</strong> account is required — personal accounts can&apos;t be
            used to sell on Vendibook. You&apos;ll be taken to PayPal to sign in to your Business
            account (or create/upgrade to one) and approve the connection.
          </p>
        )}
        {emailUnconfirmed && <p className="v2-paypal-warn">{emailWarning}</p>}
        {notReceivable && <p className="v2-paypal-warn">{receivableWarning}</p>}
        {needsPermissions && (
          <p className="v2-paypal-note">
            Finish connecting your PayPal account so Vendibook has the permissions it needs.
          </p>
        )}
        {status === 'link_sent' && (
          <p className="v2-paypal-note">
            You started connecting PayPal but haven&apos;t finished yet. Pick up where you left off
            on PayPal, then check your status here.
          </p>
        )}
        {status === 'disconnected' && (
          <p className="v2-paypal-note">
            Your PayPal account is disconnected. Your past transactions and records are unchanged —
            reconnect whenever you&apos;re ready to accept online payments again.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {(!connection || status === 'disconnected') && (
            <button
              type="button"
              className="v2-paypal-cta"
              onClick={connect}
              disabled={busy === 'connect' || enabled === false}
            >
              {busy === 'connect'
                ? 'Opening PayPal…'
                : status === 'disconnected'
                  ? 'Reconnect PayPal'
                  : 'Connect PayPal'}
            </button>
          )}
          {connection?.referral_url && (status === 'link_sent' || needsPermissions) && (
            <button
              type="button"
              className="v2-paypal-cta"
              onClick={() => window.open(connection.referral_url!, '_blank')}
            >
              <ExternalLink />
              Continue on PayPal
            </button>
          )}
          {connection && (
            <button
              type="button"
              className="v2-paypal-ghost"
              onClick={refreshStatus}
              disabled={busy === 'refresh'}
            >
              <RefreshCw />
              {busy === 'refresh' ? 'Checking…' : 'Check status'}
            </button>
          )}
          {connection && status !== 'disconnected' && (
            <button
              type="button"
              className="v2-paypal-ghost"
              onClick={disconnect}
              disabled={busy === 'disconnect'}
            >
              <Unlink />
              Disconnect
            </button>
          )}
        </div>

        {enabled === false && (
          <p className="v2-paypal-note">
            Sandbox setup required — PayPal seller connection isn&apos;t switched on for this
            environment yet. You can still create and publish listings.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 flex items-start gap-4 border-t border-border">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
        <CreditCard className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">PayPal seller account</span>
          {isReady && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] h-4 px-1.5">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              Ready to receive payments
            </Badge>
          )}
          {connection && !isReady && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] h-4 px-1.5">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              {status === 'link_sent' || status === 'onboarding'
                ? 'Connecting'
                : status === 'disconnected'
                  ? 'Disconnected'
                  : 'Action required'}
            </Badge>
          )}
        </div>

        {!connection && (
          <>
            <Badge className="mb-2 bg-muted text-muted-foreground border-border text-[10px] h-5 px-2">
              Not connected
            </Badge>
            <p className="text-xs text-muted-foreground mt-0.5">
              A PayPal <strong>Business</strong> account is required — personal accounts can't be
              used to sell on Vendibook. You'll be taken to PayPal to sign in to your Business
              account (or create/upgrade to one) and approve the connection.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={connect}
              disabled={busy === 'connect' || enabled === false}
            >
              {busy === 'connect' ? 'Opening PayPal…' : 'Connect PayPal'}
            </Button>
            {enabled === false && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                PayPal seller connection is not available during this preview. You can still create and publish listings.
              </p>
            )}
          </>
        )}

        {isReady && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your PayPal account is connected and can receive payments.
              {connection?.paypal_email && (
                <> Account: <span className="text-foreground/85">{connection.paypal_email}</span>.</>
              )}
              {connection?.merchant_id && (
                <> Merchant ID: <span className="font-mono text-[11px]">{connection.merchant_id}</span>.</>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={disconnect}
              disabled={busy === 'disconnect'}
            >
              <Unlink className="h-3.5 w-3.5 mr-1.5" />
              Disconnect
            </Button>
          </>
        )}

        {status === 'link_sent' && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">
              You started connecting PayPal but haven't finished yet. Pick up where you left off on
              PayPal, then check your status here.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {connection?.referral_url && (
                <Button size="sm" onClick={() => window.open(connection.referral_url!, '_blank')}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Finish connecting on PayPal
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refreshStatus} disabled={busy === 'refresh'}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Check status
              </Button>
            </div>
          </>
        )}

        {status === 'action_required' && (
          <>
            <div className="mt-2 space-y-2">
              {emailUnconfirmed && (
                <p className="text-xs text-amber-700 dark:text-amber-400 [&_a]:underline [&_a]:font-medium">
                  {emailWarning}
                </p>
              )}
              {notReceivable && (
                <p className="text-xs text-amber-700 dark:text-amber-400 [&_a]:underline [&_a]:font-medium">
                  {receivableWarning}
                </p>
              )}
              {needsPermissions && (
                <p className="text-xs text-muted-foreground">
                  Finish connecting your PayPal account so Vendibook has the permissions it needs.
                  {connection?.referral_url && ' Use the button below to continue on PayPal.'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {needsPermissions && connection?.referral_url && (
                <Button size="sm" onClick={() => window.open(connection.referral_url!, '_blank')}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Continue on PayPal
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refreshStatus} disabled={busy === 'refresh'}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Check status again
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
