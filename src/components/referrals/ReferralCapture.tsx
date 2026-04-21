// Captures ?ref=CODE from URL into localStorage, then redeems automatically once user is logged in.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setPendingReferralCode, getPendingReferralCode, useRedeemReferralCode } from "@/hooks/useReferral";
import { toast } from "sonner";

export const ReferralCapture = () => {
  const location = useLocation();
  const { user } = useAuth();
  const redeem = useRedeemReferralCode();

  // Capture from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) setPendingReferralCode(ref);
  }, [location.search]);

  // Redeem after login
  useEffect(() => {
    if (!user?.id) return;
    const pending = getPendingReferralCode();
    if (!pending) return;
    redeem.mutate(pending, {
      onSuccess: (data: any) => {
        if (data?.ok && !data?.already) {
          toast.success("Referral applied! You'll earn credit on your first booking.");
        }
      },
      onError: () => {
        // silent
      },
    });
  }, [user?.id]);

  return null;
};
