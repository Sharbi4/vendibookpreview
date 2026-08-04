import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSmsSubscription } from "@/hooks/useSmsSubscription";
import { supabase } from "@/integrations/supabase/client";
import { SmsConsentField } from "@/components/sms/SmsConsentField";
import { SMS_CONSENT_DISCLOSURE } from "@/lib/sms/consent";
import { normalizeNanpToE164 } from "@/lib/sms/phone";
import { toast } from "sonner";

const DISMISS_KEY = "vb_phone_verify_dismissed_until_v1";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24; // 24h
// Verification is only requested during the signup window (fresh accounts).
const SIGNUP_WINDOW_MS = 1000 * 60 * 60 * 24; // 24h after account creation

const formatWait = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.ceil(seconds / 60);
  return `${m} minute${m === 1 ? "" : "s"}`;
};

/** Reads the JSON body of a failed edge function response. */
const readFunctionError = async (fnError: any): Promise<any | null> => {
  try {
    const text = await fnError?.context?.text?.();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

/**
 * Post-signup phone verification (TCPA-compliant, two-step):
 *   1. Mobile number + explicit unchecked consent  -> sms-record-consent + send-sms-verification
 *   2. 6-digit OTP                                 -> verify-sms-otp
 *
 * Also covers Google / OAuth signups, which never pass through the email
 * signup form and therefore have no phone number or consent on file.
 */
export const PhoneVerificationPrompt = () => {
  const { user } = useAuth();
  const { subscription, isLoading } = useSmsSubscription(user?.id);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  // "Only require at sign up": the prompt is limited to freshly created
  // accounts (including Google/OAuth signups). Established users are never
  // nagged to verify later on.
  const isNewSignup = useMemo(() => {
    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
    if (!createdAt) return false;
    return Date.now() - createdAt < SIGNUP_WINDOW_MS;
  }, [user?.created_at]);

  // Needs verification when there is no subscription row at all (OAuth signups)
  // or the row exists but the number was never confirmed.
  const needsVerification = useMemo(
    () => !!user?.id && isNewSignup && !isLoading && !subscription?.verified,
    [user?.id, isNewSignup, isLoading, subscription?.verified],
  );

  useEffect(() => {
    if (subscription?.phone_number && !phone) setPhone(subscription.phone_number);
    if (subscription?.phone_number && subscription.opted_in && !subscription.verified) {
      setConsent(true);
      setStep("code");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.phone_number, subscription?.opted_in, subscription?.verified]);

  useEffect(() => {
    if (!needsVerification) {
      setOpen(false);
      return;
    }
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil > Date.now()) return;

    const pendingCode =
      subscription?.phone_number && subscription?.opted_in && !subscription?.verified;
    const t = setTimeout(() => setOpen(true), pendingCode ? 1200 : 6000);
    return () => clearTimeout(t);
  }, [needsVerification, subscription?.phone_number, subscription?.opted_in, subscription?.verified]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setOpen(false);
  };

  const sendCode = async () => {
    if (cooldown > 0 || sending) return;
    const e164 = normalizeNanpToE164(phone);
    if (!e164) {
      setError("Enter a valid US or Canadian mobile number.");
      return;
    }
    if (!consent) {
      setError("Please check the box to receive text messages before we send a code.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Record the affirmative consent first so the audit trail always
      // precedes the message we send.
      await supabase.functions.invoke("sms-record-consent", {
        body: {
          phone: e164,
          source: "settings",
          consent: true,
          marketing: false,
          disclosureText: SMS_CONSENT_DISCLOSURE,
          userAgent: navigator.userAgent,
          sourceUrl: window.location.href,
        },
      });

      const { data, error: fnError } = await supabase.functions.invoke("send-sms-verification", {
        body: { phone_number: e164 },
      });

      const payload = (data as any) ?? (await readFunctionError(fnError));
      if (payload?.error === "rate_limited") {
        const retry = Number(payload.retry_after_seconds) || 60;
        setCooldown(retry);
        const msg =
          payload.reason === "hourly_limit"
            ? `Too many code requests. You can try again in ${formatWait(retry)}.`
            : `Please wait ${formatWait(retry)} before requesting another code.`;
        setLimitMessage(msg);
        toast.error(msg);
        setStep("code");
        return;
      }
      if (fnError || payload?.error) {
        throw new Error(payload?.error || fnError?.message);
      }
      setLimitMessage(null);
      setCooldown(Number(payload?.resend_available_in) || 60);
      toast.success("Code sent — check your phone.");
      setStep("code");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-sms-otp", {
        body: { code },
      });
      if (fnError || (data as any)?.error) {
        throw new Error((data as any)?.error || fnError?.message);
      }
      toast.success("Phone verified.");
      localStorage.removeItem(DISMISS_KEY);
      setOpen(false);
    } catch (e: any) {
      const msg = e?.message === "incorrect_code" ? "Wrong code — try again" : e?.message;
      toast.error(msg || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (!needsVerification) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "phone" ? (
              <Phone className="h-5 w-5 text-primary" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            {step === "phone" ? "Verify your mobile number" : "Enter your code"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "A verified number protects your account and lets us reach you about bookings, payments, and pickups."
              : `We sent a 6-digit code to ${normalizeNanpToE164(phone) || phone}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="pt-1">
            <SmsConsentField
              phone={phone}
              onPhoneChange={(v) => { setPhone(v); setError(null); }}
              consent={consent}
              onConsentChange={(v) => { setConsent(v); setError(null); }}
              error={error ?? undefined}
              testIdPrefix="verify-sms"
            />
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <Label htmlFor="verify-code">6-digit code</Label>
            <Input
              id="verify-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              style={{ fontSize: "24px" }}
              data-testid="verify-sms-code-input"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Wrong number? Edit it
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || cooldown > 0}
                className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:no-underline"
                data-testid="verify-sms-resend"
              >
                {sending
                  ? "Resending…"
                  : cooldown > 0
                    ? `Resend in ${formatWait(cooldown)}`
                    : "Resend code"}
              </button>
            </div>
            {limitMessage && (
              <p className="text-xs text-muted-foreground" role="status">
                {limitMessage}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Codes expire shortly. You can request up to 5 codes per hour.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={dismiss}>Not now</Button>
          {step === "phone" ? (
            <Button onClick={sendCode} disabled={sending || !phone.trim()} data-testid="verify-sms-send">
              {sending ? "Sending…" : "Send code"}
            </Button>
          ) : (
            <Button onClick={verifyCode} disabled={verifying || code.length !== 6} data-testid="verify-sms-submit">
              {verifying ? "Verifying…" : "Verify"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationPrompt;
