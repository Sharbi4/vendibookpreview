import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types for every env
const rpc = (name: string, args = {}) => (supabase as any).rpc(name, args);

/**
 * Inline mobile verification for members the full-screen prompt never walls
 * (listing hosts), used where the server still requires a verified phone,
 * e.g. creating a new listing. Same edge function and RPC as
 * PhoneVerificationPrompt.
 */
export default function InlinePhoneVerification({ onVerified }: { onVerified: () => void }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) return;
    let current = true;
    supabase.from('profiles').select('phone_number').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (current && data?.phone_number) setPhone((prev) => prev || String(data.phone_number)); });
    return () => { current = false; };
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    if (busy || cooldown > 0) return;
    const normalized = normalizeNanpToE164(phone);
    if (!normalized) { setError('Enter a valid US or Canadian mobile number.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('signup-phone-verification', {
        body: { phone: normalized, security_sms_consent: true },
      });
      let payload = data;
      if (invokeError?.context) {
        try { payload = await invokeError.context.json(); } catch { /* use generic delivery error */ }
      }
      if (payload?.retry_after) setCooldown(payload.retry_after);
      if (invokeError || !payload?.ok) throw new Error(payload?.error || 'We couldn’t send your code. Please try again.');
      setPhone(normalized); setCode(''); setStep('code'); setCooldown(60);
    } catch (e) { setError((e as Error).message || 'We couldn’t send your code.'); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const { data, error: verifyError } = await rpc('verify_signup_phone_code', { code });
      if (verifyError || !data?.ok) throw new Error(data?.error || verifyError?.message || 'Verification failed. Please try again.');
      onVerified();
    } catch (e) { setError((e as Error).message || 'Verification failed.'); }
    finally { setBusy(false); }
  }

  return (
    <form
      className="space-y-4 text-left"
      onSubmit={(e) => { e.preventDefault(); void (step === 'phone' ? sendCode() : verifyCode()); }}
    >
      {step === 'phone' ? (
        <div className="space-y-2">
          <Label htmlFor="inline-mobile">Mobile number</Label>
          <Input id="inline-mobile" type="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }} disabled={busy} required />
          <p className="text-xs text-muted-foreground">
            We’ll text you a one-time code. Message and data rates may apply. This does not sign you up for marketing texts.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="inline-code">Code sent to {phone}</Label>
          <Input id="inline-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
            value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            disabled={busy} required autoFocus />
          <div className="flex gap-4 text-xs">
            <button type="button" className="underline" disabled={busy} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Change number</button>
            <button type="button" className="underline" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>
              {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || (step === 'phone' ? cooldown > 0 || !phone.trim() : code.length !== 6)}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {step === 'phone' ? (cooldown ? `Try again in ${cooldown}s` : 'Text me a code') : 'Verify & continue'}
      </Button>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" aria-hidden /> Your number is not shown on your listing or profile.
      </p>
    </form>
  );
}
