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
import { Separator } from '@/components/ui/separator';

const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  phoneNumber: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number is too long').optional(),
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('shopper');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
        authSchema.parse({ email, password, firstName, lastName, phoneNumber });
      } else if (mode === 'forgot' || mode === 'verify') {
        authSchema.pick({ email: true }).parse({ email });
      } else {
        authSchema.omit({ firstName: true, lastName: true, phoneNumber: true }).parse({ email, password });
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/activation`,
        },
      });
      
      if (error) {
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim inputs before validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phoneNumber.trim();
    setEmail(trimmedEmail);
    setFirstName(trimmedFirstName);
    setLastName(trimmedLastName);
    setPhoneNumber(trimmedPhone);
    
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
        const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
        const { error } = await signUp(trimmedEmail, password, fullName, selectedRole, trimmedFirstName, trimmedLastName, trimmedPhone);
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
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
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
                        onChange={(e) => setLastName(e.target.value)}
                        className={errors.lastName ? 'border-destructive' : ''}
                        required
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={errors.phoneNumber ? 'border-destructive' : ''}
                      required
                    />
                    {errors.phoneNumber && (
                      <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Required for account verification and Stripe payouts</p>
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

              {/* Google Sign-In - only show for signin/signup modes */}
              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                </>
              )}
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
