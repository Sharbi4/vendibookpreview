import React, { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema
const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  firstName: z.string().trim().min(1, 'First name is required').max(50).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).optional(),
});

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    try {
      if (mode === 'signup') {
        authSchema.parse({ email: email.trim(), password, firstName, lastName });
      } else {
        authSchema.pick({ email: true, password: true }).parse({ email: email.trim(), password });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submitting
    if (!validateForm()) return;
    
    const trimmedEmail = email.trim().toLowerCase();

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/create-listing/${draftId || ''}`,
            data: {
              full_name: fullName,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // If email confirmation is required, there may be no active session yet.
          // In that case we cannot claim the draft until the user is signed in.
          if (!data.session) {
            toast({
              title: 'Check your email to finish signup',
              description: 'Then sign in here to claim and save your draft to your account.',
            });
            setMode('signin');
            return;
          }

          // Best-effort: give new users the host role (non-blocking)
          try {
            await supabase.from('user_roles').insert({
              user_id: data.user.id,
              role: 'host',
            });
          } catch (err) {
            console.error('Failed to add host role:', err);
          }

          // Send welcome email to new user (don't block on failure)
          const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
          supabase.functions.invoke('send-welcome-email', {
            body: {
              email: trimmedEmail,
              fullName,
              role: 'host',
            },
          }).catch(err => console.error('Failed to send welcome email:', err));

          // Send admin notification for new user signup (don't block on failure)
          supabase.functions.invoke('send-admin-notification', {
            body: {
              type: 'new_user',
              data: {
                email: trimmedEmail,
                full_name: fullName,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: 'host',
                user_id: data.user.id,
                source: 'listing_wizard',
              },
            },
          }).catch(err => console.error('Failed to send admin notification:', err));

          toast({
            title: 'Account created!',
            description: 'You’re signed in. Claiming your draft now…',
          });
          onAuthSuccess(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: 'Welcome back!',
            description: 'Claiming your draft now…',
          });
          onAuthSuccess(data.user.id);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      // Handle specific error cases with user-friendly messages
      if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
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
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        toast({
          title: 'Too many attempts',
          description: 'Please wait a few minutes before trying again.',
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
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                    }}
                    className={errors.firstName ? 'border-destructive' : ''}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                    }}
                    className={errors.lastName ? 'border-destructive' : ''}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              className={errors.email ? 'border-destructive' : ''}
              required
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              className={errors.password ? 'border-destructive' : ''}
              minLength={8}
              required
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
            {mode === 'signup' && !errors.password && (
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            )}
          </div>

          <Button type="submit" variant="dark-shine" className="w-full" disabled={isLoading}>
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