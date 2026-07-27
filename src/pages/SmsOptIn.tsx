import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Mail, Phone } from 'lucide-react';
import SEO from '@/components/SEO';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import { SMS_PRIVACY_URL, SMS_TERMS_URL } from '@/lib/sms/consent';

/**
 * /sms-opt-in — Public web-form SMS opt-in page.
 *
 * Purpose: dedicated, reviewer-facing consent capture for Vendibook's
 * toll-free SMS verification. Every element the carrier reviewer needs is
 * on this page above the fold (branding, contact, unchecked checkbox, full
 * disclosure, STOP/HELP, rate notice, legal links, exact button label).
 *
 * The consent record is written by the sms-record-consent edge function,
 * which enforces server-side validation, phone normalization, suppression
 * respect, and per-IP abuse guards.
 */

// Exact disclosure copy required by the toll-free reviewer. Do not shorten.
const DISCLOSURE_TEXT =
  'By checking this box and selecting "Sign Up for Text Updates," you agree to receive recurring automated text messages from Vendibook at the mobile number provided, including account notifications, customer-care messages, and listing or transaction updates. Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. Consent is not a condition of purchase.';

const SUPPORT_EMAIL = 'support@vendibook.com';
const SUPPORT_PHONE_DISPLAY = '(725) 755-9598';

const SmsOptIn: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { requiresVerification: boolean }>(null);

  const validate = (): string | null => {
    if (!firstName.trim() || !lastName.trim()) return 'Enter your first and last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!normalizeNanpToE164(phone)) return 'Enter a valid US or Canadian mobile number.';
    if (!consent) return 'Please check the box to confirm you want text updates from Vendibook.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('sms-record-consent', {
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone,
          source: 'web_form',
          consent: true,
          marketing: false,
          disclosureText: DISCLOSURE_TEXT,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      });
      if (fnErr) throw fnErr;
      setDone({
        requiresVerification: Boolean((data as { requires_verification?: boolean })?.requires_verification),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not save your consent right now. Please try again.';
      const friendly = /rate_limited/i.test(raw)
        ? 'Too many requests from this network. Please try again in a few minutes.'
        : /invalid_phone/i.test(raw)
        ? 'Enter a valid US or Canadian mobile number.'
        : /consent_required/i.test(raw)
        ? 'Please check the box to confirm you want text updates from Vendibook.'
        : raw;
      setError(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO
        title="Text message updates from Vendibook | Opt in"
        description="Opt in to receive account, customer-care, and transaction text messages from Vendibook. Consent is not a condition of purchase. Reply STOP to opt out."
        canonical="https://vendibook.com/sms-opt-in"
      />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
          {/* Brand + sender identification */}
          <header className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={vendibookLogo} alt="Vendibook" className="h-9 w-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">Vendibook</p>
                <p className="text-xs text-muted-foreground">Text message opt-in</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 hover:text-foreground">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              <div className="mt-1 flex items-center gap-1.5 sm:justify-end">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                <a href={`tel:+17257559598`} className="underline underline-offset-2 hover:text-foreground">
                  {SUPPORT_PHONE_DISPLAY}
                </a>
                <span className="ml-1">(Mon–Fri, 9a–5p AZ)</span>
              </div>
            </div>
          </header>

          <section
            className="rounded-2xl border border-border/70 bg-card/40 p-6 shadow-sm sm:p-8"
            aria-labelledby="sms-optin-heading"
          >
            <h1 id="sms-optin-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Vendibook Text Message Updates
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Opt in to receive Vendibook text messages relevant to your use of the marketplace:
              account notifications, customer-care follow-up, listing and transaction updates, and
              delivery or status notifications when applicable. This program does not send
              promotional marketing texts.
            </p>

            {done ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm"
                data-testid="sms-optin-success"
              >
                <div className="mb-2 flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                  <span className="font-medium">You&apos;re enrolled in Vendibook text updates.</span>
                </div>
                <p className="text-muted-foreground">
                  We recorded your consent for <span className="font-medium text-foreground">{phone}</span>.
                  {done.requiresVerification && (
                    <>
                      {' '}Because you&apos;re not signed in, recurring messages will start after a
                      one-time verification is completed for this number.
                    </>
                  )}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Reply <span className="font-mono font-medium text-foreground">STOP</span> to any Vendibook text to opt out at any time.</li>
                  <li>Reply <span className="font-mono font-medium text-foreground">HELP</span> for help, or email <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">{SUPPORT_EMAIL}</a>.</li>
                  <li>Message frequency varies. Message and data rates may apply.</li>
                </ul>
                <div className="mt-4">
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/">Return to Vendibook</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5" data-testid="sms-optin-form" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      style={{ fontSize: '16px' }}
                      data-testid="sms-optin-first-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      style={{ fontSize: '16px' }}
                      data-testid="sms-optin-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ fontSize: '16px' }}
                    data-testid="sms-optin-email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(555) 555-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{ fontSize: '16px' }}
                    data-testid="sms-optin-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    US or Canadian mobile number. Providing a number by itself does not opt you in —
                    you must also check the box below.
                  </p>
                </div>

                {/* Single, separate, unchecked SMS consent checkbox + full disclosure above the button. */}
                <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                  <label htmlFor="sms-consent" className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      id="sms-consent"
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      aria-describedby="sms-consent-disclosure"
                      data-testid="sms-optin-consent"
                    />
                    <span
                      id="sms-consent-disclosure"
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      {DISCLOSURE_TEXT}{' '}
                      <a
                        href={SMS_TERMS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 text-foreground hover:text-primary"
                      >
                        SMS Terms
                      </a>{' '}
                      and{' '}
                      <a
                        href={SMS_PRIVACY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 text-foreground hover:text-primary"
                      >
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive" data-testid="sms-optin-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={busy}
                  data-testid="sms-optin-submit"
                >
                  {busy ? 'Enrolling…' : 'Sign Up for Text Updates'}
                </Button>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Vendibook never sells or shares your mobile number or opt-in data with third
                  parties for their marketing purposes.
                </p>
              </form>
            )}
          </section>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Questions? Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>{' '}
            or call {SUPPORT_PHONE_DISPLAY}.
          </p>
        </div>
      </main>
    </>
  );
};

export default SmsOptIn;
