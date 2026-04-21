import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SmsSubscription {
  id: string;
  user_id: string;
  phone_number: string;
  verified: boolean;
  opted_in: boolean;
  accepts_transactional: boolean;
  accepts_marketing: boolean;
  accepts_alerts: boolean;
}

export const useSmsSubscription = (userId: string | undefined) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["sms-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("sms_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as SmsSubscription | null;
    },
    enabled: !!userId,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<SmsSubscription> & { phone_number: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("sms_subscriptions")
        .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-subscription", userId] });
      toast({ title: "SMS preferences saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  return { subscription: data, isLoading, save: upsert.mutate, isSaving: upsert.isPending };
};
