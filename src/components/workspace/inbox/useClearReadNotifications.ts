import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Delete the member's already-read notifications. Allowed by the
 * "Users can delete their own notifications" RLS policy (auth.uid() = user_id),
 * the same policy useNotifications' deleteNotification/clearAll rely on.
 * Unread notifications are never touched. Invalidates ['notifications', userId]
 * so the shell, NotificationCenter and this page update together.
 */
export function useClearReadNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .not('read_at', 'is', null);
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });
}
