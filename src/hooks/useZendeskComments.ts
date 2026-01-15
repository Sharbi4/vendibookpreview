import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ZendeskComment {
  id: string;
  transaction_id: string | null;
  zendesk_ticket_id: string;
  zendesk_comment_id: string;
  author_name: string | null;
  author_email: string | null;
  author_role: string | null;
  body: string;
  is_public: boolean;
  created_at: string;
  zendesk_created_at: string | null;
}

export const useZendeskComments = (transactionId?: string) => {
  return useQuery({
    queryKey: ["zendesk-comments", transactionId],
    queryFn: async () => {
      let query = supabase
        .from("zendesk_ticket_comments")
        .select("*")
        .order("zendesk_created_at", { ascending: true });

      if (transactionId) {
        query = query.eq("transaction_id", transactionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching Zendesk comments:", error);
        throw error;
      }

      return data as ZendeskComment[];
    },
    enabled: true,
  });
};

export const useZendeskCommentsForTicket = (zendeskTicketId?: string) => {
  return useQuery({
    queryKey: ["zendesk-comments-ticket", zendeskTicketId],
    queryFn: async () => {
      if (!zendeskTicketId) return [];

      const { data, error } = await supabase
        .from("zendesk_ticket_comments")
        .select("*")
        .eq("zendesk_ticket_id", zendeskTicketId)
        .order("zendesk_created_at", { ascending: true });

      if (error) {
        console.error("Error fetching Zendesk comments:", error);
        throw error;
      }

      return data as ZendeskComment[];
    },
    enabled: !!zendeskTicketId,
  });
};
