import { useEffect, useState } from 'react';
import { MailWarning, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DISMISS_KEY = 'vendibook_email_verify_banner_dismissed_until';

/**
 * Shows a non-blocking banner when the signed-in user has not yet confirmed
 * their email. Lets them resend the confirmation or dismiss for 24 hours.
 */
const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hidden, setHidden] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      setHidden(true);
      return;
    }
    if (user.email_confirmed_at) {
      setHidden(true);
      return;
    }
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setHidden(until > Date.now());
  }, [user]);

  if (hidden || !user?.email || user.email_confirmed_at) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSending(false);
    if (error) {
      toast({
        title: 'Could not resend',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Verification email sent',
      description: `Check ${user.email} for the confirmation link.`,
    });
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setHidden(true);
  };

  return (
    <div className="mx-auto mb-4 flex w-full max-w-6xl items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
      <MailWarning className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">Verify your email to secure your account</p>
        <p className="mt-0.5 text-muted-foreground truncate">
          We sent a link to <span className="text-foreground">{user.email}</span>.
          Confirm it so you can recover access if you ever lose your password.
        </p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {sending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          'Resend email'
        )}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 24 hours"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
