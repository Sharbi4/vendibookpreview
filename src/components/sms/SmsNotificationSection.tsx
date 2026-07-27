import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SmsConsentField } from './SmsConsentField';
import {
  SMS_CONSENT_DISCLOSURE,
  SMS_PRIVACY_URL,
  SMS_TERMS_URL,
} from '@/lib/sms/consent';
import { formatDisplayUsPhone, normalizeNanpToE164 } from '@/lib/sms/phone';

interface Pref {
  id: string;
  phone_e164: string;
  transactional_status: 'opted_in' | 'opted_out' | 'pending_verification';
  opted_in_at: string | null;
  opted_out_at: string | null;
  last_updated_at: string;
}

/**
 * "SMS notifications" section for the account notification settings page.
 * Allows viewing the current active number and toggling opt-in / opt-out.
 * Changing the number requires a NEW affirmative opt-in — consent is never
 * silently carried over from the old number.
 */
export const SmsNotificationSection: React.FC = () => {
  const { toast } = useToast();
  const [pref, setPref] = useState<Pref | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('sms_preferences')
        .select('id, phone_e164, transactional_status, opted_in_at, opted_out_at, last_updated_at')
        .eq('user_id', user.id)
        .order('last_updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPref((data as Pref | null) ?? null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const activate = async () => {
    setError(null);
    if (!consent) { setError('Please check the box to confirm.'); return; }
    if (!normalizeNanpToE164(phone)) {
      setError('Enter a valid US or Canadian mobile number.');
      return;
    }
    setBusy(true);
    try {
      const { error: e } = await supabase.functions.invoke('sms-record-consent', {
        body: {
          phone, source: 'settings', consent: true, marketing: false,
          disclosureText: SMS_CONSENT_DISCLOSURE, userAgent: navigator.userAgent,
        },
      });
      if (e) throw e;
      toast({ title: 'Text updates on' });
      setEditing(false);
      setConsent(false);
      setPhone('');
      await load();
    } catch (e) {
      setError((e as Error).message || 'Could not save.');
    } finally { setBusy(false); }
  };

  const optOut = async () => {
    if (!pref) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      await supabase
        .from('sms_preferences')
        .update({ transactional_status: 'opted_out', opted_out_at: now })
        .eq('id', pref.id);
      await supabase.from('sms_consent_events').insert({
        user_id: user?.id ?? null,
        phone_e164: pref.phone_e164,
        event_type: 'opt_out',
        source: 'settings',
      });
      toast({ title: 'Text updates off' });
      await load();
    } catch (e) {
      toast({ title: 'Could not opt out', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading SMS preferences…</div>;

  const active = pref?.transactional_status === 'opted_in';
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4" data-testid="sms-notification-section">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">SMS notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Transactional texts about your account, bookings, payments, and support.
          </p>
        </div>
        {pref && (
          <Badge variant={active ? 'default' : 'outline'}>
            {active ? 'Active' : pref.transactional_status === 'opted_out' ? 'Off' : 'Pending'}
          </Badge>
        )}
      </div>

      {pref && !editing && (
        <div className="space-y-2 text-sm">
          <div>Mobile number: <span className="font-medium">{formatDisplayUsPhone(pref.phone_e164)}</span></div>
          {pref.opted_in_at && <div className="text-xs text-muted-foreground">Opted in {new Date(pref.opted_in_at).toLocaleString()}</div>}
          {pref.opted_out_at && <div className="text-xs text-muted-foreground">Opted out {new Date(pref.opted_out_at).toLocaleString()}</div>}
          <div className="flex flex-wrap gap-2 pt-2">
            {active && <Button size="sm" variant="outline" onClick={optOut} disabled={busy}>Opt out</Button>}
            <Button size="sm" variant="outline" onClick={() => { setEditing(true); setPhone(''); setConsent(false); }}>
              {active ? 'Change number' : 'Opt in with a new number'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            Review the <a href={SMS_TERMS_URL} className="underline">SMS Terms</a> and{' '}
            <a href={SMS_PRIVACY_URL} className="underline">Privacy Policy</a>.
          </div>
        </div>
      )}

      {(!pref || editing) && (
        <div className="space-y-3">
          {editing && pref && (
            <p className="text-xs text-muted-foreground">
              Changing your mobile number requires a new affirmative opt-in. Your old number
              will remain opted out.
            </p>
          )}
          <SmsConsentField
            phone={phone}
            onPhoneChange={setPhone}
            consent={consent}
            onConsentChange={setConsent}
            error={error ?? undefined}
            testIdPrefix="sms-settings"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={activate} disabled={busy}>Turn on text updates</Button>
            {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsNotificationSection;
