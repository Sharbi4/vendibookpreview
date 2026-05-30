import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";

const COOKIE_KEY = "vendibook_pending_referral_code";

interface Props {
  programType: "rental" | "purchase" | "supply";
  value: string;
  onChange: (code: string, valid: boolean, referrerName?: string) => void;
  /** When true, auto-fill from cookie/localStorage on mount. Use for Rental (auto-apply). */
  autoFillFromCookie?: boolean;
}

export const ReferralCodeField = ({ programType, value, onChange, autoFillFromCookie }: Props) => {
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referrer, setReferrer] = useState<string>("");
  const [internalValue, setInternalValue] = useState(value);

  // Auto-fill from cookie/localStorage
  useEffect(() => {
    if (!autoFillFromCookie || internalValue) return;
    try {
      const stored = localStorage.getItem(COOKIE_KEY);
      if (stored) {
        setInternalValue(stored);
        validate(stored);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFillFromCookie]);

  const validate = async (code: string) => {
    if (!code || code.length < 4) {
      setStatus("idle");
      onChange(code, false);
      return;
    }
    setStatus("checking");
    try {
      const { data } = await supabase.functions.invoke("referral-apply-code", {
        body: { code, program_type: programType },
      });
      if (data?.ok) {
        setStatus("valid");
        setReferrer(data.referrer_first_name || "your referrer");
        onChange(code.toUpperCase(), true, data.referrer_first_name);
      } else {
        setStatus("invalid");
        onChange(code, false);
      }
    } catch {
      setStatus("invalid");
      onChange(code, false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="referral-code" className="text-sm">
        Referral code <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="relative">
        <Input
          id="referral-code"
          value={internalValue}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setInternalValue(v);
            setStatus("idle");
            onChange(v, false);
          }}
          onBlur={() => validate(internalValue)}
          placeholder="VB-XXXX"
          className="font-mono uppercase tracking-wider pr-10 text-base"
          style={{ fontSize: "16px" }}
          maxLength={20}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "valid" && <Check className="h-4 w-4 text-green-500" />}
          {status === "invalid" && <X className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      {status === "valid" && (
        <p className="text-xs text-green-600">✓ Referral credited to {referrer}</p>
      )}
      {status === "invalid" && (
        <p className="text-xs text-destructive">Code not recognized — you can leave this blank</p>
      )}
      {status === "idle" && autoFillFromCookie && !internalValue && (
        <p className="text-xs text-muted-foreground">Was this recommended by someone? Enter their code.</p>
      )}
    </div>
  );
};
