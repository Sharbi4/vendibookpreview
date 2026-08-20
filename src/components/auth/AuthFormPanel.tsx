import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, Store, Eye, EyeOff, Loader2, Mail, ArrowLeft, CheckCircle2, Shield, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { triggerOrchestrator } from '@/lib/orchestrator';
import { z } from 'zod';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { trackSignupCompleted, trackLoginAttempt, trackLoginSuccess, trackLoginError, trackSignupAttempt, trackSignupError, trackPasswordResetRequest } from '@/lib/analytics';
import { trackSignupConversion } from '@/lib/gtagConversions';
import { trackGA4SignUp, trackGA4Login } from '@/lib/ga4Conversions';
import { Separator } from '@/components/ui/separator';
import {
  type AuthMethod,
  getLastAuthMethod,
  rememberAuthMethod,
  describeSignInError,
  startGoogleSignIn,
} from '@/lib/auth/oauthIntent';

import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CURRENT_VERSIONS,
  DOCUMENT_TYPES,
  CONSENT_TRIGGERS,
} from '@/lib/legalDocuments';
import { stashPendingSignupConsent, clearPendingSignupConsent } from '@/lib/pendingSignupConsent';
import SmsConsentField from '@/components/sms/SmsConsentField';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import { SMS_CONSENT_DISCLOSURE } from '@/lib/sms/consent';

const SIGNUP_TOS_ACCEPTANCE_TEXT =
  'I agree to the Vendibook Terms of Service and acknowledge the Privacy Policy.';
const SIGNUP_MARKETING_TEXT =
  'Send me occasional Vendibook updates and marketing emails. I can unsubscribe anytime.';

const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
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
  const [lastMethod] = useState<AuthMethod | null>(() => getLastAuthMethod());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendingEmail, setResendingEmail] = useState(false);
  // Email the verification link was actually sent to. When the user edits the
  // field on the verify screen (typo fix) we re-create the account on the
  // corrected address instead of resending to the wrong one.
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  // SMS consent state — must always start unchecked and remain separate
  // from the ToS + marketing consent above.
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const rawRedirect =
    searchParams.get('redirect') || searchParams.get('returnTo') || '';
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '';

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        authSchema.parse({ email, password, firstName, lastName });
      } else if (mode === 'forgot' || mode === 'verify') {
        authSchema.pick({ email: true }).parse({ email });
      } else {
        authSchema.omit({ firstName: true, lastName: true }).parse({ email, password });
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

    const target = email.trim().toLowerCase();
    const corrected = !!pendingVerifyEmail && target !== pendingVerifyEmail;

    setResendingEmail(true);
    try {
      // Typo correction: the address we sent to is unreachable, so create the
      // account on the corrected address (we still have the password in state).
      if (corrected && password) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { error } = await signUp(
          target, password, fullName, selectedRole,
          firstName.trim(), lastName.trim(), phoneNumber.trim(), redirectUrl || undefined,
        );
        if (error) {
          toast({
            title: 'Could not update your email',
            description: error.message.includes('already registered')
              ? 'That email is already registered — try signing in instead.'
              : error.message,
            variant: 'destructive',
          });
          return;
        }
        setPendingVerifyEmail(target);
        setEmail(target);
        toast({
          title: 'Email updated',
          description: `We sent a new verification link to ${target}.`,
        });
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectUrl || '/dashboard'}`,
        },
      });

      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setPendingVerifyEmail(target);
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
    // Synchronous guard — prevents a second popup on rapid double-tap.
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);

    // Intent is stashed by the helper (AuthContext drains it after SIGNED_IN);
    // redirect_uri itself must stay a public same-origin URL.
    if (email.trim()) rememberAuthMethod('google', email);
    const result = await startGoogleSignIn(redirectUrl || null);

    if (!result.ok) {
      setIsGoogleLoading(false);
      toast({
        title: 'Google sign-in failed',
        description: result.error,
        variant: 'destructive',
      });
    }
    // On success the browser is navigating (or the popup completed) — keep the
    // spinner up so the button stays disabled.
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

    if (!validateForm()) return;

    // Non-preselected consent gate — signup cannot proceed without an
    // affirmative acceptance of the Terms + Privacy Policy (spec §6 / §26).
    if (mode === 'signup' && !agreedToTerms) {
      setErrors((prev) => ({
        ...prev,
        terms: 'Please agree to the Terms of Service to create your account.',
      }));
      toast({
        title: 'Terms acceptance required',
        description:
          'Please review and accept the Vendibook Terms of Service before creating your account.',
        variant: 'destructive',
      });
      return;
    }

    // SMS consent gate: only trigger validation when the user checked the
    // box. Consent is otherwise optional and never blocks signup.
    if (mode === 'signup' && smsConsent) {
      if (!normalizeNanpToE164(trimmedPhone)) {
        setSmsError('Enter a valid US or Canadian mobile number to receive text updates, or uncheck the SMS box.');
        return;
      }
      setSmsError(null);
    }


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
        const { error } = await signUp(trimmedEmail, password, fullName, selectedRole, trimmedFirstName, trimmedLastName, trimmedPhone, redirectUrl || undefined);
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

          // Always stash the acceptance snapshot up-front. If a session
          // already exists we still record inline below and then clear the
          // stash; if not (email verification required), the stash is
          // drained on the first authenticated action post-verify by
          // drainPendingSignupConsent() inside AuthContext.
          stashPendingSignupConsent({
            email: trimmedEmail,
            role: selectedRole,
            marketingOptIn,
            tosVersion: CURRENT_VERSIONS[DOCUMENT_TYPES.TERMS_OF_SERVICE],
            privacyVersion: CURRENT_VERSIONS[DOCUMENT_TYPES.PRIVACY_POLICY],
            acceptanceText: SIGNUP_TOS_ACCEPTANCE_TEXT,
            route: '/auth?mode=signup',
            locale: navigator.language,
            userAgent: navigator.userAgent,
            capturedAt: new Date().toISOString(),
          });

          // Detect whether the user already has an active session
          // (auto-confirm enabled) vs needs to verify their email.
          let hasSession = false;
          try {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            hasSession = !!newSession?.user;
            if (newSession?.user?.id) {
              // Record the signup consent server-side immediately. If
              // auto-confirm is off (email verify required) there's no
              // session yet — the stash above will be replayed on the
              // first authenticated action post-verify.
              try {
                await supabase.rpc('record_user_consent', {
                  _document_type: DOCUMENT_TYPES.TERMS_OF_SERVICE,
                  _document_version: CURRENT_VERSIONS[DOCUMENT_TYPES.TERMS_OF_SERVICE],
                  _trigger_action: CONSENT_TRIGGERS.SIGNUP,
                  _acceptance_text: SIGNUP_TOS_ACCEPTANCE_TEXT,
                  _related_ids: { role: selectedRole },
                  _route: '/auth?mode=signup',
                  _ip: null,
                  _user_agent: navigator.userAgent,
                  _locale: navigator.language,
                  _application_version: null,
                });
                await supabase.rpc('record_user_consent', {
                  _document_type: DOCUMENT_TYPES.PRIVACY_POLICY,
                  _document_version: CURRENT_VERSIONS[DOCUMENT_TYPES.PRIVACY_POLICY],
                  _trigger_action: CONSENT_TRIGGERS.SIGNUP,
                  _acceptance_text: SIGNUP_TOS_ACCEPTANCE_TEXT,
                  _related_ids: { role: selectedRole },
                  _route: '/auth?mode=signup',
                  _ip: null,
                  _user_agent: navigator.userAgent,
                  _locale: navigator.language,
                  _application_version: null,
                });
                if (marketingOptIn) {
                  // Marketing opt-in is a separate, revocable consent —
                  // never bundled into the required platform acceptance.
                  await supabase
                    .from('newsletter_subscribers')
                    .upsert(
                      { email: trimmedEmail, source: 'signup_opt_in' },
                      { onConflict: 'email' },
                    );
                }
                // Inline write succeeded — no need for the deferred drain.
                clearPendingSignupConsent();

                // Record SMS consent when the user affirmatively opted in
                // during signup. Never blocks account creation.
                if (smsConsent && normalizeNanpToE164(trimmedPhone)) {
                  try {
                    await supabase.functions.invoke('sms-record-consent', {
                      body: {
                        phone: trimmedPhone,
                        source: 'signup',
                        consent: true,
                        marketing: false,
                        disclosureText: SMS_CONSENT_DISCLOSURE,
                        userAgent: navigator.userAgent,
                      },
                    });
                  } catch (smsErr) {
                    console.error('SMS consent record failed', smsErr);
                  }
                }
              } catch (consentErr) {
                console.error('Failed to record signup consent', consentErr);
              }

              triggerOrchestrator({
                user_id: newSession.user.id,
                event_type: 'user_signup',
                payload: { role: selectedRole, first_name: trimmedFirstName },
              });
            }
          } catch {}

          if (hasSession) {
            toast({
              title: 'Welcome to Vendibook!',
              description: 'Your account is ready.',
            });
            navigate(redirectUrl || '/dashboard');
          } else {
            toast({
              title: 'Check your email!',
              description: 'We sent you a verification link. Please check your inbox to complete signup.',
            });
            setPendingVerifyEmail(trimmedEmail);
            setMode('verify');
          }
        }
      } else {
        trackLoginAttempt('email');
        const { error } = await signIn(trimmedEmail, password);
        if (error) {
          const mapped = describeSignInError(error.message, trimmedEmail);

          if (mapped.type === 'email_not_verified') {
            // Auto-switch to verify mode so user can resend
            setPendingVerifyEmail(trimmedEmail);
            setMode('verify');
            toast({
              title: 'Email not verified',
              description: 'We switched you to the verification screen so you can resend your code.',
            });
            trackLoginError('email', mapped.type);
            return;
          }

          trackLoginError('email', mapped.type);

          toast({
            title: mapped.title,
            description: mapped.description,
            variant: mapped.type === 'google_account' ? 'default' : 'destructive',
          });
        } else {
          rememberAuthMethod('email', trimmedEmail);
          trackLoginSuccess('email');
          trackGA4Login('email');
          navigate(redirectUrl || '/dashboard');
        }

      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const headline =
    mode === 'signin'
      ? 'Welcome back.'
      : mode === 'signup'
        ? 'Create your Vendibook account.'
        : mode === 'verify'
          ? 'Verify your email.'
          : 'Reset your password.';

  const supportingCopy =
    mode === 'signin'
      ? 'Sign in to manage your listings, messages, bookings, purchases, and Vendibook account.'
      : mode === 'signup'
        ? 'Buy, sell, rent, host, and manage your mobile food business in one place.'
        : mode === 'verify'
          ? 'We sent you a verification link. Confirm your email to finish setting up your account.'
          : "Enter your email and we'll send you a link to set a new password.";

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Brand + back link */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} aria-label="Vendibook home">
            <img src={vendibookLogo} alt="Vendibook" className="h-9 w-auto" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {/* Header — one H1 per state */}
          <div className="mb-6">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {headline}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{supportingCopy}</p>
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
                <Label htmlFor="email">Email we sent the link to</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                <p className="text-xs text-muted-foreground">
                  Typo in your address? Correct it here and we'll send the verification link to the new email instead.
                </p>
              </div>

              <Button 
                type="button"
                variant="dark-shine"
                className="w-full rounded-xl h-12"
                disabled={resendingEmail}
                onClick={handleResendVerification}
              >
                {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {pendingVerifyEmail && email.trim().toLowerCase() !== pendingVerifyEmail
                  ? 'Send link to this email instead'
                  : 'Resend verification email'}
              </Button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setErrors({}); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already verified? Sign in
              </button>

            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Social first, then the email form behind a labelled divider. */}
              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="relative h-12 w-full rounded-2xl border border-border bg-card text-foreground hover:bg-muted hover:border-border"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isSubmitting}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    {isGoogleLoading ? 'Opening Google…' : 'Continue with Google'}
                    {lastMethod === 'google' && !isGoogleLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Last used
                      </span>
                    )}
                  </Button>

                  <div className="relative">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={`h-12 rounded-2xl text-base ${errors.firstName ? 'border-destructive' : ''}`}
                      aria-invalid={!!errors.firstName}
                      required
                    />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={`h-12 rounded-2xl text-base ${errors.lastName ? 'border-destructive' : ''}`}
                      aria-invalid={!!errors.lastName}
                      required
                    />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-12 rounded-2xl text-base ${errors.email ? 'border-destructive' : ''}`}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setErrors({}); }}
                        className="rounded-lg py-1 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-12 rounded-2xl pr-11 text-base ${errors.password ? 'border-destructive' : ''}`}
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
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
                      <p className="text-xs text-muted-foreground">
                        {getPasswordStrength(password).label}
                        {getPasswordStrength(password).score < 3 && ' — try adding numbers & special characters'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-3">
                  {/* Signal only — never a locked role. Every account can buy,
                      sell, rent and host without changing this later. */}
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      What brings you here?
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Just so we can tailor your dashboard — you can do both any time.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={selectedRole === 'shopper'}
                      onClick={() => setSelectedRole('shopper')}
                      className={`rounded-2xl border p-4 text-center transition-all ${
                        selectedRole === 'shopper'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-foreground/20'
                      }`}
                    >
                      <Store className={`mx-auto mb-2 h-5 w-5 ${selectedRole === 'shopper' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="block text-sm font-medium text-foreground">Rent / Buy</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={selectedRole === 'host'}
                      onClick={() => setSelectedRole('host')}
                      className={`rounded-2xl border p-4 text-center transition-all ${
                        selectedRole === 'host'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-foreground/20'
                      }`}
                    >
                      <Truck className={`mx-auto mb-2 h-5 w-5 ${selectedRole === 'host' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="block text-sm font-medium text-foreground">List / Host</span>
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={agreedToTerms}
                      onCheckedChange={(v) => {
                        setAgreedToTerms(v === true);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.terms;
                          return next;
                        });
                      }}
                      aria-label={SIGNUP_TOS_ACCEPTANCE_TEXT}
                      data-testid="signup-tos-checkbox"
                      aria-invalid={!!errors.terms}
                    />
                    <span className="text-sm leading-snug text-muted-foreground">
                      I agree to the{' '}
                      <a
                        href="/legal/terms"
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground underline underline-offset-4 hover:text-primary"
                      >
                        Vendibook Terms of Service
                      </a>{' '}
                      and acknowledge the{' '}
                      <a
                        href="/legal/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground underline underline-offset-4 hover:text-primary"
                      >
                        Privacy Policy
                      </a>.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.terms}
                    </p>
                  )}
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={marketingOptIn}
                      onCheckedChange={(v) => setMarketingOptIn(v === true)}
                      aria-label={SIGNUP_MARKETING_TEXT}
                      data-testid="signup-marketing-checkbox"
                    />
                    <span className="text-sm leading-snug text-muted-foreground">
                      {SIGNUP_MARKETING_TEXT}
                    </span>
                  </label>

                  {/* SMS opt-in — separate from ToS and marketing; unchecked by default,
                      never required, disclosure sits directly adjacent to the field. */}
                  <div className="pt-1">
                    <SmsConsentField
                      phone={phoneNumber}
                      onPhoneChange={setPhoneNumber}
                      consent={smsConsent}
                      onConsentChange={(v) => { setSmsConsent(v); if (!v) setSmsError(null); }}
                      error={smsError ?? undefined}
                      testIdPrefix="signup-sms"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="cta"
                className="h-12 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </Button>

              {mode === 'signup' && (
                <p className="text-center text-xs leading-snug text-muted-foreground">
                  Continuing with Google creates your account with your Google name and email.
                  Text messages are optional and never a condition of using Vendibook.
                </p>
              )}
            </form>

          )}

          {/* Mode switching */}
          <div className="mt-6 space-y-2 border-t border-border pt-5 text-center">
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrors({}); }}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
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
                  className="ml-1 font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <>
                <p className="text-sm text-muted-foreground">
                  {mode === 'signin' ? 'New to Vendibook?' : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); }}
                    className="ml-1 font-medium text-primary hover:underline"
                  >
                    {mode === 'signin' ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
                {mode === 'signin' && (
                  <p className="text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => { setMode('verify'); setErrors({}); }}
                      className="font-medium text-primary hover:underline"
                    >
                      Resend verification email
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Single, factual reassurance line — no stats, logos, or upsells. */}
        {(mode === 'signin' || mode === 'signup') && (
          <p className="px-2 text-center text-sm leading-relaxed text-muted-foreground">
            One account for buying, selling, renting, hosting, and managing your Vendibook activity.
          </p>
        )}
      </motion.div>
    </div>
  );
};
