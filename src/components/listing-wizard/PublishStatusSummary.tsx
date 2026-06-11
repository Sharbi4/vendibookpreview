import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, Mail, Bell, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type StatusValue = 'pending' | 'ok' | 'skipped' | 'failed';

interface StatusRow {
  key: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  status: StatusValue;
}

interface PublishStatusSummaryProps {
  listingId: string;
  hostId: string;
}

const StatusBadge: React.FC<{ status: StatusValue }> = ({ status }) => {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Queued
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Clock className="w-3.5 h-3.5" /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
      <XCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
};

export const PublishStatusSummary: React.FC<PublishStatusSummaryProps> = ({ listingId, hostId }) => {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const [listingRes, prefsRes, notifRes, emailRes] = await Promise.all([
        supabase.from('listings').select('status, featured_enabled, featured_expires_at, pending_featured_payment, title').eq('id', listingId).maybeSingle(),
        supabase.from('notification_preferences').select('push_enabled').eq('user_id', hostId).maybeSingle(),
        supabase.from('notifications').select('id, title, created_at').eq('user_id', hostId).eq('link', `/listing/${listingId}`).order('created_at', { ascending: false }).limit(5),
        supabase.from('email_send_log').select('status, created_at, error_message').ilike('message_id', `%featured-activated-${listingId}%`).order('created_at', { ascending: false }).limit(1)]);

      if (cancelled) return;

      const listing: any = listingRes.data;
      const prefs: any = prefsRes.data;
      const notifs = notifRes.data ?? [];
      const emailRow: any = emailRes.data?.[0];

      const isPublished = listing?.status === 'published';
      const featuredOn = !!listing?.featured_enabled;
      const hadPendingFeatured = !!listing?.pending_featured_payment;
      const featuredNotif = notifs.find((n: any) => /featured boost/i.test(n.title || ''));
      const pushEnabled = !!prefs?.push_enabled;

      const next: StatusRow[] = [
        {
          key: 'published',
          label: 'Listing published',
          icon: <CheckCircle2 className="w-4 h-4 text-foreground/80" />,
          detail: isPublished ? 'Live on the marketplace.' : 'Waiting for status to flip to published…',
          status: isPublished ? 'ok' : 'pending'}];

      if (hadPendingFeatured || featuredOn) {
        const expires = listing?.featured_expires_at
          ? new Date(listing.featured_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null;
        next.push({
          key: 'featured',
          label: '30-day Featured Boost',
          icon: <Star className="w-4 h-4 text-foreground/80" />,
          detail: featuredOn && expires ? `Featured until ${expires}.` : 'Activating…',
          status: featuredOn ? 'ok' : 'pending'});

        next.push({
          key: 'inapp',
          icon: <Bell className="w-4 h-4 text-foreground/80" />,
          label: 'In-app notification',
          detail: featuredNotif ? 'Sent to your notification bell.' : 'Queued for delivery…',
          status: featuredNotif ? 'ok' : 'pending'});

        const emailStatus: StatusValue = emailRow
          ? emailRow.status === 'sent'
            ? 'ok'
            : emailRow.status === 'failed' || emailRow.status === 'dlq'
              ? 'failed'
              : 'pending'
          : 'pending';
        next.push({
          key: 'email',
          icon: <Mail className="w-4 h-4 text-foreground/80" />,
          label: 'Activation email',
          detail: emailRow?.error_message
            ? emailRow.error_message
            : emailStatus === 'ok'
              ? 'Sent to your inbox.'
              : 'Queued — typically delivers within a minute.',
          status: emailStatus});

        next.push({
          key: 'push',
          icon: <Smartphone className="w-4 h-4 text-foreground/80" />,
          label: 'Push notification',
          detail: pushEnabled
            ? 'Sent to your registered devices.'
            : 'Skipped — push notifications are off in your preferences.',
          status: pushEnabled ? 'ok' : 'skipped'});
      }

      setRows(next);
    };

    check();
    // Re-poll a few times to catch the trigger settling
    const stillPending = () => rows.some((r) => r.status === 'pending');
    if (attempt < 6) {
      const t = setTimeout(() => {
        if (cancelled) return;
        setAttempt((a) => a + 1);
      }, attempt === 0 ? 1500 : 2500);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, hostId, attempt]);

  if (rows.length === 0) return null;

  return (
    <section
      className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5"
      aria-label="Publish confirmation summary"
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Publish confirmation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">What just triggered behind the scenes.</p>
        </div>
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      </header>

      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-start gap-3 p-3 rounded-xl bg-background/40 border border-white/5"
          >
            <div className="mt-0.5 shrink-0">{row.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PublishStatusSummary;
