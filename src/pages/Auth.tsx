import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, Store, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import vendibookLogo from '@/assets/vendibook-logo.jpg';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

type AuthMode = 'signin' | 'signup';
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

  const { signIn, signUp, user, isLoading } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome to Vendibook!',
            description: 'Your account has been created successfully.',
          });
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have signed in successfully.',
          });
          navigate('/');
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
    <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={vendibookLogo} 
            alt="Vendibook" 
            className="h-20 w-auto mx-auto mb-4 rounded-xl"
          />
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-center mb-6">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
            </div>

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
              className="w-full rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
