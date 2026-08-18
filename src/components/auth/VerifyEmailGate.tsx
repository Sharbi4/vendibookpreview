import { useState } from 'react';
import { Mail, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Full-screen gate shown when a signed-in user has not confirmed their email.
 * Blocks the dashboard until verification completes, and lets the user correct
 * a mistyped address (which re-sends the confirmation link to the new email).
 */
const VerifyEmailGate = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const currentEmail = user?.email ?? '';

  const [newEmail, setNewEmail] = useState(currentEmail);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const redirectTo = `${window.location.origin}/dashboard`;

  const resend = async () => {
    if (!currentEmail) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: currentEmail,
      options: { emailRedirectTo: redirectTo },
    });
    setSending(false);
    toast(
      error
        ? { title: 'Could not resend', description: error.message, variant: 'destructive' }
        : { title: 'Verification email sent', description: `Check ${currentEmail} for the link.` },
    );
  };

  const changeEmail = async () => {
    const target = newEmail.trim().toLowerCase();
    if (!isEmail(target)) {
      toast({ title: 'Invalid email', description: 'Enter a valid email address.', variant: 'destructive' });
      return;
    }
    if (target === currentEmail.toLowerCase()) {
      await resend();
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: target }, { emailRedirectTo: redirectTo });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not update email', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Email updated',
      description: `We sent a verification link to ${target}. Confirm it to unlock your dashboard.`,
    });
  };

  const recheck = async () => {
    setChecking(true);
    await supabase.auth.refreshSession();
    const { data } = await supabase.auth.getUser();
    setChecking(false);
    if (data.user?.email_confirmed_at) {
      window.location.reload();
    } else {
      toast({
        title: 'Not verified yet',
        description: 'Click the link in your email, then check again.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Verify your email to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to{' '}
            <span className="text-foreground font-medium break-all">{currentEmail}</span>.
            Your dashboard unlocks as soon as it's confirmed.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button onClick={recheck} disabled={checking} variant="dark-shine" className="w-full h-11 rounded-xl">
            {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            I've verified — check again
          </Button>
          <Button onClick={resend} disabled={sending} variant="outline" className="w-full h-11 rounded-xl">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Resend verification email
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border/60 space-y-2">
          <Label htmlFor="verify-new-email" className="text-sm">Wrong email address?</Label>
          <Input
            id="verify-new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Update it here and we'll send a fresh verification link to the corrected address.
          </p>
          <Button
            onClick={changeEmail}
            disabled={saving || !newEmail.trim()}
            variant="secondary"
            className="w-full h-11 rounded-xl"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update email &amp; resend
          </Button>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-6 w-full inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailGate;
