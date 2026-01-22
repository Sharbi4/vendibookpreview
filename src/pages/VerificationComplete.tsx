import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VerificationComplete = () => {
  const [status, setStatus] = useState<'checking' | 'verified' | 'failed'>('checking');
  const { refreshProfile, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth state to be determined before checking
    if (isLoading) return;

    const checkStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-identity-verification');
        
        if (error) {
          setStatus('failed');
          return;
        }

        if (data.verified) {
          await refreshProfile();
          setStatus('verified');
        } else {
          // Give Stripe a moment to process
          setTimeout(async () => {
            const { data: retryData } = await supabase.functions.invoke('check-identity-verification');
            if (retryData?.verified) {
              await refreshProfile();
              setStatus('verified');
            } else {
              setStatus('failed');
            }
          }, 2000);
        }
      } catch (error) {
        setStatus('failed');
      }
    };

    checkStatus();
  }, [user, isLoading, navigate, refreshProfile]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Checking verification status...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm your identity.</p>
        </div>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Verification Complete!</h1>
          <p className="text-muted-foreground mb-8">
            Your identity has been successfully verified. You now have full access to all Vendibook features.
          </p>
          <Button onClick={() => navigate('/')} className="rounded-xl">
            Start Exploring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Verification Pending</h1>
        <p className="text-muted-foreground mb-8">
          Your verification is still being processed or was not completed. You can try again or continue browsing.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/verify-identity')} className="rounded-xl">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl">
            Continue Browsing
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerificationComplete;
