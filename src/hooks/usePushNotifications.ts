import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VAPID public key - this should match the private key in your edge function
const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = (userId: string | undefined) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Ensure we use the SAME service worker as the PWA (/sw.js)
  const getServiceWorkerRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    // If already registered, reuse it (prevents conflicts / overwrites)
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    // Fallback: register our PWA service worker explicitly
    return await navigator.serviceWorker.register('/sw.js');
  }, []);

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !userId) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) {
          setIsSubscribed(false);
          return;
        }

        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, userId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!userId) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to enable push notifications.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }

      // Ensure we have the PWA service worker registered
      const registration = await getServiceWorkerRegistration();

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Push notifications enabled',
        description: 'You will now receive notifications even when the browser is minimized.',
      });

      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Failed to enable push notifications',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getServiceWorkerRegistration, toast, userId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });

      return true;
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Failed to disable push notifications',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, userId]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
};
