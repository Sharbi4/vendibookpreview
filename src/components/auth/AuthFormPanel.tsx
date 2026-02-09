import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, Store, Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { trackSignupCompleted, trackLoginAttempt, trackLoginSuccess, trackLoginError, trackSignupAttempt, trackSignupError, trackPasswordResetRequest } from '@/lib/analytics';
import { trackSignupConversion } from '@/lib/gtagConversions';
import { trackGA4SignUp, trackGA4Login } from '@/lib/ga4Conversions';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  phoneNumber: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number is too long').optional(),
});

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

interface AuthFormPanelProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
}

export const AuthFormPanel = ({ mode, setMode }: AuthFormPanelProps) => {
  const { t } = useTranslation();
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

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectUrl = searchParams.get('redirect') || '/';

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
      const postAuthRedirect = redirectUrl !== '/' ? `${window.location.origin}${redirectUrl}` : window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: postAuthRedirect,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) {
        setIsGoogleLoading(false);
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const url = data?.url;
      if (!url) {
        setIsGoogleLoading(false);
        toast({
          title: 'Google sign-in failed',
          description: 'Missing redirect URL. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      try {
        (window.top ?? window).location.assign(url);
      } catch {
        window.location.assign(url);
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          trackSignupCompleted(selectedRole);
          trackGA4SignUp('email');
          
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
          let errorType = 'invalid_credentials';
          let errorDesc = 'Invalid email or password. Please try again.';
          
          if (error.message.includes('rate limit') || error.message.includes('too many')) {
            errorType = 'rate_limit';
            errorDesc = 'Too many attempts. Please wait a few minutes before trying again.';
          } else if (error.message.includes('not confirmed') || error.message.includes('verify')) {
            errorType = 'email_not_verified';
            errorDesc = 'Please verify your email before signing in.';
            // Auto-switch to verify mode so user can resend
            setMode('verify');
            toast({
              title: 'Email not verified',
              description: 'We switched you to the verification screen so you can resend your code.',
            });
            trackLoginError('email', errorType);
            return;
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
          navigate(redirectUrl !== '/' ? redirectUrl : '/dashboard');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-[50vh] lg:min-h-screen p-6 sm:p-8 lg:p-12 bg-background">
      <div className="w-full max-w-md mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'signin' ? t('auth.signInTitle') : 
               mode === 'signup' ? t('auth.signUpTitle') : 
               mode === 'verify' ? t('auth.verifyTitle') : 
               t('auth.resetTitle')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === 'signin' ? t('auth.signInSubtitle') :
               mode === 'signup' ? t('auth.signUpSubtitle') :
               mode === 'verify' ? t('auth.verifySubtitle') :
               t('auth.resetSubtitle')}
            </p>
          </div>

          {mode === 'verify' ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Didn't receive it? Check your spam folder or resend below.
                </p>
              </div>
              
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
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              <Button 
                type="button"
                variant="dark-shine"
                className="w-full rounded-xl h-12"
                disabled={resendingEmail}
                onClick={handleResendVerification}
              >
                {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Resend Verification Email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={errors.firstName ? 'border-destructive' : ''}
                        required
                      />
                      {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={errors.lastName ? 'border-destructive' : ''}
                        required
                      />
                      {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={errors.phoneNumber ? 'border-destructive' : ''}
                      required
                    />
                    {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
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
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setErrors({}); }}
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
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  
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
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Store className={`h-6 w-6 mx-auto mb-2 ${selectedRole === 'shopper' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium block ${selectedRole === 'shopper' ? 'text-primary' : 'text-foreground'}`}>
                        Rent / Buy
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('host')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === 'host'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Truck className={`h-6 w-6 mx-auto mb-2 ${selectedRole === 'host' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium block ${selectedRole === 'host' ? 'text-primary' : 'text-foreground'}`}>
                        List Assets
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                variant="dark-shine"
                className="w-full rounded-xl h-12"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>

              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl h-12"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                </>
              )}
            </form>
          )}

          {/* Mode switching */}
          <div className="text-center space-y-2">
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrors({}); }}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            )}
            
            {mode === 'verify' && (
              <p className="text-sm text-muted-foreground">
                Already verified?
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrors({}); }}
                  className="ml-1 text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <p className="text-sm text-muted-foreground">
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); }}
                    className="ml-1 text-primary font-medium hover:underline"
                  >
                    {mode === 'signin' ? 'Sign up for free' : 'Sign in'}
                  </button>
                </p>
                {mode === 'signin' && (
                  <p className="text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => { setMode('verify'); setErrors({}); }}
                      className="text-primary font-medium hover:underline"
                    >
                      Resend verification email
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
