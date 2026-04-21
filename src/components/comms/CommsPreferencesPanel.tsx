import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageSquare, Mail, Moon, Phone, Sparkles } from "lucide-react";
import { useSmsSubscription } from "@/hooks/useSmsSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuietHours {
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string | null;
}

export const CommsPreferencesPanel = () => {
  const { user } = useAuth();
  const { subscription, save, isSaving } = useSmsSubscription(user?.id);

  const [phone, setPhone] = useState("");
  const [optedIn, setOptedIn] = useState(false);
  const [acceptsTransactional, setAcceptsTransactional] = useState(true);
  const [acceptsAlerts, setAcceptsAlerts] = useState(true);
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);

  const [quiet, setQuiet] = useState<QuietHours>({
    quiet_hours_start: "21:00",
    quiet_hours_end: "08:00",
    quiet_hours_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [savingQuiet, setSavingQuiet] = useState(false);

  useEffect(() => {
    if (subscription) {
      setPhone(subscription.phone_number || "");
      setOptedIn(!!subscription.opted_in);
      setAcceptsTransactional(!!subscription.accepts_transactional);
      setAcceptsAlerts(!!subscription.accepts_alerts);
      setAcceptsMarketing(!!subscription.accepts_marketing);
    }
  }, [subscription]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("quiet_hours_start, quiet_hours_end, quiet_hours_timezone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQuiet({
          quiet_hours_start: (data.quiet_hours_start as string)?.slice(0, 5) || "21:00",
          quiet_hours_end: (data.quiet_hours_end as string)?.slice(0, 5) || "08:00",
          quiet_hours_timezone: data.quiet_hours_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      });
  }, [user?.id]);

  const [step, setStep] = useState<"idle" | "code">("idle");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const sendVerification = async () => {
    if (!phone.trim()) {
      toast.error("Enter your mobile number first");
      return;
    }
    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-verification", {
        body: { phone_number: phone.trim() },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Verification code sent");
      setStep("code");
    } catch (e: any) {
      toast.error(e.message || "Failed to send code");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", { body: { code: otp } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Phone verified ✓");
      setStep("idle");
      setOtp("");
      save({
        phone_number: phone.trim(),
        opted_in: true,
        accepts_transactional: acceptsTransactional,
        accepts_alerts: acceptsAlerts,
        accepts_marketing: acceptsMarketing,
      });
    } catch (e: any) {
      toast.error(e.message === "incorrect_code" ? "Wrong code" : (e.message || "Verification failed"));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const saveSms = () => {
    if (optedIn && !phone.trim()) {
      toast.error("Enter your mobile number to enable SMS");
      return;
    }
    if (optedIn && !subscription?.verified) {
      sendVerification();
      return;
    }
    save({
      phone_number: phone.trim(),
      opted_in: optedIn,
      accepts_transactional: acceptsTransactional,
      accepts_alerts: acceptsAlerts,
      accepts_marketing: acceptsMarketing,
    });
  };

  const saveQuietHours = async () => {
    if (!user?.id) return;
    setSavingQuiet(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        quiet_hours_start: quiet.quiet_hours_start,
        quiet_hours_end: quiet.quiet_hours_end,
        quiet_hours_timezone: quiet.quiet_hours_timezone,
      })
      .eq("id", user.id);
    setSavingQuiet(false);
    if (error) toast.error(error.message);
    else toast.success("Quiet hours saved");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How Vendi reaches you
          </CardTitle>
          <CardDescription>
            Vendi automatically picks the best channel for each message — in-app, SMS, or email.
            Configure your defaults below.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" /> Text messages (SMS)
          </CardTitle>
          <CardDescription>
            By opting in, you agree to receive automated messages from Vendibook. Msg & data rates may
            apply. Reply STOP to unsubscribe at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={optedIn} onCheckedChange={setOptedIn} id="sms-opt-in" />
              <Label htmlFor="sms-opt-in">Enable SMS</Label>
            </div>
          </div>

          <Separator />

          <Toggle
            label="Transactional alerts"
            sub="Booking confirmations, payouts, payment receipts"
            checked={acceptsTransactional}
            onChange={setAcceptsTransactional}
            disabled={!optedIn}
          />
          <Toggle
            label="Real-time alerts"
            sub="New booking requests, urgent updates"
            checked={acceptsAlerts}
            onChange={setAcceptsAlerts}
            disabled={!optedIn}
          />
          <Toggle
            label="Tips & promotions"
            sub="Optimization nudges, occasional offers"
            checked={acceptsMarketing}
            onChange={setAcceptsMarketing}
            disabled={!optedIn}
          />

          {step === "code" && (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Label htmlFor="otp-code">Enter the 6-digit code we just texted to {phone}</Label>
              <div className="flex gap-2">
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-mono tracking-[0.4em] text-center"
                />
                <Button onClick={verifyOtp} disabled={verifyingOtp || otp.length !== 6}>
                  {verifyingOtp ? "…" : "Verify"}
                </Button>
              </div>
              <button onClick={sendVerification} disabled={sendingOtp} className="text-xs text-muted-foreground hover:text-foreground underline">
                {sendingOtp ? "Resending…" : "Resend code"}
              </button>
            </div>
          )}

          {subscription?.verified && (
            <p className="text-xs text-primary flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone verified
            </p>
          )}

          <Button onClick={saveSms} disabled={isSaving || sendingOtp} className="w-full sm:w-auto">
            {isSaving ? "Saving…" : (optedIn && !subscription?.verified ? "Verify & enable SMS" : "Save SMS preferences")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4" /> Quiet hours
          </CardTitle>
          <CardDescription>
            Vendi will hold non-urgent messages until your quiet window ends. Critical alerts
            (payment, booking confirmations) always come through.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="time"
                value={quiet.quiet_hours_start || ""}
                onChange={(e) => setQuiet((q) => ({ ...q, quiet_hours_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="time"
                value={quiet.quiet_hours_end || ""}
                onChange={(e) => setQuiet((q) => ({ ...q, quiet_hours_end: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                value={quiet.quiet_hours_timezone || ""}
                onChange={(e) => setQuiet((q) => ({ ...q, quiet_hours_timezone: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={saveQuietHours} disabled={savingQuiet} variant="outline">
            {savingQuiet ? "Saving…" : "Save quiet hours"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Email & in-app
          </CardTitle>
          <CardDescription>
            Manage per-event email and in-app notification toggles in detailed Notification Preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/notification-preferences"><Mail className="h-4 w-4 mr-2" /> Open notification preferences</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Toggle = ({ label, sub, checked, onChange, disabled }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className={disabled ? "opacity-50" : ""}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);
