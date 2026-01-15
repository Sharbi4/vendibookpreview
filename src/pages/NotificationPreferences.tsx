import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Mail, Loader2, Smartphone, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PreferenceRowProps {
  label: string;
  description: string;
  emailChecked: boolean;
  inappChecked: boolean;
  onEmailChange: (checked: boolean) => void;
  onInappChange: (checked: boolean) => void;
  disabled?: boolean;
}

const PreferenceRow = ({
  label,
  description,
  emailChecked,
  inappChecked,
  onEmailChange,
  onInappChange,
  disabled,
}: PreferenceRowProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
    <div className="flex-1">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={emailChecked}
          onCheckedChange={onEmailChange}
          disabled={disabled}
          aria-label={`${label} email notifications`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={inappChecked}
          onCheckedChange={onInappChange}
          disabled={disabled}
          aria-label={`${label} in-app notifications`}
        />
      </div>
    </div>
  </div>
);

const TestPushButton = ({ userId }: { userId: string }) => {
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
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
    <Button
      variant="outline"
      size="sm"
      onClick={sendTestNotification}
      disabled={isSending}
      className="w-full sm:w-auto"
    >
      {isSending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      Send Test Notification
    </Button>
  );
};

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences(user?.id);
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    permission: pushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications(user?.id);

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !preferences) {
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Choose how you want to receive notifications. Email notifications are sent to your registered email address.
            </p>
          </div>

          {/* Push Notifications Card */}
          {isPushSupported && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Receive notifications even when your browser is minimized or closed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {isPushSubscribed ? 'Push notifications are enabled' : 'Enable push notifications'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pushPermission === 'denied' 
                        ? 'Notifications are blocked. Please enable them in your browser settings.'
                        : isPushSubscribed 
                          ? 'You will receive notifications on this device'
                          : 'Get real-time alerts on your device'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={isPushSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={isPushLoading || pushPermission === 'denied'}
                    aria-label="Push notifications"
                  />
                </div>
                {isPushSubscribed && <TestPushButton userId={user.id} />}
              </CardContent>
            </Card>
          )}

          {/* Email & In-app Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center gap-4 ml-auto text-sm font-normal text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell className="h-4 w-4" />
                    <span>In-app</span>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                Toggle notifications on or off for each category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <PreferenceRow
                label="Booking Requests"
                description="When someone requests to book your listing"
                emailChecked={preferences.booking_request_email}
                inappChecked={preferences.booking_request_inapp}
                onEmailChange={(checked) => handlePreferenceChange('booking_request_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('booking_request_inapp', checked)}
                disabled={isUpdating}
              />
              <Separator />
              <PreferenceRow
                label="Booking Responses"
                description="When a host approves or declines your booking"
                emailChecked={preferences.booking_response_email}
                inappChecked={preferences.booking_response_inapp}
                onEmailChange={(checked) => handlePreferenceChange('booking_response_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('booking_response_inapp', checked)}
                disabled={isUpdating}
              />
              <Separator />
              <PreferenceRow
                label="Messages"
                description="When you receive a new message"
                emailChecked={preferences.message_email}
                inappChecked={preferences.message_inapp}
                onEmailChange={(checked) => handlePreferenceChange('message_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('message_inapp', checked)}
                disabled={isUpdating}
              />
              <Separator />
              <PreferenceRow
                label="Documents"
                description="Updates about document uploads and reviews"
                emailChecked={preferences.document_email}
                inappChecked={preferences.document_inapp}
                onEmailChange={(checked) => handlePreferenceChange('document_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('document_inapp', checked)}
                disabled={isUpdating}
              />
              <Separator />
              <PreferenceRow
                label="Sales"
                description="Updates about your sale transactions"
                emailChecked={preferences.sale_email}
                inappChecked={preferences.sale_inapp}
                onEmailChange={(checked) => handlePreferenceChange('sale_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('sale_inapp', checked)}
                disabled={isUpdating}
              />
              <Separator />
              <PreferenceRow
                label="Disputes"
                description="When a dispute is raised or resolved"
                emailChecked={preferences.dispute_email}
                inappChecked={preferences.dispute_inapp}
                onEmailChange={(checked) => handlePreferenceChange('dispute_email', checked)}
                onInappChange={(checked) => handlePreferenceChange('dispute_inapp', checked)}
                disabled={isUpdating}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotificationPreferences;
