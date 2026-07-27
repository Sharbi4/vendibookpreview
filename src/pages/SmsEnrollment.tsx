import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { SmsConsentField } from '@/components/sms/SmsConsentField';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import { SMS_CONSENT_DISCLOSURE } from '@/lib/sms/consent';
import { CheckCircle2 } from 'lucide-react';

/**
 * /sms — Public SMS enrollment page.
 *
 * Anyone (including toll-free verification reviewers) can view this page
 * without signing in. Submitting the form only records affirmative consent
 * when the checkbox is checked AND the number validates. Unauthenticated
 * enrollment lands as pending_verification — no recurring SMS until a
 * separate verification step confirms the number.
 */
const SmsEnrollment: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { authenticated: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('Please check the box to confirm you want text updates.');
      return;
    }
    if (!normalizeNanpToE164(phone)) {
      setError('Enter a valid US or Canadian mobile number.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('sms-record-consent', {
        body: {
          phone,
          source: 'sms_page',
          consent: true,
          marketing: false,
          disclosureText: SMS_CONSENT_DISCLOSURE,
          userAgent: navigator.userAgent,
        },
      });
      if (fnErr) throw fnErr;
      const requiresVerification = Boolean((data as { requires_verification?: boolean })?.requires_verification);
      setDone({ authenticated: !requiresVerification });
    } catch (err) {
      setError((err as Error).message || 'Could not save your enrollment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO
        title="Text updates from Vendibook | Enroll"
        description="Enroll in optional Vendibook transactional text messages about your account, bookings, payments, and support."
        canonical="https://vendibook.com/sms"
      />
      <main className="mx-auto max-w-lg px-4 py-14">
        <div className="rounded-2xl border border-border/70 bg-card/40 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <img src={vendibookLogo} alt="Vendibook" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-foreground">Text updates</span>
          </div>

          {done ? (
            <div className="text-center space-y-3 py-4" role="status" aria-live="polite">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-xl font-semibold">You&apos;re enrolled</h1>
              <p className="text-sm text-muted-foreground">
                {done.authenticated
                  ? 'Vendibook will now send transactional text updates to your mobile number. Reply STOP any time to opt out.'
                  : 'We recorded your request. To activate recurring texts, sign in to Vendibook so we can verify the number belongs to your account.'}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" data-testid="sms-page-form">
              <h1 className="text-xl font-semibold">Get Vendibook updates by text</h1>
              <p className="text-sm text-muted-foreground">
                Optional transactional text messages about your account, bookings, payments,
                required documents, listings, pickup or delivery, and customer support.
              </p>
              <SmsConsentField
                phone={phone}
                onPhoneChange={setPhone}
                consent={consent}
                onConsentChange={setConsent}
                error={error ?? undefined}
                testIdPrefix="sms-page"
              />
              <Button type="submit" className="w-full" disabled={busy} data-testid="sms-page-submit">
                {busy ? 'Enrolling…' : 'Enroll in text updates'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Consent is not a condition of using Vendibook.
              </p>
            </form>
          )}
        </div>
      </main>
    </>
  );
};

export default SmsEnrollment;
