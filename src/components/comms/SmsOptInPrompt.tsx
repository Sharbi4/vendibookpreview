import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSmsSubscription } from "@/hooks/useSmsSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DISMISS_KEY = "vb_sms_opt_dismissed_v1";

/**
 * Two-step TCPA-compliant SMS opt-in:
 *   1. Phone + consent → send-sms-verification (Twilio OTP)
 *   2. 6-digit code → verify-sms-otp → subscription.verified = true
 */
export const SmsOptInPrompt = () => {
  const { user } = useAuth();
  const { subscription } = useSmsSubscription(user?.id);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (subscription === undefined) return;
    if (subscription?.verified && subscription?.opted_in) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(t);
  }, [user?.id, subscription]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const sendCode = async () => {
    if (!phone.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-verification", {
        body: { phone_number: phone.trim() },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Code sent! Check your phone.");
      setStep("code");
    } catch (e: any) {
      toast.error(e.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", { body: { code } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Phone verified! You'll get instant SMS alerts.");
      localStorage.setItem(DISMISS_KEY, "1");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message === "incorrect_code" ? "Wrong code — try again" : (e.message || "Verification failed"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "phone" ? <Phone className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
            {step === "phone" ? "Get instant SMS alerts" : "Enter your code"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "Booking requests, payouts, and time-sensitive updates — delivered the moment they happen."
              : `We sent a 6-digit code to ${phone}. Enter it below to confirm.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="opt-phone">Mobile number</Label>
            <Input
              id="opt-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              By tapping "Send code" you agree to receive automated transactional and alert messages
              from Vendibook at the number above. Msg & data rates may apply. Frequency varies. Reply
              STOP to unsubscribe, HELP for help. Consent is not a condition of purchase.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <Label htmlFor="opt-code">6-digit code</Label>
            <Input
              id="opt-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <button onClick={() => { setStep("phone"); setCode(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Wrong number? Edit it
            </button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={dismiss}>Not now</Button>
          {step === "phone" ? (
            <Button onClick={sendCode} disabled={sending || !phone.trim()}>
              {sending ? "Sending…" : "Send code"}
            </Button>
          ) : (
            <Button onClick={verifyCode} disabled={verifying || code.length !== 6}>
              {verifying ? "Verifying…" : "Verify"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
