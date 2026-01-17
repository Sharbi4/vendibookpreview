import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ResponseTimeData {
  avgResponseTime: string | null;
  isFastResponder: boolean;
  responseCount: number;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return 'a few minutes';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 7200) return '1 hour';
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
};

export const useHostResponseTime = (hostId: string | undefined) => {
  return useQuery({
    queryKey: ['host-response-time', hostId],
    queryFn: async (): Promise<ResponseTimeData> => {
      if (!hostId) {
        return { avgResponseTime: null, isFastResponder: false, responseCount: 0 };
      }

      // Get booking requests with responses from last 90 days
      const { data: bookings, error } = await supabase
        .from('booking_requests')
        .select('created_at, responded_at')
        .eq('host_id', hostId)
        .not('responded_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (error || !bookings || bookings.length === 0) {
        return { avgResponseTime: null, isFastResponder: false, responseCount: 0 };
      }

      // Calculate average response time in seconds
      const totalSeconds = bookings.reduce((sum, booking) => {
        const created = new Date(booking.created_at).getTime();
        const responded = new Date(booking.responded_at!).getTime();
        return sum + (responded - created) / 1000;
      }, 0);

      const avgSeconds = totalSeconds / bookings.length;
      const isFastResponder = bookings.length >= 3 && avgSeconds < 7200; // 2 hours

      return {
        avgResponseTime: formatDuration(avgSeconds),
        isFastResponder,
        responseCount: bookings.length,
      };
    },
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export default useHostResponseTime;
