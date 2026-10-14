import { Capacitor } from '@capacitor/core';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Switch } from '@/components/ui/switch';
import { PageHeader, Panel, ws } from '@/components/workspace/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  getStoredSoundPreference, 
  setStoredSoundPreference, 
  playNotificationSound 
} from '@/lib/notificationSound';
import SmsNotificationSection from '@/components/sms/SmsNotificationSection';

interface PreferenceRowProps {
  label: string;
  description: string;
  emailChecked: boolean;
  inappChecked: boolean;
  onEmailChange: (checked: boolean) => void;
  onInappChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Ink-on-sand switch so state reads clearly on white. */
const switchCls = 'data-[state=checked]:bg-[#1C1B1A] data-[state=unchecked]:bg-[#D9D1C5] focus-visible:ring-[#1C1B1A] [&>span]:bg-white [&>span]:shadow-[0_1px_2px_rgba(28,27,26,0.25)]';

const PreferenceRow = ({
  label,
  description,
  emailChecked,
  inappChecked,
  onEmailChange,
  onInappChange,
  disabled,
}: PreferenceRowProps) => (
  <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-semibold leading-5 text-[#1C1B1A]">{label}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-[#6F6961]">{description}</p>
    </div>
    <div className="flex items-center gap-6 sm:gap-0">
      <label className="flex items-center gap-2.5 sm:w-20 sm:justify-center">
        <span className="text-[12.5px] font-medium text-[#5E5953] sm:sr-only">Email</span>
        <Switch
          checked={emailChecked}
          onCheckedChange={onEmailChange}
          disabled={disabled}
          className={switchCls}
          aria-label={`${label} email notifications`}
        />
      </label>
      <label className="flex items-center gap-2.5 sm:w-20 sm:justify-center">
        <span className="text-[12.5px] font-medium text-[#5E5953] sm:sr-only">In-app</span>
        <Switch
          checked={inappChecked}
          onCheckedChange={onInappChange}
          disabled={disabled}
          className={switchCls}
          aria-label={`${label} in-app notifications`}
        />
      </label>
    </div>
  </li>
);

/** One setting with a switch, for the device section. */
const DeviceRow = ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-semibold leading-5 text-[#1C1B1A]">{title}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-[#6F6961]">{body}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const TestPushButton = ({ userId }: { userId: string }) => {
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      if (Capacitor.getPlatform() === 'android') {
        const { error } = await (supabase as any).rpc('test_native_push');
        if (error) throw error;
        toast.success('Test notification queued. Watch for an Android notification.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userId,
          title: 'Test Notification 🎉',
          body: 'Push notifications are working! You\'ll receive alerts even when the browser is minimized.',
          url: '/notification-preferences',
          tag: 'test-notification',
        },
      });

      if (error) throw error;

      if (data?.sent > 0) {
        toast.success('Test notification sent!');
      } else {
        toast.info('No push subscriptions found for this device');
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={sendTestNotification}
      disabled={isSending}
      className={cn(ws.secondary, 'h-9 disabled:opacity-60')}
    >
      {isSending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      Send a test notification
    </button>
  );
};

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences(user?.id);
  const [soundEnabled, setSoundEnabled] = useState(() => getStoredSoundPreference());
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    permission: pushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications(user?.id);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setStoredSoundPreference(enabled);
    if (enabled) {
      // Play a preview of the sound
      playNotificationSound();
    }
    toast.success(enabled ? 'Notification sound enabled' : 'Notification sound disabled');
  };

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <WorkspaceShell>
        <div className={ws.page}>
          <div className="flex flex-col gap-8" aria-busy="true">
            <div className="space-y-3">
              <span className={cn(ws.skeleton, 'block h-3 w-24')} />
              <span className={cn(ws.skeleton, 'block h-8 w-72 max-w-full')} />
            </div>
            <div className={cn(ws.surface, 'h-80')} />
            <span className="sr-only" role="status">Loading your notification settings</span>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  if (!user) {
    return null;
  }

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handlePushToggle = async () => {
    if (isPushSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  const rows: Array<{ label: string; description: string; key: string }> = [
    { label: 'Booking requests', description: 'When someone requests to book your listing.', key: 'booking_request' },
    { label: 'Booking responses', description: 'When a host approves or declines your booking.', key: 'booking_response' },
    { label: 'Messages', description: 'When you receive a new message.', key: 'message' },
    { label: 'Documents', description: 'Updates about document uploads and reviews.', key: 'document' },
    { label: 'Sales', description: 'Updates about your sale transactions.', key: 'sale' },
    { label: 'Disputes', description: 'When a dispute is raised or resolved.', key: 'dispute' },
  ];
  const prefs = (preferences ?? {}) as unknown as Record<string, boolean>;

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className="flex max-w-3xl flex-col gap-8 sm:gap-10">
          <PageHeader
            eyebrow="Notifications"
            title="Notification settings"
            description={`Choose what reaches you and where. Email goes to ${user.email ?? 'your account email'}.`}
            actions={
              <Link to="/dashboard/notifications" className={ws.secondary}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Notifications
              </Link>
            }
          />

          {preferences ? (
            <Panel
              title="What you hear about"
              description={isUpdating ? 'Saving…' : 'Changes save as you go.'}
              flush
            >
              <div className="hidden items-center border-b border-[#ECE6DD] px-6 py-2.5 sm:flex">
                <span className="flex-1" />
                <span className={cn(ws.eyebrow, 'w-20 text-center')}>Email</span>
                <span className={cn(ws.eyebrow, 'w-20 text-center')}>In-app</span>
              </div>
              <ul className="divide-y divide-[#F1ECE5]">
                {rows.map((r) => (
                  <PreferenceRow
                    key={r.key}
                    label={r.label}
                    description={r.description}
                    emailChecked={!!prefs[`${r.key}_email`]}
                    inappChecked={!!prefs[`${r.key}_inapp`]}
                    onEmailChange={(checked) => handlePreferenceChange(`${r.key}_email`, checked)}
                    onInappChange={(checked) => handlePreferenceChange(`${r.key}_inapp`, checked)}
                    disabled={isUpdating}
                  />
                ))}
              </ul>
            </Panel>
          ) : (
            <Panel title="What you hear about">
              <div role="alert">
                <p className="text-[14px] font-semibold text-[#1C1B1A]">Your email and in-app settings didn’t load.</p>
                <p className="mt-1 text-[13px] leading-5 text-[#6F6961]">Nothing has changed. Check your connection and try again.</p>
                <button
                  type="button"
                  className={cn(ws.secondary, 'mt-4')}
                  onClick={() => void queryClient.invalidateQueries({ queryKey: ['notification-preferences', user.id] })}
                >
                  Try again
                </button>
              </div>
            </Panel>
          )}

          <Panel title="On this device" description="Sound and push alerts for this browser or phone." flush>
            <div className="divide-y divide-[#F1ECE5]">
              <DeviceRow
                title="Notification sound"
                body={soundEnabled ? 'A short chime plays when something new arrives.' : 'New notifications arrive silently.'}
              >
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleSoundToggle}
                  className={switchCls}
                  aria-label="Notification sound"
                />
              </DeviceRow>
              {isPushSupported && (
                <DeviceRow
                  title="Push notifications"
                  body={
                    pushPermission === 'denied'
                      ? 'Blocked by your browser. Allow notifications for Vendibook in your browser settings, then come back.'
                      : isPushSubscribed
                        ? 'On for this device, even when Vendibook isn’t open.'
                        : 'Get alerts on this device even when Vendibook isn’t open.'
                  }
                >
                  <Switch
                    checked={isPushSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={isPushLoading || pushPermission === 'denied'}
                    className={switchCls}
                    aria-label="Push notifications"
                  />
                </DeviceRow>
              )}
              {isPushSupported && isPushSubscribed && (
                <div className="px-5 py-4 sm:px-6">
                  <TestPushButton userId={user.id} />
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Text messages" description="Transactional texts only: account, bookings, payments and support.">
            {/* v2-embedded-section maps the shared form tokens onto the light workspace palette. */}
            <div className="v2-embedded-section [&_[data-testid=sms-notification-section]>div:first-child:has(>:only-child)]:hidden [&_[data-testid=sms-notification-section]>div:first-child>div:first-child]:hidden [&_label.rounded-lg]:border-[#ECE6DD] [&_label.rounded-lg]:bg-[#FCFAF7] [&_label.rounded-lg_span]:text-[#5E5953] [&_button[role=checkbox]]:border-[#8A847B] [&_button[role=checkbox]]:bg-white [&_button[role=checkbox]]:!min-h-0 [&_[data-testid=sms-notification-section]>div:first-child:has(>:only-child)+*]:!mt-0 [&_[data-testid=sms-notification-section]]:rounded-none [&_[data-testid=sms-notification-section]]:border-0 [&_[data-testid=sms-notification-section]]:bg-transparent [&_[data-testid=sms-notification-section]]:p-0">
              <SmsNotificationSection />
            </div>
          </Panel>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default NotificationPreferences;
