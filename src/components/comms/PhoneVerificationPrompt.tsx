import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeNanpToE164 } from "@/lib/sms/phone";
import "./signup-phone.css";

type Status = { required: boolean; phone?: string; pending?: boolean; retry_after?: number };
const rpc = (name: string, args = {}) => (supabase as any).rpc(name, args);

export default function PhoneVerificationPrompt({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState<Status | null>(null);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [retry, setRetry] = useState(0);

  const check = useCallback(async () => {
    const { data, error } = await rpc("signup_phone_status");
    if (error || !data || typeof data.required !== "boolean") throw new Error("We couldn’t check your verification status. Please try again.");
    return data as Status;
  }, []);

  useEffect(() => {
    let current = true;
    setStatus(null); setCheckedUser(null); setError(""); setCode("");
    if (!user) return;
    check().then(data => {
      if (!current) return;
      setStatus(data); setCheckedUser(user.id);
      setPhone(data.phone || user.user_metadata?.phone_number || "");
      setStep(data.pending ? "code" : "phone");
      setCooldown(data.retry_after || 0);
    }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [user?.id, retry, check]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    if (busy || cooldown > 0) return;
    const normalized = normalizeNanpToE164(phone);
    if (!normalized) { setError("Enter a valid US or Canadian mobile number."); return; }
    setBusy(true); setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("signup-phone-verification", {
        body: { phone: normalized, security_sms_consent: true },
      });
      let payload = data;
      if (invokeError?.context) {
        try { payload = await invokeError.context.json(); } catch { /* use generic delivery error */ }
      }
      if (payload?.retry_after) setCooldown(payload.retry_after);
      if (invokeError || !payload?.ok) throw new Error(payload?.error || "We couldn’t send your code. Please try again.");
      setPhone(normalized); setCode(""); setStep("code"); setCooldown(60);
    } catch (e: any) { setError(e.message || "We couldn’t send your code."); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const { data, error: verifyError } = await rpc("verify_signup_phone_code", { code });
      if (verifyError || !data?.ok) throw new Error(data?.error || verifyError?.message || "Verification failed. Please try again.");
      const verified = await check();
      if (verified.required) throw new Error("We couldn’t confirm verification. Please try again.");
      setStatus(verified);
      // The original URL remains in place, including checkout query parameters.
    } catch (e: any) { setError(e.message || "Verification failed."); }
    finally { setBusy(false); }
  }

  // Legal/help/password-recovery pages remain accessible. Marketplace actions are also guarded on the server.
  const publicHelp = ["/terms", "/privacy", "/sms-terms", "/help", "/help-center", "/reset-password"].some(path => pathname === path || pathname.startsWith(path + "/"));
  if (publicHelp || (!isLoading && !user)) return <>{children}</>;
  if (user && checkedUser === user.id && status?.required === false) return <>{children}</>;

  const checking = isLoading || !status || checkedUser !== user?.id;
  return <main className="signup-phone-page">
    <section className="signup-phone-card" aria-labelledby="signup-phone-title">
      <a href="/" className="signup-phone-brand">VENDIBOOK</a>
      <div className="signup-phone-icon"><Smartphone size={26} aria-hidden /></div>
      <p className="signup-phone-eyebrow">One last step</p>
      <h1 id="signup-phone-title">{checking ? "Securing your account" : step === "phone" ? "A safer marketplace starts with you." : "Check your messages."}</h1>
      <p className="signup-phone-copy">{checking ? "Checking your account verification." : step === "phone"
        ? "Verify your mobile number to finish signup. It helps us keep fake accounts out and real conversations moving."
        : "Enter the six-digit code we sent to " + phone + "."}</p>
      {checking ? <>
        {!error && <Loader2 className="animate-spin mx-auto mt-6" aria-label="Checking verification" />}
        {error && <><p className="signup-phone-error" role="alert">{error}</p><button className="signup-phone-primary" onClick={() => setRetry(n => n + 1)}>Try again</button></>}
      </> : <form onSubmit={e => { e.preventDefault(); void (step === "phone" ? sendCode() : verifyCode()); }}>
        {step === "phone" ? <>
          <label htmlFor="signup-mobile">Mobile number</label>
          <input id="signup-mobile" type="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone} onChange={e => { setPhone(e.target.value); setError(""); }} disabled={busy} required aria-describedby="signup-sms-disclosure" />
          <p id="signup-sms-disclosure" className="signup-phone-note">By selecting “Text me a code,” you request a one-time account verification text. Message and data rates may apply. This does not sign you up for marketing or other text updates.</p>
        </> : <>
          <label htmlFor="signup-code">Verification code</label>
          <input id="signup-code" className="signup-phone-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} disabled={busy} required autoFocus />
          <p className="signup-phone-note">Your code expires after 10 minutes. Never share it with anyone.</p>
        </>}
        {error && <p className="signup-phone-error" role="alert">{error}</p>}
        <button type="submit" className="signup-phone-primary" disabled={busy || (step === "phone" ? cooldown > 0 || !phone.trim() : code.length !== 6)}>
          {busy ? <><Loader2 size={18} className="animate-spin" />{step === "phone" ? "Sending code…" : "Verifying…"}</> : <>{step === "phone" ? (cooldown ? "Try again in " + cooldown + "s" : "Text me a code") : "Verify & continue"}<ArrowRight size={18} /></>}
        </button>
        {step === "code" && <div className="signup-phone-links">
          <button type="button" disabled={busy} onClick={() => { setStep("phone"); setCode(""); setError(""); }}>Change number</button>
          <button type="button" disabled={busy || cooldown > 0} onClick={sendCode}>{cooldown ? "Resend in " + cooldown + "s" : "Resend code"}</button>
        </div>}
      </form>}
      <div className="signup-phone-trust"><ShieldCheck size={16} aria-hidden /><span>Your number is not displayed on your public profile.</span></div>
      <div className="signup-phone-links"><a href="/help">Need help?</a><button type="button" disabled={busy} onClick={() => void signOut()}>Sign out</button></div>
    </section>
  </main>;
}
