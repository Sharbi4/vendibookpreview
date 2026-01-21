import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, Store, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import vendibookLogo from '@/assets/vendibook-logo.png';
import Header from '@/components/layout/Header';
import { trackSignupCompleted, trackLoginAttempt, trackLoginSuccess, trackLoginError, trackSignupAttempt, trackSignupError, trackPasswordResetRequest } from '@/lib/analytics';
import { trackSignupConversion } from '@/lib/gtagConversions';
import { trackGA4SignUp, trackGA4Login } from '@/lib/ga4Conversions';

const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long').optional(),
});

// Password strength helper
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
};

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';
type RoleType = 'host' | 'shopper';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('shopper');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendingEmail, setResendingEmail] = useState(false);

  const { signIn, signUp, resetPassword, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        authSchema.parse({ email, password, fullName });
      } else if (mode === 'forgot' || mode === 'verify') {
        authSchema.pick({ email: true }).parse({ email });
      } else {
        authSchema.omit({ fullName: true }).parse({ email, password });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }
    
    try {
      authSchema.pick({ email: true }).parse({ email });
    } catch {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Verification email sent!',
          description: 'Please check your inbox and spam folder.',
        });
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim inputs before validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();
    setEmail(trimmedEmail);
    setFullName(trimmedFullName);
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        trackPasswordResetRequest();
        const { error } = await resetPassword(trimmedEmail);
        if (error) {
          // Avoid revealing if email exists
          const safeMessage = error.message.toLowerCase().includes('not found') 
            ? 'If an account exists with this email, you will receive a reset link.'
            : error.message;
          toast({
            title: 'Request processed',
            description: safeMessage,
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link. Please check your inbox.',
          });
          setMode('signin');
          setEmail('');
        }
      } else if (mode === 'signup') {
        trackSignupAttempt(selectedRole);
        const { error } = await signUp(trimmedEmail, password, trimmedFullName, selectedRole);
        if (error) {
          // Determine error type for analytics
          let errorType = 'unknown';
          let errorTitle = 'Sign up failed';
          let errorDesc = error.message;
          
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            errorType = 'email_exists';
            errorTitle = 'Account exists';
            errorDesc = 'This email is already registered. Please sign in instead.';
          } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
            errorType = 'rate_limit';
            errorTitle = 'Too many attempts';
            errorDesc = 'Please wait a few minutes before trying again.';
          } else if (error.message.includes('invalid') && error.message.includes('email')) {
            errorType = 'invalid_email';
            errorTitle = 'Invalid email';
            errorDesc = 'Please check your email address and try again.';
          }
          
          trackSignupError(selectedRole, errorType);
          
          toast({
            title: errorTitle,
            description: errorDesc,
            variant: 'destructive',
          });
        } else {
          // Track signup completion
          trackSignupCompleted(selectedRole);
          
          // Track GA4 signup conversion
          trackGA4SignUp('email');
          
          // Track Google Ads conversion for host signups
          if (selectedRole === 'host') {
            trackSignupConversion({ method: 'email', user_type: 'host' });
          } else {
            trackSignupConversion({ method: 'email', user_type: 'shopper' });
          }
          
          toast({
            title: 'Check your email!',
            description: 'We sent you a verification link. Please check your inbox to complete signup.',
          });
          setMode('verify');
        }
      } else {
        trackLoginAttempt('email');
        const { error } = await signIn(trimmedEmail, password);
        if (error) {
          // Determine error type for analytics
          let errorType = 'invalid_credentials';
          let errorDesc = 'Invalid email or password. Please try again.';
          
          if (error.message.includes('rate limit') || error.message.includes('too many')) {
            errorType = 'rate_limit';
            errorDesc = 'Too many attempts. Please wait a few minutes before trying again.';
          } else if (error.message.includes('not confirmed') || error.message.includes('verify')) {
            errorType = 'email_not_verified';
            errorDesc = 'Please verify your email before signing in. Check your inbox.';
          }
          
          trackLoginError('email', errorType);
          
          toast({
            title: 'Sign in failed',
            description: errorDesc,
            variant: 'destructive',
          });
        } else {
          trackLoginSuccess('email');
          trackGA4Login('email');
          toast({
            title: 'Welcome back!',
            description: 'You have signed in successfully.',
          });
          // Route to activation to choose path if needed
          navigate('/activation');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={vendibookLogo} 
            alt="Vendibook" 
            className="h-60 w-auto mx-auto mb-4 rounded-xl"
          />
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-center mb-6">
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'verify' ? 'Verify your email' : 'Reset your password'}
          </h2>

          {mode === 'forgot' && (
            <p className="text-sm text-muted-foreground text-center mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          )}

          {mode === 'verify' && (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a verification link to your email. Click the link to activate your account.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn't receive it? Check your spam folder or resend below.
              </p>
            </div>
          )}

          {mode === 'verify' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <Button 
                type="button"
                variant="gradient"
                className="w-full rounded-xl"
                disabled={resendingEmail}
                onClick={handleResendVerification}
              >
                {resendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Resend Verification Email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrors({});
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  {/* Password strength indicator for signup */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => {
                          const strength = getPasswordStrength(password);
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= strength.score ? strength.color : 'bg-muted'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <p className={`text-xs ${getPasswordStrength(password).color.replace('bg-', 'text-')}`}>
                        {getPasswordStrength(password).label}
                        {getPasswordStrength(password).score < 3 && ' — try adding numbers & special characters'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-3">
                  <Label>I want to...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('shopper')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === 'shopper'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Store className={`h-6 w-6 mx-auto mb-2 ${selectedRole === 'shopper' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selectedRole === 'shopper' ? 'text-primary' : 'text-foreground'}`}>
                        Rent / Buy
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('host')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === 'host'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Truck className={`h-6 w-6 mx-auto mb-2 ${selectedRole === 'host' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selectedRole === 'host' ? 'text-primary' : 'text-foreground'}`}>
                        List Assets
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                variant="gradient"
                className="w-full rounded-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>
            </form>
          )}


          <div className="mt-6 text-center">
            {mode === 'forgot' || mode === 'verify' ? (
              <p className="text-sm text-muted-foreground">
                {mode === 'verify' ? 'Already verified?' : 'Remember your password?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrors({});
                  }}
                  className="ml-1 text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setErrors({});
                  }}
                  className="ml-1 text-primary font-medium hover:underline"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
            {mode === 'signin' && (
              <p className="text-sm text-muted-foreground mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('verify');
                    setErrors({});
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Resend verification email
                </button>
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
