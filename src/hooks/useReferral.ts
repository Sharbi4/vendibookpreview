import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  give_amount: number;
  get_amount: number;
  total_referred: number;
  total_qualified: number;
  total_earned: number;
  is_active: boolean;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  code: string;
  status: string;
  qualifying_event: string | null;
  qualified_at: string | null;
  referrer_reward_amount: number | null;
  referrer_reward_status: string | null;
  created_at: string;
}

const PENDING_KEY = "vendibook_pending_referral_code";

export const setPendingReferralCode = (code: string) => {
  try { localStorage.setItem(PENDING_KEY, code.trim().toUpperCase()); } catch {}
};

export const getPendingReferralCode = (): string | null => {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
};

export const clearPendingReferralCode = () => {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
};

export const useReferralCode = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: async (): Promise<ReferralCode | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as ReferralCode) ?? null;
    },
    enabled: !!user?.id,
  });
};

export const useMyReferrals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async (): Promise<Referral[]> => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      return (data as Referral[]) ?? [];
    },
    enabled: !!user?.id,
  });
};

export const useRedeemReferralCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("redeem-referral", { body: { code } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      clearPendingReferralCode();
      qc.invalidateQueries({ queryKey: ["my-referrals"] });
    },
  });
};

export const buildReferralUrl = (code: string, path = "/") => {
  const base = typeof window !== "undefined" ? window.location.origin : "https://vendibook.com";
  const url = new URL(path, base);
  url.searchParams.set("ref", code);
  url.searchParams.set("utm_source", "referral");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "give_get_25");
  return url.toString();
};

/** Reads a single global feature flag from `app_feature_flags`. Defaults to `true` if not found. */
export const useFeatureFlag = (key: string, defaultValue = true) => {
  return useQuery({
    queryKey: ["feature-flag", key],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from("app_feature_flags")
        .select("enabled")
        .eq("key", key)
        .maybeSingle();
      return data ? !!data.enabled : defaultValue;
    },
    staleTime: 60_000,
  });
};

export const useAcceptReferralTerms = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (terms_version: string) => {
      const { data, error } = await supabase.functions.invoke("referral-accept-terms", {
        body: { terms_version },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referral-terms-accepted"] }),
  });
};

