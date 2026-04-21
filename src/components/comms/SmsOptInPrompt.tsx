import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSmsSubscription } from "@/hooks/useSmsSubscription";

const DISMISS_KEY = "vb_sms_opt_dismissed_v1";

/**
 * Lightweight, TCPA-compliant SMS opt-in prompt.
 * Shown once to authenticated users without an active SMS subscription.
 */
export const SmsOptInPrompt = () => {
  const { user } = useAuth();
  const { subscription, save, isSaving } = useSmsSubscription(user?.id);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    if (subscription === undefined) return; // still loading
    if (subscription?.opted_in) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(t);
  }, [user?.id, subscription]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const enable = () => {
    if (!phone.trim()) return;
    save({
      phone_number: phone.trim(),
      opted_in: true,
      accepts_transactional: true,
      accepts_alerts: true,
      accepts_marketing: false,
    });
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" /> Get instant SMS alerts
          </DialogTitle>
          <DialogDescription>
            Booking requests, payouts, and time-sensitive updates — delivered the moment they
            happen. You can disable anytime.
          </DialogDescription>
        </DialogHeader>

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
            By tapping "Enable SMS" you agree to receive automated transactional and alert messages
            from Vendibook at the number above. Msg & data rates may apply. Frequency varies. Reply
            STOP to unsubscribe, HELP for help. Consent is not a condition of purchase.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={dismiss}>Not now</Button>
          <Button onClick={enable} disabled={isSaving || !phone.trim()}>
            {isSaving ? "Saving…" : "Enable SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
