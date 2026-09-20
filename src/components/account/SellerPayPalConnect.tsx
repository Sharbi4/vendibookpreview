import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { recordLegalAcceptance } from '@/lib/legal/recordAcceptance';
import SellerBusinessAccountHelp from '@/components/payments/SellerBusinessAccountHelp';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import { toast } from 'sonner';
import { sellerVettingNotices } from '@/lib/paypal/sellerVetting';
import { parseEdgeError } from '@/lib/edgeErrors';
import {
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Unlink,
  XCircle,
} from 'lucide-react';

type Connection = {
  id: string;
  onboarding_status: 'link_sent' | 'onboarding' | 'ready' | 'action_required' | 'disconnected' | 'revoked';
  action_reasons: string[] | null;
  merchant_id: string | null;
  paypal_email: string | null;
  referral_url: string | null;
  oauth_scopes: string[];
  acdc_vetting_status: string | null;
  vaulting_status: string | null;
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
  variant?: 'inline' | 'dark' | 'pill';
}) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const { connection, reload: loadConnection, isReady, webhookConfirmed, lastRefreshError } = useMyPayPalConnection();
  const [busy, setBusy] = useState<string | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [sellerTermsAccepted, setSellerTermsAccepted] = useState(false);
  const [flowMessage, setFlowMessage] = useState<
    { tone: 'success' | 'error' | 'info'; text: string } | null
  >(null);
  const handledReturn = useRef(false);

  useEffect(() => { handledReturn.current = false; setFlowMessage(null); }, [user?.id]);
  useEffect(() => { if (lastRefreshError) setFlowMessage({ tone: 'error', text: lastRefreshError }); }, [lastRefreshError]);

  const refreshStatus = useCallback(async () => {
    setBusy('refresh');
    setFlowMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'refresh_status' },
      });
      if (error) {
        const parsed = await parseEdgeError(error, data?.error ? data : null);
        throw new Error(parsed.message);
      }
      await loadConnection();
      if (data?.status_source === 'webhook') {
        setFlowMessage({
          tone: 'success',
          text: 'PayPal confirmed your connection. Your account is recorded and ready to receive payments.',
        });
        toast.success('Your PayPal account is connected.');
      } else if (data?.status === 'ready') {
        setFlowMessage({ tone: 'success', text: 'PayPal confirmed your account is ready to receive payments.' });
        toast.success('Your PayPal account is connected and ready to receive payments.');
      } else if (data?.pending || data?.status === 'link_sent') {
        setFlowMessage({
          tone: 'info',
          text: "You haven't finished the PayPal signup yet. Continue on PayPal, then check your status here.",
        });
      } else {
        setFlowMessage({
          tone: 'info',
          text: 'Your PayPal connection is active, but one or more requirements still need attention.',
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't check your PayPal status. Try again.";
      setFlowMessage({ tone: 'error', text: message });
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }, [loadConnection]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      let caps: { enabled?: boolean } | null = null;
      for (let attempt = 0; attempt < 2 && !caps; attempt += 1) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-seller-onboarding`,
          );
          if (res.ok) caps = await res.json().catch(() => null);
        } catch {
          // Retry once before presenting a recoverable loading error.
        }
      }
      if (cancelled) return;
      if (!caps) {
        setCapabilityError("We couldn't load PayPal setup. Check your connection and try again.");
        setEnabled(null);
        return;
      }
      const on = caps?.enabled === true;
      setCapabilityError(null);
      setEnabled(on);
      if (!on) return;

      try { await loadConnection(); }
      catch { if (!cancelled) setFlowMessage({ tone: 'error', text: "Couldn't load your PayPal connection. Please try checking status again." }); return; }
      if (cancelled) return;

      // Returning from PayPal: refresh status once, then clean the URL.
      const params = new URLSearchParams(window.location.search);
      if (params.get('paypal_return') === '1' && !handledReturn.current) {
        handledReturn.current = true;
        const returnedError = params.get('error_description') || params.get('error');
        const wasCancelled = params.get('cancelled') === '1' || params.get('cancel') === 'true';
        // Clean the callback marker before awaiting the network check so a
        // refresh cannot replay the return flow while PayPal is responding.
        params.delete('paypal_return');
        params.delete('error_description');
        params.delete('error');
        params.delete('cancelled');
        params.delete('cancel');
        const qs = params.toString();
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
        );
        if (returnedError) {
          setFlowMessage({ tone: 'error', text: 'PayPal could not finish connecting your account. Please try again.' });
        } else if (wasCancelled) {
          setFlowMessage({ tone: 'info', text: 'PayPal setup was not completed. You can continue whenever you are ready.' });
        } else {
          setFlowMessage({ tone: 'info', text: 'Welcome back. We are checking your account with PayPal now.' });
          await refreshStatus();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const connect = async () => {
    if (!sellerTermsAccepted) {
      setFlowMessage({ tone: 'error', text: 'Please accept the Seller Payment Terms and electronic records consent first.' });
      return;
    }
    // Open the window synchronously (user-gesture context) so popup blockers
    // allow it, then navigate it once the referral URL arrives. Embedded
    // previews block top-level redirects, so a real window is the reliable path.
    const popup = window.open('', 'vendibook_paypal_connect');
    setBusy('connect');
    setOnboardingLink(null);
    setFlowMessage(null);
    try {
      // Record the versioned acceptance before we ask PayPal for a referral
      // link. `paypal-seller-onboarding` independently verifies it server-side.
      if (user?.id) {
        const { error: acceptError } = await recordLegalAcceptance({
          userId: user.id,
          slugs: ['seller-payment-terms', 'esign'],
          surface: 'paypal_onboarding',
          relatedEntityType: 'account',
          relatedEntityId: user.id,
        });
        if (acceptError) throw new Error("We couldn't record your acceptance. Please try again.");
      }
      const { data, error } = await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'create_referral' },
      });
      if (error || data?.error) {
        const parsed = await parseEdgeError(error, data?.error ? data : null);
        throw new Error(parsed.message);
      }
      if (data?.already_connected) {
        await loadConnection();
        setFlowMessage({ tone: 'info', text: 'Your PayPal connection already exists. Check its status below.' });
        setBusy(null);
        return;
      }
      if (data?.onboarding_url) {
        const url = new URL(data.onboarding_url as string);
        if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)) {
          throw new Error('PayPal returned an unexpected setup link. Please try again.');
        }
        setOnboardingLink(url.href);
        setFlowMessage({ tone: 'info', text: 'Your secure setup link is ready. Select Continue on PayPal to grant permissions, then return here. Your status will refresh automatically.' });
        await loadConnection();
        if (window.self === window.top) window.location.assign(url.href);
        setBusy(null);
      } else {
        throw new Error("PayPal didn't return a signup link. Please try again.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start PayPal connection.';
      setFlowMessage({ tone: 'error', text: message });
      toast.error(message);
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
      setFlowMessage({ tone: 'success', text: 'Your PayPal account is disconnected. You can reconnect at any time.' });
      toast.success('Your PayPal account has been disconnected.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not disconnect PayPal.';
      setFlowMessage({ tone: 'error', text: message });
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  if (!user || (enabled === null && !capabilityError) || (enabled === false && !showWhenDisabled)) return null;

  const reasons = connection?.action_reasons ?? [];
  const emailUnconfirmed = reasons.includes('primary_email_unconfirmed');
  const notReceivable = reasons.includes('payments_receivable_false');
  const needsPermissions = reasons.includes('required_permissions_missing') || reasons.includes('oauth_not_active') || reasons.includes('vetting_pending');
  const status = connection?.onboarding_status ?? null;
  const canReconnect = status === 'disconnected' || status === 'revoked';

  // Onboarding status PayPal requires sellers to see: account ID, granted
  // scopes, and the state of each vetted feature (IWT pp.4-6).
  const grantedScopes = connection?.oauth_scopes ?? [];
  const featureNotices = sellerVettingNotices({
    acdcVettingStatus: connection?.acdc_vetting_status,
    vaultingStatus: connection?.vaulting_status,
    grantedScopes,
  });

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

  // PayPal confirmed onboarding by webhook but withholds the status API from
  // this app, so there are no itemised scopes to show. The recorded connection
  // is the fact; don't present it as unfinished.
  const permissionsLabel = webhookConfirmed && !grantedScopes.length
    ? 'Permissions confirmed by PayPal (itemised list not available)'
    : connection?.merchant_id
      ? `Permissions granted to Vendibook (${grantedScopes.length})`
      : 'PayPal permissions awaiting confirmation';

  const statusLabel = !connection
    ? 'Not connected'
    : webhookConfirmed
      ? 'Connected — confirmed by PayPal'
    : status === 'ready'
      ? 'Ready to receive payments'
      : status === 'link_sent'
        ? 'Connecting — not finished'
        : status === 'onboarding'
          ? 'Checking status'
      : status === 'disconnected'
            ? 'Disconnected'
            : status === 'revoked'
              ? 'Access revoked'
            : 'Action required';

  // Real, backend-derived readiness. Nothing is marked complete on guesswork.
  const step = (done: boolean, blocked: boolean) =>
    done ? 'is-done' : blocked ? 'is-blocked' : 'is-pending';
  const checklist: Array<{ label: string; state: string }> = [
    {
      label: 'PayPal Business account connected',
      state: step(Boolean(connection?.merchant_id) && !canReconnect, canReconnect),
    },
    { label: 'Primary email confirmed', state: step(connection?.primary_email_confirmed === true, emailUnconfirmed) },
    { label: 'Payments receivable', state: step(connection?.payments_receivable === true, notReceivable) },
    { label: 'Required permissions granted', state: step(connection?.consent_granted === true && grantedScopes.length > 0, needsPermissions) },
    { label: 'Online checkout enabled on your listings', state: step(isReady, false) },
  ];

  const onboardingFallback = onboardingLink ? <a href={onboardingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">Continue on PayPal <ExternalLink className="h-4 w-4" /></a> : null;

  if (variant === 'pill') {
    const hasConnection = Boolean(connection) && !canReconnect;
    const label = isReady ? 'Connected to PayPal' : hasConnection ? 'Finish PayPal setup' : 'Connect to PayPal';
    return (
      <div className="shrink-0 space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label={label} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0070ba] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#005ea6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] focus-visible:ring-offset-2">
              {isReady && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              <span>{isReady ? 'Connected to' : hasConnection ? 'Finish' : 'Connect to'}</span>
              <PayPalWordmark surface="dark" className="h-4" />
              {hasConnection && !isReady && <span>setup</span>}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-4">
            <div className="space-y-3">
              {onboardingFallback}
              <div>
                <h2 className="text-sm font-semibold">{isReady ? 'Ready to receive payments' : 'Receive payments with PayPal'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{isReady ? connection?.paypal_email || 'Your PayPal Business account is connected.' : 'Connect your PayPal Business account to accept online payments on eligible listings.'}</p>
                {hasConnection && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status: <span className="text-foreground/85">{statusLabel}</span>
                  </p>
                )}
              </div>
              {hasConnection && (
                <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    PayPal account ID:{' '}
                    <span className="break-all font-mono text-[11px] text-foreground/85">
                      {connection?.merchant_id ?? 'Not reported by PayPal yet'}
                    </span>
                  </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">
                        {permissionsLabel}
                      </summary>
                    {grantedScopes.length > 0 ? (
                      <ul className="mt-2 space-y-1 break-all text-[11px] text-muted-foreground">
                        {grantedScopes.map((scope) => (
                          <li key={scope}>{scope}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {webhookConfirmed
                          ? 'PayPal confirmed your account finished onboarding and granted Vendibook permission, but does not publish the itemised permission list to this app.'
                          : "PayPal hasn't reported any granted permissions yet. Check your status, or reconnect to grant them."}
                      </p>
                    )}
                  </details>
                  {featureNotices.map((notice) => (
                    <p
                      key={notice.text}
                      className={`text-xs ${
                        notice.tone === 'warn'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {notice.text}
                    </p>
                  ))}
                </div>
              )}
              {capabilityError && <p role="alert" className="text-xs text-destructive">{capabilityError}</p>}
              {enabled === false && <p className="text-xs text-muted-foreground">PayPal setup is currently unavailable. Please check back later.</p>}
              {flowMessage && <p role={flowMessage.tone === 'error' ? 'alert' : 'status'} className="text-xs">{flowMessage.text}</p>}
              {emailUnconfirmed && <p className="text-xs text-amber-700">{emailWarning}</p>}
              {notReceivable && <p className="text-xs text-amber-700">{receivableWarning}</p>}
              {enabled && !hasConnection && <>
                <label className="flex items-start gap-2 text-xs leading-relaxed">
                  <input type="checkbox" className="mt-1" checked={sellerTermsAccepted} onChange={(e) => setSellerTermsAccepted(e.target.checked)} disabled={!!busy} />
                  <span>I accept the <a href="/legal/seller-payment-terms" target="_blank" rel="noreferrer" className="underline">Seller Payment Terms</a> and consent to <a href="/legal/esign" target="_blank" rel="noreferrer" className="underline">electronic records and signatures</a>.</span>
                </label>
                <Button className="w-full rounded-full bg-[#0070ba] text-white hover:bg-[#005ea6]" disabled={!!busy || !sellerTermsAccepted} onClick={connect}>{busy === 'connect' ? 'Connecting…' : 'Get started with PayPal'}</Button>
              </>}
              {enabled && hasConnection && <div className="space-y-1">
                {!isReady && connection?.referral_url && <Button asChild variant="ghost" className="w-full justify-start"><a href={connection.referral_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Continue on PayPal</a></Button>}
                <Button variant="ghost" className="w-full justify-start" disabled={!!busy} onClick={refreshStatus}><RefreshCw className={`mr-2 h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />Check status</Button>
                <Button variant="ghost" className="w-full justify-start text-destructive" disabled={!!busy} onClick={disconnect}><Unlink className="mr-2 h-4 w-4" />Disconnect</Button>
              </div>}
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs">
                <Link to="/dashboard/payments/setup" className="underline underline-offset-4">Payment settings</Link>
                <Link to="/dashboard/payments" className="underline underline-offset-4">Payments &amp; learn more</Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground sm:text-right">{isReady ? 'Ready to receive payments' : hasConnection ? 'Complete setup to receive payments' : 'Connect to receive payments'}</p>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div className="v2-paypal-panel space-y-4">
        {onboardingFallback}
        {capabilityError && (
          <div className="v2-paypal-message is-error" role="alert">
            <XCircle />
            <span>{capabilityError}</span>
            <button type="button" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        {flowMessage && (
          <div className={`v2-paypal-message is-${flowMessage.tone}`} role={flowMessage.tone === 'error' ? 'alert' : 'status'}>
            {flowMessage.tone === 'success' ? <CheckCircle2 /> : flowMessage.tone === 'error' ? <XCircle /> : <Circle />}
            <span>{flowMessage.text}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`v2-status ${isReady ? 'is-ok' : connection ? 'is-warn' : ''}`}>
            {isReady ? <CheckCircle2 /> : connection ? <AlertTriangle /> : <CreditCard />}
            {statusLabel}
          </span>
          {connection && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium">
                PayPal account ID and granted permissions
              </summary>
              <p className="mt-2 break-all">
                PayPal account ID: {connection.merchant_id ?? 'Not reported by PayPal yet'}
              </p>
               <p className="mt-1">{permissionsLabel}</p>
               {grantedScopes.length > 0 && (
                 <ul className="mt-2 space-y-1 break-all">
                   {grantedScopes.map((scope) => (
                     <li key={scope}>{scope}</li>
                   ))}
                 </ul>
               )}
            </details>
          )}
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
          <SellerBusinessAccountHelp className="v2-paypal-note" compact />
        )}
        {emailUnconfirmed && <p className="v2-paypal-warn">{emailWarning}</p>}
        {notReceivable && <p className="v2-paypal-warn">{receivableWarning}</p>}
        {featureNotices.map((notice) => (
          <p
            key={notice.text}
            className={notice.tone === 'warn' ? 'v2-paypal-warn' : 'v2-paypal-note'}
          >
            {notice.text}
          </p>
        ))}
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
        {status === 'revoked' && (
          <p className="v2-paypal-warn">
            PayPal access was revoked. Reconnect your Business account to complete payment readiness.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {(!connection || canReconnect) && (
            <>
            <label className="mb-3 flex items-start gap-2 text-left text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sellerTermsAccepted}
                onChange={(e) => setSellerTermsAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I accept the{' '}
                <a href="/legal/seller-payment-terms" target="_blank" rel="noreferrer" className="underline">Seller Payment Terms</a>{' '}
                and consent to{' '}
                <a href="/legal/esign" target="_blank" rel="noreferrer" className="underline">electronic records and signatures</a>.
              </span>
            </label>
            <button
              type="button"
              className="v2-paypal-cta"
              onClick={connect}
              disabled={busy === 'connect' || enabled === false || !sellerTermsAccepted}
            >
              {busy === 'connect'
                ? 'Opening PayPal…'
                : canReconnect
                  ? 'Reconnect PayPal'
                  : 'Connect PayPal'}
            </button>
            </>
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
        {onboardingFallback}
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
              You&apos;ll be taken to PayPal to connect or create your account and approve the connection.
            </p>
            <SellerBusinessAccountHelp className="mt-2" compact />
                        <label className="mb-3 flex items-start gap-2 text-left text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sellerTermsAccepted}
                onChange={(e) => setSellerTermsAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I accept the{' '}
                <a href="/legal/seller-payment-terms" target="_blank" rel="noreferrer" className="underline">Seller Payment Terms</a>{' '}
                and consent to{' '}
                <a href="/legal/esign" target="_blank" rel="noreferrer" className="underline">electronic records and signatures</a>.
              </span>
            </label>
            <Button
              size="sm"
              className="mt-3"
              onClick={connect}
              disabled={busy === 'connect' || enabled === false || !sellerTermsAccepted}
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
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium">PayPal permissions and card approval</summary>
              <ul className="mt-2 space-y-1 break-all">
                {grantedScopes.map(scope => <li key={scope}>{scope}</li>)}
              </ul>
            </details>
            {featureNotices.map((notice) => (
              <p
                key={notice.text}
                className={`mt-2 text-xs ${
                  notice.tone === 'warn'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground'
                }`}
              >
                {notice.text}
              </p>
            ))}

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
