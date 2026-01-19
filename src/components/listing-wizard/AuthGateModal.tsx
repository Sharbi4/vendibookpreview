import React, { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (userId: string) => void;
  draftId?: string | null;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  open,
  onOpenChange,
  onAuthSuccess,
  draftId,
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/create-listing/${draftId || ''}`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Send admin notification for new user signup (don't block on failure)
          supabase.functions.invoke('send-admin-notification', {
            body: {
              type: 'new_user',
              data: {
                email,
                full_name: null,
                role: 'host',
                user_id: data.user.id,
                source: 'listing_wizard',
              },
            },
          }).catch(err => console.error('Failed to send admin notification:', err));

          toast({
            title: 'Account created!',
            description: 'Your draft is saved. Continue where you left off.',
          });
          onAuthSuccess(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: 'Welcome back!',
            description: 'Your draft is saved. Continue where you left off.',
          });
          onAuthSuccess(data.user.id);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      // Handle specific error cases
      if (errorMessage.includes('User already registered')) {
        toast({
          title: 'Email already registered',
          description: 'Try signing in instead.',
          variant: 'destructive',
        });
        setMode('signin');
      } else if (errorMessage.includes('Invalid login credentials')) {
        toast({
          title: 'Invalid credentials',
          description: 'Check your email and password.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signup' ? 'Create an account to save your draft' : 'Sign in to continue'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signup' 
              ? 'Sign up to save your listing and publish when ready.' 
              : 'Welcome back! Continue where you left off.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {mode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};