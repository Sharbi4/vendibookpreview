import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConciergeAction {
  label: string;
  url?: string;
  kind: "link" | "share" | "dismiss";
}

export interface ConciergeMessage {
  id: string;
  thread_id: string;
  sender_role: "ai" | "user" | "system";
  content: string;
  actions: ConciergeAction[];
  read_at: string | null;
  created_at: string;
}

export interface ConciergeThread {
  id: string;
  topic: string;
  status: string;
  priority: string;
  last_message_at: string;
  unread_count: number;
  context: Record<string, unknown>;
}

export const useConciergeInbox = (userId: string | undefined) => {
  const qc = useQueryClient();

  const threadsQuery = useQuery({
    queryKey: ["concierge-threads", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("concierge_threads")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConciergeThread[];
    },
    enabled: !!userId,
  });

  // Realtime updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`concierge-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "concierge_threads", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["concierge-threads", userId] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "concierge_messages", filter: `user_id=eq.${userId}` },
        (payload) => {
          const tid = (payload.new as any)?.thread_id;
          if (tid) qc.invalidateQueries({ queryKey: ["concierge-messages", tid] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const totalUnread = (threadsQuery.data ?? []).reduce((s, t) => s + (t.unread_count || 0), 0);

  const markRead = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("concierge_threads")
        .update({ unread_count: 0 })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concierge-threads", userId] }),
  });

  return {
    threads: threadsQuery.data ?? [],
    isLoading: threadsQuery.isLoading,
    totalUnread,
    markRead: markRead.mutate,
  };
};

export const useConciergeMessages = (threadId: string | undefined) => {
  return useQuery({
    queryKey: ["concierge-messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ConciergeMessage[];
    },
    enabled: !!threadId,
  });
};
