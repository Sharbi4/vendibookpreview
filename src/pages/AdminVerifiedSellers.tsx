import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verified Seller operations.
 *
 * Every action is executed by the `verified-seller-admin` edge function, which
 * re-checks the admin role server-side. This page deliberately shows only
 * sanitized operational data — no Plaid PII, documents, webhook bodies, tokens,
 * IP addresses or user agents.
 */

interface Row {
  user_id: string;
  status: string;
  identity_status: string | null;
  payment_state: string;
  verified_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  retry_count: number;
  retry_allowance: number;
  last_reason_code: string | null;
  badge_active: boolean;
  updated_at: string;
  profile: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null;
}

interface Detail {
  record: Row;
  attempts: {
    plaid_verification_id: string;
    previous_verification_id: string | null;
    status: string | null;
    reason_code: string | null;
    completed_at: string | null;
    created_at: string;
  }[];
  payments: {
    id: string;
    reference: string;
    state: string;
    amount_cents: number;
    currency: string;
    paypal_order_id: string | null;
    paypal_capture_id: string | null;
    paypal_refund_id: string | null;
    error_code: string | null;
    authorized_at: string | null;
    captured_at: string | null;
    voided_at: string | null;
    refunded_at: string | null;
    created_at: string;
  }[];
  terms: { terms_version: string; accepted_at: string }[];
  events: {
    provider: string;
    event_type: string;
    outcome: string | null;
    processed_at: string;
  }[];
}

type ConfirmAction = 'refund' | 'revoke' | 'restore' | 'retry-capture' | 'retry-void' | 'grant-retry';

const NEEDS_REASON: ConfirmAction[] = ['refund', 'revoke', 'restore'];

const CONFIRM_COPY: Record<ConfirmAction, { title: string; body: string; cta: string }> = {
  refund: {
    title: 'Refund $19.99 and remove the badge',
    body: 'This refunds the captured payment through PayPal and makes the badge ineligible in the same operation. It cannot be undone.',
    cta: 'Refund and remove badge',
  },
  revoke: {
    title: 'Revoke this badge',
    body: 'The badge disappears from every public surface immediately. The payment is not refunded by this action.',
    cta: 'Revoke badge',
  },
  restore: {
    title: 'Restore this badge',
    body: 'The badge only comes back if identity succeeded and the payment is still captured and unrefunded. Otherwise only the revocation is cleared.',
    cta: 'Restore badge',
  },
  'retry-capture': {
    title: 'Capture the open authorization',
    body: 'This moves money: the held $19.99 is captured. Allowed only when the identity check succeeded.',
    cta: 'Capture payment',
  },
  'retry-void': {
    title: 'Void the open authorization',
    body: 'This releases the hold. The seller is not charged.',
    cta: 'Void authorization',
  },
  'grant-retry': {
    title: 'Grant one extra retry',
    body: 'Gives this seller one more support-approved identity attempt.',
    cta: 'Grant retry',
  },
};

const STATUSES = [
  'not_started',
  'terms_accepted',
  'awaiting_authorization',
  'identity_in_progress',
  'pending_review',
  'payment_required',
  'verified',
  'failed',
  'canceled',
  'expired',
  'revoked',
];

const PAYMENT_STATES = ['none', 'created', 'authorized', 'captured', 'voided', 'refunded', 'failed'];

const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const AdminVerifiedSellers = () => {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [paymentState, setPaymentState] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; userId: string } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session?.user) return setAllowed(false);
      const { data } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin',
      });
      setAllowed(data === true);
    })();
  }, []);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('verified-seller-admin', { body });
    if (error || (data as { error?: string })?.error) {
      throw new Error((data as { message?: string })?.message || error?.message || 'That action was rejected.');
    }
    return data as Record<string, unknown>;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke({
        action: 'list',
        status: status === 'all' ? null : status,
        payment_state: paymentState === 'all' ? null : paymentState,
      });
      setRows((data.rows as Row[]) ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [invoke, status, paymentState]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const openDetail = async (userId: string) => {
    setBusy(true);
    try {
      setDetail((await invoke({ action: 'detail', user_id: userId })) as unknown as Detail);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: ConfirmAction | 'refresh', userId: string) => {
    setBusy(true);
    try {
      const result = await invoke({
        action,
        user_id: userId,
        ...(NEEDS_REASON.includes(action as ConfirmAction) ? { reason } : {}),
      });
      toast.success((result.message as string) ?? 'Done.');
      setConfirm(null);
      setReason('');
      await load();
      await openDetail(userId);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.profile?.email?.toLowerCase().includes(q) ||
        `${r.profile?.first_name ?? ''} ${r.profile?.last_name ?? ''}`.toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (allowed === false) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Verified Seller admin" description="Admin only." noindex />
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-3 text-lg font-semibold text-foreground">Admins only</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You don&rsquo;t have access to Verified Seller operations.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Verified Seller operations — Vendibook admin"
        description="Verified Seller verification and payment lifecycle."
        noindex
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              Verified Seller operations
            </h1>
            <p className="text-sm text-muted-foreground">
              Identity and payment lifecycle. Sanitized data only — no identity documents or
              provider credentials are ever shown here.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="min-h-11">
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            Reload
          </Button>
        </header>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or user id"
              className="pl-9 text-base"
              aria-label="Search verifications"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[190px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentState} onValueChange={setPaymentState}>
            <SelectTrigger className="w-[190px]" aria-label="Filter by payment state">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment states</SelectItem>
              {PAYMENT_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading verifications…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No verifications match these filters.</p>
          ) : (
            filtered.map((row) => (
              <button
                key={row.user_id}
                type="button"
                onClick={() => openDetail(row.user_id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {row.profile?.first_name || row.profile?.last_name
                      ? `${row.profile?.first_name ?? ''} ${row.profile?.last_name ?? ''}`.trim()
                      : row.profile?.email ?? row.user_id}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {row.profile?.email ?? row.user_id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.badge_active && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Badge live
                    </Badge>
                  )}
                  <Badge variant="outline">{row.status.replace(/_/g, ' ')}</Badge>
                  <Badge variant="secondary">{row.payment_state}</Badge>
                  <span className="text-xs text-muted-foreground">{fmt(row.updated_at)}</span>
                </div>
              </button>
            ))
          )}
        </Card>
      </main>

      {/* ------------------------------------------------------------ detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification detail</DialogTitle>
            <DialogDescription>
              {detail?.record.profile?.email ?? detail?.record.user_id}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
                <Field label="Status" value={detail.record.status.replace(/_/g, ' ')} />
                <Field label="Identity" value={detail.record.identity_status ?? '—'} />
                <Field label="Payment" value={detail.record.payment_state} />
                <Field label="Badge" value={detail.record.badge_active ? 'Live' : 'Off'} />
                <Field label="Verified" value={fmt(detail.record.verified_at)} />
                <Field
                  label="Retries"
                  value={`${detail.record.retry_count} of ${detail.record.retry_allowance}`}
                />
              </div>

              {detail.record.revoked_at && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  Revoked {fmt(detail.record.revoked_at)} — {detail.record.revoked_reason}
                </p>
              )}

              <Section title="Attempts">
                {detail.attempts.map((a) => (
                  <li key={a.plaid_verification_id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {a.status ?? 'active'}
                      {a.reason_code ? ` · ${a.reason_code}` : ''}
                      {a.previous_verification_id ? ' · retry' : ''}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{fmt(a.created_at)}</span>
                  </li>
                ))}
              </Section>

              <Section title="Payments">
                {detail.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {p.reference} · {p.state} · ${(p.amount_cents / 100).toFixed(2)} {p.currency}
                      {p.error_code ? ` · ${p.error_code}` : ''}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {fmt(p.refunded_at ?? p.voided_at ?? p.captured_at ?? p.authorized_at ?? p.created_at)}
                    </span>
                  </li>
                ))}
              </Section>

              <Section title="Terms accepted">
                {detail.terms.map((t) => (
                  <li key={t.accepted_at} className="flex justify-between gap-3">
                    <span>{t.terms_version}</span>
                    <span className="text-muted-foreground">{fmt(t.accepted_at)}</span>
                  </li>
                ))}
              </Section>

              <Section title="Audit trail">
                {detail.events.map((e) => (
                  <li key={`${e.provider}-${e.processed_at}`} className="flex justify-between gap-3">
                    <span className="truncate">
                      {e.provider} · {e.event_type}
                      {e.outcome ? ` · ${e.outcome}` : ''}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{fmt(e.processed_at)}</span>
                  </li>
                ))}
              </Section>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => runAction('refresh', detail.record.user_id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Authoritative refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm({ action: 'retry-capture', userId: detail.record.user_id })}
                >
                  Retry capture
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm({ action: 'retry-void', userId: detail.record.user_id })}
                >
                  Void hold
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm({ action: 'grant-retry', userId: detail.record.user_id })}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Grant retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm({ action: 'refund', userId: detail.record.user_id })}
                >
                  Refund
                </Button>
                {detail.record.revoked_at ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirm({ action: 'restore', userId: detail.record.user_id })}
                  >
                    <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setConfirm({ action: 'revoke', userId: detail.record.user_id })}
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Revoke
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------- confirm */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm ? CONFIRM_COPY[confirm.action].title : ''}</DialogTitle>
            <DialogDescription>{confirm ? CONFIRM_COPY[confirm.action].body : ''}</DialogDescription>
          </DialogHeader>

          {confirm && NEEDS_REASON.includes(confirm.action) && (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (recorded in the audit trail)"
              className="text-base"
              aria-label="Reason"
            />
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)} className="min-h-11">
              Cancel
            </Button>
            <Button
              className="min-h-11"
              disabled={
                busy || (confirm ? NEEDS_REASON.includes(confirm.action) && reason.trim().length < 4 : true)
              }
              onClick={() => confirm && runAction(confirm.action, confirm.userId)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {confirm ? CONFIRM_COPY[confirm.action].cta : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
    <ul className="space-y-1 rounded-lg border border-border p-3 text-xs">
      {Array.isArray(children) && children.length ? children : (
        <li className="text-muted-foreground">Nothing recorded.</li>
      )}
    </ul>
  </div>
);

export default AdminVerifiedSellers;
