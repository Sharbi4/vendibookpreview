import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  booking_request_email: boolean;
  booking_request_inapp: boolean;
  booking_response_email: boolean;
  booking_response_inapp: boolean;
  message_email: boolean;
  message_inapp: boolean;
  document_email: boolean;
  document_inapp: boolean;
  sale_email: boolean;
  sale_inapp: boolean;
  dispute_email: boolean;
  dispute_inapp: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences = {
  booking_request_email: true,
  booking_request_inapp: true,
  booking_response_email: true,
  booking_response_inapp: true,
  message_email: true,
  message_inapp: true,
  document_email: true,
  document_inapp: true,
  sale_email: true,
  sale_inapp: true,
  dispute_email: true,
  dispute_inapp: true,
};

export const useNotificationPreferences = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      // Return existing preferences or create default ones
      if (data) {
        return data as NotificationPreferences;
      }

      // Create default preferences if none exist
      const { data: newData, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId, ...defaultPreferences })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData as NotificationPreferences;
    },
    enabled: !!userId,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', userId] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving preferences',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};
