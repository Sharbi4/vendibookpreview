import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook that tracks user activity and updates last_active_at in profiles table.
 * Updates on mount and every 5 minutes while active.
 */
export const useActivityTracker = () => {
  const { user } = useAuth();
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    if (!user?.id) return;

    const updateActivity = async () => {
      const now = Date.now();
      // Throttle updates to avoid excessive DB writes
      if (now - lastUpdate.current < ACTIVITY_UPDATE_INTERVAL) return;
      
      lastUpdate.current = now;
      
      try {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        // Silently fail - activity tracking is non-critical
        console.debug('Activity update failed:', error);
      }
    };

    // Update immediately on mount
    updateActivity();

    // Set up interval for periodic updates
    const interval = setInterval(updateActivity, ACTIVITY_UPDATE_INTERVAL);

    // Update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);
};

/**
 * Utility to format last active time as human-readable string
 */
export const formatLastActive = (lastActiveAt: string | null): string | null => {
  if (!lastActiveAt) return null;

  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 5) {
    return 'Active now';
  } else if (diffMins < 60) {
    return `Active ${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `Active ${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Active yesterday';
  } else if (diffDays < 7) {
    return `Active ${diffDays} days ago`;
  } else if (diffWeeks < 4) {
    return `Active ${diffWeeks}w ago`;
  } else {
    return `Active ${lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
};
